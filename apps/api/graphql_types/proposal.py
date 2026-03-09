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
    created_at: datetime
    updated_at: datetime
