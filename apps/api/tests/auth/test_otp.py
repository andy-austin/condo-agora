# apps/api/tests/auth/test_otp.py
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from apps.api.src.auth.otp import (
    OTPVerificationError,
    generate_otp,
    request_otp,
    verify_otp,
)


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.otp_codes = AsyncMock()
    db.rate_limits = AsyncMock()
    db.users = AsyncMock()
    return db


def test_generate_otp_returns_6_digits():
    code = generate_otp()
    assert len(code) == 6
    assert code.isdigit()


def test_generate_otp_is_random():
    codes = {generate_otp() for _ in range(100)}
    assert len(codes) > 1  # Not always the same


@pytest.mark.asyncio
async def test_request_otp_stores_code_and_sends_whatsapp(mock_db):
    mock_db.otp_codes.insert_one = AsyncMock()
    mock_db.rate_limits.find_one_and_update = AsyncMock(return_value={"count": 1})

    with patch("apps.api.src.auth.otp.send_whatsapp_otp") as mock_send:
        mock_send.return_value = None
        await request_otp(
            db=mock_db,
            identifier="+56912345678",
            channel="whatsapp",
            ip_address="127.0.0.1",
        )
        mock_send.assert_called_once()
        mock_db.otp_codes.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_request_otp_stores_code_and_sends_email(mock_db):
    mock_db.otp_codes.insert_one = AsyncMock()
    mock_db.rate_limits.find_one_and_update = AsyncMock(return_value={"count": 1})

    with patch("apps.api.src.auth.otp.send_email_otp") as mock_send:
        mock_send.return_value = None
        await request_otp(
            db=mock_db,
            identifier="user@example.com",
            channel="email",
            ip_address="127.0.0.1",
        )
        mock_send.assert_called_once()


@pytest.mark.asyncio
async def test_verify_otp_success(mock_db):
    mock_db.otp_codes.find_one = AsyncMock(
        return_value={
            "_id": "abc",
            "identifier": "+56912345678",
            "code": "123456",
            "channel": "whatsapp",
            "attempts": 0,
            "created_at": datetime.now(timezone.utc),
        }
    )
    mock_db.otp_codes.delete_one = AsyncMock()
    mock_db.users.find_one = AsyncMock(
        return_value={
            "_id": "user123",
            "nextauth_id": "uuid-1",
            "phone": "+56912345678",
            "email": None,
        }
    )

    user = await verify_otp(db=mock_db, identifier="+56912345678", code="123456")
    assert user["phone"] == "+56912345678"
    mock_db.otp_codes.delete_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_otp_creates_user_if_not_exists(mock_db):
    mock_db.otp_codes.find_one = AsyncMock(
        return_value={
            "_id": "abc",
            "identifier": "+56912345678",
            "code": "123456",
            "channel": "whatsapp",
            "attempts": 0,
            "created_at": datetime.now(timezone.utc),
        }
    )
    mock_db.otp_codes.delete_one = AsyncMock()
    mock_db.users.find_one = AsyncMock(return_value=None)
    mock_db.users.insert_one = AsyncMock(return_value=MagicMock(inserted_id="new_id"))

    user = await verify_otp(db=mock_db, identifier="+56912345678", code="123456")
    assert user is not None
    mock_db.users.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_otp_wrong_code_increments_attempts(mock_db):
    mock_db.otp_codes.find_one = AsyncMock(
        return_value={
            "_id": "abc",
            "identifier": "+56912345678",
            "code": "123456",
            "channel": "whatsapp",
            "attempts": 0,
            "created_at": datetime.now(timezone.utc),
        }
    )
    mock_db.otp_codes.update_one = AsyncMock()

    with pytest.raises(OTPVerificationError, match="Invalid code"):
        await verify_otp(db=mock_db, identifier="+56912345678", code="999999")

    mock_db.otp_codes.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_otp_max_attempts_deletes_code(mock_db):
    mock_db.otp_codes.find_one = AsyncMock(
        return_value={
            "_id": "abc",
            "identifier": "+56912345678",
            "code": "123456",
            "channel": "whatsapp",
            "attempts": 2,
            "created_at": datetime.now(timezone.utc),
        }
    )
    mock_db.otp_codes.delete_one = AsyncMock()

    with pytest.raises(OTPVerificationError, match="Too many attempts"):
        await verify_otp(db=mock_db, identifier="+56912345678", code="999999")

    mock_db.otp_codes.delete_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_otp_no_code_found(mock_db):
    mock_db.otp_codes.find_one = AsyncMock(return_value=None)

    with pytest.raises(OTPVerificationError, match="No active code"):
        await verify_otp(db=mock_db, identifier="+56912345678", code="123456")
