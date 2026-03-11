# Fast Onboarding Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign onboarding into a single-page flow where admins can bulk-create an organization with properties and phone-based residents via CSV import or manual entry.

**Architecture:** New `bulkSetupOrganization` GraphQL mutation backed by a dedicated service module. Frontend is a full rewrite of the onboarding page with CSV parsing (PapaParse), editable spreadsheet table, and filter tabs. Phone-only users created via Clerk API with SMS OTP, redirected to `/complete-profile` on first login.

**Tech Stack:** FastAPI + Strawberry GraphQL, MongoDB (Motor), Clerk Backend API (phone users), Next.js 14, PapaParse, next-intl

**Spec:** `docs/superpowers/specs/2026-03-10-fast-onboarding-design.md`

---

## File Structure

### Backend (new files)
- `apps/api/src/onboarding/__init__.py` — empty
- `apps/api/src/onboarding/service.py` — bulk setup orchestration logic
- `apps/api/graphql_types/onboarding.py` — Strawberry types for bulk setup input/output
- `apps/api/schemas/onboarding.py` — OnboardingMutations class
- `apps/api/resolvers/onboarding.py` — resolver for bulkSetupOrganization

### Backend (modified files)
- `apps/api/models/user.py` — make `email` optional, add `phone_number` + `requires_profile_completion`
- `apps/api/src/auth/clerk_utils.py` — add `create_phone_user()` + `update_clerk_user_metadata()` functions
- `apps/api/src/auth/webhooks.py` — handle phone-only users in both `handle_user_created` and `handle_user_updated`
- `apps/api/database.py` — drop and recreate `email` index as sparse, add sparse `phone_number` index
- `apps/api/graphql_types/auth.py` — make `email` optional on User and MemberWithUser types
- `apps/api/resolvers/auth.py` — handle optional email in resolve_me
- `apps/api/schema.py` — register OnboardingMutations

### Frontend (new files)
- `apps/web/app/complete-profile/page.tsx` — profile completion page for phone-only users
- `apps/web/lib/queries/onboarding.ts` — BULK_SETUP_ORGANIZATION mutation
- `apps/web/public/templates/onboarding-template.csv` — downloadable CSV template

### Frontend (modified files)
- `apps/web/app/onboarding/page.tsx` — full rewrite: single-page with CSV import + table
- `apps/web/middleware.ts` — redirect `requires_profile_completion` users
- `apps/web/messages/en.json` — English i18n strings for onboarding + complete-profile
- `apps/web/messages/es.json` — Spanish i18n strings for onboarding + complete-profile
- `apps/web/package.json` — add `papaparse` dependency

---

## Chunk 1: Backend Data Model & Clerk Changes

### Task 1: Make email optional on User model

**Files:**
- Modify: `apps/api/models/user.py:12`
- Test: `apps/api/tests/test_user_model.py`

- [ ] **Step 1: Write failing test for phone-only user creation**

```python
# apps/api/tests/test_user_model.py
from apps.api.models.user import User
from datetime import datetime


def test_user_without_email():
    """User can be created with phone_number and no email."""
    user = User(
        clerk_id="clerk_123",
        phone_number="+584121234567",
        first_name="María",
        last_name="García",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.email is None
    assert user.phone_number == "+584121234567"
    assert user.requires_profile_completion is False


def test_user_with_email_still_works():
    """Existing users with email are not affected."""
    user = User(
        clerk_id="clerk_456",
        email="test@example.com",
        first_name="Carlos",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.email == "test@example.com"
    assert user.phone_number is None


def test_user_requires_profile_completion_flag():
    """User can be created with requires_profile_completion=True."""
    user = User(
        clerk_id="clerk_789",
        phone_number="+584149876543",
        requires_profile_completion=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.requires_profile_completion is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest apps/api/tests/test_user_model.py -v`
Expected: FAIL — `email` is required, `phone_number` field doesn't exist

- [ ] **Step 3: Update User model**

In `apps/api/models/user.py`, replace the field definitions:

```python
from typing import Optional

from pydantic import Field

from .base import BaseDocument


class User(BaseDocument):
    """User document model."""

    clerk_id: str = Field(..., description="Clerk authentication ID")
    email: Optional[str] = Field(default=None, description="User email address")
    phone_number: Optional[str] = Field(
        default=None, description="User phone number in E.164 format"
    )
    first_name: Optional[str] = Field(default=None, description="User first name")
    last_name: Optional[str] = Field(default=None, description="User last name")
    avatar_url: Optional[str] = Field(default=None, description="User avatar URL")
    requires_profile_completion: bool = Field(
        default=False,
        description="Whether user needs to complete their profile on next login",
    )

    @classmethod
    def from_mongo(cls, data: dict) -> Optional["User"]:
        """Create User instance from MongoDB document."""
        if data is None:
            return None
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest apps/api/tests/test_user_model.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/models/user.py apps/api/tests/test_user_model.py
git commit -m "feat: make email optional on User model, add phone_number and requires_profile_completion"
```

---

### Task 2: Update database indexes for phone-only users

**Files:**
- Modify: `apps/api/database.py:79-81`

- [ ] **Step 1: Update indexes in `_create_indexes()`**

In `apps/api/database.py`, replace the users collection indexes section. **Important:** the existing non-sparse `email` index must be dropped first — MongoDB's `create_index()` is a no-op if an index with the same key already exists but with different options.

```python
# Before:
await self.db.users.create_index("clerk_id", unique=True)
await self.db.users.create_index("email")

# After:
await self.db.users.create_index("clerk_id", unique=True)
# Drop existing non-sparse email index before recreating as sparse
try:
    await self.db.users.drop_index("email_1")
except Exception:
    pass
await self.db.users.create_index("email", sparse=True)
await self.db.users.create_index("phone_number", unique=True, sparse=True)
```

The `sparse=True` on `email` allows multiple documents with `null` email. The `phone_number` index is unique + sparse so phone-only users are indexed but users without phone are allowed.

- [ ] **Step 2: Commit**

```bash
git add apps/api/database.py
git commit -m "feat: add sparse phone_number index, make email index sparse"
```

---

### Task 3: Update GraphQL types for optional email

**Files:**
- Modify: `apps/api/graphql_types/auth.py:49,68`
- Modify: `apps/api/resolvers/auth.py:100,214`

- [ ] **Step 1: Make email optional on User and MemberWithUser GraphQL types**

In `apps/api/graphql_types/auth.py`, update the `User` type (line 49) and `MemberWithUser` type (line 68):

```python
# User type — change line 49:
email: Optional[str] = None

# Add phone_number field after email:
phone_number: Optional[str] = None

# MemberWithUser type — change line 68:
email: Optional[str] = None

# Add phone_number field after email:
phone_number: Optional[str] = None
```

- [ ] **Step 2: Update resolvers to handle optional email**

In `apps/api/resolvers/auth.py`, update `resolve_me` (line 100):

```python
# Change line 100 from:
email=user_data["email"],
# To:
email=user_data.get("email"),
phone_number=user_data.get("phone_number"),
```

Update `_mongo_member_to_member_with_user` (line 214):

```python
# Change line 214 from:
email=user.get("email", ""),
# To:
email=user.get("email"),
phone_number=user.get("phone_number"),
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/graphql_types/auth.py apps/api/resolvers/auth.py
git commit -m "feat: make email optional in GraphQL types, add phone_number field"
```

---

### Task 4: Add `create_phone_user` to Clerk utilities

**Files:**
- Modify: `apps/api/src/auth/clerk_utils.py`
- Test: `apps/api/tests/test_clerk_utils.py`

- [ ] **Step 1: Write failing test**

```python
# apps/api/tests/test_clerk_utils.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest apps/api/tests/test_clerk_utils.py -v`
Expected: FAIL — `create_phone_user` does not exist

- [ ] **Step 3: Add `create_phone_user` function**

Add to the end of `apps/api/src/auth/clerk_utils.py`:

```python
async def create_phone_user(
    phone: str,
    first_name: str = None,
    last_name: str = None,
    metadata: dict = None,
):
    """
    Creates a Clerk user with phone number as primary identifier.
    Phone must be in E.164 format (e.g., +584121234567).
    """
    if not CLERK_SECRET_KEY:
        print("Warning: CLERK_SECRET_KEY not found. Skipping Clerk user creation.")
        return None

    url = "https://api.clerk.com/v1/users"
    headers = {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    unsafe_metadata = metadata or {}
    unsafe_metadata["requires_profile_completion"] = True

    payload = {
        "phone_number": [phone],
        "unsafe_metadata": unsafe_metadata,
    }
    if first_name:
        payload["first_name"] = first_name
    if last_name:
        payload["last_name"] = last_name

    print(f"Clerk create_phone_user request: phone={phone}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            print(f"Clerk create_phone_user response: status={response.status_code}")
            response.raise_for_status()
            result = response.json()
            print(f"Clerk user created: id={result.get('id')}")
            return result
        except httpx.HTTPStatusError as e:
            error_body = e.response.text
            print(
                f"Clerk API Error creating phone user: "
                f"status={e.response.status_code}, body={error_body}"
            )
            # Return error info instead of raising — caller handles per-row errors
            return {"error": True, "status": e.response.status_code, "detail": error_body}
        except Exception as e:
            print(f"Error calling Clerk API: {e}")
            return {"error": True, "status": 500, "detail": str(e)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/python -m pytest apps/api/tests/test_clerk_utils.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/clerk_utils.py apps/api/tests/test_clerk_utils.py
git commit -m "feat: add create_phone_user utility for Clerk phone-based user creation"
```

---

### Task 5: Update webhook handler for phone-only users

**Files:**
- Modify: `apps/api/src/auth/webhooks.py:120-135`

- [ ] **Step 1: Update `handle_user_created` to handle users without email**

In `apps/api/src/auth/webhooks.py`, replace lines 120-139:

```python
async def handle_user_created(data: dict):
    """
    Syncs a newly created Clerk user to our local database.
    Handles both email-based and phone-only users.
    """
    clerk_id = data.get("id")
    email_addresses = data.get("email_addresses", [])
    primary_email_id = data.get("primary_email_address_id")
    phone_numbers = data.get("phone_numbers", [])

    primary_email = next(
        (e["email_address"] for e in email_addresses if e["id"] == primary_email_id),
        email_addresses[0]["email_address"] if email_addresses else None,
    )

    primary_phone = (
        phone_numbers[0].get("phone_number") if phone_numbers else None
    )

    if not primary_email and not primary_phone:
        print(f"Warning: No email or phone found for Clerk user {clerk_id}")
        return

    first_name = data.get("first_name")
    last_name = data.get("last_name")
    image_url = data.get("image_url")
    unsafe_metadata = data.get("unsafe_metadata", {})
    requires_profile_completion = unsafe_metadata.get(
        "requires_profile_completion", False
    )
```

Also update the user_data dict creation (around lines 164-169) to include new fields:

```python
    user_data = {
        "clerk_id": clerk_id,
        "email": primary_email,
        "phone_number": primary_phone,
        "first_name": first_name,
        "last_name": last_name,
        "avatar_url": image_url,
        "requires_profile_completion": requires_profile_completion,
```

And update the `$set` in the existing user update (around lines 153-158) to include:

```python
"$set": {
    "email": primary_email,
    "phone_number": primary_phone,
    "first_name": first_name,
    "last_name": last_name,
    "avatar_url": image_url,
    "requires_profile_completion": requires_profile_completion,
    "updated_at": now,
}
```

- [ ] **Step 2: Update `process_pending_invitations` to match by phone too**

In the same file, update `process_pending_invitations` (around line 56-58) to also search by phone:

```python
    email = user.get("email")
    phone = user.get("phone_number")

    # Build query to find invitations matching email or phone
    match_conditions = []
    if email:
        match_conditions.append({"email": email})
    if phone:
        match_conditions.append({"phone": phone})

    if not match_conditions:
        return

    query = {
        "$or": match_conditions,
        "accepted_at": None,
        "expires_at": {"$gt": now},
    }
```

- [ ] **Step 3: Update `handle_user_updated` for phone and profile completion fields**

In `apps/api/src/auth/webhooks.py`, update `handle_user_updated` (lines 181-213) to also sync `phone_number` and `requires_profile_completion`. This is critical — when a phone-only user completes their profile and adds an email via Clerk, the `user.updated` webhook fires and must sync the new data back:

```python
async def handle_user_updated(data: dict):
    """
    Updates an existing user in our local database when changed in Clerk.
    Handles both email-based and phone-only users.
    """
    clerk_id = data.get("id")
    email_addresses = data.get("email_addresses", [])
    primary_email_id = data.get("primary_email_address_id")
    phone_numbers = data.get("phone_numbers", [])

    primary_email = next(
        (e["email_address"] for e in email_addresses if e["id"] == primary_email_id),
        email_addresses[0]["email_address"] if email_addresses else None,
    )

    primary_phone = (
        phone_numbers[0].get("phone_number") if phone_numbers else None
    )

    first_name = data.get("first_name")
    last_name = data.get("last_name")
    image_url = data.get("image_url")
    unsafe_metadata = data.get("unsafe_metadata", {})
    requires_profile_completion = unsafe_metadata.get(
        "requires_profile_completion", False
    )

    if not db.is_connected():
        await db.connect()

    await db.db.users.update_one(
        {"clerk_id": clerk_id},
        {
            "$set": {
                "email": primary_email,
                "phone_number": primary_phone,
                "first_name": first_name,
                "last_name": last_name,
                "avatar_url": image_url,
                "requires_profile_completion": requires_profile_completion,
                "updated_at": datetime.utcnow(),
            }
        },
    )
    print(f"User {clerk_id} updated in local DB")
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/webhooks.py
git commit -m "feat: handle phone-only users in both webhook handlers, support phone matching for invitations"
```

---

## Chunk 2: Bulk Setup Backend Service & GraphQL

### Task 6: Create GraphQL types for bulk setup

**Files:**
- Create: `apps/api/graphql_types/onboarding.py`

- [ ] **Step 1: Create the Strawberry types**

```python
# apps/api/graphql_types/onboarding.py
from enum import Enum
from typing import List, Optional

import strawberry

from .auth import Organization


@strawberry.enum
class RowStatus(Enum):
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"
    SKIPPED = "SKIPPED"


@strawberry.input
class BulkSetupRow:
    row_id: str
    property_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


@strawberry.input
class BulkSetupInput:
    organization_name: str
    rows: List[BulkSetupRow]


@strawberry.type
class BulkSetupRowResult:
    row_id: str
    status: RowStatus
    error: Optional[str] = None
    property_id: Optional[str] = None
    user_id: Optional[str] = None


@strawberry.type
class BulkSetupResult:
    organization: Organization
    total_properties: int
    total_residents: int
    rows: List[BulkSetupRowResult]
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/graphql_types/onboarding.py
git commit -m "feat: add GraphQL types for bulk onboarding setup"
```

---

### Task 7: Create bulk setup service

**Files:**
- Create: `apps/api/src/onboarding/__init__.py`
- Create: `apps/api/src/onboarding/service.py`
- Test: `apps/api/tests/test_onboarding_service.py`

- [ ] **Step 1: Create `__init__.py`**

```bash
mkdir -p apps/api/src/onboarding
touch apps/api/src/onboarding/__init__.py
```

- [ ] **Step 2: Write failing test for bulk setup**

```python
# apps/api/tests/test_onboarding_service.py
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_bulk_setup_creates_org_and_properties():
    """bulk_setup_organization creates org, houses, and returns results."""
    # Mock DB
    mock_db = MagicMock()
    mock_db.is_connected.return_value = True
    mock_db.db = MagicMock()

    # Mock org creation
    mock_org = {
        "_id": "org_id_1",
        "name": "Test Condo",
        "slug": "test-condo",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    # Mock house insertion
    mock_db.db.houses.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="house_1")
    )
    mock_db.db.houses.find_one = AsyncMock(
        return_value={
            "_id": "house_1",
            "name": "Apto 101",
            "organization_id": "org_id_1",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
    )

    rows = [
        {"row_id": "r1", "property_name": "Apto 101"},
        {"row_id": "r2", "property_name": "Apto 102"},
    ]

    with patch(
        "apps.api.src.onboarding.service.create_organization",
        new=AsyncMock(return_value=mock_org),
    ), patch("apps.api.src.onboarding.service.db", mock_db):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization(
            organization_name="Test Condo",
            rows=rows,
            creator_user_id="user_creator",
        )

    assert result["organization"]["name"] == "Test Condo"
    assert result["total_properties"] == 2
    assert result["total_residents"] == 0
    assert len(result["rows"]) == 2
    assert all(r["status"] == "SUCCESS" for r in result["rows"])


@pytest.mark.asyncio
async def test_bulk_setup_creates_clerk_users_for_phone_rows():
    """Rows with phone numbers create Clerk users and assign them."""
    mock_db = MagicMock()
    mock_db.is_connected.return_value = True
    mock_db.db = MagicMock()

    mock_org = {
        "_id": "org_id_1",
        "name": "Test Condo",
        "slug": "test-condo",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    mock_db.db.houses.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="house_1")
    )
    mock_db.db.houses.find_one = AsyncMock(
        return_value={
            "_id": "house_1",
            "name": "Apto 101",
            "organization_id": "org_id_1",
            "voter_user_id": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
    )
    mock_db.db.users.find_one = AsyncMock(return_value=None)
    mock_db.db.users.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="local_user_1")
    )
    mock_db.db.organization_members.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="member_1")
    )
    mock_db.db.organization_members.update_one = AsyncMock()
    mock_db.db.houses.update_one = AsyncMock()

    mock_clerk_result = {"id": "clerk_user_1", "phone_numbers": []}

    rows = [
        {
            "row_id": "r1",
            "property_name": "Apto 101",
            "first_name": "María",
            "last_name": "García",
            "phone": "+584121234567",
        },
    ]

    with patch(
        "apps.api.src.onboarding.service.create_organization",
        new=AsyncMock(return_value=mock_org),
    ), patch(
        "apps.api.src.onboarding.service.create_phone_user",
        new=AsyncMock(return_value=mock_clerk_result),
    ), patch("apps.api.src.onboarding.service.db", mock_db):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization(
            organization_name="Test Condo",
            rows=rows,
            creator_user_id="user_creator",
        )

    assert result["total_residents"] == 1
    assert result["rows"][0]["status"] == "SUCCESS"
    assert result["rows"][0]["user_id"] is not None


@pytest.mark.asyncio
async def test_bulk_setup_rejects_over_200_rows():
    """Mutation rejects input with more than 200 rows."""
    rows = [{"row_id": f"r{i}", "property_name": f"Apto {i}"} for i in range(201)]

    with pytest.raises(Exception, match="Maximum 200"):
        from apps.api.src.onboarding.service import bulk_setup_organization

        await bulk_setup_organization(
            organization_name="Big Condo",
            rows=rows,
            creator_user_id="user_1",
        )


@pytest.mark.asyncio
async def test_bulk_setup_handles_clerk_error_per_row():
    """If Clerk fails for one row, other rows still succeed."""
    mock_db = MagicMock()
    mock_db.is_connected.return_value = True
    mock_db.db = MagicMock()

    mock_org = {
        "_id": "org_id_1",
        "name": "Test",
        "slug": "test",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    mock_db.db.houses.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="house_1")
    )
    mock_db.db.houses.find_one = AsyncMock(
        return_value={
            "_id": "house_1",
            "name": "Apto 101",
            "organization_id": "org_id_1",
            "voter_user_id": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
    )
    mock_db.db.users.find_one = AsyncMock(return_value=None)
    mock_db.db.users.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="local_user_1")
    )
    mock_db.db.organization_members.insert_one = AsyncMock()
    mock_db.db.organization_members.update_one = AsyncMock()
    mock_db.db.houses.update_one = AsyncMock()

    clerk_error = {"error": True, "status": 422, "detail": "Phone already exists"}
    clerk_success = {"id": "clerk_user_2"}

    rows = [
        {"row_id": "r1", "property_name": "Apto 101", "phone": "+584121111111"},
        {"row_id": "r2", "property_name": "Apto 102", "phone": "+584122222222"},
    ]

    with patch(
        "apps.api.src.onboarding.service.create_organization",
        new=AsyncMock(return_value=mock_org),
    ), patch(
        "apps.api.src.onboarding.service.create_phone_user",
        new=AsyncMock(side_effect=[clerk_error, clerk_success]),
    ), patch("apps.api.src.onboarding.service.db", mock_db):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization(
            organization_name="Test",
            rows=rows,
            creator_user_id="user_1",
        )

    assert result["rows"][0]["status"] == "ERROR"
    assert "Phone already exists" in result["rows"][0]["error"]
    assert result["rows"][1]["status"] == "SUCCESS"
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest apps/api/tests/test_onboarding_service.py -v`
Expected: FAIL — module does not exist

- [ ] **Step 4: Implement `bulk_setup_organization` service**

```python
# apps/api/src/onboarding/service.py
import re
from datetime import datetime

from ...database import db
from ..auth.clerk_utils import create_phone_user
from ..auth.service import create_organization

E164_REGEX = re.compile(r"^\+[1-9]\d{6,14}$")
MAX_ROWS = 200


async def bulk_setup_organization(
    organization_name: str,
    rows: list,
    creator_user_id: str,
) -> dict:
    """
    Orchestrates bulk organization setup:
    1. Create organization (creator becomes ADMIN)
    2. Create houses for each row
    3. For rows with phone: create Clerk user, local user, membership, house assignment
    """
    if len(rows) > MAX_ROWS:
        raise Exception(f"Maximum {MAX_ROWS} rows per batch")

    if not db.is_connected():
        await db.connect()

    # Step 1: Create organization
    org = await create_organization(organization_name, creator_user_id)
    org_id = str(org["_id"])

    now = datetime.utcnow()
    results = []
    total_properties = 0
    total_residents = 0

    # Step 2: Process each row
    for row in rows:
        row_id = row["row_id"]
        property_name = row["property_name"]
        first_name = row.get("first_name")
        last_name = row.get("last_name")
        phone = row.get("phone")

        row_result = {"row_id": row_id, "status": "SUCCESS", "error": None}

        try:
            # Create house
            house_data = {
                "name": property_name,
                "organization_id": org_id,
                "voter_user_id": None,
                "created_at": now,
                "updated_at": now,
            }
            house_insert = await db.db.houses.insert_one(house_data)
            house_id = str(house_insert.inserted_id)
            row_result["property_id"] = house_id
            total_properties += 1

            # If phone provided, create user + assign
            if phone:
                phone = phone.strip()
                if not E164_REGEX.match(phone):
                    row_result["status"] = "ERROR"
                    row_result["error"] = (
                        f"Invalid phone format: {phone}. "
                        "Expected E.164 format (e.g., +584121234567)"
                    )
                    results.append(row_result)
                    continue

                # Check if user with this phone already exists locally
                existing_user = await db.db.users.find_one(
                    {"phone_number": phone}
                )

                if existing_user:
                    user_id = str(existing_user["_id"])
                    clerk_id = existing_user["clerk_id"]
                else:
                    # Create Clerk user
                    clerk_result = await create_phone_user(
                        phone=phone,
                        first_name=first_name,
                        last_name=last_name,
                        metadata={
                            "organization_id": org_id,
                            "house_id": house_id,
                        },
                    )

                    if clerk_result is None:
                        # No Clerk key — skip user creation
                        row_result["status"] = "ERROR"
                        row_result["error"] = "Clerk API not configured"
                        results.append(row_result)
                        continue

                    if clerk_result.get("error"):
                        row_result["status"] = "ERROR"
                        row_result["error"] = clerk_result.get("detail", "Clerk error")
                        results.append(row_result)
                        continue

                    clerk_id = clerk_result["id"]

                    # Create local user (upsert by clerk_id)
                    local_user = await db.db.users.find_one(
                        {"clerk_id": clerk_id}
                    )
                    if local_user:
                        user_id = str(local_user["_id"])
                    else:
                        user_doc = {
                            "clerk_id": clerk_id,
                            "email": None,
                            "phone_number": phone,
                            "first_name": first_name,
                            "last_name": last_name,
                            "avatar_url": None,
                            "requires_profile_completion": True,
                            "created_at": now,
                            "updated_at": now,
                        }
                        insert_result = await db.db.users.insert_one(user_doc)
                        user_id = str(insert_result.inserted_id)

                # Create org membership
                member_data = {
                    "user_id": user_id,
                    "organization_id": org_id,
                    "house_id": house_id,
                    "role": "RESIDENT",
                    "created_at": now,
                    "updated_at": now,
                }
                await db.db.organization_members.insert_one(member_data)

                # Set as designated voter
                await db.db.houses.update_one(
                    {"_id": house_insert.inserted_id},
                    {"$set": {"voter_user_id": user_id}},
                )

                row_result["user_id"] = user_id
                total_residents += 1

        except Exception as e:
            row_result["status"] = "ERROR"
            row_result["error"] = str(e)

        results.append(row_result)

    return {
        "organization": org,
        "total_properties": total_properties,
        "total_residents": total_residents,
        "rows": results,
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest apps/api/tests/test_onboarding_service.py -v`
Expected: PASS (all 4 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/onboarding/__init__.py apps/api/src/onboarding/service.py apps/api/tests/test_onboarding_service.py
git commit -m "feat: add bulk_setup_organization service with phone user creation"
```

---

### Task 8: Create GraphQL resolver and schema for bulk setup

**Files:**
- Create: `apps/api/resolvers/onboarding.py`
- Create: `apps/api/schemas/onboarding.py`
- Modify: `apps/api/schema.py:9,45-56`

- [ ] **Step 1: Create resolver**

```python
# apps/api/resolvers/onboarding.py
import strawberry

from ..graphql_types.auth import Organization
from ..graphql_types.onboarding import (
    BulkSetupInput,
    BulkSetupResult,
    BulkSetupRowResult,
    RowStatus,
)
from ..src.onboarding.service import bulk_setup_organization


async def resolve_bulk_setup_organization(
    info: strawberry.types.Info, input: BulkSetupInput
) -> BulkSetupResult:
    """Resolver for bulk organization setup. Authenticated users only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    user_id = user.get("id") or str(user.get("_id"))

    rows_data = [
        {
            "row_id": row.row_id,
            "property_name": row.property_name,
            "first_name": row.first_name,
            "last_name": row.last_name,
            "phone": row.phone,
        }
        for row in input.rows
    ]

    result = await bulk_setup_organization(
        organization_name=input.organization_name,
        rows=rows_data,
        creator_user_id=user_id,
    )

    org = result["organization"]
    return BulkSetupResult(
        organization=Organization(
            id=str(org["_id"]),
            name=org["name"],
            slug=org["slug"],
            created_at=org["created_at"],
            updated_at=org["updated_at"],
        ),
        total_properties=result["total_properties"],
        total_residents=result["total_residents"],
        rows=[
            BulkSetupRowResult(
                row_id=r["row_id"],
                status=RowStatus(r["status"]),
                error=r.get("error"),
                property_id=r.get("property_id"),
                user_id=r.get("user_id"),
            )
            for r in result["rows"]
        ],
    )
```

- [ ] **Step 2: Create schema**

```python
# apps/api/schemas/onboarding.py
import strawberry

from ..graphql_types.onboarding import BulkSetupInput, BulkSetupResult
from ..resolvers.onboarding import resolve_bulk_setup_organization


@strawberry.type
class OnboardingMutations:
    bulk_setup_organization: BulkSetupResult = strawberry.mutation(
        resolver=resolve_bulk_setup_organization
    )
```

- [ ] **Step 3: Register in main schema**

In `apps/api/schema.py`, add import (after line 9):

```python
from .schemas.onboarding import OnboardingMutations
```

Add `OnboardingMutations` to the `Mutation` class (after line 56, before the closing parenthesis):

```python
@strawberry.type
class Mutation(
    AuthMutations,
    HouseMutations,
    ProposalMutations,
    CommentMutations,
    AnnouncementMutations,
    NotificationMutations,
    VotingMutations,
    ProposalVoteMutations,
    DocumentMutations,
    ProjectMilestoneMutations,
    BudgetMutations,
    OnboardingMutations,
):
    pass
```

- [ ] **Step 4: Verify backend starts without errors**

Run: `cd apps/api && python -c "from schema import schema; print('Schema OK:', len(schema.as_str()) > 0)"`
Expected: `Schema OK: True`

- [ ] **Step 5: Commit**

```bash
git add apps/api/resolvers/onboarding.py apps/api/schemas/onboarding.py apps/api/schema.py
git commit -m "feat: register bulkSetupOrganization GraphQL mutation"
```

---

### Task 8.5: Add `completeUserProfile` mutation for clearing profile completion flag

**Files:**
- Modify: `apps/api/src/auth/clerk_utils.py` — add `update_clerk_user_metadata()`
- Modify: `apps/api/src/auth/service.py` — add `complete_user_profile()` function
- Modify: `apps/api/resolvers/auth.py` — add resolver
- Modify: `apps/api/schemas/auth.py` — add mutation
- Modify: `apps/api/graphql_types/auth.py` — add input type

- [ ] **Step 1: Add `update_clerk_user_metadata` to clerk_utils.py**

Add to `apps/api/src/auth/clerk_utils.py`:

```python
async def update_clerk_user_metadata(clerk_id: str, unsafe_metadata: dict):
    """
    Updates a Clerk user's unsafe_metadata.
    Used to clear requires_profile_completion after profile setup.
    """
    if not CLERK_SECRET_KEY:
        print("Warning: CLERK_SECRET_KEY not found. Skipping metadata update.")
        return None

    url = f"https://api.clerk.com/v1/users/{clerk_id}"
    headers = {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    payload = {"unsafe_metadata": unsafe_metadata}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.patch(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            print(f"Clerk API Error updating metadata: {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to update Clerk user metadata: {e.response.text}",
            )
        except Exception as e:
            print(f"Error calling Clerk API: {e}")
            raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 2: Add `complete_user_profile` service function**

Add to `apps/api/src/auth/service.py`:

```python
async def complete_user_profile(
    user_id: str,
    first_name: str = None,
    last_name: str = None,
) -> dict:
    """
    Marks a user's profile as complete. Clears the requires_profile_completion
    flag in both local DB and Clerk metadata.
    """
    if not db.is_connected():
        await db.connect()

    from bson import ObjectId

    user = await db.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise Exception("User not found")

    update_fields = {
        "requires_profile_completion": False,
        "updated_at": datetime.utcnow(),
    }
    if first_name is not None:
        update_fields["first_name"] = first_name
    if last_name is not None:
        update_fields["last_name"] = last_name

    await db.db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields},
    )

    # Clear flag in Clerk
    from .clerk_utils import update_clerk_user_metadata

    await update_clerk_user_metadata(
        user["clerk_id"],
        {"requires_profile_completion": False},
    )

    return await db.db.users.find_one({"_id": ObjectId(user_id)})
```

- [ ] **Step 3: Add GraphQL input type**

Add to `apps/api/graphql_types/auth.py`:

```python
@strawberry.input
class CompleteProfileInput:
    first_name: Optional[str] = None
    last_name: Optional[str] = None
```

- [ ] **Step 4: Add resolver**

Add to `apps/api/resolvers/auth.py`:

```python
from ..src.auth.service import complete_user_profile as service_complete_profile

async def resolve_complete_profile(
    info: strawberry.types.Info, input: "CompleteProfileInput"
) -> User:
    """Resolver for completing user profile. Authenticated users only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    user_id = user.get("id") or str(user.get("_id"))
    updated = await service_complete_profile(
        user_id=user_id,
        first_name=input.first_name,
        last_name=input.last_name,
    )

    return User(
        id=str(updated["_id"]),
        clerk_id=updated["clerk_id"],
        email=updated.get("email"),
        phone_number=updated.get("phone_number"),
        first_name=updated.get("first_name"),
        last_name=updated.get("last_name"),
        avatar_url=updated.get("avatar_url"),
        created_at=updated["created_at"],
        updated_at=updated["updated_at"],
        memberships=[],
    )
```

- [ ] **Step 5: Register mutation in schema**

Add to `apps/api/schemas/auth.py` AuthMutations class:

```python
complete_profile: User = strawberry.mutation(resolver=resolve_complete_profile)
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/clerk_utils.py apps/api/src/auth/service.py apps/api/resolvers/auth.py apps/api/schemas/auth.py apps/api/graphql_types/auth.py
git commit -m "feat: add completeUserProfile mutation for clearing profile completion flag"
```

---

## Chunk 3: Frontend — Onboarding Page Rewrite

### Task 9: Add PapaParse dependency and CSV template

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/public/templates/onboarding-template.csv`

- [ ] **Step 1: Install PapaParse**

Run: `cd apps/web && pnpm add papaparse && pnpm add -D @types/papaparse`

- [ ] **Step 2: Create CSV template file**

```csv
property,first_name,last_name,phone
Apto 101,María,García,+584121234567
Apto 102,Carlos,Rodríguez,+584147654321
Apto 103,,,
```

Save to: `apps/web/public/templates/onboarding-template.csv`

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/public/templates/onboarding-template.csv
git commit -m "feat: add papaparse dependency and CSV template for onboarding"
```

---

### Task 10: Add GraphQL mutation for bulk setup

**Files:**
- Create: `apps/web/lib/queries/onboarding.ts`

- [ ] **Step 1: Create the mutation and types**

```typescript
// apps/web/lib/queries/onboarding.ts

export const BULK_SETUP_ORGANIZATION = `
  mutation BulkSetupOrganization($input: BulkSetupInput!) {
    bulkSetupOrganization(input: $input) {
      organization {
        id
        name
        slug
      }
      totalProperties
      totalResidents
      rows {
        rowId
        status
        error
        propertyId
        userId
      }
    }
  }
`;

export type BulkSetupRow = {
  rowId: string;
  propertyName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type BulkSetupInput = {
  organizationName: string;
  rows: BulkSetupRow[];
};

export type RowStatus = "SUCCESS" | "ERROR" | "SKIPPED";

export type BulkSetupRowResult = {
  rowId: string;
  status: RowStatus;
  error?: string;
  propertyId?: string;
  userId?: string;
};

export type BulkSetupResult = {
  bulkSetupOrganization: {
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    totalProperties: number;
    totalResidents: number;
    rows: BulkSetupRowResult[];
  };
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/queries/onboarding.ts
git commit -m "feat: add GraphQL mutation types for bulk onboarding setup"
```

---

### Task 11: Add i18n strings for onboarding

**Files:**
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/es.json`

- [ ] **Step 1: Add English strings**

Add an `"onboarding"` key to `apps/web/messages/en.json`:

```json
"onboarding": {
  "title": "Set Up Your Organization",
  "orgName": "Organization Name",
  "orgNamePlaceholder": "e.g., Residencial Los Jardines",
  "importMethod": "Import from file",
  "importMethodSub": "CSV",
  "manualMethod": "Add manually",
  "manualMethodSub": "Type or use range",
  "dropzone": "Drag and drop your file here",
  "dropzoneBrowse": "browse files",
  "dropzoneFormats": "Supports .csv files",
  "downloadTemplate": "Download CSV template",
  "templateHelp": "Need help formatting your data?",
  "addRow": "Add row",
  "bulkAdd": "Bulk add (range)",
  "paste": "Paste",
  "colProperty": "Property",
  "colFirstName": "First Name",
  "colLastName": "Last Name",
  "colPhone": "Phone",
  "filterAll": "All",
  "filterPending": "Pending",
  "filterCompleted": "Completed",
  "completed": "completed",
  "pending": "pending",
  "createOrg": "Create Organization",
  "creating": "Creating...",
  "bulkPrefix": "Prefix",
  "bulkPrefixPlaceholder": "e.g., Apto",
  "bulkFrom": "From",
  "bulkTo": "To",
  "bulkAddButton": "Add range",
  "maxRowsError": "Maximum 200 properties per batch",
  "orgNameRequired": "Organization name is required",
  "propertyRequired": "Property name is required",
  "invalidPhone": "Invalid phone format. Use E.164 (e.g., +584121234567)",
  "duplicatePhone": "Duplicate phone number",
  "csvError": "Could not parse CSV file",
  "csvMissingProperty": "CSV must have a 'property' column",
  "retryFailed": "Retry failed rows",
  "success": "Organization created successfully!",
  "successSub": "Redirecting to dashboard..."
}
```

- [ ] **Step 2: Add Spanish strings**

Add the equivalent `"onboarding"` key to `apps/web/messages/es.json`:

```json
"onboarding": {
  "title": "Configura Tu Organización",
  "orgName": "Nombre de la Organización",
  "orgNamePlaceholder": "ej., Residencial Los Jardines",
  "importMethod": "Importar archivo",
  "importMethodSub": "CSV",
  "manualMethod": "Agregar manualmente",
  "manualMethodSub": "Escribir o usar rango",
  "dropzone": "Arrastra y suelta tu archivo aquí",
  "dropzoneBrowse": "buscar archivos",
  "dropzoneFormats": "Soporta archivos .csv",
  "downloadTemplate": "Descargar plantilla CSV",
  "templateHelp": "¿Necesitas ayuda con el formato?",
  "addRow": "Agregar fila",
  "bulkAdd": "Agregar en lote (rango)",
  "paste": "Pegar",
  "colProperty": "Propiedad",
  "colFirstName": "Nombre",
  "colLastName": "Apellido",
  "colPhone": "Teléfono",
  "filterAll": "Todos",
  "filterPending": "Pendientes",
  "filterCompleted": "Completados",
  "completed": "completados",
  "pending": "pendientes",
  "createOrg": "Crear Organización",
  "creating": "Creando...",
  "bulkPrefix": "Prefijo",
  "bulkPrefixPlaceholder": "ej., Apto",
  "bulkFrom": "Desde",
  "bulkTo": "Hasta",
  "bulkAddButton": "Agregar rango",
  "maxRowsError": "Máximo 200 propiedades por lote",
  "orgNameRequired": "El nombre de la organización es requerido",
  "propertyRequired": "El nombre de la propiedad es requerido",
  "invalidPhone": "Formato de teléfono inválido. Usa E.164 (ej., +584121234567)",
  "duplicatePhone": "Número de teléfono duplicado",
  "csvError": "No se pudo leer el archivo CSV",
  "csvMissingProperty": "El CSV debe tener una columna 'property'",
  "retryFailed": "Reintentar filas fallidas",
  "success": "¡Organización creada exitosamente!",
  "successSub": "Redirigiendo al panel..."
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/messages/en.json apps/web/messages/es.json
git commit -m "feat: add i18n strings for onboarding (en/es)"
```

---

### Task 12: Rewrite onboarding page

**Files:**
- Modify: `apps/web/app/onboarding/page.tsx` (full rewrite)

This is the largest task. The page has these sections:

1. **Org name input** — always visible at top
2. **Method toggle** — Import / Manual, controls which panel shows
3. **Import panel** — drag-and-drop CSV zone, template download, template preview
4. **Table** — editable rows with filter tabs (All/Pending/Completed), action bar, inline editing
5. **Sticky footer** — status counts + Create Organization button

- [ ] **Step 1: Implement the full page component**

Rewrite `apps/web/app/onboarding/page.tsx` with the following structure. This is a client component using `useReducer` for table state management.

Key implementation details:
- Use `crypto.randomUUID()` for client-side row IDs
- PapaParse for CSV parsing: `Papa.parse(file, { header: false, complete: callback })` — skip first row (header), map by column position (0=property, 1=first_name, 2=last_name, 3=phone) to avoid i18n header mismatch issues
- Phone validation regex: `/^\+[1-9]\d{6,14}$/`
- Filter state: `'all' | 'pending' | 'completed'`
- Rows are "completed" when `phone` is non-empty and valid
- Sticky footer: `position: sticky; bottom: 0`
- Bulk-add modal: prefix + start/end number range
- Paste handler: listen for `paste` event on table container, parse tab-separated values
- `beforeunload` warning when rows exist and not submitted
- On submit: validate, call `BULK_SETUP_ORGANIZATION` mutation, handle partial errors
- On success: redirect to `/dashboard/${slug}`

The component should be broken into sub-components for readability:
- Main `OnboardingPage` — state management and layout
- `MethodToggle` — import/manual toggle cards
- `ImportPanel` — drag-and-drop zone, template download
- `BulkAddModal` — prefix + range input dialog
- `OnboardingTable` — table with header, rows, filter tabs
- `OnboardingRow` — single editable row

All can live in the same file since they're tightly coupled to the onboarding flow.

- [ ] **Step 2: Verify the page renders**

Run: `cd apps/web && pnpm dev`
Navigate to `http://localhost:3000/onboarding` and verify:
- Org name input renders
- Method toggle (Import/Manual) shows
- Clicking Manual shows empty table with action bar
- Clicking Import shows drag-and-drop zone
- Filter tabs render (All/Pending/Completed)
- Sticky footer with "Create Organization" button

- [ ] **Step 3: Test CSV import flow**

1. Click "Download CSV template" — file downloads
2. Fill in template with 3 rows in a text editor
3. Drag file onto drop zone — table populates with parsed data
4. Verify filter counts update

- [ ] **Step 4: Test manual flow**

1. Click "Add manually"
2. Click "+ Add row" — empty row appears
3. Click "+ Bulk add" — modal appears
4. Enter prefix "Apto", from 101, to 105 — 5 rows created
5. Fill in name + phone on row 1 — status changes to completed
6. Filter tabs show correct counts

- [ ] **Step 5: Test submission**

1. Fill in org name + at least 1 property row
2. Click "Create Organization"
3. Verify loading state on button
4. On success: redirect to dashboard
5. On partial error: error rows highlighted red with message

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/onboarding/page.tsx
git commit -m "feat: rewrite onboarding page with CSV import, editable table, and bulk setup"
```

---

## Chunk 4: Complete Profile Page & Middleware

### Task 13: Add complete-profile page

**Files:**
- Create: `apps/web/app/complete-profile/page.tsx`

- [ ] **Step 1: Add i18n strings for complete-profile**

Add to both `en.json` and `es.json`:

English:
```json
"completeProfile": {
  "title": "Complete Your Profile",
  "subtitle": "Add your email and set a password for easier access",
  "email": "Email (optional)",
  "emailPlaceholder": "you@example.com",
  "password": "Password (optional)",
  "passwordPlaceholder": "At least 8 characters",
  "firstName": "First Name",
  "lastName": "Last Name",
  "save": "Save & Continue",
  "skip": "Skip for now",
  "saving": "Saving..."
}
```

Spanish:
```json
"completeProfile": {
  "title": "Completa Tu Perfil",
  "subtitle": "Agrega tu correo y establece una contraseña para acceder más fácil",
  "email": "Correo electrónico (opcional)",
  "emailPlaceholder": "tu@ejemplo.com",
  "password": "Contraseña (opcional)",
  "passwordPlaceholder": "Al menos 8 caracteres",
  "firstName": "Nombre",
  "lastName": "Apellido",
  "save": "Guardar y Continuar",
  "skip": "Omitir por ahora",
  "saving": "Guardando..."
}
```

- [ ] **Step 2: Create the page component**

`apps/web/app/complete-profile/page.tsx`:
- Client component
- Uses Clerk's `useUser()` hook to get current user
- Form fields: first name (pre-filled), last name (pre-filled), email (optional), password (optional)
- On submit: call `user.update()` via Clerk SDK to add email/password
- Then call a GraphQL mutation to update the local user record and clear `requires_profile_completion`
- "Skip for now" button: clears the flag without adding email/password
- Redirect to `/dashboard` after save or skip

- [ ] **Step 3: Verify the page renders**

Navigate to `http://localhost:3000/complete-profile` and verify form renders correctly.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/complete-profile/page.tsx apps/web/messages/en.json apps/web/messages/es.json
git commit -m "feat: add complete-profile page for phone-only users"
```

---

### Task 14: Update middleware for profile completion redirect

**Files:**
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Add profile completion check**

In `apps/web/middleware.ts`, after the Clerk auth check, add logic to check `requires_profile_completion` in the user's metadata:

```typescript
// After line 37 (existing auth check), add:
// Check if user needs to complete their profile
const path = request.nextUrl.pathname;
const isCompleteProfilePage = path === "/complete-profile";
const isExcludedFromRedirect =
  path.startsWith("/api/") ||
  path.startsWith("/sign-in") ||
  path.startsWith("/sign-up") ||
  isCompleteProfilePage;

if (auth.userId && !isExcludedFromRedirect) {
  const unsafeMetadata = auth.sessionClaims?.unsafe_metadata as Record<string, unknown> | undefined;
  if (unsafeMetadata?.requires_profile_completion) {
    return NextResponse.redirect(new URL("/complete-profile", request.url));
  }
}
```

Note: For Clerk to include `unsafe_metadata` in session claims, the Clerk Dashboard must be configured to include it in the JWT template (Session > Customize session token > add `unsafe_metadata`).

- [ ] **Step 2: Verify redirect works**

1. Create a test phone user via Clerk dashboard with `unsafe_metadata: { requires_profile_completion: true }`
2. Log in as that user
3. Verify redirect to `/complete-profile`
4. After completing profile, verify redirect to `/dashboard`

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat: redirect users with requires_profile_completion to complete-profile page"
```

---

## Chunk 5: Integration Testing & Cleanup

### Task 15: End-to-end manual testing checklist

- [ ] **Step 1: Test full happy path**

1. Start both frontend and backend: `pnpm dev`
2. Navigate to `/onboarding`
3. Enter org name "Test Condo"
4. Click "Import from file"
5. Download CSV template
6. Edit template with 5 properties, 3 with phone numbers
7. Upload CSV — verify table populates
8. Verify filter counts: All (5), Pending (2), Completed (3)
9. Click "Create Organization"
10. Verify redirect to dashboard
11. Verify org, houses, and members visible in dashboard

- [ ] **Step 2: Test manual entry path**

1. Navigate to `/onboarding`
2. Enter org name
3. Click "Add manually"
4. Use "Bulk add" to create Apto 101-110
5. Fill in 3 rows with name + phone
6. Click "Create Organization"
7. Verify success

- [ ] **Step 3: Test error handling**

1. Upload CSV with invalid phone number in one row
2. Submit — verify partial success
3. Verify error row highlighted with message
4. Fix the phone number
5. Click "Retry failed rows"
6. Verify retry succeeds

- [ ] **Step 4: Test paste from clipboard**

1. Copy tab-separated data from a spreadsheet
2. Click "Paste" button in the table action bar
3. Verify rows populate correctly

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `pnpm test`
Expected: All existing tests pass

- [ ] **Step 6: Run linting**

Run: `pnpm lint`
Expected: No new lint errors

- [ ] **Step 7: Final commit and cleanup**

```bash
git add -A
git commit -m "feat: fast onboarding — bulk organization setup with CSV import and phone-based users"
```
