from typing import List

import strawberry

from ..graphql_types.notification import ActivityItem, Notification
from ..resolvers.notification import (
    resolve_activity_feed,
    resolve_mark_all_notifications_read,
    resolve_mark_notification_read,
    resolve_notifications,
    resolve_unread_notification_count,
)


@strawberry.type
class NotificationQueries:
    notifications: List[Notification] = strawberry.field(resolver=resolve_notifications)
    unread_notification_count: int = strawberry.field(
        resolver=resolve_unread_notification_count
    )
    activity_feed: List[ActivityItem] = strawberry.field(resolver=resolve_activity_feed)


@strawberry.type
class NotificationMutations:
    mark_notification_read: Notification = strawberry.mutation(
        resolver=resolve_mark_notification_read
    )
    mark_all_notifications_read: int = strawberry.mutation(
        resolver=resolve_mark_all_notifications_read
    )
