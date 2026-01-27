from unittest.mock import AsyncMock, MagicMock, patch

import pytest

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

    mock_user = MagicMock()
    mock_user.id = "db_user_id"

    with patch("apps.api.src.auth.webhooks.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.user.upsert = AsyncMock(return_value=mock_user)
        mock_db.invitation.find_many = AsyncMock(return_value=[])

        await handle_user_created(data)

        mock_db.user.upsert.assert_called_once()
        _, kwargs = mock_db.user.upsert.call_args
        assert kwargs["where"] == {"clerkId": "user_123"}
        assert kwargs["data"]["create"]["email"] == "test@example.com"
        assert kwargs["data"]["create"]["firstName"] == "Test"
        mock_db.invitation.find_many.assert_called_once()


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
        mock_db.user.update = AsyncMock()

        await handle_user_updated(data)

        mock_db.user.update.assert_called_once()
        _, kwargs = mock_db.user.update.call_args
        assert kwargs["where"] == {"clerkId": "user_123"}
        assert kwargs["data"]["email"] == "updated@example.com"
        assert kwargs["data"]["firstName"] == "Updated"
