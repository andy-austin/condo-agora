from typing import List

import strawberry

from ..graphql_types.notification import ActivityItem, Notification
from ..src.auth.permissions import require_org_member
from ..src.notification.service import (
    get_activity_feed,
)
from ..src.notification.service import get_notifications as service_get_notifications
from ..src.notification.service import get_unread_count as service_get_unread_count
from ..src.notification.service import mark_all_read as service_mark_all_read
from ..src.notification.service import (
    mark_notification_read as service_mark_notification_read,
)


def _mongo_notification_to_graphql(n: dict) -> Notification:
    return Notification(
        id=str(n["_id"]),
        user_id=n["user_id"],
        type=n["type"],
        title=n["title"],
        message=n["message"],
        reference_id=n["reference_id"],
        is_read=n.get("is_read", False),
        organization_id=n.get("organization_id", ""),
        created_at=n["created_at"],
        updated_at=n["updated_at"],
    )


def _activity_to_graphql(item: dict) -> ActivityItem:
    return ActivityItem(
        id=str(item["_id"]),
        type=item["type"],
        title=item["title"],
        description=item["description"],
        reference_id=item["reference_id"],
        organization_id=item["organization_id"],
        created_at=item["created_at"],
    )


async def resolve_notifications(
    info: strawberry.types.Info, limit: int = 50
) -> List[Notification]:
    """Resolver for listing notifications for current user."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    user_id = user.get("id") or str(user.get("_id"))
    notifications = await service_get_notifications(user_id, limit)
    return [_mongo_notification_to_graphql(n) for n in notifications]


async def resolve_unread_notification_count(info: strawberry.types.Info) -> int:
    """Resolver for unread notification count."""
    user = info.context.get("user")
    if not user:
        return 0

    user_id = user.get("id") or str(user.get("_id"))
    return await service_get_unread_count(user_id)


async def resolve_mark_notification_read(
    info: strawberry.types.Info, id: str
) -> Notification:
    """Resolver for marking a notification as read."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    notification = await service_mark_notification_read(id)
    if not notification:
        raise Exception("Notification not found")
    return _mongo_notification_to_graphql(notification)


async def resolve_mark_all_notifications_read(info: strawberry.types.Info) -> int:
    """Resolver for marking all notifications as read. Returns count."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    user_id = user.get("id") or str(user.get("_id"))
    return await service_mark_all_read(user_id)


async def resolve_activity_feed(
    info: strawberry.types.Info,
    organization_id: str,
    limit: int = 20,
) -> List[ActivityItem]:
    """Resolver for activity feed. MEMBER only."""
    user = info.context.get("user")
    await require_org_member(user, organization_id)

    items = await get_activity_feed(organization_id, limit)
    return [_activity_to_graphql(item) for item in items]
