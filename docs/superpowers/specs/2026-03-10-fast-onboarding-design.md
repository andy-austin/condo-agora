# Fast Onboarding: Bulk Organization Setup

**Date:** 2026-03-10
**Status:** Approved

## Overview

Redesign the onboarding flow into a single-page experience that lets an admin create an organization, bulk-add properties, and assign residents via phone number — using CSV import or manual entry. Admin-only feature.

## Prerequisites

**Clerk Dashboard configuration required before implementation:**
- Enable "Phone number" as an authentication identifier (Authentication > Email, Phone, Username)
- Enable SMS OTP as a first-factor verification method
- Note: SMS costs apply per Clerk plan and region — review pricing for large orgs (100+ units)

## User Flow

1. Admin enters organization name
2. Chooses method: **Import from file** (CSV/XLSX) or **Add manually**
   - Import: drag-and-drop zone + downloadable CSV template with preview
   - Manual: goes straight to editable table with bulk-add (prefix+range) and row-by-row entry
3. Editable spreadsheet table — columns: #, Property, First Name, Last Name, Phone, Status
   - Filter tabs: All | Pending | Completed
   - Action bar: + Add row, + Bulk add (range), Paste from clipboard
   - Scrollable body with sticky column header
   - Sticky bottom bar: status counts + "Create Organization" button
4. On submit: creates org, properties, Clerk users (phone-only), org memberships, house assignments

**Authorization:** Any authenticated user can call this mutation. The calling user becomes the ADMIN of the newly created organization (same as current `createOrganization` behavior).

**Batch size limit:** Maximum 200 rows per submission to avoid serverless function timeouts on Vercel.

## Resident Account Flow

- Clerk user created with phone number as primary identifier (SMS OTP)
- SMS OTP always available for login
- On first login, redirect to `/complete-profile` page
- Resident can optionally add email + password for convenience
- `requires_profile_completion` flag in Clerk `unsafe_metadata` controls the redirect

### Complete Profile Redirect

Middleware at `apps/web/middleware.ts` checks `requires_profile_completion` in Clerk metadata:
- **Applies to:** all authenticated routes except `/complete-profile`, `/sign-in`, `/sign-up`, and `/api/*`
- **On completion:** call Clerk `updateUser` to remove the flag, then redirect to `/dashboard`
- **Skip for:** users who don't have the flag (existing email-based users)

## Backend

### Data Model Changes

**User model** (`models/user.py`) — changes:
- `email: str` → `email: Optional[str] = None` (phone-only users won't have email)
- Add `phone_number: Optional[str] = None`
- Add `requires_profile_completion: bool = False`

**Database indexes:**
- Add unique sparse index on `phone_number` in `users` collection
- Existing unique index on `email` must become a sparse index (to allow null emails)

**No new collections.** Existing Organization, House, OrganizationMember models are sufficient.

### Webhook Handler Update (`webhooks.py`)

The `handle_user_created` webhook must be updated to handle phone-only users:
- Don't skip users without email — extract phone number instead
- Upsert by `clerk_id` (already idempotent) to avoid race condition with bulk mutation creating the same local user
- The bulk mutation creates local users directly, and the Clerk `user.created` webhook may fire for the same user — the upsert ensures no duplicates

### New Utility: `create_phone_user` in `clerk_utils.py`

Creates a Clerk user with phone number as primary identifier. Payload:

```json
{
  "phone_number": "+584121234567",
  "first_name": "María",
  "last_name": "García",
  "unsafe_metadata": {
    "requires_profile_completion": true,
    "organization_id": "...",
    "house_id": "..."
  }
}
```

### New Mutation: `bulkSetupOrganization`

Single GraphQL mutation that orchestrates:

1. Create organization
2. Bulk-create properties
3. For rows with phone numbers:
   - Create Clerk user (phone-only)
   - Create local user record in MongoDB (upsert by `clerk_id`)
   - Create org membership (RESIDENT role)
   - Assign user to house
   - Set user as designated voter for the house

**Input:**

```graphql
input BulkSetupInput {
  organizationName: String!
  rows: [BulkSetupRow!]!
}

input BulkSetupRow {
  rowId: String!        # Client-generated UUID for idempotency
  propertyName: String!
  firstName: String
  lastName: String
  phone: String         # Must be E.164 format: +[country][number]
}
```

**Response:**

```graphql
type BulkSetupResult {
  organization: Organization!
  totalProperties: Int!
  totalResidents: Int!
  rows: [BulkSetupRowResult!]!
}

type BulkSetupRowResult {
  rowId: String!
  status: RowStatus!  # SUCCESS, ERROR, SKIPPED
  error: String
  propertyId: ID
  userId: ID
}
```

**Error handling:** Partial success allowed. Failed rows return per-row errors. Already-created resources are not rolled back.

**Idempotency keys:**
- Properties: matched by `rowId` (client-generated UUID sent with each row)
- Users: matched by `phone_number` (natural unique key) — if a Clerk user with that phone exists, skip creation and link existing user

### Phone Number Validation

- **Format:** E.164 — `+[country code][number]`, no spaces, dashes, or parentheses
- **Client-side:** normalize before submission (strip spaces/dashes, ensure `+` prefix). Use a regex: `/^\+[1-9]\d{6,14}$/`
- **Server-side:** validate E.164 format before calling Clerk API. Reject invalid numbers with per-row error.
- **Both sides validate** — client for UX, server for safety.

## Frontend

### Modified: `apps/web/app/onboarding/page.tsx` (full rewrite)

Single-page layout:
- Org name input at top
- Method toggle (Import / Manual)
- Import panel: drag-and-drop, CSV template download, PapaParse for parsing
- Editable table with filter tabs, inline editing, sticky footer
- Bulk-add modal (prefix + range)
- Paste handler (tab-separated clipboard data)
- Submit calling `bulkSetupOrganization`

**Client-side state:**

```typescript
type OnboardingRow = {
  id: string           // client-side UUID (sent as rowId)
  property: string
  firstName: string
  lastName: string
  phone: string
  status: 'pending' | 'completed' | 'error'
  error?: string
}
```

### New: `apps/web/app/complete-profile/page.tsx`

- Shown after first SMS OTP login when `requires_profile_completion` is true
- Fields: email (optional), password (optional), first name, last name
- On submit: update Clerk user (add email/password), update local user record, clear `requires_profile_completion` flag
- Redirect to `/dashboard` after completion

### New Dependencies

- `papaparse` — CSV parsing

XLSX support deferred to a future iteration. CSV-only for v1.

### CSV Template

Columns: `property`, `first_name`, `last_name`, `phone`

| Column | Required | Example |
|--------|----------|---------|
| property | Yes | Apto 101 |
| first_name | No | María |
| last_name | No | García |
| phone | No | +584121234567 |

Template downloadable as static file. Preview shown inline below the drop zone.

**Parsing:** match by column position (not header name) to avoid i18n issues. First row treated as header and skipped regardless of content.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Duplicate phone numbers in CSV | Flag during client-side validation, highlight both rows |
| Phone already exists in Clerk | Link existing Clerk user instead of creating new one |
| Empty property name | Required — block submit, highlight row |
| Extra CSV columns | Ignored |
| Missing `property` CSV column | Reject file with error message |
| Admin leaves page mid-edit | `beforeunload` warning |
| 0 residents assigned | Allowed — properties created without residents |
| Duplicate property names | Allowed |
| More than 200 rows | Block submit, show error "Maximum 200 properties per batch" |
| Invalid phone format | Per-row error, highlighted in red |
| Webhook race condition | Upsert by `clerk_id` — both bulk mutation and webhook are safe |

## Retry on Partial Failure

- Error rows stay editable on the table
- Admin fixes issues (e.g., invalid phone format)
- "Retry failed rows" button re-submits only error rows
- Idempotency: properties matched by `rowId`, users matched by `phone_number`

## i18n

All strings through next-intl. Spanish (default) and English for all labels, errors, placeholders. CSV template column headers are fixed English (`property`, `first_name`, `last_name`, `phone`) — parsing by column position avoids language mismatch issues.
