from typing import Optional

from pydantic import Field

from .base import BaseDocument


class Note(BaseDocument):
    """Note document model."""

    title: str = Field(..., description="Note title")
    content: Optional[str] = Field(default=None, description="Note content")
    is_published: bool = Field(default=False, description="Whether note is published")

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["Note"]:
        """Create Note instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
