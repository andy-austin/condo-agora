from __future__ import annotations

from datetime import datetime
from typing import List, Optional

import strawberry


@strawberry.type
class Comment:
    id: str
    proposal_id: str
    author_id: str
    content: str
    parent_id: Optional[str]
    replies: List[Comment] = strawberry.field(default_factory=list)
    created_at: datetime
    updated_at: datetime
