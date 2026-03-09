from typing import List, Optional

import strawberry

from ..graphql_types.document import Document
from ..src.auth.permissions import require_org_admin, require_org_member
from ..src.document.service import attach_document as service_attach
from ..src.document.service import delete_document as service_delete
from ..src.document.service import get_document as service_get
from ..src.document.service import get_documents as service_list
from ..src.document.service import mark_quote_selected as service_select


def _doc_to_graphql(d: dict) -> Document:
    return Document(
        id=str(d["_id"]),
        proposal_id=d["proposal_id"],
        type=d["type"],
        file_url=d["file_url"],
        file_name=d["file_name"],
        file_size=d["file_size"],
        mime_type=d["mime_type"],
        uploaded_by=d["uploaded_by"],
        selected=d.get("selected", False),
        created_at=d["created_at"],
        updated_at=d["updated_at"],
    )


async def resolve_documents(
    info: strawberry.types.Info,
    proposal_id: str,
    type: Optional[str] = None,
) -> List[Document]:
    """List documents for a proposal. MEMBER only."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")
    await require_org_member(user, proposal["organization_id"])

    docs = await service_list(proposal_id, type)
    return [_doc_to_graphql(d) for d in docs]


async def resolve_attach_document(
    info: strawberry.types.Info,
    proposal_id: str,
    type: str,
    file_url: str,
    file_name: str,
    file_size: int,
    mime_type: str,
) -> Document:
    """Attach a document to a proposal. Any MEMBER can upload."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")
    await require_org_member(user, proposal["organization_id"])

    uploaded_by = user.get("id") or str(user.get("_id"))
    doc = await service_attach(
        proposal_id, type, file_url, file_name, file_size, mime_type, uploaded_by
    )
    return _doc_to_graphql(doc)


async def resolve_delete_document(
    info: strawberry.types.Info,
    id: str,
) -> bool:
    """Delete a document. Uploader or admin only."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    doc = await service_get(id)
    if not doc:
        raise Exception("Document not found")

    proposal = await get_proposal(doc["proposal_id"])
    if not proposal:
        raise Exception("Proposal not found")

    user_id = user.get("id") or str(user.get("_id"))

    # Check if user is uploader or admin
    from ..src.auth.permissions import get_user_role_in_org

    role = await get_user_role_in_org(user_id, proposal["organization_id"])
    if role != "ADMIN" and doc["uploaded_by"] != user_id:
        raise Exception("Permission denied")

    return await service_delete(id)


async def resolve_mark_quote_selected(
    info: strawberry.types.Info,
    id: str,
) -> Document:
    """Mark a quote as selected. ADMIN only."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    doc = await service_get(id)
    if not doc:
        raise Exception("Document not found")

    proposal = await get_proposal(doc["proposal_id"])
    if not proposal:
        raise Exception("Proposal not found")

    await require_org_admin(user, proposal["organization_id"])
    updated = await service_select(id, doc["proposal_id"])
    return _doc_to_graphql(updated)
