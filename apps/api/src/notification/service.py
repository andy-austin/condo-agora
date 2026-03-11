from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from ...database import db


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_notifications(user_id: str, limit: int = 50) -> List[dict]:
    """Get notifications for a user, newest first."""
    await _ensure_connected()

    notifications = []
    cursor = (
        db.db.notifications.find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    async for notification in cursor:
        notifications.append(notification)
    return notifications


async def get_unread_count(user_id: str) -> int:
    """Get count of unread notifications for a user."""
    await _ensure_connected()
    return await db.db.notifications.count_documents(
        {"user_id": user_id, "is_read": False}
    )


async def create_notification(
    user_id: str,
    organization_id: str,
    notification_type: str,
    title: str,
    message: str,
    reference_id: str,
) -> dict:
    """Create a new notification."""
    await _ensure_connected()

    now = datetime.utcnow()
    data = {
        "user_id": user_id,
        "organization_id": organization_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "reference_id": reference_id,
        "is_read": False,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.db.notifications.insert_one(data)
    return await db.db.notifications.find_one({"_id": result.inserted_id})


async def mark_notification_read(notification_id: str) -> Optional[dict]:
    """Mark a single notification as read."""
    await _ensure_connected()
    now = datetime.utcnow()
    return await db.db.notifications.find_one_and_update(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True, "updated_at": now}},
        return_document=True,
    )


async def mark_all_read(user_id: str) -> int:
    """Mark all notifications as read for a user. Returns count updated."""
    await _ensure_connected()
    now = datetime.utcnow()
    result = await db.db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True, "updated_at": now}},
    )
    return result.modified_count


async def notify_org_members(
    organization_id: str,
    exclude_user_id: str,
    notification_type: str,
    title: str,
    message: str,
    reference_id: str,
) -> None:
    """Send a notification to all org members except one user."""
    await _ensure_connected()

    members_cursor = db.db.organization_members.find(
        {"organization_id": organization_id}
    )
    async for member in members_cursor:
        user_id = member.get("user_id")
        if user_id and user_id != exclude_user_id:
            await create_notification(
                user_id,
                organization_id,
                notification_type,
                title,
                message,
                reference_id,
            )


async def notify_designated_voters(
    organization_id: str,
    notification_type: str,
    title: str,
    message: str,
    reference_id: str,
) -> None:
    """Send a notification to all designated voters in an organization."""
    await _ensure_connected()

    cursor = db.db.houses.find(
        {"organization_id": organization_id, "voter_user_id": {"$ne": None}}
    )
    voter_ids: set = set()
    async for house in cursor:
        vid = house.get("voter_user_id")
        if vid:
            voter_ids.add(vid)

    for voter_id in voter_ids:
        await create_notification(
            voter_id,
            organization_id,
            notification_type,
            title,
            message,
            reference_id,
        )


async def get_activity_feed(organization_id: str, limit: int = 20) -> List[dict]:
    """Get recent activity for an organization from proposals, comments, announcements."""
    await _ensure_connected()

    items = []

    # Recent proposals
    proposal_cursor = (
        db.db.proposals.find({"organization_id": organization_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    async for p in proposal_cursor:
        items.append(
            {
                "_id": p["_id"],
                "type": "PROPOSAL",
                "title": p["title"],
                "description": f"New proposal: {p['title']}",
                "reference_id": str(p["_id"]),
                "organization_id": organization_id,
                "created_at": p["created_at"],
            }
        )

    # Recent announcements
    announcement_cursor = (
        db.db.announcements.find({"organization_id": organization_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    async for a in announcement_cursor:
        items.append(
            {
                "_id": a["_id"],
                "type": "ANNOUNCEMENT",
                "title": a["title"],
                "description": f"New announcement: {a['title']}",
                "reference_id": str(a["_id"]),
                "organization_id": organization_id,
                "created_at": a["created_at"],
            }
        )

    # Sort combined by date and limit
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items[:limit]
