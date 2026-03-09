from typing import List, Optional

import strawberry

from ..graphql_types.comment import Comment
from ..src.auth.permissions import require_org_admin, require_org_member
from ..src.comment.service import create_comment as service_create_comment
from ..src.comment.service import delete_comment as service_delete_comment
from ..src.comment.service import get_comment as service_get_comment
from ..src.comment.service import get_comments as service_get_comments
from ..src.comment.service import update_comment as service_update_comment
from ..src.notification.service import create_notification
from ..src.proposal.service import get_proposal


def _mongo_comment_to_graphql(c: dict) -> Comment:
    replies = [_mongo_comment_to_graphql(r) for r in c.get("replies", [])]
    return Comment(
        id=str(c["_id"]),
        proposal_id=c["proposal_id"],
        author_id=c["author_id"],
        content=c["content"],
        parent_id=c.get("parent_id"),
        replies=replies,
        created_at=c["created_at"],
        updated_at=c["updated_at"],
    )


async def resolve_comments(
    info: strawberry.types.Info, proposal_id: str
) -> List[Comment]:
    """Resolver for listing comments on a proposal. MEMBER only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")

    await require_org_member(user, proposal["organization_id"])

    comments = await service_get_comments(proposal_id)
    return [_mongo_comment_to_graphql(c) for c in comments]


async def resolve_create_comment(
    info: strawberry.types.Info,
    proposal_id: str,
    content: str,
    parent_id: Optional[str] = None,
) -> Comment:
    """Resolver for creating a comment. Any org member can comment."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")

    await require_org_member(user, proposal["organization_id"])

    author_id = user.get("id") or str(user.get("_id"))
    comment = await service_create_comment(proposal_id, author_id, content, parent_id)

    # Notify proposal author of new comment (if not the commenter)
    if proposal["author_id"] != author_id:
        await create_notification(
            user_id=proposal["author_id"],
            organization_id=proposal["organization_id"],
            notification_type="NEW_COMMENT",
            title="New comment on your proposal",
            message=f"Someone commented on your proposal: {proposal['title']}",
            reference_id=proposal_id,
        )

    return _mongo_comment_to_graphql(comment)


async def resolve_update_comment(
    info: strawberry.types.Info, id: str, content: str
) -> Comment:
    """Resolver for updating a comment. Author only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    comment = await service_get_comment(id)
    if not comment:
        raise Exception("Comment not found")

    user_id = user.get("id") or str(user.get("_id"))
    if comment["author_id"] != user_id:
        raise Exception("Only the author can edit this comment")

    updated = await service_update_comment(id, content)
    return _mongo_comment_to_graphql(updated)


async def resolve_delete_comment(info: strawberry.types.Info, id: str) -> bool:
    """Resolver for deleting a comment. Author or ADMIN."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    comment = await service_get_comment(id)
    if not comment:
        raise Exception("Comment not found")

    user_id = user.get("id") or str(user.get("_id"))
    is_author = comment["author_id"] == user_id

    if not is_author:
        # Check if admin by getting proposal's org
        proposal = await get_proposal(comment["proposal_id"])
        if proposal:
            await require_org_admin(user, proposal["organization_id"])
        else:
            raise Exception("Not authorized to delete this comment")

    return await service_delete_comment(id)
