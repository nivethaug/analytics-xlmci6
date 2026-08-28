"""X (Twitter) routes — data for the connected account via the platform integration proxy."""
import os

import requests
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/twitter", tags=["twitter"])

PROXY_URL = "https://api.dreamagent.cloud/api/integrations/proxy"
PROJECT_ID = "2015"


def _proxy(endpoint: str) -> dict:
    """Call the platform integration proxy for the connected X account."""
    resp = requests.post(
        PROXY_URL,
        headers={
            "Authorization": f"Bearer {os.environ['SECRET_KEY']}",
            "X-Project-Id": PROJECT_ID,
            "Content-Type": "application/json",
        },
        json={
            "provider": "twitter",
            "method": "GET",
            "endpoint": endpoint,
        },
        timeout=30,
    )
    if resp.status_code == 409:
        raise HTTPException(
            status_code=409,
            detail="X account not connected. Connect it in Settings → Integrations.",
        )
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"X proxy error ({resp.status_code}): {resp.text[:300]}",
        )
    return resp.json()


@router.get("/profile")
async def get_profile():
    """Connected X profile."""
    data = _proxy("2/users/me?user.fields=profile_image_url,description,public_metrics")
    user = data.get("data") or {}
    metrics = user.get("public_metrics", {}) or {}
    return {
        "id": user.get("id"),
        "name": user.get("name"),
        "username": user.get("username"),
        "description": user.get("description"),
        "profileImage": user.get("profile_image_url"),
        "followers": int(metrics.get("followers_count", 0) or 0),
        "following": int(metrics.get("following_count", 0) or 0),
        "tweetCount": int(metrics.get("tweet_count", 0) or 0),
    }


# Note: tweet/timeline reads are a PAID X API tier — intentionally not offered.
# Only profile reads (free) and posting are supported.
