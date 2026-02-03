from typing import Optional

from pydantic import Field

from .base import BaseDocument


class Organization(BaseDocument):
    """Organization document model."""

    name: str = Field(..., description="Organization name")
    slug: str = Field(..., description="Organization URL slug (unique)")

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["Organization"]:
        """Create Organization instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
