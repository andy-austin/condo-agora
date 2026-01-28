from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Annotated, List

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
    created_at: datetime
    updated_at: datetime
    residents: List[
        Annotated[
            "OrganizationMember", strawberry.lazy("apps.api.graphql_types.auth")
        ]
    ] = strawberry.field(default_factory=list)
