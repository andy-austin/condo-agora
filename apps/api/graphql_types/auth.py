from datetime import datetime
from enum import Enum
from typing import List, Optional

import strawberry


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


@strawberry.type
class OrganizationMember:
    id: str
    user_id: str
    organization_id: str
    role: Role
    created_at: datetime
    organization: Organization


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
    role: Role
    expires_at: datetime
    created_at: datetime
    accepted_at: Optional[datetime]
