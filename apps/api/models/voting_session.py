from datetime import datetime
from typing import List, Optional

from pydantic import Field

from .base import BaseDocument


class VotingSession(BaseDocument):
    organization_id: str
    title: str
    status: str = "DRAFT"  # DRAFT, OPEN, CLOSED
    proposal_ids: List[str] = Field(default_factory=list)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_by: str


class Vote(BaseDocument):
    voting_session_id: str
    house_id: str
    voter_id: str
    rankings: List[dict]  # [{proposal_id: str, rank: int}]
    submitted_at: datetime
