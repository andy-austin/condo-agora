import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from apps.api.src.auth.channels import send_whatsapp_otp, send_email_otp


@pytest.mark.asyncio
@patch("apps.api.src.auth.channels.httpx.AsyncClient")
async def test_send_whatsapp_otp_calls_chasqui(mock_client_class):
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(
        return_value=AsyncMock(status_code=200, json=lambda: {"success": True})
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client_class.return_value = mock_client

    await send_whatsapp_otp(to="+56912345678", code="123456")

    mock_client.post.assert_called_once()
    call_args = mock_client.post.call_args
    assert "/messages/send/template" in call_args[0][0]
    assert call_args[1]["json"]["to"] == "+56912345678"


@pytest.mark.asyncio
@patch("apps.api.src.auth.channels.asyncio.to_thread")
@patch("apps.api.src.auth.channels.resend")
async def test_send_email_otp_calls_resend(mock_resend, mock_to_thread):
    # to_thread is used to wrap the sync resend call; mock it to call the function directly
    async def fake_to_thread(func, **kwargs):
        func(**kwargs)

    mock_to_thread.side_effect = fake_to_thread
    mock_resend.Emails.send = MagicMock(return_value={"id": "test"})

    await send_email_otp(to="user@example.com", code="123456")

    mock_resend.Emails.send.assert_called_once()
    call_args = mock_resend.Emails.send.call_args
    assert call_args[1]["to"] == "user@example.com"
