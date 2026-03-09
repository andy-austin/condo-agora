from __future__ import annotations

from datetime import datetime

import strawberry


@strawberry.type
class Notification:
    id: str
    user_id: str
    type: str
    title: str
    message: str
    reference_id: str
    is_read: bool
    organization_id: str
    created_at: datetime
    updated_at: datetime


@strawberry.type
class ActivityItem:
    id: str
    type: str
    title: str
    description: str
    reference_id: str
    organization_id: str
    created_at: datetime
