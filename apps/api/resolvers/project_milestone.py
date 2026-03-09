from typing import List, Optional

import strawberry

from ..graphql_types.project_milestone import ProjectMilestone
from ..src.auth.permissions import require_org_admin, require_org_member
from ..src.project_milestone.service import create_milestone as service_create
from ..src.project_milestone.service import delete_milestone as service_delete
from ..src.project_milestone.service import get_milestone as service_get
from ..src.project_milestone.service import get_milestones as service_list
from ..src.project_milestone.service import (
    update_milestone_status as service_update_status,
)


def _milestone_to_graphql(m: dict) -> ProjectMilestone:
    return ProjectMilestone(
        id=str(m["_id"]),
        proposal_id=m["proposal_id"],
        title=m["title"],
        description=m.get("description", ""),
        status=m["status"],
        due_date=m.get("due_date"),
        completed_at=m.get("completed_at"),
        created_by=m["created_by"],
        created_at=m["created_at"],
        updated_at=m["updated_at"],
    )


async def resolve_project_milestones(
    info: strawberry.types.Info,
    proposal_id: str,
) -> List[ProjectMilestone]:
    """List milestones for a proposal. MEMBER only."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")
    await require_org_member(user, proposal["organization_id"])

    milestones = await service_list(proposal_id)
    return [_milestone_to_graphql(m) for m in milestones]


async def resolve_create_project_milestone(
    info: strawberry.types.Info,
    proposal_id: str,
    title: str,
    description: str = "",
    due_date: Optional[str] = None,
) -> ProjectMilestone:
    """Create a project milestone. ADMIN or responsible house."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")
    await require_org_admin(user, proposal["organization_id"])

    created_by = user.get("id") or str(user.get("_id"))

    from datetime import datetime

    dd = datetime.fromisoformat(due_date) if due_date else None
    milestone = await service_create(proposal_id, title, description, created_by, dd)
    return _milestone_to_graphql(milestone)


async def resolve_update_milestone_status(
    info: strawberry.types.Info,
    id: str,
    status: str,
) -> ProjectMilestone:
    """Update milestone status. ADMIN only."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    milestone = await service_get(id)
    if not milestone:
        raise Exception("Milestone not found")

    proposal = await get_proposal(milestone["proposal_id"])
    if not proposal:
        raise Exception("Proposal not found")
    await require_org_admin(user, proposal["organization_id"])

    updated = await service_update_status(id, status)
    return _milestone_to_graphql(updated)


async def resolve_delete_project_milestone(
    info: strawberry.types.Info,
    id: str,
) -> bool:
    """Delete a milestone. ADMIN only."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    milestone = await service_get(id)
    if not milestone:
        raise Exception("Milestone not found")

    proposal = await get_proposal(milestone["proposal_id"])
    if not proposal:
        raise Exception("Proposal not found")
    await require_org_admin(user, proposal["organization_id"])

    return await service_delete(id)
