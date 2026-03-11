from typing import Optional

from pydantic import Field

from .base import BaseDocument


class User(BaseDocument):
    """User document model."""

    clerk_id: str = Field(..., description="Clerk authentication ID")
    email: Optional[str] = Field(default=None, description="User email address")
    phone_number: Optional[str] = Field(
        default=None, description="User phone number in E.164 format"
    )
    first_name: Optional[str] = Field(default=None, description="User first name")
    last_name: Optional[str] = Field(default=None, description="User last name")
    avatar_url: Optional[str] = Field(default=None, description="User avatar URL")
    requires_profile_completion: bool = Field(
        default=False,
        description="Whether user needs to complete their profile on next login",
    )

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["User"]:
        """Create User instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
