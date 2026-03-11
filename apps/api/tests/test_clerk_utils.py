from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
@patch("apps.api.src.auth.clerk_utils.CLERK_SECRET_KEY", "test_key")
async def test_create_phone_user_sends_correct_payload():
    """create_phone_user sends phone_number and metadata to Clerk API."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "id": "user_abc123",
        "phone_numbers": [{"phone_number": "+584121234567"}],
    }
    mock_response.raise_for_status = MagicMock()

    with patch("apps.api.src.auth.clerk_utils.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        from apps.api.src.auth.clerk_utils import create_phone_user

        result = await create_phone_user(
            phone="+584121234567",
            first_name="María",
            last_name="García",
            metadata={"organization_id": "org_123"},
        )

        assert result["id"] == "user_abc123"
        call_args = mock_client.post.call_args
        payload = call_args.kwargs.get("json") or call_args[1].get("json")
        assert payload["phone_number"] == ["+584121234567"]
        assert payload["unsafe_metadata"]["organization_id"] == "org_123"
        assert payload["unsafe_metadata"]["requires_profile_completion"] is True


@pytest.mark.asyncio
@patch("apps.api.src.auth.clerk_utils.CLERK_SECRET_KEY", None)
async def test_create_phone_user_skips_without_key():
    """create_phone_user returns None when CLERK_SECRET_KEY is not set."""
    from apps.api.src.auth.clerk_utils import create_phone_user

    result = await create_phone_user(phone="+584121234567")
    assert result is None
