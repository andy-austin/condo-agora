# Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the onboarding flow into a 3-step stepper (profile → org+properties via CSV → confirmation) with dual-channel WhatsApp+email invitations.

**Architecture:** Evolve existing `/onboarding` page and `bulkSetupOrganization` backend. Extend invitation model for WhatsApp support. Frontend is a full rewrite using single-page React stepper with state managed locally. Backend extends the onboarding service with email-based user creation and dual-channel invitation sending.

**Tech Stack:** Next.js 14 (App Router), Strawberry GraphQL, FastAPI, MongoDB (Motor), PapaParse, next-intl, Resend (email), Chasqui API (WhatsApp)

**Spec:** `docs/superpowers/specs/2026-03-12-onboarding-redesign-design.md`

---

## File Structure

### Backend (Modify)
| File | Responsibility | Changes |
|------|---------------|---------|
| `apps/api/models/invitation.py` | Invitation Pydantic model | Add `WHATSAPP` to enum, make `email` optional, add `phone` field |
| `apps/api/graphql_types/auth.py` | Strawberry invitation types | Add `WHATSAPP` to GraphQL enum, add `phone` to Invitation type, make `email` optional |
| `apps/api/graphql_types/onboarding.py` | Bulk setup GraphQL types | Add `email` to BulkSetupRow, add invitation counts to BulkSetupResult |
| `apps/api/src/onboarding/service.py` | Bulk setup business logic | Add email user creation, invitation creation, dual-channel sending, count tracking |
| `apps/web/lib/queries/onboarding.ts` | Frontend GraphQL queries/types | Add `email` field, add invitation count fields |
| `apps/web/public/templates/onboarding-template.csv` | CSV template | Add email column |

### Frontend (Rewrite)
| File | Responsibility |
|------|---------------|
| `apps/web/app/onboarding/page.tsx` | Main onboarding page — stepper shell, state management, step routing |
| `apps/web/app/onboarding/steps/user-profile-step.tsx` | Step 1: profile form with auth pre-fill |
| `apps/web/app/onboarding/steps/org-name-step.tsx` | Step 2a: organization name input |
| `apps/web/app/onboarding/steps/properties-step.tsx` | Step 2b: spreadsheet table, CSV import, bulk range |
| `apps/web/app/onboarding/steps/confirmation-step.tsx` | Step 3: summary + CTA |
| `apps/web/app/onboarding/lib/csv-parser.ts` | CSV parsing with PapaParse, column alias support |
| `apps/web/app/onboarding/lib/validation.ts` | E.164 phone and email validation utils |
| `apps/web/app/onboarding/components/bulk-range-modal.tsx` | Bulk range modal (prefix + start/end) |
| `apps/web/app/onboarding/components/properties-table.tsx` | Editable spreadsheet table component |
| `apps/web/app/onboarding/components/csv-dropzone.tsx` | CSV drag-and-drop upload zone |

### i18n (Modify)
| File | Changes |
|------|---------|
| `apps/web/messages/en.json` | Add/update onboarding section keys |
| `apps/web/messages/es.json` | Add/update onboarding section keys |

### Tests (Create/Modify)
| File | Responsibility |
|------|---------------|
| `apps/api/tests/test_onboarding_service.py` | Extend with email user, dual-send, counts tests |
| `apps/api/tests/test_invitation_model.py` | New: test updated invitation model |
| `apps/web/app/onboarding/__tests__/csv-parser.test.ts` | New: CSV parsing tests |
| `apps/web/app/onboarding/__tests__/validation.test.ts` | New: validation utils tests |

---

## Chunk 1: Backend — Invitation Model & GraphQL Types

### Task 1: Extend InvitationMethod Enum and Invitation Model

**Files:**
- Modify: `apps/api/models/invitation.py:11-30`
- Test: `apps/api/tests/test_invitation_model.py` (create)

- [ ] **Step 1: Write failing tests for updated invitation model**

Create `apps/api/tests/test_invitation_model.py`:

```python
import pytest
from datetime import datetime, timedelta, timezone
from apps.api.models.invitation import Invitation, InvitationMethod


def test_whatsapp_invitation_method_exists():
    assert InvitationMethod.WHATSAPP == "WHATSAPP"


def test_invitation_with_phone_only():
    inv = Invitation(
        phone="+584121234567",
        token="test-token",
        organization_id="org-1",
        inviter_id="user-1",
        method=InvitationMethod.WHATSAPP,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    assert inv.phone == "+584121234567"
    assert inv.email is None
    assert inv.method == InvitationMethod.WHATSAPP


def test_invitation_with_email_only():
    inv = Invitation(
        email="test@example.com",
        token="test-token",
        organization_id="org-1",
        inviter_id="user-1",
        method=InvitationMethod.EMAIL,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    assert inv.email == "test@example.com"
    assert inv.phone is None


def test_invitation_with_both_phone_and_email():
    inv = Invitation(
        email="test@example.com",
        phone="+584121234567",
        token="test-token",
        organization_id="org-1",
        inviter_id="user-1",
        method=InvitationMethod.EMAIL,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    assert inv.email == "test@example.com"
    assert inv.phone == "+584121234567"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/test_invitation_model.py -v`
Expected: FAIL — `WHATSAPP` not in enum, `phone` field missing, `email` still required

- [ ] **Step 3: Update the invitation model**

In `apps/api/models/invitation.py`, make these changes:

1. Add `WHATSAPP = "WHATSAPP"` to `InvitationMethod` enum (after line 13)
2. Change `email: str = Field(...)` to `email: Optional[str] = None`
3. Add `phone: Optional[str] = None` field after `email`

```python
class InvitationMethod(str, Enum):
    EMAIL = "EMAIL"
    LINK = "LINK"
    WHATSAPP = "WHATSAPP"
```

```python
class Invitation(BaseDocument):
    email: Optional[str] = None
    phone: Optional[str] = None
    token: str = Field(...)
    # ... rest stays the same
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/test_invitation_model.py -v`
Expected: All 4 tests PASS

- [ ] **Step 5: Run existing test suite to check for regressions**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/ -v --tb=short`
Expected: All existing tests PASS (some invitation tests may need the `email` field added where it was previously required — fix if needed)

- [ ] **Step 6: Commit**

```bash
git add apps/api/models/invitation.py apps/api/tests/test_invitation_model.py
git commit -m "feat: extend invitation model with WHATSAPP method and optional email/phone"
```

### Task 2: Update GraphQL Invitation Types

**Files:**
- Modify: `apps/api/graphql_types/auth.py:85-103`

- [ ] **Step 1: Update Strawberry InvitationMethod enum**

In `apps/api/graphql_types/auth.py`, find the `InvitationMethod` enum (around line 85-88) and add `WHATSAPP`:

```python
@strawberry.enum
class InvitationMethod(str, Enum):
    EMAIL = "EMAIL"
    LINK = "LINK"
    WHATSAPP = "WHATSAPP"
```

- [ ] **Step 2: Update Strawberry Invitation type**

In the same file, find the `Invitation` type (around line 91-103). Make `email` optional and add `phone`. Preserve all existing fields including the lazy-loaded `house` field:

```python
@strawberry.type
class Invitation:
    id: strawberry.ID
    email: Optional[str] = None
    phone: Optional[str] = None
    organization_id: str
    inviter_id: str
    house_id: Optional[str] = None
    role: Role = Role.MEMBER
    method: InvitationMethod = InvitationMethod.EMAIL
    expires_at: datetime
    created_at: datetime
    accepted_at: Optional[datetime] = None
    house: Optional[Annotated["House", strawberry.lazy(".house")]] = None
```

- [ ] **Step 3: Run backend tests to check for regressions**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/ -v --tb=short`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/graphql_types/auth.py
git commit -m "feat: add WHATSAPP method and phone field to GraphQL invitation types"
```

### Task 3: Extend BulkSetup GraphQL Types

**Files:**
- Modify: `apps/api/graphql_types/onboarding.py:16-45`

- [ ] **Step 1: Add email to BulkSetupRow input**

In `apps/api/graphql_types/onboarding.py`, add `email` field to `BulkSetupRow` (after line 23):

```python
@strawberry.input
class BulkSetupRow:
    row_id: str
    property_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
```

- [ ] **Step 2: Add invitation counts to BulkSetupResult**

In the same file, add new fields to `BulkSetupResult` (around line 40-45):

```python
@strawberry.type
class BulkSetupResult:
    organization: Organization
    total_properties: int
    total_residents: int
    whatsapp_invitations_sent: int
    email_invitations_sent: int
    properties_without_contact: int
    rows: List[BulkSetupRowResult]
```

- [ ] **Step 3: Update resolver immediately to avoid broken intermediate state**

Since `BulkSetupResult` now requires new fields, update `apps/api/resolvers/onboarding.py` in the same step. Add the new count fields to the result mapping (use `.get()` with default 0 since the service doesn't return them yet):

```python
return BulkSetupResult(
    organization=org_type,
    total_properties=result["total_properties"],
    total_residents=result["total_residents"],
    whatsapp_invitations_sent=result.get("whatsapp_invitations_sent", 0),
    email_invitations_sent=result.get("email_invitations_sent", 0),
    properties_without_contact=result.get("properties_without_contact", 0),
    rows=row_results,
)
```

Also add `email` to the row transformation:

```python
rows_data = [
    {
        "row_id": row.row_id,
        "property_name": row.property_name,
        "first_name": row.first_name,
        "last_name": row.last_name,
        "phone": row.phone,
        "email": row.email,
    }
    for row in input.rows
]
```

- [ ] **Step 4: Run backend tests**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/ -v --tb=short`
Expected: All tests PASS (resolver returns 0 for new count fields since service doesn't populate them yet)

- [ ] **Step 5: Commit**

```bash
git add apps/api/graphql_types/onboarding.py apps/api/resolvers/onboarding.py
git commit -m "feat: add email field and invitation counts to bulk setup GraphQL types and resolver"
```

## Chunk 2: Backend — Onboarding Service

### Task 4: Extend Onboarding Service with Email Users and Invitations

**Files:**
- Modify: `apps/api/src/onboarding/service.py:1-115`
- Modify: `apps/api/tests/test_onboarding_service.py:1-129`

- [ ] **Step 1: Write failing test for email-only user creation**

Add to `apps/api/tests/test_onboarding_service.py`. Follow existing mocking pattern: `MagicMock()` with `mock_db.db.` prefix, patch `apps.api.src.onboarding.service.db`, and import `bulk_setup_organization` inside the `with patch(...)` block:

```python
@pytest.mark.asyncio
async def test_bulk_setup_creates_user_for_email_only_row():
    """When a row has email but no phone, a user should be created by email."""
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
    mock_db.db.users.find_one = AsyncMock(return_value=None)
    mock_db.db.users.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="user_1")
    )
    mock_db.db.organization_members.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="member_1")
    )
    mock_db.db.houses.update_one = AsyncMock()
    mock_db.db.invitations.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="inv_1")
    )
    rows = [
        {
            "row_id": "r1",
            "property_name": "Apto 101",
            "email": "maria@example.com",
        }
    ]
    with (
        patch(
            "apps.api.src.onboarding.service.create_organization",
            new=AsyncMock(return_value=mock_org),
        ),
        patch("apps.api.src.onboarding.service.db", mock_db),
        patch("apps.api.src.onboarding.service.send_email_invitation", new=AsyncMock()),
    ):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization("Test Condo", rows, "user_creator")
    assert result["total_residents"] == 1
    mock_db.db.users.find_one.assert_called()
    mock_db.db.users.insert_one.assert_called_once()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/test_onboarding_service.py::test_bulk_setup_creates_user_for_email_only_row -v`
Expected: FAIL — current service only handles phone-based rows

- [ ] **Step 3: Write failing test for dual-channel invitation sending**

Add to `apps/api/tests/test_onboarding_service.py`:

```python
@pytest.mark.asyncio
async def test_bulk_setup_sends_dual_channel_invitations():
    """When a row has both phone and email, invitations sent via both channels."""
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
    mock_db.db.users.find_one = AsyncMock(return_value=None)
    mock_db.db.users.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="user_1")
    )
    mock_db.db.organization_members.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="member_1")
    )
    mock_db.db.houses.update_one = AsyncMock()
    mock_db.db.invitations.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="inv_1")
    )
    rows = [
        {
            "row_id": "r1",
            "property_name": "Apto 101",
            "first_name": "María",
            "last_name": "López",
            "phone": "+584121234567",
            "email": "maria@example.com",
        }
    ]
    mock_whatsapp = AsyncMock()
    mock_email = AsyncMock()
    with (
        patch(
            "apps.api.src.onboarding.service.create_organization",
            new=AsyncMock(return_value=mock_org),
        ),
        patch("apps.api.src.onboarding.service.db", mock_db),
        patch("apps.api.src.onboarding.service.send_whatsapp_invitation", mock_whatsapp),
        patch("apps.api.src.onboarding.service.send_email_invitation", mock_email),
    ):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization("Test Condo", rows, "user_creator")
    assert result["whatsapp_invitations_sent"] == 1
    assert result["email_invitations_sent"] == 1
    mock_whatsapp.assert_called_once()
    mock_email.assert_called_once()
```

- [ ] **Step 4: Write failing test for invitation count tracking**

Add to `apps/api/tests/test_onboarding_service.py`:

```python
@pytest.mark.asyncio
async def test_bulk_setup_tracks_properties_without_contact():
    """Rows with no phone and no email are counted as properties_without_contact."""
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
    rows = [
        {"row_id": "r1", "property_name": "Apto 101"},
        {"row_id": "r2", "property_name": "Apto 102"},
    ]
    with (
        patch(
            "apps.api.src.onboarding.service.create_organization",
            new=AsyncMock(return_value=mock_org),
        ),
        patch("apps.api.src.onboarding.service.db", mock_db),
    ):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization("Test Condo", rows, "user_creator")
    assert result["properties_without_contact"] == 2
    assert result["whatsapp_invitations_sent"] == 0
    assert result["email_invitations_sent"] == 0
```

- [ ] **Step 5: Run all new tests to verify they fail**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/test_onboarding_service.py -v -k "email_only or dual_channel or without_contact"`
Expected: All 3 new tests FAIL

- [ ] **Step 6: Implement the extended onboarding service**

Update `apps/api/src/onboarding/service.py`. Key changes:

1. Add imports for invitation sending, UUID, logging, and settings:
```python
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from apps.api.src.auth.channels import send_whatsapp_invitation, send_email_invitation

logger = logging.getLogger(__name__)
BASE_URL = os.environ.get("NEXTAUTH_URL", "http://localhost:3000")
```

2. Add email validation regex:
```python
EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
```

3. In the row processing loop, after the existing phone-based user creation block, add email-based user creation:
```python
# After existing phone handling, add:
elif email and re.match(EMAIL_REGEX, email):
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        user_id = str(existing_user["_id"])
    else:
        user_doc = {
            "email": email,
            "first_name": first_name or None,
            "last_name": last_name or None,
            "auth_provider": "email",
            "requires_profile_completion": True,
            "created_at": now,
            "updated_at": now,
        }
        user_result = await db.users.insert_one(user_doc)
        user_id = str(user_result.inserted_id)
    # Create membership + set voter (same as phone path)
```

4. After user+house creation, add invitation creation and sending:
```python
# Create invitation record
phone_val = row.get("phone")
email_val = row.get("email")
if phone_val or email_val:
    token = str(uuid.uuid4())
    invite_url = f"{base_url}/invite/{token}"
    method = "WHATSAPP" if phone_val and not email_val else "EMAIL"
    invitation_doc = {
        "email": email_val,
        "phone": phone_val,
        "token": token,
        "organization_id": org_id,
        "inviter_id": admin_user_id,
        "house_id": house_id,
        "role": "RESIDENT",
        "method": method,
        "expires_at": now + timedelta(days=7),
        "created_at": now,
        "updated_at": now,
    }
    await db.invitations.insert_one(invitation_doc)

    # Fire-and-forget dual-channel sends
    if phone_val:
        try:
            await send_whatsapp_invitation(phone_val, org_name, invite_url)
            whatsapp_count += 1
        except Exception:
            logger.exception(f"Failed to send WhatsApp invitation to {phone_val}")
    if email_val:
        try:
            await send_email_invitation(email_val, org_name, invite_url)
            email_count += 1
        except Exception:
            logger.exception(f"Failed to send email invitation to {email_val}")
else:
    no_contact_count += 1
```

5. Update the return dict to include new counts:
```python
return {
    "organization": org,
    "total_properties": total_properties,
    "total_residents": total_residents,
    "whatsapp_invitations_sent": whatsapp_count,
    "email_invitations_sent": email_count,
    "properties_without_contact": no_contact_count,
    "rows": row_results,
}
```

- [ ] **Step 7: Run all onboarding tests**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/test_onboarding_service.py -v`
Expected: All tests PASS (both new and existing)

- [ ] **Step 8: Run full backend test suite**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/ -v --tb=short`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/onboarding/service.py apps/api/tests/test_onboarding_service.py
git commit -m "feat: extend onboarding service with email users and dual-channel invitations"
```

### Task 5: Update CSV Template

**Files:**
- Modify: `apps/web/public/templates/onboarding-template.csv`

- [ ] **Step 1: Update CSV template with email column**

Replace contents of `apps/web/public/templates/onboarding-template.csv`:

```csv
property_name,first_name,last_name,phone,email
Apt 101,María,López,+584125550101,maria@example.com
Apt 102,Carlos,Pérez,+584145550102,carlos@example.com
Apt 103,,,,
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/public/templates/onboarding-template.csv
git commit -m "feat: add email column to onboarding CSV template"
```

## Chunk 3: Frontend — Shared Utilities and GraphQL

### Task 7: Update Frontend GraphQL Queries and Types

**Files:**
- Modify: `apps/web/lib/queries/onboarding.ts:1-69`

- [ ] **Step 1: Add email to BulkSetupRow type and mutation**

Update `apps/web/lib/queries/onboarding.ts`:

1. Update the `BULK_SETUP_ORGANIZATION` mutation (uses plain template literal, no `gql` tag — matches existing pattern):

```typescript
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
      whatsappInvitationsSent
      emailInvitationsSent
      propertiesWithoutContact
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
```

2. Update TypeScript types:

```typescript
export interface BulkSetupRow {
  rowId: string;
  propertyName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export interface BulkSetupResult {
  bulkSetupOrganization: {
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    totalProperties: number;
    totalResidents: number;
    whatsappInvitationsSent: number;
    emailInvitationsSent: number;
    propertiesWithoutContact: number;
    rows: BulkSetupRowResult[];
  };
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm --filter web typecheck`
Expected: PASS (or note type errors to fix in frontend tasks)

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/queries/onboarding.ts
git commit -m "feat: add email and invitation counts to onboarding GraphQL queries"
```

### Task 8: Create Validation Utilities

**Files:**
- Create: `apps/web/app/onboarding/lib/validation.ts`
- Create: `apps/web/app/onboarding/__tests__/validation.test.ts`

- [ ] **Step 1: Write failing tests for validation utils**

Create `apps/web/app/onboarding/__tests__/validation.test.ts`:

```typescript
import { validateE164Phone, validateEmail } from "../lib/validation";

describe("validateE164Phone", () => {
  it("accepts valid E.164 phone numbers", () => {
    expect(validateE164Phone("+584121234567")).toBe(true);
    expect(validateE164Phone("+14155551234")).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(validateE164Phone("04121234567")).toBe(false);
    expect(validateE164Phone("+58")).toBe(false);
    expect(validateE164Phone("not-a-phone")).toBe(false);
  });

  it("returns true for empty/undefined (optional field)", () => {
    expect(validateE164Phone(undefined)).toBe(true);
    expect(validateE164Phone("")).toBe(true);
  });
});

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("a.b+tag@domain.co")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("@domain.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
  });

  it("returns true for empty/undefined (optional field)", () => {
    expect(validateEmail(undefined)).toBe(true);
    expect(validateEmail("")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/andyfernandez/Projects/condo-agora/apps/web && pnpm test -- --testPathPattern="onboarding/__tests__/validation"`
Expected: FAIL — module not found

- [ ] **Step 3: Implement validation utils**

Create `apps/web/app/onboarding/lib/validation.ts`:

```typescript
const E164_REGEX = /^\+[1-9]\d{6,14}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateE164Phone(phone: string | undefined): boolean {
  if (!phone || phone.trim() === "") return true;
  return E164_REGEX.test(phone.trim());
}

export function validateEmail(email: string | undefined): boolean {
  if (!email || email.trim() === "") return true;
  return EMAIL_REGEX.test(email.trim());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/andyfernandez/Projects/condo-agora/apps/web && pnpm test -- --testPathPattern="onboarding/__tests__/validation"`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/onboarding/lib/validation.ts apps/web/app/onboarding/__tests__/validation.test.ts
git commit -m "feat: add E.164 phone and email validation utils for onboarding"
```

### Task 9: Create CSV Parser

**Files:**
- Create: `apps/web/app/onboarding/lib/csv-parser.ts`
- Create: `apps/web/app/onboarding/__tests__/csv-parser.test.ts`

- [ ] **Step 1: Write failing tests for CSV parser**

Create `apps/web/app/onboarding/__tests__/csv-parser.test.ts`:

```typescript
import { parseOnboardingCSV, type PropertyRow } from "../lib/csv-parser";

describe("parseOnboardingCSV", () => {
  it("parses valid CSV with all columns", () => {
    const csv = `property_name,first_name,last_name,phone,email
Apt 101,María,López,+584121234567,maria@example.com
Apt 102,Carlos,Pérez,+584141234567,`;

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      propertyName: "Apt 101",
      firstName: "María",
      lastName: "López",
      phone: "+584121234567",
      email: "maria@example.com",
    });
    expect(result.rows[1].email).toBe("");
    expect(result.error).toBeNull();
  });

  it("accepts 'property' as alias for 'property_name'", () => {
    const csv = `property,first_name,last_name,phone,email
Apt 101,María,López,+584121234567,maria@example.com`;

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].propertyName).toBe("Apt 101");
    expect(result.error).toBeNull();
  });

  it("returns error when property_name column is missing", () => {
    const csv = `first_name,last_name,phone,email
María,López,+584121234567,maria@example.com`;

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.error).toContain("property_name");
  });

  it("enforces 200 row max", () => {
    const header = "property_name,first_name,last_name,phone,email";
    const rows = Array.from({ length: 201 }, (_, i) => `Apt ${i + 1},,,,`);
    const csv = [header, ...rows].join("\n");

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.error).toContain("200");
  });

  it("skips empty rows", () => {
    const csv = `property_name,first_name,last_name,phone,email
Apt 101,María,López,,
,,,,
Apt 102,,,,`;

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/andyfernandez/Projects/condo-agora/apps/web && pnpm test -- --testPathPattern="onboarding/__tests__/csv-parser"`
Expected: FAIL — module not found

- [ ] **Step 3: Install PapaParse if not already installed**

Run: `cd /Users/andyfernandez/Projects/condo-agora/apps/web && pnpm list papaparse 2>/dev/null || pnpm add papaparse && pnpm add -D @types/papaparse`

Check `apps/web/package.json` first — PapaParse may already be installed from PR #213.

- [ ] **Step 4: Implement CSV parser**

Create `apps/web/app/onboarding/lib/csv-parser.ts`:

```typescript
import Papa from "papaparse";

const MAX_ROWS = 200;
const PROPERTY_COLUMN = "property_name";
const PROPERTY_ALIAS = "property";

export interface PropertyRow {
  id: string;
  propertyName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface ParseResult {
  rows: PropertyRow[];
  error: string | null;
}

export function parseOnboardingCSV(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { rows: [], error: `CSV parse error: ${parsed.errors[0].message}` };
  }

  const headers = parsed.meta.fields || [];
  const hasPropertyCol =
    headers.includes(PROPERTY_COLUMN) || headers.includes(PROPERTY_ALIAS);

  if (!hasPropertyCol) {
    return {
      rows: [],
      error:
        "Missing required column: property_name (or property). Please check your CSV format.",
    };
  }

  const dataRows = parsed.data.filter((row) => {
    const name =
      row[PROPERTY_COLUMN] || row[PROPERTY_ALIAS] || "";
    return name.trim() !== "";
  });

  if (dataRows.length > MAX_ROWS) {
    return {
      rows: [],
      error: `CSV has ${dataRows.length} rows, maximum is ${MAX_ROWS}.`,
    };
  }

  const rows: PropertyRow[] = dataRows.map((row, index) => ({
    id: `csv-${index}`,
    propertyName: (row[PROPERTY_COLUMN] || row[PROPERTY_ALIAS] || "").trim(),
    firstName: (row["first_name"] || "").trim(),
    lastName: (row["last_name"] || "").trim(),
    phone: (row["phone"] || "").trim(),
    email: (row["email"] || "").trim(),
  }));

  return { rows, error: null };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/andyfernandez/Projects/condo-agora/apps/web && pnpm test -- --testPathPattern="onboarding/__tests__/csv-parser"`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/onboarding/lib/csv-parser.ts apps/web/app/onboarding/__tests__/csv-parser.test.ts
git commit -m "feat: add CSV parser with PapaParse for onboarding property import"
```

## Chunk 4: Frontend — Onboarding Page Rewrite

### Task 10: Update i18n Messages

**Files:**
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/es.json`

- [ ] **Step 1: Add/update onboarding keys in en.json**

Update the `onboarding` section in `apps/web/messages/en.json`. Add new keys for the redesigned flow:

```json
{
  "onboarding": {
    "stepProfile": "Your Info",
    "stepOrg": "Organization",
    "stepConfirm": "Confirmation",
    "profileTitle": "Tell us about yourself",
    "profileSubtitle": "You can always update this later",
    "profileFirstName": "First Name",
    "profileLastName": "Last Name",
    "profileEmail": "Email",
    "profilePhone": "Phone",
    "profileSkip": "Skip for now",
    "profileContinue": "Continue",
    "profileHintGoogle": "From your Google login",
    "profileHintEmail": "From your email login",
    "profileHintWhatsapp": "From your WhatsApp login",
    "orgTitle": "Name your community",
    "orgSubtitle": "This is the name residents will see when they join",
    "orgNameLabel": "Organization Name",
    "orgNamePlaceholder": "e.g., Residencias Los Samanes",
    "orgNext": "Next: Add Properties",
    "propertiesTitle": "Add your properties",
    "propertiesSubtitle": "Add properties one by one, use bulk range, or import a CSV",
    "downloadTemplate": "Download Template",
    "importCsv": "Import CSV",
    "bulkRange": "Bulk Range",
    "addRow": "Add Row",
    "dropzoneTitle": "Drag & drop your CSV here",
    "dropzoneSubtitle": "or click \"Import CSV\" above",
    "dropzoneTemplate": "download template",
    "colProperty": "Property Name",
    "colFirstName": "First Name",
    "colLastName": "Last Name",
    "colPhone": "Phone",
    "colEmail": "Email",
    "warningNoContact": "{count} {count, plural, one {property has} other {properties have}} no contact info — will be created without a voter",
    "summaryProperties": "properties",
    "summaryVoters": "with voters",
    "summaryNoContact": "no contact",
    "back": "Back",
    "reviewConfirm": "Review & Confirm",
    "bulkPrefix": "Prefix",
    "bulkPrefixPlaceholder": "e.g., Apt",
    "bulkFrom": "From",
    "bulkTo": "To",
    "bulkAdd": "Add Properties",
    "bulkMaxError": "Maximum {max} properties per range",
    "confirmTitle": "You're all set!",
    "confirmSubtitle": "{orgName} is ready to go",
    "confirmProperties": "Properties",
    "confirmVoters": "Voters Assigned",
    "confirmNoContact": "No Contact Yet",
    "confirmNextTitle": "What happens next",
    "confirmWhatsapp": "{count} WhatsApp invitations",
    "confirmWhatsappSub": "Sent to voters with a phone number",
    "confirmEmail": "{count} email invitations",
    "confirmEmailSub": "Sent to voters with an email address",
    "confirmPending": "{count} properties pending",
    "confirmPendingSub": "You can invite residents from the dashboard anytime",
    "confirmDualNote": "Voters with both phone and email will receive invitations on both channels — the first one they click will activate their account.",
    "confirmCta": "Go to Dashboard",
    "confirmCtaNote": "Invitations will be sent automatically when you press this button",
    "confirmLoading": "Setting up your community...",
    "csvError": "CSV error: {error}",
    "csvMissingProperty": "Missing required column: property_name",
    "maxRowsError": "Maximum {max} rows allowed",
    "invalidPhone": "Invalid phone format (use +country code)",
    "invalidEmail": "Invalid email format",
    "errorRetry": "Something went wrong. Please try again."
  }
}
```

- [ ] **Step 2: Add matching Spanish translations in es.json**

Update the `onboarding` section in `apps/web/messages/es.json`:

```json
{
  "onboarding": {
    "stepProfile": "Tu Información",
    "stepOrg": "Organización",
    "stepConfirm": "Confirmación",
    "profileTitle": "Cuéntanos sobre ti",
    "profileSubtitle": "Siempre puedes actualizar esto después",
    "profileFirstName": "Nombre",
    "profileLastName": "Apellido",
    "profileEmail": "Correo electrónico",
    "profilePhone": "Teléfono",
    "profileSkip": "Omitir por ahora",
    "profileContinue": "Continuar",
    "profileHintGoogle": "De tu inicio de sesión con Google",
    "profileHintEmail": "De tu inicio de sesión con correo",
    "profileHintWhatsapp": "De tu inicio de sesión con WhatsApp",
    "orgTitle": "Nombra tu comunidad",
    "orgSubtitle": "Este es el nombre que los residentes verán al unirse",
    "orgNameLabel": "Nombre de la Organización",
    "orgNamePlaceholder": "ej., Residencias Los Samanes",
    "orgNext": "Siguiente: Agregar Propiedades",
    "propertiesTitle": "Agrega tus propiedades",
    "propertiesSubtitle": "Agrega propiedades una por una, usa rango masivo, o importa un CSV",
    "downloadTemplate": "Descargar Plantilla",
    "importCsv": "Importar CSV",
    "bulkRange": "Rango Masivo",
    "addRow": "Agregar Fila",
    "dropzoneTitle": "Arrastra y suelta tu CSV aquí",
    "dropzoneSubtitle": "o haz clic en \"Importar CSV\" arriba",
    "dropzoneTemplate": "descargar plantilla",
    "colProperty": "Nombre de Propiedad",
    "colFirstName": "Nombre",
    "colLastName": "Apellido",
    "colPhone": "Teléfono",
    "colEmail": "Correo",
    "warningNoContact": "{count} {count, plural, one {propiedad no tiene} other {propiedades no tienen}} información de contacto — se crearán sin votante",
    "summaryProperties": "propiedades",
    "summaryVoters": "con votantes",
    "summaryNoContact": "sin contacto",
    "back": "Atrás",
    "reviewConfirm": "Revisar y Confirmar",
    "bulkPrefix": "Prefijo",
    "bulkPrefixPlaceholder": "ej., Apto",
    "bulkFrom": "Desde",
    "bulkTo": "Hasta",
    "bulkAdd": "Agregar Propiedades",
    "bulkMaxError": "Máximo {max} propiedades por rango",
    "confirmTitle": "¡Todo listo!",
    "confirmSubtitle": "{orgName} está lista para funcionar",
    "confirmProperties": "Propiedades",
    "confirmVoters": "Votantes Asignados",
    "confirmNoContact": "Sin Contacto Aún",
    "confirmNextTitle": "Qué sucede ahora",
    "confirmWhatsapp": "{count} invitaciones por WhatsApp",
    "confirmWhatsappSub": "Enviadas a votantes con número de teléfono",
    "confirmEmail": "{count} invitaciones por correo",
    "confirmEmailSub": "Enviadas a votantes con correo electrónico",
    "confirmPending": "{count} propiedades pendientes",
    "confirmPendingSub": "Puedes invitar residentes desde el panel en cualquier momento",
    "confirmDualNote": "Los votantes con teléfono y correo recibirán invitaciones por ambos canales — el primero que hagan clic activará su cuenta.",
    "confirmCta": "Ir al Panel",
    "confirmCtaNote": "Las invitaciones se enviarán automáticamente al presionar este botón",
    "confirmLoading": "Configurando tu comunidad...",
    "csvError": "Error de CSV: {error}",
    "csvMissingProperty": "Falta la columna requerida: property_name",
    "maxRowsError": "Máximo {max} filas permitidas",
    "invalidPhone": "Formato de teléfono inválido (usa +código de país)",
    "invalidEmail": "Formato de correo inválido",
    "errorRetry": "Algo salió mal. Por favor intenta de nuevo."
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/messages/en.json apps/web/messages/es.json
git commit -m "feat: add i18n messages for redesigned onboarding flow"
```

### Task 11: Create Onboarding Stepper Shell (Main Page)

**Files:**
- Rewrite: `apps/web/app/onboarding/page.tsx`

- [ ] **Step 1: Rewrite the onboarding page as a stepper shell**

Rewrite `apps/web/app/onboarding/page.tsx` to be a stepper container that manages shared state and renders step components. Keep imports minimal — each step is a separate file.

Key state to manage:
```typescript
// Step tracking
const [currentStep, setCurrentStep] = useState(0);

// Step 1: Profile data
const [profileData, setProfileData] = useState({
  firstName: "", lastName: "", email: "", phone: "",
});

// Step 2a: Org name
const [orgName, setOrgName] = useState("");

// Step 2b: Properties table rows
const [rows, setRows] = useState<PropertyRow[]>([]);

// Step 3: Submission state
const [isSubmitting, setIsSubmitting] = useState(false);
```

Steps array: `["profile", "orgName", "properties", "confirmation"]`

Render logic: switch on `currentStep` to render the appropriate step component, passing state and callbacks as props.

Include stepper indicator at top showing progress (reuse design from wireframes: colored badges for each step). Use `useTranslations("onboarding")` for step labels (`stepProfile`, `stepOrg`, `stepConfirm`).

Pre-fill profile data from session (use `useSession()` to get `email`, `phone`, `name`, `image` from NextAuth session).

- [ ] **Step 2: Verify the page compiles**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm --filter web typecheck`
Expected: PASS (step components don't exist yet — use placeholder divs)

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/onboarding/page.tsx
git commit -m "feat: rewrite onboarding page as stepper shell with shared state"
```

### Task 12: Create Step 1 — User Profile Step

**Files:**
- Create: `apps/web/app/onboarding/steps/user-profile-step.tsx`

- [ ] **Step 1: Implement the user profile step component**

Create `apps/web/app/onboarding/steps/user-profile-step.tsx`:

Props:
```typescript
interface UserProfileStepProps {
  data: { firstName: string; lastName: string; email: string; phone: string };
  authProvider: "phone" | "google" | "email" | null;
  onChange: (data: UserProfileStepProps["data"]) => void;
  onContinue: () => void;
  onSkip: () => void;
}
```

UI structure (from wireframe):
- Centered card (max-w-md), avatar placeholder, title + subtitle
- First Name / Last Name side by side
- Email field (with "From your X login" hint if pre-filled)
- Phone field (with E.164 placeholder)
- Footer: "Skip for now" link + "Continue" button
- Calls `completeProfile` mutation on continue/skip
- Uses `useTranslations("onboarding")` for all strings

- [ ] **Step 2: Wire into stepper shell**

Update `apps/web/app/onboarding/page.tsx` to import and render `UserProfileStep` for `currentStep === 0`.

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/onboarding/steps/user-profile-step.tsx apps/web/app/onboarding/page.tsx
git commit -m "feat: add user profile step with auth pre-fill for onboarding"
```

### Task 13: Create Step 2a — Organization Name Step

**Files:**
- Create: `apps/web/app/onboarding/steps/org-name-step.tsx`

- [ ] **Step 1: Implement org name step**

Create `apps/web/app/onboarding/steps/org-name-step.tsx`:

Props:
```typescript
interface OrgNameStepProps {
  orgName: string;
  onChange: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
}
```

UI structure (from wireframe):
- Centered card, building emoji, title "Name your community", subtitle
- Single text input for org name (required — disable Next button if empty)
- "Next: Add Properties" button

- [ ] **Step 2: Wire into stepper shell**

Update `apps/web/app/onboarding/page.tsx` to render `OrgNameStep` for `currentStep === 1`.

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/onboarding/steps/org-name-step.tsx apps/web/app/onboarding/page.tsx
git commit -m "feat: add organization name step for onboarding"
```

### Task 14: Create Properties Table Component

**Files:**
- Create: `apps/web/app/onboarding/components/properties-table.tsx`

- [ ] **Step 1: Implement the editable spreadsheet table**

Create `apps/web/app/onboarding/components/properties-table.tsx`:

Props:
```typescript
interface PropertiesTableProps {
  rows: PropertyRow[];
  onChange: (rows: PropertyRow[]) => void;
}
```

Features:
- Table with columns: #, Property Name, First Name, Last Name, Phone, Email, delete (✕)
- All cells are inline-editable `<input>` elements
- Phone validated on blur using `validateE164Phone` — red border if invalid
- Email validated on blur using `validateEmail` — red border if invalid
- Rows with no phone AND no email: yellow background + warning icon on row number
- Delete button removes row from state
- Tab-separated paste support: detect paste event on any input, parse tab-separated data, populate multiple rows

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/onboarding/components/properties-table.tsx
git commit -m "feat: add editable properties table component for onboarding"
```

### Task 15: Create CSV Dropzone Component

**Files:**
- Create: `apps/web/app/onboarding/components/csv-dropzone.tsx`

- [ ] **Step 1: Implement CSV drag-and-drop zone**

Create `apps/web/app/onboarding/components/csv-dropzone.tsx`:

Props:
```typescript
interface CsvDropzoneProps {
  onImport: (rows: PropertyRow[]) => void;
  onError: (error: string) => void;
}
```

Features:
- Drag-and-drop area with file icon, title, subtitle
- Accepts `.csv` files only
- On drop/select: read file as text, pass to `parseOnboardingCSV()`
- If error, call `onError`; if success, call `onImport` with parsed rows
- Visual drag-over state (blue border highlight)
- Download template link pointing to `/templates/onboarding-template.csv`

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/onboarding/components/csv-dropzone.tsx
git commit -m "feat: add CSV dropzone component for onboarding property import"
```

### Task 16: Create Bulk Range Modal

**Files:**
- Create: `apps/web/app/onboarding/components/bulk-range-modal.tsx`

- [ ] **Step 1: Install shadcn Dialog component**

Run: `cd /Users/andyfernandez/Projects/condo-agora/apps/web && npx shadcn-ui@latest add dialog`

This creates `components/ui/dialog.tsx` with Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter primitives.

- [ ] **Step 2: Implement bulk range modal**

Create `apps/web/app/onboarding/components/bulk-range-modal.tsx`:

Props:
```typescript
interface BulkRangeModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (rows: PropertyRow[]) => void;
}
```

Features:
- Modal/dialog with prefix input, start number, end number
- Generates rows like `{prefix} {n}` for n in [start, end]
- Validates range: start < end, max 200 properties
- "Add Properties" button generates rows and calls `onAdd`
- All fields required in the modal

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/onboarding/components/bulk-range-modal.tsx apps/web/components/ui/dialog.tsx
git commit -m "feat: add bulk range modal for onboarding property generation"
```

### Task 17: Create Step 2b — Properties Step

**Files:**
- Create: `apps/web/app/onboarding/steps/properties-step.tsx`

- [ ] **Step 1: Implement the properties step**

Create `apps/web/app/onboarding/steps/properties-step.tsx`:

Props:
```typescript
interface PropertiesStepProps {
  orgName: string;
  rows: PropertyRow[];
  onChange: (rows: PropertyRow[]) => void;
  onNext: () => void;
  onBack: () => void;
}
```

Composes: `PropertiesTable`, `CsvDropzone`, `BulkRangeModal`

UI structure (from wireframe):
- Header with org name badge, title, subtitle
- Toolbar: Download Template, Import CSV, Bulk Range, + Add Row buttons
- CSV dropzone (shown when table is empty, collapsed otherwise)
- Properties table
- Warning banner (if rows with no contact exist)
- Summary bar: X properties, Y with voters, Z no contact
- Footer: Back + "Review & Confirm" buttons
- "Review & Confirm" validates: at least 1 row, all rows have property name

- [ ] **Step 2: Wire into stepper shell**

Update `apps/web/app/onboarding/page.tsx` to render `PropertiesStep` for `currentStep === 2`.

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/onboarding/steps/properties-step.tsx apps/web/app/onboarding/page.tsx
git commit -m "feat: add properties step with table, CSV import, and bulk range"
```

## Chunk 5: Frontend — Confirmation Step & Integration

### Task 18: Create Step 3 — Confirmation Step

**Files:**
- Create: `apps/web/app/onboarding/steps/confirmation-step.tsx`

- [ ] **Step 1: Install canvas-confetti**

Run: `cd /Users/andyfernandez/Projects/condo-agora/apps/web && pnpm add canvas-confetti && pnpm add -D @types/canvas-confetti`

- [ ] **Step 2: Implement the confirmation step**

Create `apps/web/app/onboarding/steps/confirmation-step.tsx`:

Props:
```typescript
interface ConfirmationStepProps {
  orgName: string;
  rows: PropertyRow[];
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  result: BulkSetupResult["bulkSetupOrganization"] | null;
}
```

UI structure (from wireframe):

**Before submission (result is null):** Show preview summary computed from `rows`:
- Count total properties, voters (rows with phone or email), no-contact
- Count WhatsApp sends (rows with phone), email sends (rows with email)
- Same layout as post-submission but with "estimated" counts

**After submission (result available):** Show actual counts from mutation result.

Both states share the same UI:
- Celebratory header: 🎉 emoji, "You're all set!" title, org name subtitle
- Confetti animation on mount (lightweight canvas-based — use `canvas-confetti` package or inline canvas animation, ~2KB)
- Three stat cards: properties (green), voters (blue), no contact (yellow)
- "What happens next" section with WhatsApp/email/pending counts
- Blue info box about dual-channel delivery
- Full-width "Go to Dashboard" CTA button
- Loading state: button shows spinner + "Setting up your community..."
- Sub-note: "Invitations will be sent automatically when you press this button"

- [ ] **Step 3: Wire into stepper shell**

Update `apps/web/app/onboarding/page.tsx`:
- Render `ConfirmationStep` for `currentStep === 3`
- Wire `onSubmit` to call `BULK_SETUP_ORGANIZATION` mutation, then `updateSession({ hasMemberships: true })`, then `router.push("/dashboard")`
- Handle errors: show toast, keep user on confirmation screen

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm --filter web typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/onboarding/steps/confirmation-step.tsx apps/web/app/onboarding/page.tsx
git commit -m "feat: add confirmation step with celebratory UI and submission logic"
```

### Task 19: End-to-End Integration Test

**Files:**
- Modify: `apps/web/app/onboarding/page.tsx` (if needed for final wiring)

- [ ] **Step 1: Manual smoke test of the full flow**

Start dev servers:
```bash
cd /Users/andyfernandez/Projects/condo-agora && pnpm dev
```

Test the full flow manually:
1. Log in as a new user (or clear `hasMemberships` flag)
2. Verify redirect to `/onboarding`
3. Step 1: Verify pre-fill from auth, fill/skip fields, click Continue
4. Step 2a: Enter org name, click Next
5. Step 2b: Add rows manually, test CSV import, test bulk range
6. Step 3: Verify summary counts, click "Go to Dashboard"
7. Verify redirect to `/dashboard` with org populated

- [ ] **Step 2: Run full frontend test suite**

Run: `cd /Users/andyfernandez/Projects/condo-agora/apps/web && pnpm test`
Expected: All tests PASS

- [ ] **Step 3: Run linting**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm lint`
Expected: PASS

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address integration issues found during smoke test"
```

### Task 20: Clean Up and Final Verification

- [ ] **Step 1: Run full backend test suite**

Run: `cd /Users/andyfernandez/Projects/condo-agora && .venv/bin/python -m pytest apps/api/tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Run full frontend test suite**

Run: `cd /Users/andyfernandez/Projects/condo-agora/apps/web && pnpm test`
Expected: All tests PASS

- [ ] **Step 3: Run lint + typecheck**

Run: `cd /Users/andyfernandez/Projects/condo-agora && pnpm lint && pnpm typecheck`
Expected: Both PASS

- [ ] **Step 4: Create PR**

Create PR from feature branch to master with summary of all changes.
