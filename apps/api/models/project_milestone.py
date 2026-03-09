from datetime import datetime
from typing import Optional

from .base import BaseDocument


class ProjectMilestone(BaseDocument):
    proposal_id: str
    title: str
    description: str = ""
    status: str = "PENDING"  # PENDING, IN_PROGRESS, COMPLETED
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: str
