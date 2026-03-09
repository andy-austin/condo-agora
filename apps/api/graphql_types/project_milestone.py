from datetime import datetime
from typing import Optional

import strawberry


@strawberry.type
class ProjectMilestone:
    id: str
    proposal_id: str
    title: str
    description: str
    status: str
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    created_by: str
    created_at: datetime
    updated_at: datetime
