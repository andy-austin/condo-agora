from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Annotated, List, Optional

import strawberry

if TYPE_CHECKING:
    from .house import House


@strawberry.enum
class Role(Enum):
    ADMIN = "ADMIN"
    RESIDENT = "RESIDENT"
    MEMBER = "MEMBER"


@strawberry.type
class Organization:
    id: str
    name: str
    slug: str
    created_at: datetime
    updated_at: datetime
    houses: List[
        Annotated["House", strawberry.lazy("apps.api.graphql_types.house")]
    ] = strawberry.field(default_factory=list)
    houses_count: int = 0


@strawberry.type
class OrganizationMember:
    id: str
    user_id: str
    organization_id: str
    house_id: Optional[str] = None
    role: Role
    created_at: datetime
    organization: Organization
    house: Optional[
        Annotated["House", strawberry.lazy("apps.api.graphql_types.house")]
    ] = None


@strawberry.type
class User:
    id: str
    clerk_id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    memberships: List[OrganizationMember]


@strawberry.type
class Invitation:
    id: str
    email: str
    token: str
    organization_id: str
    inviter_id: str
    house_id: Optional[str] = None
    role: Role
    expires_at: datetime
    created_at: datetime
    accepted_at: Optional[datetime]
    house: Optional[
        Annotated["House", strawberry.lazy("apps.api.graphql_types.house")]
    ] = None
