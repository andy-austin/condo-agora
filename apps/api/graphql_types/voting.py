from datetime import datetime
from typing import List, Optional

import strawberry


@strawberry.type
class RankingEntry:
    proposal_id: str
    rank: int


@strawberry.type
class Vote:
    id: str
    voting_session_id: str
    house_id: str
    voter_id: str
    rankings: List[RankingEntry]
    submitted_at: datetime
    created_at: datetime
    updated_at: datetime


@strawberry.type
class VotingSession:
    id: str
    organization_id: str
    title: str
    status: str
    proposal_ids: List[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_by: str
    created_at: datetime
    updated_at: datetime


@strawberry.type
class ProposalScore:
    proposal_id: str
    title: str
    score: int
    votes_count: int
    rank: int
    approval_percentage: float
    is_approved: bool


@strawberry.type
class VotingResults:
    session_id: str
    session_title: str
    status: str
    total_houses: int
    votes_cast: int
    participation_rate: float
    proposal_scores: List[ProposalScore]


@strawberry.input
class RankingInput:
    proposal_id: str
    rank: int
