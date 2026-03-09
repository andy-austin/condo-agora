from typing import List, Optional

from pydantic import Field

from .base import BaseDocument


class Comment(BaseDocument):
    """Comment document model."""

    proposal_id: str = Field(..., description="Reference to proposal")
    author_id: str = Field(..., description="ID of user who created the comment")
    content: str = Field(..., description="Comment content")
    parent_id: Optional[str] = Field(
        default=None, description="Parent comment ID for threading"
    )
    replies: List[dict] = Field(default_factory=list, description="Nested replies")

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["Comment"]:
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
