"""
YouTube routes — real data via the platform integration proxy.
"""
import os
from datetime import date, timedelta

import requests
from fastapi import APIRouter, HTTPException

from core.config import settings

router = APIRouter(prefix="/api/youtube", tags=["YouTube"])

PROXY_URL = "https://api.dreamagent.cloud/api/integrations/proxy"
PROJECT_ID = os.getenv("PROJECT_ID", "2015")


def _proxy(endpoint: str) -> dict:
    """Call the platform integration proxy for the connected YouTube account."""
    resp = requests.post(
        PROXY_URL,
        headers={
            "Authorization": f"Bearer {os.environ['SECRET_KEY']}",
            "X-Project-Id": PROJECT_ID,
            "Content-Type": "application/json",
        },
        json={
            "provider": "youtube",
            "method": "GET",
            "endpoint": endpoint,
        },
        timeout=30,
    )
    if resp.status_code == 409:
        raise HTTPException(
            status_code=409,
            detail="YouTube account not connected. Connect it in Settings → Integrations.",
        )
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"YouTube proxy error ({resp.status_code}): {resp.text[:300]}",
        )
    return resp.json()


@router.get("/channel")
async def get_channel():
    """Connected channel snippet + statistics."""
    data = _proxy("youtube/v3/channels?part=snippet,statistics&mine=true")
    items = data.get("items") or []
    if not items:
        raise HTTPException(status_code=404, detail="No channel found for this account.")
    it = items[0]
    snippet, stats = it.get("snippet", {}), it.get("statistics", {})
    return {
        "id": it.get("id"),
        "channelName": snippet.get("title"),
        "handle": snippet.get("customUrl"),
        "description": snippet.get("description"),
        "thumbnail": (snippet.get("thumbnails", {}).get("default", {}) or {}).get("url"),
        "subscribers": int(stats.get("subscriberCount", 0)),
        "totalViews": int(stats.get("viewCount", 0)),
        "videoCount": int(stats.get("videoCount", 0)),
    }


@router.get("/videos")
async def get_videos():
    """Latest 5 uploads with titles and view counts (search + statistics)."""
    # search doesn't return view counts, so fetch stats in a second call
    search = _proxy(
        "youtube/v3/search?part=snippet&type=video&order=date&maxResults=5"
        "&forMine=true"
        "&fields=items(id/videoId,snippet(publishedAt,title,thumbnails/default/url))"
    )
    items = [
        (i["id"]["videoId"], i.get("snippet", {}) or {})
        for i in search.get("items", [])
        if i.get("id", {}).get("videoId")
    ]
    stats_map = {}
    if items:
        ids = [vid for vid, _ in items]
        details = _proxy(
            f"youtube/v3/videos?part=snippet,statistics&id={','.join(ids)}"
            "&fields=items(id,snippet(title,publishedAt,thumbnails(medium/url,default/url)),statistics)"
        )
        for v in details.get("items", []):
            stats_map[v["id"]] = v
    videos = []
    for vid, search_snippet in items:
        v = stats_map.get(vid, {})
        sn = v.get("snippet", {}) or search_snippet
        st = v.get("statistics", {}) or {}
        videos.append({
            "id": vid,
            "title": sn.get("title") or vid,
            "publishedAt": sn.get("publishedAt"),
            "views": int(st.get("viewCount", 0) or 0),
            "likes": int(st.get("likeCount", 0) or 0),
            "comments": int(st.get("commentCount", 0) or 0),
            "thumbnail": ((sn.get("thumbnails", {}).get("medium", {}) or {}).get("url"))
                or ((sn.get("thumbnails", {}).get("default", {}) or {}).get("url")),
        })
    return {"videos": videos}


@router.get("/analytics")
async def get_analytics():
    """Views & watch time for the last 14 days from the YouTube Analytics API.

    Note: if the analytics API is not reachable through the platform proxy,
    we return available=false instead of fabricated numbers.
    """
    end = date.today()
    start = end - timedelta(days=13)
    endpoint = (
        "https://youtubeanalytics.googleapis.com/youtube/analytics/v2/reports"
        f"?ids=channel%3D%3Dmine&metrics=views,estimatedMinutesWatched"
        f"&dimensions=day&startDate={start.isoformat()}&endDate={end.isoformat()}"
    )
    try:
        data = _proxy(endpoint)
    except HTTPException:
        # proxy cannot reach the analytics host yet — report honestly
        return {"available": False, "days": [], "message": "YouTube Analytics API is not currently reachable through the platform proxy."}
    rows = data.get("rows") or []
    column = [c["name"] for c in data.get("columnHeaders", [])]
    di = column.index("day") if "day" in column else 0
    days = [
        {"day": r[di], "views": int(r[di + 1]), "watchMinutes": int(r[di + 2])}
        for r in rows
    ]
    return {
        "available": True,
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "totalViews": sum(d["views"] for d in days),
        "totalWatchMinutes": sum(d["watchMinutes"] for d in days),
        "days": days,
    }
