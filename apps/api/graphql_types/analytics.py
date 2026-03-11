from typing import List, Optional

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
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    proposals_count: int = 0
    comments_count: int = 0
    total_score: int = 0


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
