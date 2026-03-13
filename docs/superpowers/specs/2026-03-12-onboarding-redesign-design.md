# Onboarding Redesign — Design Spec

**Date:** 2026-03-12
**Status:** Draft

## Overview

Redesign the first-time user onboarding flow into a 3-step single-page stepper: user profile collection, organization + property setup via CSV/spreadsheet, and a celebratory confirmation screen. Evolves the existing `/onboarding` page and `bulkSetupOrganization` backend infrastructure.

## Goals

- Collect admin profile info (pre-filled from auth provider) with zero required fields
- Let admins set up their entire community in one sitting via CSV import, bulk range, or manual entry
- Send invitations to voters via both WhatsApp and email simultaneously
- Land the admin on a fully populated dashboard after onboarding

## Non-Goals

- Resident self-registration flow (separate feature)
- Multi-org onboarding (admin creates one org at a time)
- Payment or subscription setup

## User Flow

```
Login (OTP email / OTP WhatsApp / Google)
  → Middleware detects first-time user (hasMemberships=false)
  → Redirect to /onboarding

Step 1: User Profile
  → Pre-filled fields from auth provider
  → All optional, "Skip for now" available
  → Calls completeProfile mutation
  → Advances to Step 2

Step 2: Organization + Properties
  → Part A: Organization name (required)
  → Part B: Properties table (CSV, bulk range, or manual)
  → Advances to Step 3

Step 3: Confirmation
  → Summary stats + "What happens next"
  → "Go to Dashboard" triggers bulkSetupOrganization
  → Sends invitations via both channels
  → Updates session, redirects to /dashboard
```

## Step 1: User Profile

### UI

- Centered card (max-width 480px) with avatar placeholder
- Fields: First Name, Last Name (side-by-side), Email, Phone
- Pre-filled values show a hint: "From your Google login" / "From your WhatsApp login"
- "Skip for now" link at bottom left, "Continue" button at bottom right
- Nudge text below heading: "You can always update this later"

### Pre-fill Matrix

| Field | OTP (email) | OTP (WhatsApp) | Google |
|-------|-------------|----------------|--------|
| Email | Yes | No | Yes |
| Phone | No | Yes | No |
| First Name | No | No | Yes (parsed) |
| Last Name | No | No | Yes (parsed) |

### Behavior

- All fields optional — no validation blocking
- "Continue" calls `completeProfile` mutation with whatever was filled
- "Skip for now" calls `completeProfile` with empty fields
- Updates session flag: `requiresProfileCompletion = false`
- Phone field uses E.164 format hint (placeholder: "+58 412 123 4567")

### Backend

No changes — reuses existing `completeProfile` mutation and session flag logic.

## Step 2: Organization + Properties

### Part A: Organization Name

- Focused single-input screen with building emoji
- Heading: "Name your community"
- Subtitle: "This is the name residents will see when they join"
- Organization name is the only required field in the entire onboarding flow
- "Next: Add Properties" button advances to Part B

### Part B: Properties Table

#### Layout

- Toolbar with description + action buttons: Download Template, Import CSV, Bulk Range, + Add Row
- Drag-and-drop zone for CSV (visible when table is empty, collapses after data added)
- Editable spreadsheet table with columns:
  - `#` (row number)
  - `Property Name` (required)
  - `First Name` (optional)
  - `Last Name` (optional)
  - `Phone` (optional, E.164 validated)
  - `Email` (optional, format validated)
  - Delete row button (✕)
- Warning banner for rows missing both phone and email
- Summary bar: property count, voters count, no-contact count
- "Back" and "Review & Confirm" buttons

#### Three Input Methods

1. **CSV Import:** Drag-drop or file picker. Parsed with PapaParse. Columns: `property_name`, `first_name`, `last_name`, `phone`, `email`. Downloadable template provided. Max 200 rows.

2. **Bulk Range:** Modal with prefix + start/end number. Example: prefix "Apt", range 101–120 creates "Apt 101" through "Apt 120". Properties created with no voter info (admin fills in contact details after).

3. **Manual Entry:** "+ Add Row" appends an empty row. All cells are inline-editable. Paste from Excel/Sheets supported (tab-separated parsing).

#### Validation

- Property name required per row (red border if empty on submit attempt)
- Phone validated as E.164 on blur (red border + tooltip if invalid)
- Email validated as format on blur
- Rows with no phone AND no email: yellow background + warning icon in row number
- Warning banner shows count: "X properties have no contact info — they will be created without a voter"
- Warnings do not block submission

### Backend

No changes to Part A. Part B collects data in React state only — no mutation called until Step 3.

## Step 3: Confirmation

### UI

- Celebratory header: large emoji (🎉), "You're all set!" heading, org name subtitle
- Lightweight confetti animation on page load (CSS/canvas, no heavy library)
- Three stat cards in a row:
  - Green: total properties count
  - Blue: voters assigned count
  - Yellow: properties without contact count
- "What happens next" section:
  - 📲 "X WhatsApp invitations — Sent to voters with a phone number"
  - 📧 "Y email invitations — Sent to voters with an email address"
  - 🏠 "Z properties pending — You can invite residents from the dashboard anytime"
- Blue info box: "Voters with both phone and email will receive invitations on both channels — the first one they click will activate their account."
- Full-width CTA button: "Go to Dashboard →"
- Subtle note below button: "Invitations will be sent automatically when you press this button"
- No back button (browser back via React state still works)

### Behavior

On "Go to Dashboard" click:

1. Call `bulkSetupOrganization` mutation with org name + all rows
2. Mutation creates org, houses, users, memberships, and invitation records
3. Invitations sent via both WhatsApp (Twilio) and email (Resend) for each voter
4. Update session: `hasMemberships = true`
5. Redirect to `/dashboard`

### Loading State

- Button shows spinner + "Setting up your community..."
- Disable back navigation during mutation
- On error: show toast with retry option, keep user on confirmation screen

## Backend Changes

### Extend `BulkSetupRow` Input

Add `email` field (optional string, validated format):

```python
# Current
class BulkSetupRow:
    row_id: str
    property_name: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]

# New
class BulkSetupRow:
    row_id: str
    property_name: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]  # NEW
```

### Extend `BulkSetupResult` Output

Add invitation counts:

```python
# New fields
class BulkSetupResult:
    organization: Organization
    total_properties: int
    total_residents: int
    whatsapp_invitations_sent: int  # NEW
    email_invitations_sent: int     # NEW
    properties_without_contact: int  # NEW
    rows: List[BulkSetupRowResult]
```

### Extend Onboarding Service

Update `apps/api/src/onboarding/service.py`:

1. **User creation by email:** Currently only finds/creates users by phone. Add logic to find/create by email when only email is provided.

2. **Dual-channel invitation sending:** For each row with contact info:
   - Create invitation record with `method: "WHATSAPP"` if phone present → send via Twilio
   - Create invitation record with `method: "EMAIL"` if email present → send via Resend
   - Voters with both get two invitation records (one per channel), same token so either activates the account

3. **Count tracking:** Track and return `whatsapp_invitations_sent`, `email_invitations_sent`, `properties_without_contact` in the result.

### Update CSV Template

Update `apps/web/public/templates/onboarding-template.csv`:

```csv
property_name,first_name,last_name,phone,email
Apt 101,María,López,+58412555101,maria@email.com
Apt 102,Carlos,Pérez,+58414555102,
Apt 103,,,,
```

## What We Reuse vs. What's New

| Component | Action |
|-----------|--------|
| `completeProfile` mutation | Reuse as-is |
| `bulkSetupOrganization` mutation | Extend (add email, dual-send, counts) |
| Middleware redirects | Reuse as-is |
| Session flags (`hasMemberships`, `requiresProfileCompletion`) | Reuse as-is |
| Onboarding service (`src/onboarding/service.py`) | Extend (email users, dual invitations) |
| CSV template | Update (add email column) |
| Frontend `/onboarding` page | Rewrite UI (3-step stepper) |
| Invitation model | Reuse as-is (supports email + link methods) |
| Twilio WhatsApp sending | Reuse existing infrastructure |
| Resend email sending | Reuse existing infrastructure |

## i18n

All user-facing strings must be added to both `apps/web/messages/en.json` and `apps/web/messages/es.json` using `next-intl`. Spanish is the default locale.

## Error Handling

- **Network failure on mutation:** Toast with "Something went wrong. Please try again." + retry button. User stays on confirmation screen.
- **Partial row failures:** `bulkSetupOrganization` already handles per-row errors. On confirmation screen, show a warning if some rows failed with option to retry failed rows or continue to dashboard.
- **Invalid CSV format:** Show error toast with details (e.g., "Missing required column: property_name"). Don't populate table.
- **Duplicate phone/email in CSV:** Highlight duplicate rows in table, warn but don't block.

## Testing Strategy

- **Backend:** Extend existing `test_onboarding_service.py` with cases for email-only users, dual-channel sending, and count tracking.
- **Frontend:** Jest tests for stepper navigation, CSV parsing, table editing, validation logic.
- **E2E:** Playwright test covering full flow: login → profile → org + manual properties → confirm → dashboard.
