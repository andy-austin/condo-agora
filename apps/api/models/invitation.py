from datetime import datetime
from typing import Optional

from pydantic import Field

from .base import BaseDocument
from .organization_member import Role


class Invitation(BaseDocument):
    """Invitation document model."""

    email: str = Field(..., description="Invitee email address")
    token: str = Field(..., description="Unique invitation token")
    organization_id: str = Field(..., description="Reference to organization")
    inviter_id: str = Field(..., description="Reference to inviting user")
    house_id: Optional[str] = Field(default=None, description="Reference to house")
    role: Role = Field(default=Role.MEMBER, description="Assigned role")
    expires_at: datetime = Field(..., description="Invitation expiration timestamp")
    accepted_at: Optional[datetime] = Field(
        default=None, description="Timestamp when invitation was accepted"
    )

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["Invitation"]:
        """Create Invitation instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
