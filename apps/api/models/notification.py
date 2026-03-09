from pydantic import Field

from .base import BaseDocument


class Notification(BaseDocument):
    """Notification document model."""

    user_id: str = Field(..., description="Recipient user ID")
    type: str = Field(..., description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    reference_id: str = Field(..., description="ID of the referenced entity")
    is_read: bool = Field(
        default=False, description="Whether user has read the notification"
    )
    organization_id: str = Field(..., description="Organization context")

    @classmethod
    def from_mongo(cls, data: dict):
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
