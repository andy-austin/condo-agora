from typing import List, Optional

import strawberry

from ..graphql_types.announcement import Announcement
from ..src.announcement.service import create_announcement as service_create
from ..src.announcement.service import delete_announcement as service_delete
from ..src.announcement.service import get_announcement as service_get
from ..src.announcement.service import get_announcements as service_list
from ..src.announcement.service import update_announcement as service_update
from ..src.auth.permissions import require_org_admin, require_org_member
from ..src.notification.service import notify_org_members


def _mongo_announcement_to_graphql(a: dict) -> Announcement:
    return Announcement(
        id=str(a["_id"]),
        title=a["title"],
        content=a["content"],
        organization_id=a["organization_id"],
        author_id=a["author_id"],
        is_pinned=a.get("is_pinned", False),
        created_at=a["created_at"],
        updated_at=a["updated_at"],
    )


async def resolve_announcements(
    info: strawberry.types.Info, organization_id: str
) -> List[Announcement]:
    """Resolver for listing announcements. MEMBER only."""
    user = info.context.get("user")
    await require_org_member(user, organization_id)

    announcements = await service_list(organization_id)
    return [_mongo_announcement_to_graphql(a) for a in announcements]


async def resolve_announcement(
    info: strawberry.types.Info, id: str
) -> Optional[Announcement]:
    """Resolver for getting a single announcement."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    announcement = await service_get(id)
    if not announcement:
        return None

    await require_org_member(user, announcement["organization_id"])
    return _mongo_announcement_to_graphql(announcement)


async def resolve_create_announcement(
    info: strawberry.types.Info,
    organization_id: str,
    title: str,
    content: str,
    is_pinned: bool = False,
) -> Announcement:
    """Resolver for creating an announcement. ADMIN only."""
    user = info.context.get("user")
    await require_org_admin(user, organization_id)

    author_id = user.get("id") or str(user.get("_id"))
    announcement = await service_create(
        organization_id, author_id, title, content, is_pinned
    )

    # Notify all org members about new announcement
    await notify_org_members(
        organization_id=organization_id,
        exclude_user_id=author_id,
        notification_type="NEW_ANNOUNCEMENT",
        title=f"New announcement: {title}",
        message=content[:100] + ("..." if len(content) > 100 else ""),
        reference_id=str(announcement["_id"]),
    )

    return _mongo_announcement_to_graphql(announcement)


async def resolve_update_announcement(
    info: strawberry.types.Info,
    id: str,
    title: str,
    content: str,
    is_pinned: bool = False,
) -> Announcement:
    """Resolver for updating an announcement. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    announcement = await service_get(id)
    if not announcement:
        raise Exception("Announcement not found")

    await require_org_admin(user, announcement["organization_id"])
    updated = await service_update(id, title, content, is_pinned)
    return _mongo_announcement_to_graphql(updated)


async def resolve_delete_announcement(info: strawberry.types.Info, id: str) -> bool:
    """Resolver for deleting an announcement. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    announcement = await service_get(id)
    if not announcement:
        raise Exception("Announcement not found")

    await require_org_admin(user, announcement["organization_id"])
    return await service_delete(id)
