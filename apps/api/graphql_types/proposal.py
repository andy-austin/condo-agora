from __future__ import annotations

from datetime import datetime
from typing import Optional

import strawberry


@strawberry.type
class Proposal:
    id: str
    title: str
    description: str
    category: str
    status: str
    author_id: str
    organization_id: str
    responsible_house_id: Optional[str]
    rejection_reason: Optional[str]
    vote_status: Optional[str]
    vote_threshold: Optional[int]
    vote_started_at: Optional[datetime]
    vote_ended_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
