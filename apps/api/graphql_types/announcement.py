from __future__ import annotations

from datetime import datetime

import strawberry


@strawberry.type
class Announcement:
    id: str
    title: str
    content: str
    organization_id: str
    author_id: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
