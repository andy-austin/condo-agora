# apps/api/tests/auth/test_invite_router.py
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from bson import ObjectId
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Must be set before importing modules that read env vars at import time
os.environ.setdefault("MONGODB_URI", "mongodb://test:test@localhost:27017/test_db")
os.environ.setdefault("MONGODB_DB_NAME", "test_db")

from apps.api.src.auth.dependencies import get_current_user  # noqa: E402
from apps.api.src.auth.invite_router import invite_router  # noqa: E402

# Build a minimal FastAPI app for testing
app = FastAPI()
app.include_router(invite_router)

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

ORG_ID = ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa")
USER_ID = ObjectId("bbbbbbbbbbbbbbbbbbbbbbbb")

MOCK_USER = {
    "_id": USER_ID,
    "id": str(USER_ID),
    "nextauth_id": "uuid-test-1",
    "email": "member@example.com",
    "phone": None,
}


def _pending_invitation(channel: str = "email", identifier: str = "member@example.com"):
    """Return a minimal pending invitation document."""
    return {
        "_id": ObjectId("cccccccccccccccccccccccc"),
        "token": "valid-token-abc",
        "organization_id": ORG_ID,
        "identifier": identifier,
        "channel": channel,
        "role": "resident",
        "status": "pending",
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    }


def _override_user(user: dict = MOCK_USER):
    """Return a FastAPI dependency override that returns the given user."""
    return lambda: user


# ---------------------------------------------------------------------------
# POST /invite/{token}/accept — success cases
# ---------------------------------------------------------------------------


def test_accept_invitation_success():
    """Happy path: valid token, email matches, no existing membership."""
    invitation = _pending_invitation()

    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.invitations.find_one = AsyncMock(return_value=invitation)
        mock_db.db.organization_members.find_one = AsyncMock(return_value=None)
        mock_db.db.organization_members.insert_one = AsyncMock()
        mock_db.db.invitations.update_one = AsyncMock()

        app.dependency_overrides[get_current_user] = _override_user()
        try:
            response = client.post("/invite/valid-token-abc/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "accepted"
    assert data["organization_id"] == str(ORG_ID)
    mock_db.db.organization_members.insert_one.assert_called_once()
    mock_db.db.invitations.update_one.assert_called_once()


def test_accept_invitation_already_member():
    """User is already a member — invitation still accepted but no new membership created."""
    invitation = _pending_invitation()
    existing_membership = {"organization_id": ORG_ID, "user_id": USER_ID}

    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.invitations.find_one = AsyncMock(return_value=invitation)
        mock_db.db.organization_members.find_one = AsyncMock(
            return_value=existing_membership
        )
        mock_db.db.invitations.update_one = AsyncMock()

        app.dependency_overrides[get_current_user] = _override_user()
        try:
            response = client.post("/invite/valid-token-abc/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "accepted"
    assert data["message"] == "Already a member"


def test_accept_invitation_whatsapp_channel():
    """WhatsApp invitation matched by phone number."""
    phone_user = dict(MOCK_USER, email=None, phone="+56912345678")
    invitation = _pending_invitation(channel="whatsapp", identifier="+56912345678")

    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.invitations.find_one = AsyncMock(return_value=invitation)
        mock_db.db.organization_members.find_one = AsyncMock(return_value=None)
        mock_db.db.organization_members.insert_one = AsyncMock()
        mock_db.db.invitations.update_one = AsyncMock()

        app.dependency_overrides[get_current_user] = _override_user(phone_user)
        try:
            response = client.post("/invite/valid-token-abc/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


# ---------------------------------------------------------------------------
# POST /invite/{token}/accept — error cases
# ---------------------------------------------------------------------------


def test_accept_invitation_not_found():
    """Token does not match any invitation — 404."""
    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.invitations.find_one = AsyncMock(return_value=None)

        app.dependency_overrides[get_current_user] = _override_user()
        try:
            response = client.post("/invite/nonexistent-token/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_accept_invitation_expired():
    """Invitation past its expiry date — 410."""
    invitation = _pending_invitation()
    invitation["expires_at"] = datetime.now(timezone.utc) - timedelta(hours=1)

    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.invitations.find_one = AsyncMock(return_value=invitation)
        mock_db.db.invitations.update_one = AsyncMock()

        app.dependency_overrides[get_current_user] = _override_user()
        try:
            response = client.post("/invite/valid-token-abc/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 410
    assert "expired" in response.json()["detail"].lower()
    # Invitation status should be updated to "expired" in DB
    mock_db.db.invitations.update_one.assert_called_once()


def test_accept_invitation_not_for_this_user():
    """Authenticated user's email doesn't match the invitation recipient — 403."""
    invitation = _pending_invitation(identifier="someone-else@example.com")

    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.invitations.find_one = AsyncMock(return_value=invitation)

        app.dependency_overrides[get_current_user] = _override_user()
        try:
            response = client.post("/invite/valid-token-abc/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 403
    assert "not for this user" in response.json()["detail"].lower()


def test_accept_invitation_not_for_this_user_whatsapp():
    """WhatsApp invitation phone doesn't match user's phone — 403."""
    invitation = _pending_invitation(channel="whatsapp", identifier="+56999999999")

    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.invitations.find_one = AsyncMock(return_value=invitation)

        app.dependency_overrides[get_current_user] = _override_user()  # phone is None
        try:
            response = client.post("/invite/valid-token-abc/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 403


def test_accept_invitation_already_accepted():
    """Invitation was already accepted — 400."""
    invitation = _pending_invitation()
    invitation["status"] = "accepted"

    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.invitations.find_one = AsyncMock(return_value=invitation)

        app.dependency_overrides[get_current_user] = _override_user()
        try:
            response = client.post("/invite/valid-token-abc/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 400
    assert "accepted" in response.json()["detail"].lower()


def test_accept_invitation_revoked():
    """Invitation was revoked — 400."""
    invitation = _pending_invitation()
    invitation["status"] = "revoked"

    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db.invitations.find_one = AsyncMock(return_value=invitation)

        app.dependency_overrides[get_current_user] = _override_user()
        try:
            response = client.post("/invite/valid-token-abc/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 400
    assert "revoked" in response.json()["detail"].lower()


def test_accept_invitation_connects_db_if_not_connected():
    """DB connection is established lazily if not already connected."""
    invitation = _pending_invitation()

    with patch("apps.api.src.auth.invite_router.db") as mock_db:
        mock_db.is_connected.return_value = False
        mock_db.connect = AsyncMock()
        mock_db.db.invitations.find_one = AsyncMock(return_value=invitation)
        mock_db.db.organization_members.find_one = AsyncMock(return_value=None)
        mock_db.db.organization_members.insert_one = AsyncMock()
        mock_db.db.invitations.update_one = AsyncMock()

        app.dependency_overrides[get_current_user] = _override_user()
        try:
            response = client.post("/invite/valid-token-abc/accept")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    mock_db.connect.assert_called_once()
