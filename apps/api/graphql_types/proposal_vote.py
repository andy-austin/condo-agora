from datetime import datetime

import strawberry


@strawberry.type
class ProposalVote:
    id: str
    proposal_id: str
    house_id: str
    voter_id: str
    vote: str
    created_at: datetime
    updated_at: datetime


@strawberry.type
class ProposalVoteResults:
    yes_count: int
    no_count: int
    total_houses: int
    yes_percentage: float
    threshold: int
    is_approved: bool
    vote_status: str
