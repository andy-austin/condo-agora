from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

from apps.api.src.auth.webhooks import handle_user_created, handle_user_updated


@pytest.mark.asyncio
async def test_handle_user_created_syncs_to_db():
    data = {
        "id": "user_123",
        "email_addresses": [{"id": "email_1", "email_address": "test@example.com"}],
        "primary_email_address_id": "email_1",
        "first_name": "Test",
        "last_name": "User",
        "image_url": "https://example.com/avatar.jpg",
    }

    user_id = ObjectId()
    mock_user_doc = {
        "_id": user_id,
        "clerk_id": "user_123",
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "avatar_url": "https://example.com/avatar.jpg",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    with patch("apps.api.src.auth.webhooks.db") as mock_db:
        # Setup mock database
        mock_db.is_connected.return_value = True
        mock_db.db = MagicMock()

        # Mock users collection
        mock_db.db.users = MagicMock()
        mock_db.db.users.find_one = AsyncMock(side_effect=[None, mock_user_doc])
        mock_db.db.users.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=user_id)
        )

        # Mock invitations collection (empty cursor)

        async def empty_iter():
            return
            yield  # Make it a generator

        mock_cursor = MagicMock()
        mock_cursor.__aiter__ = lambda self: empty_iter()
        mock_db.db.invitations = MagicMock()
        mock_db.db.invitations.find = MagicMock(return_value=mock_cursor)

        await handle_user_created(data)

        mock_db.db.users.insert_one.assert_called_once()
        call_args = mock_db.db.users.insert_one.call_args[0][0]
        assert call_args["clerk_id"] == "user_123"
        assert call_args["email"] == "test@example.com"
        assert call_args["first_name"] == "Test"


@pytest.mark.asyncio
async def test_handle_user_updated_syncs_to_db():
    data = {
        "id": "user_123",
        "email_addresses": [{"id": "email_1", "email_address": "updated@example.com"}],
        "primary_email_address_id": "email_1",
        "first_name": "Updated",
        "last_name": "User",
        "image_url": "https://example.com/new-avatar.jpg",
    }

    with patch("apps.api.src.auth.webhooks.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db = MagicMock()
        mock_db.db.users = MagicMock()
        mock_db.db.users.update_one = AsyncMock()

        await handle_user_updated(data)

        mock_db.db.users.update_one.assert_called_once()
        call_args = mock_db.db.users.update_one.call_args
        assert call_args[0][0] == {"clerk_id": "user_123"}
        assert call_args[0][1]["$set"]["email"] == "updated@example.com"
        assert call_args[0][1]["$set"]["first_name"] == "Updated"
