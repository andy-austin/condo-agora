from typing import Optional

from pydantic import Field

from .base import BaseDocument


class House(BaseDocument):
    """House document model."""

    name: str = Field(..., description="House name")
    organization_id: str = Field(..., description="Reference to organization")

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["House"]:
        """Create House instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
