from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from ...database import db


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_announcements(organization_id: str) -> List[dict]:
    """Get all announcements for an organization (pinned first, then by date)."""
    await _ensure_connected()

    announcements = []
    cursor = db.db.announcements.find({"organization_id": organization_id}).sort(
        [("is_pinned", -1), ("created_at", -1)]
    )
    async for announcement in cursor:
        announcements.append(announcement)
    return announcements


async def get_announcement(announcement_id: str) -> Optional[dict]:
    """Get a single announcement by ID."""
    await _ensure_connected()
    try:
        announcement = await db.db.announcements.find_one(
            {"_id": ObjectId(announcement_id)}
        )
    except Exception:
        return None
    return announcement


async def create_announcement(
    organization_id: str,
    author_id: str,
    title: str,
    content: str,
    is_pinned: bool = False,
) -> dict:
    """Create a new announcement."""
    await _ensure_connected()

    now = datetime.utcnow()
    data = {
        "organization_id": organization_id,
        "author_id": author_id,
        "title": title,
        "content": content,
        "is_pinned": is_pinned,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.db.announcements.insert_one(data)
    return await db.db.announcements.find_one({"_id": result.inserted_id})


async def update_announcement(
    announcement_id: str,
    title: str,
    content: str,
    is_pinned: bool,
) -> Optional[dict]:
    """Update an announcement."""
    await _ensure_connected()

    now = datetime.utcnow()
    return await db.db.announcements.find_one_and_update(
        {"_id": ObjectId(announcement_id)},
        {
            "$set": {
                "title": title,
                "content": content,
                "is_pinned": is_pinned,
                "updated_at": now,
            }
        },
        return_document=True,
    )


async def delete_announcement(announcement_id: str) -> bool:
    """Delete an announcement."""
    await _ensure_connected()
    try:
        result = await db.db.announcements.delete_one(
            {"_id": ObjectId(announcement_id)}
        )
        return result.deleted_count > 0
    except Exception:
        return False
