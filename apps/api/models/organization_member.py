from enum import Enum
from typing import Optional

from pydantic import Field

from .base import BaseDocument


class Role(str, Enum):
    """Organization member role."""

    ADMIN = "ADMIN"
    RESIDENT = "RESIDENT"
    MEMBER = "MEMBER"


class OrganizationMember(BaseDocument):
    """Organization member document model."""

    user_id: str = Field(..., description="Reference to user")
    organization_id: str = Field(..., description="Reference to organization")
    house_id: Optional[str] = Field(default=None, description="Reference to house")
    role: Role = Field(default=Role.MEMBER, description="Member role")

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["OrganizationMember"]:
        """Create OrganizationMember instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
