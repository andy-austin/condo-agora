from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import Field

from .base import BaseDocument


class ProposalStatus(str, Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    VOTING = "VOTING"
    APPROVED = "APPROVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class ProposalCategory(str, Enum):
    SECURITY = "SECURITY"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    COMMON_AREAS = "COMMON_AREAS"
    MAINTENANCE = "MAINTENANCE"
    FINANCIAL = "FINANCIAL"
    OTHER = "OTHER"


class Proposal(BaseDocument):
    """Proposal document model."""

    title: str = Field(..., description="Proposal title")
    description: str = Field(..., description="Proposal description")
    category: str = Field(..., description="Proposal category")
    status: str = Field(default=ProposalStatus.DRAFT, description="Proposal status")
    author_id: str = Field(..., description="ID of user who created the proposal")
    organization_id: str = Field(..., description="Reference to organization")
    responsible_house_id: Optional[str] = Field(
        default=None, description="Optional responsible house"
    )
    rejection_reason: Optional[str] = Field(
        default=None, description="Reason for rejection"
    )
    vote_status: Optional[str] = Field(
        default=None, description="Yes/No vote status: ACTIVE or CLOSED"
    )
    vote_threshold: Optional[int] = Field(
        default=None, description="Approval threshold percentage"
    )
    vote_started_at: Optional[datetime] = Field(
        default=None, description="When the vote was started"
    )
    vote_ended_at: Optional[datetime] = Field(
        default=None, description="When the vote was closed"
    )
    vote_started_by: Optional[str] = Field(
        default=None, description="User ID who started the vote"
    )

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["Proposal"]:
        """Create Proposal instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
