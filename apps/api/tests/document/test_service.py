from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.src.document.service import (
    attach_document,
    delete_document,
    get_document,
    get_documents,
    mark_quote_selected,
)

from ..conftest import (
    create_async_cursor_mock,
    mock_documents_collection,
)


def _make_doc(
    id=None,
    proposal_id="prop-1",
    doc_type="QUOTE",
    file_url="https://example.com/file.pdf",
    file_name="quote.pdf",
    file_size=1024,
    mime_type="application/pdf",
    uploaded_by="user-1",
    selected=False,
):
    return {
        "_id": id or ObjectId(),
        "proposal_id": proposal_id,
        "type": doc_type,
        "file_url": file_url,
        "file_name": file_name,
        "file_size": file_size,
        "mime_type": mime_type,
        "uploaded_by": uploaded_by,
        "selected": selected,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


class TestGetDocuments:
    @pytest.mark.asyncio
    async def test_returns_empty_list(self):
        cursor_mock = create_async_cursor_mock([])
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock([]))
        mock_documents_collection.find.return_value = cursor_mock

        result = await get_documents("prop-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_documents_for_proposal(self):
        docs = [_make_doc(), _make_doc(doc_type="DESIGN")]
        cursor_mock = create_async_cursor_mock(docs)
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock(docs))
        mock_documents_collection.find.return_value = cursor_mock

        result = await get_documents("prop-1")
        assert len(result) == 2


class TestGetDocument:
    @pytest.mark.asyncio
    async def test_returns_none_for_invalid_id(self):
        result = await get_document("not-valid")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_document_by_id(self):
        doc_id = ObjectId()
        doc = _make_doc(id=doc_id)
        mock_documents_collection.find_one.return_value = doc

        result = await get_document(str(doc_id))
        assert result["file_name"] == "quote.pdf"


class TestAttachDocument:
    @pytest.mark.asyncio
    async def test_attaches_document(self):
        doc_id = ObjectId()
        doc = _make_doc(id=doc_id)
        mock_documents_collection.insert_one.return_value = MagicMock(
            inserted_id=doc_id
        )
        mock_documents_collection.find_one.return_value = doc

        result = await attach_document(
            "prop-1",
            "QUOTE",
            "https://example.com/q.pdf",
            "q.pdf",
            2048,
            "application/pdf",
            "user-1",
        )
        assert result["type"] == "QUOTE"

    @pytest.mark.asyncio
    async def test_raises_on_invalid_type(self):
        with pytest.raises(Exception, match="Invalid document type"):
            await attach_document(
                "prop-1",
                "INVALID",
                "https://example.com/f.pdf",
                "f.pdf",
                1024,
                "application/pdf",
                "user-1",
            )

    @pytest.mark.asyncio
    async def test_raises_on_file_too_large(self):
        with pytest.raises(Exception, match="10MB"):
            await attach_document(
                "prop-1",
                "QUOTE",
                "https://example.com/big.pdf",
                "big.pdf",
                11 * 1024 * 1024,
                "application/pdf",
                "user-1",
            )


class TestDeleteDocument:
    @pytest.mark.asyncio
    async def test_deletes_document(self):
        mock_documents_collection.delete_one.return_value = MagicMock(deleted_count=1)
        result = await delete_document("507f1f77bcf86cd799439011")
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_for_invalid_id(self):
        result = await delete_document("not-valid")
        assert result is False


class TestMarkQuoteSelected:
    @pytest.mark.asyncio
    async def test_marks_quote_selected(self):
        doc_id = ObjectId()
        selected_doc = _make_doc(id=doc_id, selected=True)
        mock_documents_collection.update_many.return_value = MagicMock(modified_count=1)
        mock_documents_collection.find_one_and_update.return_value = selected_doc

        result = await mark_quote_selected(str(doc_id), "prop-1")
        assert result["selected"] is True

    @pytest.mark.asyncio
    async def test_raises_when_not_found(self):
        mock_documents_collection.update_many.return_value = MagicMock(modified_count=0)
        mock_documents_collection.find_one_and_update.return_value = None

        with pytest.raises(Exception, match="not found"):
            await mark_quote_selected("507f1f77bcf86cd799439011", "prop-1")
