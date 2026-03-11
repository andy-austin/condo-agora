from typing import Optional

from pydantic import Field

from .base import BaseDocument


class User(BaseDocument):
    """User document model."""

    nextauth_id: str = Field(..., description="NextAuth authentication ID")
    email: str = Field(..., description="User email address")
    phone: Optional[str] = Field(default=None, description="User phone number")
    auth_provider: str = Field(default="phone", description="Authentication provider")
    first_name: Optional[str] = Field(default=None, description="User first name")
    last_name: Optional[str] = Field(default=None, description="User last name")
    avatar_url: Optional[str] = Field(default=None, description="User avatar URL")

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["User"]:
        """Create User instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
