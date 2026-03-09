from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from ...database import db


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_comments(proposal_id: str) -> List[dict]:
    """Get all top-level comments for a proposal, with nested replies."""
    await _ensure_connected()

    # Get all comments for proposal
    all_comments: List[dict] = []
    cursor = db.db.comments.find({"proposal_id": proposal_id}).sort("created_at", 1)
    async for comment in cursor:
        all_comments.append(comment)

    # Build threaded structure: top-level comments contain their replies
    top_level = []
    replies_map: dict = {}

    for comment in all_comments:
        comment_id = str(comment["_id"])
        comment["replies"] = []
        replies_map[comment_id] = comment

        if not comment.get("parent_id"):
            top_level.append(comment)

    for comment in all_comments:
        parent_id = comment.get("parent_id")
        if parent_id and parent_id in replies_map:
            parent = replies_map[parent_id]
            if len(parent["replies"]) < 50:  # cap replies
                parent["replies"].append(comment)

    return top_level


async def get_comment(comment_id: str) -> Optional[dict]:
    """Get a single comment by ID."""
    await _ensure_connected()
    try:
        comment = await db.db.comments.find_one({"_id": ObjectId(comment_id)})
    except Exception:
        return None
    return comment


async def create_comment(
    proposal_id: str,
    author_id: str,
    content: str,
    parent_id: Optional[str] = None,
) -> dict:
    """Create a new comment."""
    await _ensure_connected()

    now = datetime.utcnow()
    comment_data = {
        "proposal_id": proposal_id,
        "author_id": author_id,
        "content": content,
        "parent_id": parent_id,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.db.comments.insert_one(comment_data)
    comment = await db.db.comments.find_one({"_id": result.inserted_id})
    comment["replies"] = []
    return comment


async def update_comment(comment_id: str, content: str) -> Optional[dict]:
    """Update a comment's content."""
    await _ensure_connected()

    now = datetime.utcnow()
    comment = await db.db.comments.find_one_and_update(
        {"_id": ObjectId(comment_id)},
        {"$set": {"content": content, "updated_at": now}},
        return_document=True,
    )
    if comment:
        comment["replies"] = []
    return comment


async def delete_comment(comment_id: str) -> bool:
    """Delete a comment and its replies."""
    await _ensure_connected()
    try:
        # Delete the comment
        result = await db.db.comments.delete_one({"_id": ObjectId(comment_id)})
        # Also delete any replies to this comment
        await db.db.comments.delete_many({"parent_id": comment_id})
        return result.deleted_count > 0
    except Exception:
        return False


async def get_comment_count(proposal_id: str) -> int:
    """Get total comment count for a proposal."""
    await _ensure_connected()
    return await db.db.comments.count_documents({"proposal_id": proposal_id})
