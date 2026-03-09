from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from ...database import db

ALLOWED_TYPES = {"QUOTE", "DESIGN", "WARRANTY", "RECEIPT", "OTHER"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_documents(proposal_id: str, doc_type: Optional[str] = None) -> List[dict]:
    """Get documents for a proposal, optionally filtered by type."""
    await _ensure_connected()
    query: dict = {"proposal_id": proposal_id}
    if doc_type:
        query["type"] = doc_type

    docs = []
    cursor = db.db.documents.find(query).sort("created_at", -1)
    async for doc in cursor:
        docs.append(doc)
    return docs


async def get_document(document_id: str) -> Optional[dict]:
    """Get a single document by ID."""
    await _ensure_connected()
    try:
        return await db.db.documents.find_one({"_id": ObjectId(document_id)})
    except Exception:
        return None


async def attach_document(
    proposal_id: str,
    doc_type: str,
    file_url: str,
    file_name: str,
    file_size: int,
    mime_type: str,
    uploaded_by: str,
) -> dict:
    """Attach a document to a proposal."""
    await _ensure_connected()

    if doc_type not in ALLOWED_TYPES:
        raise Exception(f"Invalid document type. Allowed: {ALLOWED_TYPES}")
    if file_size > MAX_FILE_SIZE:
        raise Exception("File size exceeds 10MB limit")

    now = datetime.utcnow()
    data = {
        "proposal_id": proposal_id,
        "type": doc_type,
        "file_url": file_url,
        "file_name": file_name,
        "file_size": file_size,
        "mime_type": mime_type,
        "uploaded_by": uploaded_by,
        "selected": False,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.db.documents.insert_one(data)
    return await db.db.documents.find_one({"_id": result.inserted_id})


async def delete_document(document_id: str) -> bool:
    """Delete a document."""
    await _ensure_connected()
    try:
        result = await db.db.documents.delete_one({"_id": ObjectId(document_id)})
        return result.deleted_count > 0
    except Exception:
        return False


async def mark_quote_selected(document_id: str, proposal_id: str) -> dict:
    """Mark a quote as selected (admin only). Deselects others for same proposal."""
    await _ensure_connected()

    now = datetime.utcnow()
    # Deselect all other quotes for this proposal
    await db.db.documents.update_many(
        {"proposal_id": proposal_id, "type": "QUOTE"},
        {"$set": {"selected": False, "updated_at": now}},
    )
    # Select this one
    updated = await db.db.documents.find_one_and_update(
        {"_id": ObjectId(document_id)},
        {"$set": {"selected": True, "updated_at": now}},
        return_document=True,
    )
    if not updated:
        raise Exception("Document not found")
    return updated
