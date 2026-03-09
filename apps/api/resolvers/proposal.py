from typing import List, Optional

import strawberry

from ..graphql_types.proposal import Proposal
from ..src.auth.permissions import require_org_admin, require_org_member
from ..src.proposal.service import assign_responsible_house as service_assign_house
from ..src.proposal.service import create_proposal as service_create_proposal
from ..src.proposal.service import delete_proposal as service_delete_proposal
from ..src.proposal.service import get_proposal as service_get_proposal
from ..src.proposal.service import get_proposals as service_get_proposals
from ..src.proposal.service import update_proposal as service_update_proposal
from ..src.proposal.service import (
    update_proposal_status as service_update_proposal_status,
)


def _mongo_proposal_to_graphql(p: dict) -> Proposal:
    """Convert a MongoDB Proposal document to GraphQL type."""
    return Proposal(
        id=str(p["_id"]),
        title=p["title"],
        description=p["description"],
        category=p["category"],
        status=p["status"],
        author_id=p["author_id"],
        organization_id=p["organization_id"],
        responsible_house_id=p.get("responsible_house_id"),
        rejection_reason=p.get("rejection_reason"),
        created_at=p["created_at"],
        updated_at=p["updated_at"],
    )


async def resolve_proposals(
    info: strawberry.types.Info,
    organization_id: str,
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> List[Proposal]:
    """Resolver for listing proposals in an organization. MEMBER only."""
    user = info.context.get("user")
    await require_org_member(user, organization_id)

    proposals = await service_get_proposals(organization_id, status, category)
    return [_mongo_proposal_to_graphql(p) for p in proposals]


async def resolve_proposal(
    info: strawberry.types.Info, id: str
) -> Optional[Proposal]:
    """Resolver for getting a single proposal by ID."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(id)
    if not proposal:
        return None

    await require_org_member(user, proposal["organization_id"])
    return _mongo_proposal_to_graphql(proposal)


async def resolve_create_proposal(
    info: strawberry.types.Info,
    organization_id: str,
    title: str,
    description: str,
    category: str,
    status: Optional[str] = "DRAFT",
) -> Proposal:
    """Resolver for creating a proposal. Any org member can create."""
    user = info.context.get("user")
    await require_org_member(user, organization_id)

    author_id = user.get("id") or str(user.get("_id"))
    proposal = await service_create_proposal(
        organization_id, title, description, category, author_id, status or "DRAFT"
    )
    return _mongo_proposal_to_graphql(proposal)


async def resolve_update_proposal(
    info: strawberry.types.Info,
    id: str,
    title: str,
    description: str,
    category: str,
) -> Proposal:
    """Resolver for updating a proposal. Author only, while DRAFT."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(id)
    if not proposal:
        raise Exception("Proposal not found")

    user_id = user.get("id") or str(user.get("_id"))
    if proposal["author_id"] != user_id:
        # Admins can also update
        await require_org_admin(user, proposal["organization_id"])

    if proposal["status"] != "DRAFT":
        raise Exception("Only proposals in DRAFT status can be edited")

    updated = await service_update_proposal(id, title, description, category)
    return _mongo_proposal_to_graphql(updated)


async def resolve_update_proposal_status(
    info: strawberry.types.Info,
    id: str,
    status: str,
    rejection_reason: Optional[str] = None,
    responsible_house_id: Optional[str] = None,
) -> Proposal:
    """Resolver for updating proposal status. ADMIN or author (DRAFT→OPEN only)."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(id)
    if not proposal:
        raise Exception("Proposal not found")

    user_id = user.get("id") or str(user.get("_id"))
    is_author = proposal["author_id"] == user_id

    # Authors can only move DRAFT → OPEN
    if is_author and proposal["status"] == "DRAFT" and status == "OPEN":
        pass  # allowed
    else:
        await require_org_admin(user, proposal["organization_id"])

    updated = await service_update_proposal_status(
        id, status, rejection_reason, responsible_house_id
    )
    return _mongo_proposal_to_graphql(updated)


async def resolve_assign_responsible_house(
    info: strawberry.types.Info,
    proposal_id: str,
    house_id: str,
) -> Proposal:
    """Resolver for assigning a responsible house. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")

    await require_org_admin(user, proposal["organization_id"])

    updated = await service_assign_house(proposal_id, house_id)
    return _mongo_proposal_to_graphql(updated)


async def resolve_delete_proposal(
    info: strawberry.types.Info, id: str
) -> bool:
    """Resolver for deleting a proposal. ADMIN or author (DRAFT only)."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(id)
    if not proposal:
        raise Exception("Proposal not found")

    user_id = user.get("id") or str(user.get("_id"))
    is_author = proposal["author_id"] == user_id

    if not is_author:
        await require_org_admin(user, proposal["organization_id"])
    elif proposal["status"] != "DRAFT":
        raise Exception("Authors can only delete proposals in DRAFT status")

    return await service_delete_proposal(id)
