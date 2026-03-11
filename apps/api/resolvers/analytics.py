import strawberry

from ..graphql_types.analytics import (
    CategoryStat,
    CommunityAnalytics,
    MonthlyProposalStat,
    ParticipationReport,
    TopContributor,
)
from ..src.analytics.service import get_community_analytics as service_analytics
from ..src.analytics.service import get_participation_report as service_participation
from ..src.auth.permissions import require_org_admin, require_org_member


def _analytics_to_graphql(a: dict) -> CommunityAnalytics:
    return CommunityAnalytics(
        organization_id=a["organization_id"],
        total_proposals=a["total_proposals"],
        approved_proposals=a["approved_proposals"],
        active_projects=a["active_projects"],
        completed_projects=a["completed_projects"],
        rejected_proposals=a["rejected_proposals"],
        approval_rate=a["approval_rate"],
        last_session_participation_rate=a["last_session_participation_rate"],
        category_breakdown=[
            CategoryStat(category=c["category"], count=c["count"])
            for c in a["category_breakdown"]
        ],
        monthly_trends=[
            MonthlyProposalStat(month=m["month"], count=m["count"])
            for m in a["monthly_trends"]
        ],
        top_contributors=[
            TopContributor(
                user_id=t["user_id"],
                proposals_count=t["proposals_count"],
                comments_count=t["comments_count"],
                total_score=t["total_score"],
            )
            for t in a["top_contributors"]
        ],
    )


async def resolve_community_analytics(
    info: strawberry.types.Info,
    organization_id: str,
) -> CommunityAnalytics:
    """Get community analytics. MEMBER only."""
    user = info.context.get("user")
    await require_org_member(user, organization_id)

    analytics = await service_analytics(organization_id)
    return _analytics_to_graphql(analytics)


async def resolve_participation_report(
    info: strawberry.types.Info,
    session_id: str,
) -> ParticipationReport:
    """Get participation report for a voting session. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    # Check admin access before fetching report
    from ..src.voting.service import get_voting_session

    session = await get_voting_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    await require_org_admin(user, session["organization_id"])

    report = await service_participation(session_id)

    return ParticipationReport(
        session_id=report["session_id"],
        session_title=report["session_title"],
        total_houses=report["total_houses"],
        votes_cast=report["votes_cast"],
        participation_rate=report["participation_rate"],
        voted_house_ids=report["voted_house_ids"],
        non_voted_house_ids=report["non_voted_house_ids"],
    )
