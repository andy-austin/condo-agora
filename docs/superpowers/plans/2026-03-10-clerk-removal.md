# Clerk Removal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Clerk authentication with NextAuth + WhatsApp OTP (Chasqui) + Email OTP (Resend) to eliminate per-MAU costs.

**Architecture:** NextAuth handles session management and Google OAuth. A custom CredentialsProvider delegates OTP verification to the FastAPI backend via server-to-server calls. A Next.js API route proxies GraphQL requests, injecting the JWT from httpOnly cookies. Chasqui sends WhatsApp OTP, Resend sends email OTP.

**Tech Stack:** NextAuth v5, FastAPI, MongoDB (Motor), Chasqui (WhatsApp Business API), Resend (transactional email), PyJWT

**Spec:** `docs/superpowers/specs/2026-03-10-clerk-removal-design.md`

**Critical implementation notes (read before starting any task):**

1. **Database access pattern:** The codebase exports `db` singleton from `apps/api/database.py`. Access the Motor database via `db.db` (e.g., `db.db.users.find_one(...)`). There is no `get_database()` function. In new modules, use `from ...database import db` then `db.db.collection_name`. Alternatively, add a `get_database()` helper to `database.py` that returns `db.db`.
2. **OTP routing:** The FastAPI app has `root_path="/api"` for Vercel deployment. The OTP router should be mounted so endpoints are reachable. Add a Next.js rewrite in `next.config.js` for `/api/auth/otp/*` → FastAPI, similar to the existing GraphQL rewrite.
3. **Middleware locale handling:** The current middleware does NOT use `next-intl/middleware`. It handles locale detection manually via cookies and `Accept-Language` headers. The replacement middleware MUST preserve this exact locale logic — do NOT introduce `createMiddleware(routing)` from next-intl.
4. **Resend SDK is synchronous:** The Python `resend` package is sync. Wrap calls in `asyncio.to_thread()` to avoid blocking the event loop.
5. **40+ files reference Clerk in frontend:** Tasks 14-19 cover the main files, but many more pages/hooks reference Clerk. Task 20 must enumerate and fix ALL of them.
6. **FastAPI dependency overrides in tests:** Use `app.dependency_overrides[get_current_user] = lambda: mock_user` instead of `patch()` for FastAPI `Depends()` parameters.

---

## Chunk 1: Backend OTP & Rate Limiting

### Task 1: MongoDB Rate Limiting Module

**Files:**
- Create: `apps/api/src/auth/rate_limit.py`
- Create: `apps/api/tests/auth/test_rate_limit.py`

- [ ] **Step 1: Write the failing test**

```python
# apps/api/tests/auth/test_rate_limit.py
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from apps.api.src.auth.rate_limit import check_rate_limit, RateLimitExceeded


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.rate_limits = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_check_rate_limit_allows_first_request(mock_db):
    mock_db.rate_limits.find_one_and_update = AsyncMock(return_value={
        "key": "otp_request:127.0.0.1",
        "count": 1,
        "window_start": datetime.now(timezone.utc),
    })
    # Should not raise
    await check_rate_limit(mock_db, key="otp_request:127.0.0.1", max_count=10, window_seconds=3600)


@pytest.mark.asyncio
async def test_check_rate_limit_blocks_when_exceeded(mock_db):
    mock_db.rate_limits.find_one_and_update = AsyncMock(return_value={
        "key": "otp_request:127.0.0.1",
        "count": 11,
        "window_start": datetime.now(timezone.utc),
    })
    with pytest.raises(RateLimitExceeded):
        await check_rate_limit(mock_db, key="otp_request:127.0.0.1", max_count=10, window_seconds=3600)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_rate_limit.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write minimal implementation**

```python
# apps/api/src/auth/rate_limit.py
from datetime import datetime, timezone, timedelta


class RateLimitExceeded(Exception):
    """Raised when a rate limit is exceeded."""

    def __init__(self, key: str, max_count: int, window_seconds: int):
        self.key = key
        self.max_count = max_count
        self.window_seconds = window_seconds
        super().__init__(
            f"Rate limit exceeded for {key}: {max_count} requests per {window_seconds}s"
        )


async def check_rate_limit(db, key: str, max_count: int, window_seconds: int) -> None:
    """Increment counter for key. Raise RateLimitExceeded if over max_count.

    Uses MongoDB upsert with TTL. Each key gets a counter doc that auto-expires.
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=window_seconds)

    # Atomically increment counter, create if not exists
    result = await db.rate_limits.find_one_and_update(
        {"key": key, "window_start": {"$gte": window_start}},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {"key": key, "window_start": now},
        },
        upsert=True,
        return_document=True,
    )

    if result and result.get("count", 0) > max_count:
        raise RateLimitExceeded(key, max_count, window_seconds)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_rate_limit.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/rate_limit.py apps/api/tests/auth/test_rate_limit.py
git commit -m "feat(auth): add MongoDB-based rate limiting module"
```

---

### Task 2: Messaging Channels Module

**Files:**
- Create: `apps/api/src/auth/channels.py`
- Create: `apps/api/tests/auth/test_channels.py`

- [ ] **Step 1: Write the failing test**

```python
# apps/api/tests/auth/test_channels.py
import pytest
from unittest.mock import AsyncMock, patch

from apps.api.src.auth.channels import send_whatsapp_otp, send_email_otp


@pytest.mark.asyncio
@patch("apps.api.src.auth.channels.httpx.AsyncClient")
async def test_send_whatsapp_otp_calls_chasqui(mock_client_class):
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=AsyncMock(status_code=200, json=lambda: {"success": True}))
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client_class.return_value = mock_client

    await send_whatsapp_otp(to="+56912345678", code="123456")

    mock_client.post.assert_called_once()
    call_args = mock_client.post.call_args
    assert "/messages/send/template" in call_args[0][0]
    assert call_args[1]["json"]["to"] == "+56912345678"


@pytest.mark.asyncio
@patch("apps.api.src.auth.channels.resend")
async def test_send_email_otp_calls_resend(mock_resend):
    mock_resend.Emails.send = AsyncMock(return_value={"id": "test"})

    await send_email_otp(to="user@example.com", code="123456")

    mock_resend.Emails.send.assert_called_once()
    call_args = mock_resend.Emails.send.call_args
    assert call_args[1]["to"] == "user@example.com"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_channels.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write minimal implementation**

```python
# apps/api/src/auth/channels.py
import os
import httpx
import resend

CHASQUI_API_URL = os.getenv("CHASQUI_API_URL", "")
CHASQUI_API_TOKEN = os.getenv("CHASQUI_API_TOKEN", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "noreply@condoagora.com")

resend.api_key = RESEND_API_KEY


async def send_whatsapp_otp(to: str, code: str) -> None:
    """Send OTP code via WhatsApp using Chasqui template API."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CHASQUI_API_URL}/messages/send/template",
            json={
                "to": to,
                "template_name": "otp_code",
                "language_code": "es",
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": code}],
                    }
                ],
            },
            headers={"Authorization": f"Bearer {CHASQUI_API_TOKEN}"},
            timeout=10.0,
        )
        response.raise_for_status()


async def send_email_otp(to: str, code: str) -> None:
    """Send OTP code via email using Resend."""
    resend.Emails.send(
        from_email=RESEND_FROM_EMAIL,
        to=to,
        subject="Tu código de verificación - Condo Agora",
        html=f"""
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
            <h2>Código de verificación</h2>
            <p>Tu código es:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                        padding: 16px; background: #f3f4f6; border-radius: 8px;
                        text-align: center;">{code}</div>
            <p style="color: #666; font-size: 14px; margin-top: 16px;">
                Este código expira en 5 minutos.
            </p>
        </div>
        """,
    )


async def send_whatsapp_invitation(to: str, org_name: str, invite_url: str) -> None:
    """Send invitation via WhatsApp using Chasqui template API."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CHASQUI_API_URL}/messages/send/template",
            json={
                "to": to,
                "template_name": "org_invitation",
                "language_code": "es",
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": org_name},
                            {"type": "text", "text": invite_url},
                        ],
                    }
                ],
            },
            headers={"Authorization": f"Bearer {CHASQUI_API_TOKEN}"},
            timeout=10.0,
        )
        response.raise_for_status()


async def send_email_invitation(to: str, org_name: str, invite_url: str) -> None:
    """Send invitation via email using Resend."""
    resend.Emails.send(
        from_email=RESEND_FROM_EMAIL,
        to=to,
        subject=f"Invitación a {org_name} - Condo Agora",
        html=f"""
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
            <h2>Te han invitado a {org_name}</h2>
            <p>Has sido invitado a unirte a <strong>{org_name}</strong> en Condo Agora.</p>
            <a href="{invite_url}"
               style="display: inline-block; padding: 12px 24px; background: #7c3aed;
                      color: white; text-decoration: none; border-radius: 8px;
                      margin-top: 16px;">
                Aceptar invitación
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 16px;">
                Esta invitación expira en 7 días.
            </p>
        </div>
        """,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_channels.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/channels.py apps/api/tests/auth/test_channels.py
git commit -m "feat(auth): add messaging channels (Chasqui WhatsApp + Resend email)"
```

---

### Task 3: OTP Lifecycle Module

**Files:**
- Create: `apps/api/src/auth/otp.py`
- Create: `apps/api/tests/auth/test_otp.py`

- [ ] **Step 1: Write the failing tests**

```python
# apps/api/tests/auth/test_otp.py
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

from apps.api.src.auth.otp import generate_otp, request_otp, verify_otp, OTPVerificationError


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
    mock_db.otp_codes.find_one = AsyncMock(return_value={
        "_id": "abc",
        "identifier": "+56912345678",
        "code": "123456",
        "channel": "whatsapp",
        "attempts": 0,
        "created_at": datetime.now(timezone.utc),
    })
    mock_db.otp_codes.delete_one = AsyncMock()
    mock_db.users.find_one = AsyncMock(return_value={
        "_id": "user123",
        "nextauth_id": "uuid-1",
        "phone": "+56912345678",
        "email": None,
    })

    user = await verify_otp(db=mock_db, identifier="+56912345678", code="123456")
    assert user["phone"] == "+56912345678"
    mock_db.otp_codes.delete_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_otp_creates_user_if_not_exists(mock_db):
    mock_db.otp_codes.find_one = AsyncMock(return_value={
        "_id": "abc",
        "identifier": "+56912345678",
        "code": "123456",
        "channel": "whatsapp",
        "attempts": 0,
        "created_at": datetime.now(timezone.utc),
    })
    mock_db.otp_codes.delete_one = AsyncMock()
    mock_db.users.find_one = AsyncMock(return_value=None)
    mock_db.users.insert_one = AsyncMock(return_value=MagicMock(inserted_id="new_id"))

    user = await verify_otp(db=mock_db, identifier="+56912345678", code="123456")
    assert user is not None
    mock_db.users.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_otp_wrong_code_increments_attempts(mock_db):
    mock_db.otp_codes.find_one = AsyncMock(return_value={
        "_id": "abc",
        "identifier": "+56912345678",
        "code": "123456",
        "channel": "whatsapp",
        "attempts": 0,
        "created_at": datetime.now(timezone.utc),
    })
    mock_db.otp_codes.update_one = AsyncMock()

    with pytest.raises(OTPVerificationError, match="Invalid code"):
        await verify_otp(db=mock_db, identifier="+56912345678", code="999999")

    mock_db.otp_codes.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_otp_max_attempts_deletes_code(mock_db):
    mock_db.otp_codes.find_one = AsyncMock(return_value={
        "_id": "abc",
        "identifier": "+56912345678",
        "code": "123456",
        "channel": "whatsapp",
        "attempts": 2,
        "created_at": datetime.now(timezone.utc),
    })
    mock_db.otp_codes.delete_one = AsyncMock()

    with pytest.raises(OTPVerificationError, match="Too many attempts"):
        await verify_otp(db=mock_db, identifier="+56912345678", code="999999")

    mock_db.otp_codes.delete_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_otp_no_code_found(mock_db):
    mock_db.otp_codes.find_one = AsyncMock(return_value=None)

    with pytest.raises(OTPVerificationError, match="No active code"):
        await verify_otp(db=mock_db, identifier="+56912345678", code="123456")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_otp.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write minimal implementation**

```python
# apps/api/src/auth/otp.py
import secrets
import uuid
from datetime import datetime, timezone

from .channels import send_whatsapp_otp, send_email_otp
from .rate_limit import check_rate_limit


class OTPVerificationError(Exception):
    """Raised when OTP verification fails."""
    pass


def generate_otp() -> str:
    """Generate a cryptographically random 6-digit OTP code."""
    return f"{secrets.randbelow(1000000):06d}"


async def request_otp(db, identifier: str, channel: str, ip_address: str) -> None:
    """Generate OTP, store it, and send via the specified channel.

    Rate limits:
    - 3 requests per identifier per hour
    - 10 requests per IP per hour
    """
    # Rate limit checks
    await check_rate_limit(
        db, key=f"otp_request:id:{identifier}", max_count=3, window_seconds=3600
    )
    await check_rate_limit(
        db, key=f"otp_request:ip:{ip_address}", max_count=10, window_seconds=3600
    )

    # Delete any existing codes for this identifier
    await db.otp_codes.delete_many({"identifier": identifier})

    # Generate and store new code
    code = generate_otp()
    await db.otp_codes.insert_one({
        "identifier": identifier,
        "code": code,
        "channel": channel,
        "attempts": 0,
        "created_at": datetime.now(timezone.utc),
    })

    # Send via appropriate channel
    if channel == "whatsapp":
        await send_whatsapp_otp(to=identifier, code=code)
    elif channel == "email":
        await send_email_otp(to=identifier, code=code)
    else:
        raise ValueError(f"Unknown channel: {channel}")


async def verify_otp(db, identifier: str, code: str) -> dict:
    """Verify OTP code. Returns user dict (creates user if new).

    Raises OTPVerificationError on failure.
    """
    otp_doc = await db.otp_codes.find_one({"identifier": identifier})

    if not otp_doc:
        raise OTPVerificationError("No active code for this identifier")

    # Check max attempts (3)
    if otp_doc["attempts"] >= 2:
        await db.otp_codes.delete_one({"_id": otp_doc["_id"]})
        raise OTPVerificationError("Too many attempts. Request a new code.")

    # Check code match
    if otp_doc["code"] != code:
        await db.otp_codes.update_one(
            {"_id": otp_doc["_id"]},
            {"$inc": {"attempts": 1}},
        )
        raise OTPVerificationError("Invalid code")

    # Code is correct — delete it
    await db.otp_codes.delete_one({"_id": otp_doc["_id"]})

    # Find or create user
    is_phone = identifier.startswith("+")
    lookup_field = "phone" if is_phone else "email"
    user = await db.users.find_one({lookup_field: identifier})

    if not user:
        now = datetime.now(timezone.utc)
        new_user = {
            "nextauth_id": str(uuid.uuid4()),
            "email": None if is_phone else identifier,
            "phone": identifier if is_phone else None,
            "first_name": None,
            "last_name": None,
            "avatar_url": None,
            "auth_provider": "phone" if is_phone else "email",
            "created_at": now,
            "updated_at": now,
        }
        result = await db.users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        user = new_user

    return user
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_otp.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/otp.py apps/api/tests/auth/test_otp.py
git commit -m "feat(auth): add OTP lifecycle module (generate, request, verify)"
```

---

### Task 4: OTP REST Router

**Files:**
- Create: `apps/api/src/auth/otp_router.py`
- Create: `apps/api/tests/auth/test_otp_router.py`

- [ ] **Step 1: Write the failing test**

```python
# apps/api/tests/auth/test_otp_router.py
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from apps.api.src.auth.otp_router import otp_router


@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(otp_router)
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


def test_request_otp_success(client):
    with patch("apps.api.src.auth.otp_router.request_otp") as mock_request:
        mock_request.return_value = None
        with patch("apps.api.src.auth.otp_router.get_database") as mock_get_db:
            mock_get_db.return_value = AsyncMock()
            response = client.post(
                "/otp/request",
                json={"identifier": "+56912345678", "channel": "whatsapp"},
            )
    assert response.status_code == 200
    assert response.json()["message"] == "Code sent"


def test_request_otp_missing_identifier(client):
    response = client.post("/otp/request", json={"channel": "whatsapp"})
    assert response.status_code == 422


def test_verify_otp_success(client):
    with patch("apps.api.src.auth.otp_router.verify_otp") as mock_verify:
        mock_verify.return_value = {
            "_id": "user123",
            "nextauth_id": "uuid-1",
            "phone": "+56912345678",
            "email": None,
        }
        with patch("apps.api.src.auth.otp_router.get_database") as mock_get_db:
            mock_get_db.return_value = AsyncMock()
            response = client.post(
                "/otp/verify",
                json={"identifier": "+56912345678", "code": "123456"},
                headers={"X-Internal-Secret": "test-secret"},
            )
    assert response.status_code == 200
    assert response.json()["nextauth_id"] == "uuid-1"


def test_verify_otp_missing_internal_secret(client):
    response = client.post(
        "/otp/verify",
        json={"identifier": "+56912345678", "code": "123456"},
    )
    assert response.status_code == 403
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_otp_router.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write minimal implementation**

```python
# apps/api/src/auth/otp_router.py
import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..database import get_database
from .otp import request_otp, verify_otp, OTPVerificationError
from .rate_limit import RateLimitExceeded

INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "")

otp_router = APIRouter(prefix="/otp", tags=["otp"])


class OTPRequestBody(BaseModel):
    identifier: str
    channel: str  # "whatsapp" or "email"


class OTPVerifyBody(BaseModel):
    identifier: str
    code: str


@otp_router.post("/request")
async def handle_otp_request(body: OTPRequestBody, request: Request):
    """Public endpoint: generate and send OTP code."""
    db = await get_database()
    ip_address = request.client.host if request.client else "unknown"

    try:
        await request_otp(
            db=db,
            identifier=body.identifier,
            channel=body.channel,
            ip_address=ip_address,
        )
    except RateLimitExceeded:
        raise HTTPException(status_code=429, detail="Too many requests. Try again later.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "Code sent"}


@otp_router.post("/verify")
async def handle_otp_verify(body: OTPVerifyBody, request: Request):
    """Server-to-server endpoint: verify OTP code and return user.

    Protected by INTERNAL_API_SECRET header — only called by NextAuth authorize().
    """
    secret = request.headers.get("X-Internal-Secret", "")
    if secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    db = await get_database()

    try:
        user = await verify_otp(db=db, identifier=body.identifier, code=body.code)
    except OTPVerificationError as e:
        raise HTTPException(status_code=401, detail=str(e))

    # Serialize ObjectId
    user["_id"] = str(user["_id"])
    return user
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_otp_router.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/otp_router.py apps/api/tests/auth/test_otp_router.py
git commit -m "feat(auth): add OTP REST router (request + verify endpoints)"
```

---

### Task 5: Rewrite JWT Verification (utils.py)

**Files:**
- Modify: `apps/api/src/auth/utils.py`
- Modify: `apps/api/tests/auth/test_utils.py` (or create if missing)

- [ ] **Step 1: Write the failing test**

```python
# apps/api/tests/auth/test_utils.py
import pytest
import jwt
from datetime import datetime, timezone, timedelta

from apps.api.src.auth.utils import verify_token


def _make_token(payload: dict, secret: str = "test-nextauth-secret-min-32-chars!!") -> str:
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_verify_token_valid():
    token = _make_token({
        "sub": "uuid-1",
        "email": "user@example.com",
        "iat": datetime.now(timezone.utc).timestamp(),
        "exp": (datetime.now(timezone.utc) + timedelta(days=30)).timestamp(),
    })
    payload = await verify_token(token, secret="test-nextauth-secret-min-32-chars!!")
    assert payload["sub"] == "uuid-1"


@pytest.mark.asyncio
async def test_verify_token_expired():
    token = _make_token({
        "sub": "uuid-1",
        "iat": (datetime.now(timezone.utc) - timedelta(days=60)).timestamp(),
        "exp": (datetime.now(timezone.utc) - timedelta(days=1)).timestamp(),
    })
    with pytest.raises(Exception):
        await verify_token(token, secret="test-nextauth-secret-min-32-chars!!")


@pytest.mark.asyncio
async def test_verify_token_wrong_secret():
    token = _make_token({"sub": "uuid-1"}, secret="correct-secret-that-is-long-enough!!")
    with pytest.raises(Exception):
        await verify_token(token, secret="wrong-secret-that-is-long-enough!!!")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_utils.py -v`
Expected: FAIL (function doesn't exist yet or has wrong signature)

- [ ] **Step 3: Rewrite utils.py**

Replace the entire file:

```python
# apps/api/src/auth/utils.py
import os
import jwt

NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "")


async def verify_token(token: str, secret: str | None = None) -> dict:
    """Verify a NextAuth JWT token (HS256).

    Args:
        token: The JWT string from Authorization header
        secret: The NEXTAUTH_SECRET. Defaults to env var.

    Returns:
        The decoded JWT payload.

    Raises:
        jwt.InvalidTokenError on any verification failure.
    """
    signing_secret = secret or NEXTAUTH_SECRET
    payload = jwt.decode(
        token,
        signing_secret,
        algorithms=["HS256"],
    )
    return payload
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_utils.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/utils.py apps/api/tests/auth/test_utils.py
git commit -m "refactor(auth): replace Clerk JWKS verification with NextAuth HS256"
```

---

### Task 6: Rewrite Auth Dependencies (dependencies.py)

**Files:**
- Modify: `apps/api/src/auth/dependencies.py`

- [ ] **Step 1: Write the failing test**

```python
# apps/api/tests/auth/test_dependencies.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from apps.api.src.auth.dependencies import get_current_user, get_current_user_optional


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.users = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_get_current_user_returns_user(mock_db):
    """Valid token + existing user → returns user dict."""
    mock_db.users.find_one = AsyncMock(return_value={
        "_id": "obj123",
        "nextauth_id": "uuid-1",
        "email": "user@example.com",
        "phone": None,
    })

    # Mock the token and credential
    from unittest.mock import patch
    with patch("apps.api.src.auth.dependencies.verify_token") as mock_verify:
        mock_verify.return_value = {"sub": "uuid-1", "email": "user@example.com"}
        with patch("apps.api.src.auth.dependencies.get_database") as mock_get_db:
            mock_get_db.return_value = mock_db
            credential = MagicMock()
            credential.credentials = "fake-jwt-token"
            user = await get_current_user(credential=credential)

    assert user["nextauth_id"] == "uuid-1"


@pytest.mark.asyncio
async def test_get_current_user_invalid_token_raises():
    from unittest.mock import patch
    with patch("apps.api.src.auth.dependencies.verify_token") as mock_verify:
        mock_verify.side_effect = Exception("Invalid token")
        credential = MagicMock()
        credential.credentials = "bad-token"
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credential=credential)
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_optional_no_token():
    user = await get_current_user_optional(credential=None)
    assert user is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_dependencies.py -v`
Expected: FAIL

- [ ] **Step 3: Rewrite dependencies.py**

Replace the entire file:

```python
# apps/api/src/auth/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..database import get_database
from .utils import verify_token

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    credential: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Extract and verify JWT from Authorization header. Returns user dict.

    Raises HTTPException 401 if token is invalid or user not found.
    """
    try:
        payload = await verify_token(credential.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    nextauth_id = payload.get("sub")
    if not nextauth_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    db = await get_database()
    user = await db.users.find_one({"nextauth_id": nextauth_id})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Convert ObjectId to string for serialization
    user["id"] = str(user["_id"])
    return user


async def get_current_user_optional(
    credential: HTTPAuthorizationCredentials | None = Depends(security_optional),
) -> dict | None:
    """Same as get_current_user but returns None instead of raising."""
    if credential is None:
        return None

    try:
        return await get_current_user(credential=credential)
    except HTTPException:
        return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_dependencies.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/dependencies.py apps/api/tests/auth/test_dependencies.py
git commit -m "refactor(auth): simplify dependencies to NextAuth JWT lookup"
```

---

### Task 7: Update Database Indexes

**Files:**
- Modify: `apps/api/database.py`

- [ ] **Step 1: Read current database.py to find exact index lines**

Run: `grep -n "clerk_id\|create_index.*users\|create_index.*otp\|create_index.*rate" apps/api/database.py`

- [ ] **Step 2: Update indexes**

In `database.py`, find the `_create_indexes()` method and:
1. Replace `await self.db.users.create_index("clerk_id", unique=True)` with:
   ```python
   await self.db.users.create_index("nextauth_id", unique=True)
   await self.db.users.create_index("email", unique=True, sparse=True)
   await self.db.users.create_index("phone", unique=True, sparse=True)
   ```
2. Add new collection indexes:
   ```python
   # OTP codes - auto-expire after 5 minutes
   await self.db.otp_codes.create_index("created_at", expireAfterSeconds=300)
   await self.db.otp_codes.create_index("identifier")

   # Rate limits - auto-expire after 1 hour
   await self.db.rate_limits.create_index("window_start", expireAfterSeconds=3600)
   await self.db.rate_limits.create_index("key")
   ```

- [ ] **Step 3: Verify backend starts without errors**

Run: `cd apps/api && python -c "from database import Database; print('OK')"`
Expected: OK (no import errors)

- [ ] **Step 4: Commit**

```bash
git add apps/api/database.py
git commit -m "refactor(auth): update MongoDB indexes for NextAuth + OTP"
```

---

### Task 8: Update User Model

**Files:**
- Modify: `apps/api/models/user.py`

- [ ] **Step 1: Read current user model**

Run: `cat apps/api/models/user.py`

- [ ] **Step 2: Replace `clerk_id` with `nextauth_id` and add `phone` field**

Update the Pydantic model:
- Rename `clerk_id: str` → `nextauth_id: str`
- Add `phone: str | None = None`
- Add `auth_provider: str = "phone"` if not already present
- Keep all other fields unchanged

- [ ] **Step 3: Run existing tests to check for breakage**

Run: `.venv/bin/python -m pytest apps/api/tests/ -v --tb=short`
Expected: Some tests may fail due to `clerk_id` references — note which ones for Task 9

- [ ] **Step 4: Commit**

```bash
git add apps/api/models/user.py
git commit -m "refactor(auth): replace clerk_id with nextauth_id in user model"
```

---

### Task 9: Delete Clerk Files and Update service.py

**Files:**
- Delete: `apps/api/src/auth/clerk_utils.py`
- Delete: `apps/api/src/auth/webhooks.py`
- Delete: `apps/api/src/auth/router.py`
- Modify: `apps/api/src/auth/service.py`
- Modify: `apps/api/index.py`
- Modify: `apps/api/requirements.txt`

- [ ] **Step 1: Delete Clerk-specific files**

```bash
rm apps/api/src/auth/clerk_utils.py
rm apps/api/src/auth/webhooks.py
rm apps/api/src/auth/router.py
```

- [ ] **Step 2: Remove svix from requirements.txt**

Remove the line `svix>=1.0.0` from `apps/api/requirements.txt`. Keep `PyJWT[crypto]>=2.8.0`.

Add new dependencies:
```
httpx>=0.25.0
resend>=0.7.0
```

- [ ] **Step 3: Update index.py — remove webhook router, add OTP router**

In `apps/api/index.py`:
- Remove: `from .src.auth.router import auth_router` and `app.include_router(auth_router)`
- Add: `from .src.auth.otp_router import otp_router` and `app.include_router(otp_router, prefix="/api/auth")`

- [ ] **Step 4: Update service.py — replace Clerk calls with channels**

In `apps/api/src/auth/service.py`:
- Remove all imports from `clerk_utils`
- Add: `from .channels import send_whatsapp_invitation, send_email_invitation`
- In `create_invitation()`: replace `create_clerk_invitation()` call with:
  ```python
  invite_url = f"{os.getenv('NEXTAUTH_URL')}/invite/{token}"
  if channel == "whatsapp":
      await send_whatsapp_invitation(to=identifier, org_name=org_name, invite_url=invite_url)
  else:
      await send_email_invitation(to=identifier, org_name=org_name, invite_url=invite_url)
  ```
- In `resend_invitation()`: same replacement
- In `remove_member_from_organization()`: remove `delete_clerk_user()` call — just delete user from MongoDB

- [ ] **Step 5: Remove old webhook tests**

```bash
rm apps/api/tests/auth/test_webhooks.py
```

- [ ] **Step 6: Run all backend tests**

Run: `.venv/bin/python -m pytest apps/api/tests/ -v --tb=short`
Expected: All tests pass (some may need updating for clerk_id → nextauth_id references)

- [ ] **Step 7: Commit**

```bash
git add -A apps/api/
git commit -m "refactor(auth): remove Clerk files, wire OTP router, update service"
```

---

### Task 8.5: Update GraphQL Types and Resolvers

**Files:**
- Modify: `apps/api/graphql_types/auth.py`
- Modify: `apps/api/resolvers/auth.py`
- Modify: `apps/api/src/analytics/service.py` (if it references `clerk_id`)

- [ ] **Step 1: Find all `clerk_id` references in GraphQL layer**

Run: `grep -rn "clerk_id" apps/api/graphql_types/ apps/api/resolvers/ apps/api/src/`

- [ ] **Step 2: Update GraphQL types**

In `apps/api/graphql_types/auth.py`:
- Rename `clerk_id: str` → `nextauth_id: str`
- Change `email: str` → `email: Optional[str] = None` (phone-only users have no email)
- Add `phone: Optional[str] = None`
- Add `auth_provider: str = "phone"`

- [ ] **Step 3: Update resolvers**

In `apps/api/resolvers/auth.py`:
- Replace all `user_data["clerk_id"]` → `user_data["nextauth_id"]`
- Update `resolve_me` to handle nullable email
- Ensure `user_data["phone"]` is included in response

- [ ] **Step 4: Update analytics service**

In `apps/api/src/analytics/service.py` and its tests:
- Replace any `clerk_id` references with `nextauth_id` or `user_id`

- [ ] **Step 5: Run tests**

Run: `.venv/bin/python -m pytest apps/api/tests/ -v --tb=short`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add apps/api/graphql_types/ apps/api/resolvers/ apps/api/src/analytics/
git commit -m "refactor(auth): update GraphQL types and resolvers for nextauth_id"
```

---

### Task 9.5: Add OTP Rewrite to next.config.js and Google Account Linking

**Files:**
- Modify: `apps/web/next.config.js`
- Modify: `apps/web/lib/auth.ts`

- [ ] **Step 1: Add OTP rewrite in next.config.js**

In the `rewrites()` function, add a rewrite for OTP endpoints alongside the existing GraphQL rewrite:

```javascript
{
  source: "/api/auth/otp/:path*",
  destination: "http://localhost:8000/api/auth/otp/:path*",
}
```

For production, this rewrite is handled by `vercel.json` (all `/api/*` routes go to Python).

- [ ] **Step 2: Implement Google account linking in auth.ts**

Replace the `// TODO` in the JWT callback with actual account linking:

```typescript
if (account?.provider === "google" && user?.email) {
  try {
    const res = await fetch(`${FASTAPI_URL}/api/auth/google-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify({
        email: user.email,
        name: user.name,
        image: user.image,
      }),
    });
    if (res.ok) {
      const dbUser = await res.json();
      token.sub = dbUser.nextauth_id;
      token.phone = dbUser.phone;
    }
  } catch {
    // Non-blocking
  }
}
```

- [ ] **Step 3: Add Google link endpoint to OTP router**

In `apps/api/src/auth/otp_router.py`, add:

```python
class GoogleLinkBody(BaseModel):
    email: str
    name: str | None = None
    image: str | None = None

@otp_router.post("/google-link")
async def handle_google_link(body: GoogleLinkBody, request: Request):
    """Server-to-server: find or create user for Google sign-in."""
    secret = request.headers.get("X-Internal-Secret", "")
    if secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    db_instance = await get_database()
    user = await db_instance.users.find_one({"email": body.email})

    if user:
        # Update avatar if missing
        updates = {}
        if not user.get("avatar_url") and body.image:
            updates["avatar_url"] = body.image
        if updates:
            await db_instance.users.update_one({"_id": user["_id"]}, {"$set": updates})
            user.update(updates)
    else:
        import uuid
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        name_parts = (body.name or "").split(" ", 1)
        new_user = {
            "nextauth_id": str(uuid.uuid4()),
            "email": body.email,
            "phone": None,
            "first_name": name_parts[0] if name_parts else None,
            "last_name": name_parts[1] if len(name_parts) > 1 else None,
            "avatar_url": body.image,
            "auth_provider": "google",
            "created_at": now,
            "updated_at": now,
        }
        result = await db_instance.users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        user = new_user

    user["_id"] = str(user["_id"])
    return user
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/next.config.js apps/web/lib/auth.ts apps/api/src/auth/otp_router.py
git commit -m "feat(auth): add OTP rewrite, Google account linking endpoint"
```

---

## Chunk 2: Frontend NextAuth Setup

### Task 10: Install NextAuth and Remove Clerk

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Remove Clerk, add NextAuth**

```bash
cd apps/web && pnpm remove @clerk/nextjs && pnpm add next-auth@beta
```

Note: NextAuth v5 is published under the `beta` tag for Next.js App Router support.

- [ ] **Step 2: Verify installation**

Run: `cd apps/web && pnpm list next-auth`
Expected: Shows next-auth version

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "chore: replace @clerk/nextjs with next-auth"
```

---

### Task 11: NextAuth Configuration

**Files:**
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create NextAuth config**

```typescript
// apps/web/lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      id: "otp",
      name: "OTP",
      credentials: {
        identifier: { label: "Phone or Email", type: "text" },
        code: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.code) return null;

        try {
          const res = await fetch(`${FASTAPI_URL}/api/auth/otp/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Secret": INTERNAL_API_SECRET,
            },
            body: JSON.stringify({
              identifier: credentials.identifier,
              code: credentials.code,
            }),
          });

          if (!res.ok) return null;

          const user = await res.json();
          return {
            id: user.nextauth_id,
            email: user.email,
            phone: user.phone,
            name: [user.first_name, user.last_name].filter(Boolean).join(" ") || null,
            image: user.avatar_url,
          };
        } catch {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in, persist user data in the token
      if (user) {
        token.sub = user.id;
        token.phone = (user as any).phone;
      }
      // For Google sign-in, sync user to backend
      if (account?.provider === "google" && user) {
        try {
          // TODO: Call backend to find-or-create Google user
          // This will be implemented in the Google account linking task
        } catch {
          // Non-blocking — user record will be created on first API call
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as any).phone = token.phone;
      }
      return session;
    },
  },
});
```

- [ ] **Step 2: Create route handler**

```typescript
// apps/web/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Verify no build errors**

Run: `cd apps/web && pnpm typecheck`
Expected: No errors related to auth config

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/auth.ts apps/web/app/api/auth/\[...nextauth\]/route.ts
git commit -m "feat(auth): add NextAuth v5 config with OTP + Google providers"
```

---

### Task 12: GraphQL Proxy Route

**Files:**
- Create: `apps/web/app/api/graphql/route.ts`
- Delete: `apps/web/hooks/use-auth-token.ts`

- [ ] **Step 1: Create the GraphQL proxy**

```typescript
// apps/web/app/api/graphql/route.ts
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  const session = await auth();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Forward the JWT token to FastAPI if user is authenticated
  if (session?.user?.id) {
    // Re-encode a minimal JWT for the backend
    const token = await encode({
      token: {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        phone: (session.user as any).phone,
      },
      secret: NEXTAUTH_SECRET,
    });
    headers["Authorization"] = `Bearer ${token}`;
  }

  const body = await request.text();

  const response = await fetch(`${FASTAPI_URL}/graphql`, {
    method: "POST",
    headers,
    body,
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Update GraphQL client to use proxy**

In `apps/web/lib/api.ts`, update the GraphQL endpoint URL:
- Change the URL from the FastAPI backend to `/api/graphql` (the proxy route)
- Remove the token parameter from `getApiClient()` since the proxy handles auth
- Update the function signature to `getApiClient()` (no args)

Also remove the old GraphQL rewrite from `apps/web/next.config.js` since the proxy route replaces it. The `/api/graphql` rewrite to `localhost:8000/graphql` is no longer needed — the new `app/api/graphql/route.ts` proxy handles this.

- [ ] **Step 3: Delete use-auth-token.ts**

```bash
rm apps/web/hooks/use-auth-token.ts
```

- [ ] **Step 4: Find and update all imports of useAuthToken**

Run: `grep -rn "useAuthToken\|use-auth-token" apps/web/` to find all usages.

For each file that imports `useAuthToken`:
- Remove the import
- Remove the `const { getAuthToken } = useAuthToken()` line
- Remove `token` from `getApiClient(token)` calls → `getApiClient()`

- [ ] **Step 5: Verify build**

Run: `cd apps/web && pnpm typecheck`
Expected: May show errors from Clerk imports still present — those will be fixed in next tasks

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/graphql/route.ts apps/web/lib/api.ts
git rm apps/web/hooks/use-auth-token.ts
git commit -m "feat(auth): add GraphQL proxy route, remove useAuthToken hook"
```

---

### Task 13: Replace Middleware

**Files:**
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Read current middleware.ts to understand locale logic**

Read `apps/web/middleware.ts` carefully — preserve all locale/i18n handling.

- [ ] **Step 2: Rewrite middleware**

Replace only the Clerk auth parts. **PRESERVE all existing locale/i18n logic exactly as-is.** Read the current file carefully and keep the locale detection, cookie handling, and redirect logic. Only change:

1. Remove `import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'`
2. Add `import { auth } from "@/lib/auth"`
3. Replace the `clerkMiddleware(async (auth, request) => {...})` wrapper with NextAuth's `auth()` wrapper
4. Replace `auth.protect()` calls with session checks (`if (!req.auth)`)
5. Update the public routes list to include `/login`, `/invite`, `/api/auth`
6. Keep ALL locale detection, cookie-based locale, Accept-Language parsing, and redirect logic EXACTLY as it is

Do NOT introduce `createMiddleware` from `next-intl/middleware` — the current code handles locale manually and must continue to do so.

- [ ] **Step 3: Verify build**

Run: `cd apps/web && pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "refactor(auth): replace Clerk middleware with NextAuth"
```

---

### Task 14: Replace Root Layout (ClerkProvider → SessionProvider)

**Files:**
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Read current layout.tsx**

Read `apps/web/app/layout.tsx` to see exact ClerkProvider usage.

- [ ] **Step 2: Replace ClerkProvider with SessionProvider**

- Remove: `import { ClerkProvider } from '@clerk/nextjs'`
- Add: `import { SessionProvider } from 'next-auth/react'`
- Replace `<ClerkProvider>` wrapper with `<SessionProvider>`
- Keep all other providers (NextIntlClientProvider, Analytics) unchanged

- [ ] **Step 3: Verify build**

Run: `cd apps/web && pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "refactor(auth): replace ClerkProvider with SessionProvider"
```

---

## Chunk 3: Frontend Component Migration

### Task 15: Login Page

**Files:**
- Create: `apps/web/app/login/page.tsx`
- Delete: `apps/web/app/sign-in/[[...sign-in]]/page.tsx`
- Delete: `apps/web/app/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Create login page with OTP flow**

```typescript
// apps/web/app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

type Step = "identifier" | "otp";
type Channel = "whatsapp" | "email";

export default function LoginPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [step, setStep] = useState<Step>("identifier");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isPhone = channel === "whatsapp";

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, channel }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Error sending code");
        return;
      }

      setStep("otp");
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("otp", {
        identifier,
        code,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid code");
        return;
      }

      window.location.href = callbackUrl;
    } catch {
      setError("Verification error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <h1 className="text-center text-2xl font-bold">Condo Agora</h1>

        {step === "identifier" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  isPhone
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  !isPhone
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                Email
              </button>
            </div>

            <input
              type={isPhone ? "tel" : "email"}
              placeholder={isPhone ? "+56 9 1234 5678" : "email@example.com"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-3 dark:border-gray-600 dark:bg-gray-700"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "..." : "Send Code"}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500 dark:bg-gray-800">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full rounded-lg border py-3 font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Sign in with Google
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-center text-sm text-gray-500">
              Code sent to <strong>{identifier}</strong>
            </p>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
              className="w-full rounded-lg border px-4 py-3 text-center text-2xl tracking-widest dark:border-gray-600 dark:bg-gray-700"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("identifier"); setCode(""); setError(""); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete old sign-in/sign-up pages**

```bash
rm -rf apps/web/app/sign-in
rm -rf apps/web/app/sign-up
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/login/page.tsx
git rm -rf apps/web/app/sign-in apps/web/app/sign-up
git commit -m "feat(auth): add OTP login page, remove Clerk sign-in/sign-up"
```

---

### Task 16: UserMenu Component

**Files:**
- Create: `apps/web/components/auth/UserMenu.tsx`

- [ ] **Step 1: Create UserMenu component**

```typescript
// apps/web/components/auth/UserMenu.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session?.user) return null;

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : session.user.email?.[0]?.toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white hover:bg-purple-700"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 rounded-lg border bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <div className="border-b px-4 py-2 dark:border-gray-600">
            <p className="truncate text-sm font-medium">
              {session.user.name || session.user.email}
            </p>
            <p className="truncate text-xs text-gray-500">
              {session.user.email || (session.user as any).phone}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/auth/UserMenu.tsx
git commit -m "feat(auth): add UserMenu component replacing Clerk UserButton"
```

---

### Task 17: Update Header Component

**Files:**
- Modify: `apps/web/components/landing/Header.tsx`

- [ ] **Step 1: Read current Header.tsx**

Read `apps/web/components/landing/Header.tsx` to see exact Clerk usage.

- [ ] **Step 2: Replace Clerk components**

- Remove: `import { SignInButton, UserButton, SignedIn, SignedOut } from '@clerk/nextjs'`
- Add: `import { useSession } from 'next-auth/react'`
- Add: `import { UserMenu } from '@/components/auth/UserMenu'`
- Add: `import Link from 'next/link'`
- Replace `<SignedOut>...</SignedOut>` with `{!session ? ... : null}`
- Replace `<SignedIn>...</SignedIn>` with `{session ? ... : null}`
- Replace `<SignInButton mode="modal">` with `<Link href="/login">`
- Replace `<UserButton />` with `<UserMenu />`
- Add `const { data: session } = useSession()` in the component body

- [ ] **Step 3: Verify no Clerk imports remain**

Run: `grep -n "clerk" apps/web/components/landing/Header.tsx`
Expected: No results

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/landing/Header.tsx
git commit -m "refactor(auth): replace Clerk components in Header with NextAuth"
```

---

### Task 18: Update Sidebar Component

**Files:**
- Modify: `apps/web/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Read current Sidebar.tsx**

Read `apps/web/components/dashboard/Sidebar.tsx` focusing on Clerk imports and usage.

- [ ] **Step 2: Replace Clerk usage**

- Remove: `import { useUser } from '@clerk/nextjs'` (and `useAuth` if present)
- Add: `import { useSession } from 'next-auth/react'`
- Add: `import { UserMenu } from '@/components/auth/UserMenu'`
- Replace `const { user } = useUser()` with `const { data: session } = useSession()`
- Replace `user?.firstName` with `session?.user?.name?.split(' ')[0]`
- Replace `user?.primaryEmailAddress?.emailAddress` with `session?.user?.email`
- Replace `<UserButton />` with `<UserMenu />`

- [ ] **Step 3: Verify no Clerk imports remain**

Run: `grep -n "clerk" apps/web/components/dashboard/Sidebar.tsx`
Expected: No results

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/dashboard/Sidebar.tsx
git commit -m "refactor(auth): replace Clerk usage in Sidebar with NextAuth"
```

---

### Task 19: Update Dashboard Layout and Page

**Files:**
- Modify: `apps/web/app/dashboard/layout.tsx`
- Modify: `apps/web/app/dashboard/page.tsx`

- [ ] **Step 1: Update dashboard layout**

In `apps/web/app/dashboard/layout.tsx`:
- Remove: `import { useAuth, RedirectToSignIn } from '@clerk/nextjs'`
- Add: `import { useSession } from 'next-auth/react'`
- Add: `import { redirect } from 'next/navigation'`
- Replace `useAuth()` with `useSession()`
- Replace `<RedirectToSignIn />` with `redirect('/login')`
- Replace `isLoaded` check with `status !== 'loading'`
- Replace `isSignedIn` check with `status === 'authenticated'`

- [ ] **Step 2: Update dashboard page**

In `apps/web/app/dashboard/page.tsx`:
- Remove: `import { useUser } from '@clerk/nextjs'`
- Add: `import { useSession } from 'next-auth/react'`
- Replace `const { user } = useUser()` with `const { data: session } = useSession()`
- Replace `user?.firstName` with `session?.user?.name?.split(' ')[0]`
- Replace references to `user?.primaryEmailAddress?.emailAddress` with `session?.user?.email`
- Remove any `getAuthToken` / token passing to `getApiClient` (proxy handles it now)

- [ ] **Step 3: Verify no Clerk imports remain in dashboard**

Run: `grep -rn "clerk" apps/web/app/dashboard/`
Expected: No results

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/dashboard/layout.tsx apps/web/app/dashboard/page.tsx
git commit -m "refactor(auth): replace Clerk usage in dashboard with NextAuth"
```

---

### Task 20: Clean Up Remaining Clerk References

**Files (known Clerk references beyond Tasks 14-19):**
- `apps/web/app/onboarding/page.tsx` — uses `useAuth`, `useUser`, token fetching
- `apps/web/app/dashboard/settings/page.tsx` — uses `useUser`
- `apps/web/app/dashboard/proposals/[id]/page.tsx` — uses `useAuthToken`
- `apps/web/app/dashboard/proposals/page.tsx` — uses `useAuthToken`
- `apps/web/app/dashboard/properties/page.tsx` — uses `useAuthToken`
- `apps/web/app/dashboard/residents/page.tsx` — uses `useAuthToken`
- `apps/web/app/dashboard/invitations/page.tsx` — uses `useAuthToken`
- `apps/web/app/dashboard/voting/page.tsx` — uses `useAuthToken`
- `apps/web/hooks/use-user-role.ts` — uses `useAuth`
- `apps/web/hooks/use-graphql.ts` (or similar) — uses `useAuthToken`
- Any other files found by grep

- [ ] **Step 1: Find ALL remaining Clerk references**

```bash
grep -rn "@clerk\|from.*clerk\|useAuth\|useUser\|useAuthToken\|getAuthToken" apps/web/ --include="*.ts" --include="*.tsx" --include="*.js"
```

- [ ] **Step 2: Fix each remaining reference systematically**

For each file found, apply the same pattern:
- Replace `@clerk/nextjs` imports with `next-auth/react`
- Replace `useAuth()` → `useSession()`, adapt `isLoaded`/`isSignedIn` → `status`
- Replace `useUser()` → `useSession()`, adapt `user.firstName` → `session.user.name`
- Remove `useAuthToken()` and any token passing to `getApiClient()` (proxy handles auth)
- Replace Clerk components with NextAuth/custom equivalents
- Use `useTranslations()` for any hardcoded strings (app is bilingual es/en)

- [ ] **Step 3: Update environment files**

In `apps/web/.env.local.example`:
- Remove Clerk variables
- Add NextAuth variables:
  ```
  NEXTAUTH_SECRET=your-secret-min-32-chars
  NEXTAUTH_URL=http://localhost:3000
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=
  FASTAPI_URL=http://localhost:8000
  INTERNAL_API_SECRET=your-internal-secret
  ```

In `apps/api/.env.example` (or create):
- Remove Clerk variables
- Add:
  ```
  NEXTAUTH_SECRET=your-secret-min-32-chars
  CHASQUI_API_URL=https://chasqui-mu.vercel.app
  CHASQUI_API_TOKEN=your-chasqui-token
  RESEND_API_KEY=your-resend-key
  INTERNAL_API_SECRET=your-internal-secret
  ```

- [ ] **Step 4: Verify full build**

Run: `cd apps/web && pnpm typecheck && pnpm build`
Expected: Build succeeds with no Clerk-related errors

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/
git commit -m "refactor(auth): remove all remaining Clerk references"
```

---

## Chunk 4: Invitation System & E2E Tests

### Task 21: Invitation Accept Endpoint

**Files:**
- Create: `apps/api/src/auth/invite_router.py`
- Create: `apps/api/tests/auth/test_invite_router.py`

- [ ] **Step 1: Write the failing test**

```python
# apps/api/tests/auth/test_invite_router.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
from datetime import datetime, timezone, timedelta

from apps.api.src.auth.invite_router import invite_router


@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(invite_router)
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


def test_accept_invitation_success(client):
    mock_db = AsyncMock()
    now = datetime.now(timezone.utc)
    mock_db.invitations.find_one = AsyncMock(return_value={
        "_id": "inv123",
        "organization_id": "org123",
        "identifier": "+56912345678",
        "channel": "whatsapp",
        "token": "abc123",
        "role": "resident",
        "status": "pending",
        "expires_at": now + timedelta(days=7),
    })
    mock_db.invitations.update_one = AsyncMock()
    mock_db.organization_members.find_one = AsyncMock(return_value=None)
    mock_db.organization_members.insert_one = AsyncMock(return_value=MagicMock(inserted_id="mem123"))

    with patch("apps.api.src.auth.invite_router.get_database", return_value=mock_db):
        with patch("apps.api.src.auth.invite_router.get_current_user") as mock_auth:
            mock_auth.return_value = {
                "_id": "user123",
                "id": "user123",
                "nextauth_id": "uuid-1",
                "phone": "+56912345678",
                "email": None,
            }
            response = client.post(
                "/invite/abc123/accept",
                headers={"Authorization": "Bearer fake-token"},
            )

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


def test_accept_invitation_expired(client):
    mock_db = AsyncMock()
    now = datetime.now(timezone.utc)
    mock_db.invitations.find_one = AsyncMock(return_value={
        "_id": "inv123",
        "token": "abc123",
        "status": "pending",
        "expires_at": now - timedelta(days=1),  # expired
    })

    with patch("apps.api.src.auth.invite_router.get_database", return_value=mock_db):
        with patch("apps.api.src.auth.invite_router.get_current_user") as mock_auth:
            mock_auth.return_value = {"_id": "user123", "id": "user123"}
            response = client.post(
                "/invite/abc123/accept",
                headers={"Authorization": "Bearer fake-token"},
            )

    assert response.status_code == 410
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_invite_router.py -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```python
# apps/api/src/auth/invite_router.py
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..database import get_database
from .dependencies import get_current_user

invite_router = APIRouter(prefix="/invite", tags=["invitations"])


@invite_router.post("/{token}/accept")
async def accept_invitation(
    token: str,
    user: dict = Depends(get_current_user),
):
    """Accept an invitation by token. Requires authentication."""
    db = await get_database()

    invitation = await db.invitations.find_one({"token": token})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation is {invitation['status']}")

    if invitation["expires_at"] < datetime.now(timezone.utc):
        await db.invitations.update_one(
            {"_id": invitation["_id"]},
            {"$set": {"status": "expired"}},
        )
        raise HTTPException(status_code=410, detail="Invitation expired")

    # Verify identifier matches user
    identifier = invitation["identifier"]
    channel = invitation.get("channel", "email")
    if channel == "whatsapp":
        if user.get("phone") != identifier:
            raise HTTPException(status_code=403, detail="Invitation not for this user")
    else:
        if user.get("email") != identifier:
            raise HTTPException(status_code=403, detail="Invitation not for this user")

    # Check if already a member
    existing = await db.organization_members.find_one({
        "organization_id": invitation["organization_id"],
        "user_id": user["_id"],
    })
    if existing:
        # Already a member — just mark invitation as accepted
        await db.invitations.update_one(
            {"_id": invitation["_id"]},
            {"$set": {"status": "accepted"}},
        )
        return {"status": "accepted", "message": "Already a member"}

    # Create membership
    now = datetime.now(timezone.utc)
    await db.organization_members.insert_one({
        "organization_id": invitation["organization_id"],
        "user_id": user["_id"],
        "role": invitation["role"],
        "created_at": now,
        "updated_at": now,
    })

    # Mark invitation as accepted
    await db.invitations.update_one(
        {"_id": invitation["_id"]},
        {"$set": {"status": "accepted", "accepted_at": now}},
    )

    return {"status": "accepted", "organization_id": str(invitation["organization_id"])}
```

- [ ] **Step 4: Register router in index.py**

In `apps/api/index.py`, add:
```python
from .src.auth.invite_router import invite_router
app.include_router(invite_router, prefix="/api")
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest apps/api/tests/auth/test_invite_router.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/invite_router.py apps/api/tests/auth/test_invite_router.py apps/api/index.py
git commit -m "feat(auth): add invitation accept endpoint"
```

---

### Task 22: Invitation Page (Frontend)

**Files:**
- Create: `apps/web/app/invite/[token]/page.tsx`

- [ ] **Step 1: Create invitation acceptance page**

```typescript
// apps/web/app/invite/[token]/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/invite/${token}`);
    }
  }, [status, router, token]);

  async function handleAccept() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `mutation { acceptInvitation(token: "${token}") { status organizationId } }`,
        }),
      });

      // Fallback: direct API call if GraphQL mutation not available
      if (!res.ok) {
        const directRes = await fetch(`/api/invite/${token}/accept`, {
          method: "POST",
        });
        if (!directRes.ok) {
          const data = await directRes.json();
          setError(data.detail || "Error accepting invitation");
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <h1 className="text-center text-2xl font-bold">Invitation</h1>

        {success ? (
          <div className="text-center">
            <p className="text-green-600">Invitation accepted!</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-500">
              You have been invited to join an organization.
            </p>

            {error && <p className="text-center text-sm text-red-500">{error}</p>}

            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "..." : "Accept Invitation"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/invite/\[token\]/page.tsx
git commit -m "feat(auth): add invitation acceptance page"
```

---

### Task 23: Update E2E Test Fixtures

**Files:**
- Modify: `apps/web/e2e/fixtures/auth.ts` (or equivalent)

- [ ] **Step 1: Read current E2E auth fixture**

Run: `cat apps/web/e2e/fixtures/auth.ts` (or find the actual fixture file)

- [ ] **Step 2: Create NextAuth E2E fixture**

Replace Clerk auth fixture with a NextAuth-compatible version. Since E2E tests run against a real browser, the fixture should:
1. Navigate to `/login`
2. Enter a test phone/email
3. Enter the test OTP code (`000000` in test mode)
4. Wait for redirect to dashboard

Add test-mode OTP bypass in the backend. In `apps/api/src/auth/otp.py`, at the top of `verify_otp()`:
```python
import os
# Test mode bypass
if os.getenv("NODE_ENV") == "test" and code == "000000":
    # Skip code verification, just find/create user
    pass  # Continue to user lookup below
```

- [ ] **Step 3: Update E2E env vars**

In `apps/web/.env.local` or E2E config, add:
```
E2E_TEST_PHONE=+56900000001
E2E_TEST_EMAIL=e2e-admin@condoagora.com
```

- [ ] **Step 4: Run E2E tests to verify basic auth flow works**

Run: `cd apps/web && pnpm test:e2e -- e2e/auth.spec.ts`
Expected: Basic auth tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/ apps/api/src/auth/otp.py
git commit -m "test(auth): update E2E fixtures for NextAuth OTP flow"
```

---

### Task 23.5: Database Migration Script

**Files:**
- Create: `scripts/wipe-user-data.js` (MongoDB shell script)

- [ ] **Step 1: Create migration script**

```javascript
// scripts/wipe-user-data.js
// Run with: mongosh "your-connection-string" scripts/wipe-user-data.js
// WARNING: This wipes all user-related data. Organizations are preserved.

print("=== Condo Agora: Wipe User Data for Clerk Removal ===");
print("Collections to wipe: users, organization_members, invitations, houses");
print("Collections preserved: organizations");

const db = db.getSiblingDB("condo_agora");

print("Dropping users: " + db.users.countDocuments() + " docs");
db.users.drop();

print("Dropping organization_members: " + db.organization_members.countDocuments() + " docs");
db.organization_members.drop();

print("Dropping invitations: " + db.invitations.countDocuments() + " docs");
db.invitations.drop();

print("Dropping houses: " + db.houses.countDocuments() + " docs");
db.houses.drop();

// Drop any voting/proposal data that references users
if (db.getCollectionNames().includes("votes")) {
    print("Dropping votes: " + db.votes.countDocuments() + " docs");
    db.votes.drop();
}
if (db.getCollectionNames().includes("proposals")) {
    print("Dropping proposals: " + db.proposals.countDocuments() + " docs");
    db.proposals.drop();
}

print("Done. Organizations preserved: " + db.organizations.countDocuments());
print("Run the app to recreate indexes automatically.");
```

- [ ] **Step 2: Commit**

```bash
git add scripts/wipe-user-data.js
git commit -m "chore: add migration script for Clerk removal data wipe"
```

---

### Task 24: Full Integration Test

- [ ] **Step 1: Run all backend tests**

Run: `.venv/bin/python -m pytest apps/api/tests/ -v`
Expected: All pass

- [ ] **Step 2: Run frontend build**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Run frontend lint**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 4: Run E2E tests**

Run: `cd apps/web && pnpm test:e2e`
Expected: All pass (some may need individual fixing)

- [ ] **Step 5: Manual smoke test**

Start dev: `pnpm dev`
1. Open http://localhost:3000
2. Click login → enter phone → get OTP → verify → see dashboard
3. Sign out → sign in with Google → see dashboard
4. Test invitation flow

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "test(auth): verify full Clerk removal integration"
```
