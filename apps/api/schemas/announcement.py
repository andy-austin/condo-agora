from typing import List, Optional

import strawberry

from ..graphql_types.announcement import Announcement
from ..resolvers.announcement import (
    resolve_announcement,
    resolve_announcements,
    resolve_create_announcement,
    resolve_delete_announcement,
    resolve_update_announcement,
)


@strawberry.type
class AnnouncementQueries:
    announcements: List[Announcement] = strawberry.field(resolver=resolve_announcements)
    announcement: Optional[Announcement] = strawberry.field(
        resolver=resolve_announcement
    )


@strawberry.type
class AnnouncementMutations:
    create_announcement: Announcement = strawberry.mutation(
        resolver=resolve_create_announcement
    )
    update_announcement: Announcement = strawberry.mutation(
        resolver=resolve_update_announcement
    )
    delete_announcement: bool = strawberry.mutation(
        resolver=resolve_delete_announcement
    )
