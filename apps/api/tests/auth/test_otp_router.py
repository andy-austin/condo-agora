# apps/api/tests/auth/test_otp_router.py
import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Must be set before importing the router
os.environ.setdefault("MONGODB_URI", "mongodb://test:test@localhost:27017/test_db")
os.environ.setdefault("MONGODB_DB_NAME", "test_db")
os.environ["INTERNAL_API_SECRET"] = "test-secret"

from apps.api.src.auth.otp_router import router  # noqa: E402
from apps.api.src.auth.otp import OTPVerificationError  # noqa: E402
from apps.api.src.auth.rate_limit import RateLimitExceeded  # noqa: E402

# Build a minimal FastAPI app for testing
app = FastAPI()
app.include_router(router)

client = TestClient(app)


# ---------------------------------------------------------------------------
# POST /otp/request
# ---------------------------------------------------------------------------


def test_request_otp_returns_200_on_success():
    with (
        patch(
            "apps.api.src.auth.otp_router.request_otp", new_callable=AsyncMock
        ) as mock_request,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = True
        mock_request.return_value = None

        response = client.post(
            "/otp/request",
            json={"identifier": "+56912345678", "channel": "whatsapp"},
        )

    assert response.status_code == 200
    assert response.json() == {"message": "Code sent"}


def test_request_otp_email_channel_returns_200():
    with (
        patch(
            "apps.api.src.auth.otp_router.request_otp", new_callable=AsyncMock
        ) as mock_request,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = True
        mock_request.return_value = None

        response = client.post(
            "/otp/request",
            json={"identifier": "user@example.com", "channel": "email"},
        )

    assert response.status_code == 200
    assert response.json() == {"message": "Code sent"}


def test_request_otp_rate_limit_returns_429():
    with (
        patch(
            "apps.api.src.auth.otp_router.request_otp", new_callable=AsyncMock
        ) as mock_request,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = True
        mock_request.side_effect = RateLimitExceeded(
            key="otp_request:id:+56912345678", max_count=3, window_seconds=3600
        )

        response = client.post(
            "/otp/request",
            json={"identifier": "+56912345678", "channel": "whatsapp"},
        )

    assert response.status_code == 429


def test_request_otp_value_error_returns_400():
    with (
        patch(
            "apps.api.src.auth.otp_router.request_otp", new_callable=AsyncMock
        ) as mock_request,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = True
        mock_request.side_effect = ValueError("Unknown channel: sms")

        response = client.post(
            "/otp/request",
            json={"identifier": "+56912345678", "channel": "whatsapp"},
        )

    assert response.status_code == 400
    assert "Unknown channel" in response.json()["detail"]


def test_request_otp_invalid_channel_returns_422():
    """Pydantic should reject channels not in the Literal union."""
    response = client.post(
        "/otp/request",
        json={"identifier": "+56912345678", "channel": "sms"},
    )
    assert response.status_code == 422


def test_request_otp_passes_client_ip():
    with (
        patch(
            "apps.api.src.auth.otp_router.request_otp", new_callable=AsyncMock
        ) as mock_request,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = True
        mock_request.return_value = None

        response = client.post(
            "/otp/request",
            json={"identifier": "+56912345678", "channel": "whatsapp"},
            headers={"X-Forwarded-For": "1.2.3.4"},
        )

    assert response.status_code == 200
    call_kwargs = mock_request.call_args.kwargs
    assert call_kwargs["ip_address"] == "1.2.3.4"


def test_request_otp_connects_db_if_not_connected():
    with (
        patch(
            "apps.api.src.auth.otp_router.request_otp", new_callable=AsyncMock
        ) as mock_request,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = False
        mock_db.connect = AsyncMock()
        mock_request.return_value = None

        response = client.post(
            "/otp/request",
            json={"identifier": "+56912345678", "channel": "whatsapp"},
        )

    assert response.status_code == 200
    mock_db.connect.assert_called_once()


# ---------------------------------------------------------------------------
# POST /otp/verify
# ---------------------------------------------------------------------------


def test_verify_otp_returns_user_on_success():
    fake_user = {
        "_id": "507f1f77bcf86cd799439011",
        "nextauth_id": "uuid-1",
        "phone": "+56912345678",
        "email": None,
    }
    with (
        patch(
            "apps.api.src.auth.otp_router.verify_otp", new_callable=AsyncMock
        ) as mock_verify,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = True
        mock_verify.return_value = dict(fake_user)  # copy so mutation is safe

        response = client.post(
            "/otp/verify",
            json={"identifier": "+56912345678", "code": "123456"},
            headers={"X-Internal-Secret": "test-secret"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "+56912345678"
    # ObjectId should be serialized to string
    assert isinstance(data["_id"], str)


def test_verify_otp_missing_secret_returns_403():
    response = client.post(
        "/otp/verify",
        json={"identifier": "+56912345678", "code": "123456"},
    )
    assert response.status_code == 403


def test_verify_otp_wrong_secret_returns_403():
    response = client.post(
        "/otp/verify",
        json={"identifier": "+56912345678", "code": "123456"},
        headers={"X-Internal-Secret": "wrong-secret"},
    )
    assert response.status_code == 403


def test_verify_otp_invalid_code_returns_401():
    with (
        patch(
            "apps.api.src.auth.otp_router.verify_otp", new_callable=AsyncMock
        ) as mock_verify,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = True
        mock_verify.side_effect = OTPVerificationError("Invalid code")

        response = client.post(
            "/otp/verify",
            json={"identifier": "+56912345678", "code": "000000"},
            headers={"X-Internal-Secret": "test-secret"},
        )

    assert response.status_code == 401
    assert "Invalid code" in response.json()["detail"]


def test_verify_otp_no_active_code_returns_401():
    with (
        patch(
            "apps.api.src.auth.otp_router.verify_otp", new_callable=AsyncMock
        ) as mock_verify,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = True
        mock_verify.side_effect = OTPVerificationError(
            "No active code for this identifier"
        )

        response = client.post(
            "/otp/verify",
            json={"identifier": "+56912345678", "code": "123456"},
            headers={"X-Internal-Secret": "test-secret"},
        )

    assert response.status_code == 401


def test_verify_otp_connects_db_if_not_connected():
    fake_user = {"_id": "abc123", "phone": "+56912345678", "email": None}
    with (
        patch(
            "apps.api.src.auth.otp_router.verify_otp", new_callable=AsyncMock
        ) as mock_verify,
        patch("apps.api.src.auth.otp_router.db") as mock_db,
    ):
        mock_db.is_connected.return_value = False
        mock_db.connect = AsyncMock()
        mock_verify.return_value = dict(fake_user)

        response = client.post(
            "/otp/verify",
            json={"identifier": "+56912345678", "code": "123456"},
            headers={"X-Internal-Secret": "test-secret"},
        )

    assert response.status_code == 200
    mock_db.connect.assert_called_once()


# ---------------------------------------------------------------------------
# POST /otp/google-link
# ---------------------------------------------------------------------------


def test_google_link_creates_new_user():
    with patch("apps.api.src.auth.otp_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.users.find_one = AsyncMock(return_value=None)
        mock_db.db.users.insert_one = AsyncMock()
        mock_db.db.users.insert_one.return_value.inserted_id = "507f1f77bcf86cd799439011"

        response = client.post(
            "/otp/google-link",
            json={"email": "newuser@example.com", "name": "Jane Doe", "image": "https://example.com/avatar.jpg"},
            headers={"X-Internal-Secret": "test-secret"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["first_name"] == "Jane"
    assert data["last_name"] == "Doe"
    assert data["auth_provider"] == "google"
    assert data["avatar_url"] == "https://example.com/avatar.jpg"
    assert isinstance(data["_id"], str)


def test_google_link_links_existing_user():
    existing_user = {
        "_id": "507f1f77bcf86cd799439011",
        "email": "existing@example.com",
        "first_name": "Existing",
        "last_name": "User",
        "auth_provider": "google",
        "avatar_url": "https://example.com/existing.jpg",
    }
    with patch("apps.api.src.auth.otp_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.users.find_one = AsyncMock(return_value=dict(existing_user))

        response = client.post(
            "/otp/google-link",
            json={"email": "existing@example.com"},
            headers={"X-Internal-Secret": "test-secret"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "existing@example.com"
    assert data["_id"] == "507f1f77bcf86cd799439011"


def test_google_link_updates_avatar_if_missing():
    existing_user = {
        "_id": "507f1f77bcf86cd799439011",
        "email": "existing@example.com",
        "avatar_url": None,
    }
    with patch("apps.api.src.auth.otp_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.users.find_one = AsyncMock(return_value=dict(existing_user))
        mock_db.db.users.update_one = AsyncMock()

        response = client.post(
            "/otp/google-link",
            json={"email": "existing@example.com", "image": "https://example.com/new.jpg"},
            headers={"X-Internal-Secret": "test-secret"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["avatar_url"] == "https://example.com/new.jpg"
    mock_db.db.users.update_one.assert_called_once()


def test_google_link_requires_internal_secret():
    response = client.post(
        "/otp/google-link",
        json={"email": "user@example.com"},
    )
    assert response.status_code == 403


def test_google_link_wrong_secret_returns_403():
    response = client.post(
        "/otp/google-link",
        json={"email": "user@example.com"},
        headers={"X-Internal-Secret": "wrong-secret"},
    )
    assert response.status_code == 403
