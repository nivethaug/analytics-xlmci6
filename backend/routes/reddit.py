"""
Reddit routes — public subreddit data via the Arctic Shift public Reddit
archive API (arctic-shift.photon-reddit.com).

Reddit's own endpoints block datacenter IPs (403), so we use this archive,
which serves the same public data. Per-subreddit in-memory cache (15 min).
"""
import time
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException

from core.config import settings

router = APIRouter(prefix="/api/reddit", tags=["Reddit"])

API_BASE = "https://arctic-shift.photon-reddit.com/api"
DEFAULT_SUBS = [
    "AI_India", "nocode", "developersIndia",
    "NoCodeAppBuilder", "lowcode", "webdev", "SaaS",
    "Entrepreneur", "artificial", "ChatGPT", "OpenAI",
    "vibecoding", "india", "startups_india",
]
CACHE_TTL = 900  # 15 min
TIMEOUT = 20

_cache: dict = {}  # key -> {"t": ts, "data": ...}


def _cached(key: str):
    entry = _cache.get(key)
    if entry and time.time() - entry["t"] < CACHE_TTL:
        return entry["data"]
    return None


def _store(key: str, data):
    _cache[key] = {"t": time.time(), "data": data}
    return data


def _get(url: str, params: dict) -> dict:
    r = requests.get(url, params=params, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def _fetch_about(sub: str) -> dict:
    """Subreddit metadata from Arctic Shift."""
    data = _get(f"{API_BASE}/subreddits/search", {"subreddit": sub})
    rows = data.get("data") or []
    if not rows:
        raise ValueError(f"r/{sub} not found")
    r0 = rows[0]
    meta = r0.get("_meta") or {}
    return {
        "name": r0.get("display_name", sub),
        "title": r0.get("title") or r0.get("display_name", sub),
        "description": r0.get("public_description") or "",
        "subscribers": r0.get("subscribers"),
        "activeUsers": r0.get("active_user_count") or r0.get("accounts_active") or 0,
        "icon": "",
        "createdUtc": r0.get("created_utc") or 0,
    }


def _fetch_posts(sub: str, limit: int = 25) -> list:
    """Latest posts from Arctic Shift (no 'newest' sort param needed; results
    come back newest-first)."""
    # Fetch without 'fields' param: removal fields (removed_by_category etc.)
    # exist in the payload but are not accepted by the fields filter.
    try:
        data = _get(f"{API_BASE}/posts/search", {"subreddit": sub, "limit": limit})
    except requests.HTTPError:
        data = _get(f"{API_BASE}/posts/search",
                    {"subreddit": sub, "limit": limit,
                     "fields": "id,subreddit,title,author,score,num_comments,created_utc,permalink,over_18,selftext"})
    rows = data.get("data") or []
    posts = []
    for p in rows:
        permalink = p.get("permalink") or f"/r/{sub}/comments/{p.get('id')}/"
        removed = bool(
            p.get("removed_by_category")
            or p.get("removal_reason")
            or p.get("banned_by")
            or p.get("removed_by")
        )
        posts.append({
            "id": p.get("id"),
            "title": p.get("title", ""),
            "author": p.get("author", "[deleted]"),
            "score": p.get("score", 0),
            "num_comments": p.get("num_comments", 0),
            "created_utc": p.get("created_utc"),
            "url": f"https://www.reddit.com{permalink}" if permalink.startswith("/") else permalink,
            "selftext": (p.get("selftext") or "")[:280],
            "removed": removed,
            "removed_by": p.get("removed_by_category") or p.get("banned_by") or "moderator",
        })
    return posts


# Demand-related keyword groups: apps/websites, no-code, AI agents, bots
KEYWORDS = [
    "app", "website", "web app", "landing page", "saas", "mvp", "platform",
    "tool", "dashboard",
    "no code", "nocode", "no-code", "low code", "lowcode", "builder",
    "drag and drop", "bubble", "webflow",
    "ai agent", "agent", "autonomous", "chatgpt", "gpt", "llm", "automation",
    "bot", "discord bot", "telegram bot", "slack bot", "chatbot", "scraper",
]


def _matches_demand(p: dict) -> bool:
    text = f"{p.get('title', '')} {p.get('selftext', '')}".lower()
    return any(k in text for k in KEYWORDS)


def _filter_posts(posts: list) -> list:
    """Keep demand-related posts, plus posts removed by moderators."""
    out = []
    for p in posts:
        if p.get("removed") or _matches_demand(p):
            out.append(p)
    return out or posts  # never return an empty card


@router.get("/subs")
def get_subs(subreddits: Optional[str] = None):
    """Fetch about-info for a comma-separated list of subreddits."""
    subs = [s.strip() for s in (subreddits or "").split(",") if s.strip()] or DEFAULT_SUBS
    result, errors = {}, {}
    for s in subs:
        key = f"sub:{s.lower()}"
        try:
            cached = _cached(key)
            if cached:
                result[s] = cached
                continue
            about = _fetch_about(s)
            try:
                posts_raw = _fetch_posts(s, 25)
            except Exception:
                posts_raw = []
            about["posts"] = [
                {
                    "title": p["title"],
                    "author": p["author"],
                    "score": p["score"],
                    "numComments": p["num_comments"],
                    "upvoteRatio": 0,
                    "createdUtc": p["created_utc"] or 0,
                    "permalink": p["url"],
                    "url": p["url"],
                    "flair": None,
                    "selftext": p.get("selftext", ""),
                    "removed": p.get("removed", False),
                    "removedBy": p.get("removed_by"),
                }
                for p in _filter_posts(posts_raw)
            ]
            result[s] = _store(key, about)
        except Exception:
            errors[s] = "Subreddit data temporarily unavailable."
    return {"subs": result, "errors": errors, "defaults": DEFAULT_SUBS}


@router.get("/r/{subreddit}/posts")
def get_posts(subreddit: str, limit: int = 25):
    sub = subreddit.strip()[:50]
    if not sub.replace("_", "").isalnum():
        raise HTTPException(400, "Invalid subreddit name")
    key = f"posts:{sub.lower()}:{limit}"
    try:
        posts = _cached(key)
        if not posts:
            posts = _store(key, _filter_posts(_fetch_posts(sub, min(limit, 100))))
    except Exception:
        raise HTTPException(503, "Reddit data temporarily unavailable.")
    return {"subreddit": sub, "posts": posts}
