from typing import List

import strawberry


@strawberry.type
class CategoryStat:
    category: str
    count: int


@strawberry.type
class MonthlyProposalStat:
    month: str  # "YYYY-MM"
    count: int


@strawberry.type
class TopContributor:
    user_id: str
    proposals_count: int
    comments_count: int
    total_score: int


@strawberry.type
class CommunityAnalytics:
    organization_id: str
    total_proposals: int
    approved_proposals: int
    active_projects: int
    completed_projects: int
    rejected_proposals: int
    approval_rate: float
    last_session_participation_rate: float
    category_breakdown: List[CategoryStat]
    monthly_trends: List[MonthlyProposalStat]
    top_contributors: List[TopContributor]


@strawberry.type
class ParticipationReport:
    session_id: str
    session_title: str
    total_houses: int
    votes_cast: int
    participation_rate: float
    voted_house_ids: List[str]
    non_voted_house_ids: List[str]
