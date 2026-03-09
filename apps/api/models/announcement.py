from pydantic import Field

from .base import BaseDocument


class Announcement(BaseDocument):
    """Announcement document model."""

    title: str = Field(..., description="Announcement title")
    content: str = Field(..., description="Announcement content")
    organization_id: str = Field(..., description="Reference to organization")
    author_id: str = Field(..., description="ID of admin who created announcement")
    is_pinned: bool = Field(default=False, description="Whether announcement is pinned")

    @classmethod
    def from_mongo(cls, data: dict):
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
