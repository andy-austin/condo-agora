from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Annotated, List, Optional

import strawberry

if TYPE_CHECKING:
    from .auth import OrganizationMember


@strawberry.input
class CreateHouseInput:
    organization_id: str
    name: str


@strawberry.input
class UpdateHouseInput:
    name: str


@strawberry.type
class House:
    id: str
    name: str
    organization_id: str
    voter_user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    residents: List[Annotated["OrganizationMember", strawberry.lazy(".auth")]] = (
        strawberry.field(default_factory=list)
    )
