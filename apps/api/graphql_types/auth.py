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
    houses: List[Annotated["House", strawberry.lazy(".house")]] = strawberry.field(
        default_factory=list
    )
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
    house: Optional[Annotated["House", strawberry.lazy(".house")]] = None


@strawberry.type
class User:
    id: str
    nextauth_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    auth_provider: str = "phone"
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    memberships: List[OrganizationMember]


@strawberry.type
class MemberWithUser:
    """Organization member with their user profile details."""

    id: str
    user_id: str
    organization_id: str
    house_id: Optional[str] = None
    role: Role
    created_at: datetime
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    house_name: Optional[str] = None


@strawberry.input
class CompleteProfileInput:
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


@strawberry.enum
class InvitationMethod(Enum):
    EMAIL = "EMAIL"
    LINK = "LINK"


@strawberry.type
class Invitation:
    id: str
    email: str
    organization_id: str
    inviter_id: str
    house_id: Optional[str] = None
    role: Role
    method: InvitationMethod = InvitationMethod.EMAIL
    expires_at: datetime
    created_at: datetime
    accepted_at: Optional[datetime] = None
    house: Optional[Annotated["House", strawberry.lazy(".house")]] = None
