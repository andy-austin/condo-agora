import strawberry

from ..graphql_types.analytics import CommunityAnalytics, ParticipationReport
from ..resolvers.analytics import (
    resolve_community_analytics,
    resolve_participation_report,
)


@strawberry.type
class AnalyticsQueries:
    community_analytics: CommunityAnalytics = strawberry.field(
        resolver=resolve_community_analytics
    )
    participation_report: ParticipationReport = strawberry.field(
        resolver=resolve_participation_report
    )
