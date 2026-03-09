# Testing Roadmap — Condo Agora E2E

## Bugs Found in Manual Testing

> These bugs were discovered during a manual E2E walkthrough of the invitation flow (2026-03-08).
> Each item maps to a GitHub issue and belongs in the **Milestone: Invitation Flow Fixes** milestone.

### [BUG] Clerk invitation link does not redirect to app after sign-up
- **Issue title**: `fix: Clerk invitation accept link doesn't redirect back to app`
- **Labels**: `bug`, `auth`, `backend`, `frontend`
- **Milestone**: `Invitation Flow Fixes`
- **Description**: When a new user clicks "Accept invitation" in the email, Clerk handles sign-up on its hosted page (`accounts.dev`) but never redirects to the app. Root cause: `create_clerk_invitation()` is called without `redirect_url`, and `ClerkProvider`/`<SignUp>` lack `afterSignUpUrl`.
- **Affected files**: `service.py`, `layout.tsx`, `sign-up/page.tsx`
- **Fix**: Pass `redirect_url="https://condo-agora.vercel.app/dashboard"` in `create_clerk_invitation()` call; add `afterSignUpUrl="/dashboard"` to ClerkProvider and SignUp component.
- **Status**: Fixed

### [BUG] Invited users not associated with organization after sign-up
- **Issue title**: `fix: Invited users not added to org when JIT provisioning runs`
- **Labels**: `bug`, `auth`, `backend`, `critical`
- **Milestone**: `Invitation Flow Fixes`
- **Description**: Users who accept an invitation land in the app with no org membership. The JIT provisioning path (`_provision_user_from_clerk()`) creates the user record but never checks for pending invitations. The webhook handler has this logic but can lose the race.
- **Affected files**: `dependencies.py`
- **Fix**: Mirror `handle_user_created()` invitation logic in `_provision_user_from_clerk()`, guarded by an existing-member check to prevent duplicates.
- **Status**: Fixed

### [BUG] Invitation email shows "Personal workspace" instead of org name
- **Issue title**: `fix: Invitation email shows "Personal workspace" instead of organization name`
- **Labels**: `bug`, `ux`, `clerk`
- **Milestone**: `Invitation Flow Fixes`
- **Description**: The Clerk invitation email body reads "Personal workspace has invited you to join them on condo-agora." This is the Clerk instance display name, not the actual org. Requires configuring the Clerk instance display name or customizing the email template.
- **Affected files**: Clerk Dashboard configuration (not code)
- **Status**: Open

### [BUG] No UI feedback when sending an invitation
- **Issue title**: `fix: Invite form shows no success/error feedback after submission`
- **Labels**: `bug`, `ux`, `frontend`
- **Milestone**: `Invitation Flow Fixes`
- **Description**: The "Send Invite" button submits silently. On success, the form doesn't clear or show a toast. On error (e.g. duplicate), the error is logged to console but no message is shown to the user.
- **Affected files**: `apps/web/app/dashboard/settings/page.tsx` (or the Settings component)
- **Status**: Open

---

## Current State Assessment

### Existing E2E Tests (11 spec files)

| File | Coverage | Auth Mode |
|------|----------|-----------|
| `landing.spec.ts` | Hero, nav, i18n, pricing, mobile menu | No auth |
| `health.spec.ts` | Status badges, refresh | No auth |
| `auth.spec.ts` | Sign-in/up components, nav bar | Mocked Clerk |
| `dashboard.spec.ts` | Welcome greeting, nav cards | Mocked Clerk + GraphQL |
| `properties.spec.ts` | CRUD, detail, auto-redirect | Mocked Clerk + GraphQL |
| `residents.spec.ts` | Resident list, role badges, empty state | Mocked Clerk + GraphQL |
| `rbac.spec.ts` | Admin vs non-admin UI visibility | Mocked GraphQL only |
| `invitation.spec.ts` | Send invite, form clear, role options | Mocked GraphQL only |
| `committee.spec.ts` | Member sections, role dropdowns, role change | Mocked GraphQL only |
| `onboarding.spec.ts` | 3-step org creation wizard | Mocked Clerk + GraphQL |
| `notes-api.spec.ts` | Direct GraphQL CRUD | API-level (no browser) |

### Key Gaps Identified

1. **No real-auth E2E tests** — All tests use mocked Clerk auth or mocked GraphQL. No tests verify actual login + backend authorization.
2. **No per-role real user tests** — Three real accounts exist (`admin@agora.com`, `resident@agora.com`, `member@agora.com`) but aren't used.
3. **RBAC tests are mock-only** — `rbac.spec.ts` mocks the `Me` query role. A real backend could still serve restricted data if authorization is broken.
4. **No cross-role mutation enforcement tests** — e.g., verifying that a RESIDENT hitting `createHouse` via GraphQL gets rejected.
5. **No negative authorization tests** — Nobody tests what happens when a non-admin tries to invoke admin-only mutations through the real backend.
6. **Missing dashboard role-specific content** — Admin "Quick Actions" section not tested per role.
7. **No settings Organization tab tests** — The form disable behavior for non-admins isn't tested.
8. **No multi-organization scenarios** — User belonging to multiple orgs.
9. **No error/edge case flows** — Network failures, invalid tokens, expired sessions.
10. **No resident-to-house assignment flow tests** — Admin assigning/removing residents from properties.

---

## Test Users

| Email | Role | Password |
|-------|------|----------|
| `admin@agora.com` | ADMIN | `3AgF…XrXqBX0Qa` |
| `resident@agora.com` | RESIDENT | `3AgF…XrXqBX0Qa` |
| `member@agora.com` | MEMBER | `3AgF…XrXqBX0Qa` |

---

## Roadmap

### P0 — Critical: Real Auth + Role Enforcement (Backend Authorization)

These tests verify the backend actually enforces permissions, not just the UI.

#### `e2e/real-auth.spec.ts` — Real Login Per Role
- [ ] Admin can log in and reaches dashboard
- [ ] Resident can log in and reaches dashboard
- [ ] Member can log in and reaches dashboard
- [ ] Each user sees correct role in settings page
- [ ] Auth state is cached per role for test speed

#### `e2e/real-rbac.spec.ts` — Backend Authorization Enforcement
- [ ] **Admin** can create a property (end-to-end through real backend)
- [ ] **Resident** cannot create a property (mutation rejected by backend)
- [ ] **Member** cannot create a property (mutation rejected by backend)
- [ ] **Admin** can send an invitation
- [ ] **Resident** cannot send an invitation
- [ ] **Member** cannot send an invitation
- [ ] **Admin** can change a member's role
- [ ] **Non-admin** cannot change a member's role
- [ ] **Admin** can edit a property name
- [ ] **Non-admin** cannot edit a property name
- [ ] **Admin** can delete a property
- [ ] **Non-admin** cannot delete a property

> **Why P0:** If backend authorization is broken, the UI-level RBAC tests give false confidence. These are the only tests that catch real permission escalation bugs.

---

### P1 — High: Role-Specific UI Behavior (Real Auth)

These use real login with each role to verify the UI correctly adapts.

#### `e2e/dashboard-roles.spec.ts` — Dashboard Per Role
- [ ] **Admin** sees Quick Actions section (Add Property, Invite Member, Manage Committee)
- [ ] **Resident** does NOT see Quick Actions section
- [ ] **Member** does NOT see Quick Actions section
- [ ] All roles see stat cards, recent members, properties summary
- [ ] Onboarding checklist visibility per role

#### `e2e/properties-roles.spec.ts` — Properties Page Per Role
- [ ] **Admin** sees Add Property button, Delete buttons, Edit on detail
- [ ] **Resident** sees properties list but no Add/Delete/Edit
- [ ] **Member** sees properties list but no Add/Delete/Edit
- [ ] **Resident** assigned to a house sees their unit highlighted/indicated
- [ ] Grid and Table view work for all roles

#### `e2e/committee-roles.spec.ts` — Committee Page Per Role
- [ ] **Admin** sees role change dropdowns for all members
- [ ] **Resident** sees member list but no role dropdowns
- [ ] **Member** sees member list but no role dropdowns
- [ ] Admin changes member role and sees immediate UI update

#### `e2e/settings-roles.spec.ts` — Settings Page Per Role
- [ ] **Admin** sees invite form + editable org fields
- [ ] **Resident** sees member list but "only administrators" message, org fields disabled
- [ ] **Member** sees member list but "only administrators" message, org fields disabled
- [ ] Settings Organization tab: admin can edit, non-admin sees disabled fields
- [ ] Members search works for all roles

---

### P2 — Medium: Functional Flows End-to-End

Full user journeys with real auth (primarily admin).

#### `e2e/property-lifecycle.spec.ts` — Property CRUD Lifecycle
- [ ] Admin creates property -> appears in list
- [ ] Admin edits property name -> name updates
- [ ] Admin deletes empty property -> removed from list
- [ ] Admin cannot delete property with assigned residents (button disabled)

#### `e2e/invitation-lifecycle.spec.ts` — Invitation Flow
- [ ] Admin sends invitation with MEMBER role
- [ ] Admin sends invitation with RESIDENT role
- [ ] Admin sends invitation with ADMIN role
- [ ] Duplicate email invitation handling (error message)
- [ ] Invalid email format validation
- [ ] Invited user is redirected to `/dashboard` after sign-up _(see Bug: redirect)_
- [ ] Invited user sees org membership on first load _(see Bug: JIT org association)_

#### `e2e/resident-assignment.spec.ts` — Resident Assignment
- [ ] Admin assigns resident to a house
- [ ] Admin removes resident from a house
- [ ] House occupancy badge updates (Vacant -> Occupied)
- [ ] Assigned resident sees their unit on dashboard/committee

#### `e2e/role-change-lifecycle.spec.ts` — Role Change Flow
- [ ] Admin promotes member to admin
- [ ] Admin demotes admin to member (if not last admin)
- [ ] Cannot remove the last admin (error shown)
- [ ] User cannot demote themselves (error shown)
- [ ] Role change reflects across all pages (committee, settings, dashboard)

---

### P3 — Low: Edge Cases & Error Handling

#### `e2e/error-states.spec.ts`
- [ ] GraphQL network failure shows error state with retry button
- [ ] Retry button re-fetches data
- [ ] Invalid property ID in URL shows error
- [ ] Expired session redirects to sign-in

#### `e2e/empty-states.spec.ts`
- [ ] Dashboard with no properties shows empty state
- [ ] Dashboard with no members shows empty state
- [ ] Properties page with no properties shows empty state + hint
- [ ] Committee page with no members shows empty state
- [ ] Settings search with no results shows empty state

#### `e2e/responsive.spec.ts`
- [ ] Mobile: sidebar hamburger menu opens/closes
- [ ] Mobile: table columns hide appropriately
- [ ] Mobile: property grid switches to single column
- [ ] Mobile: settings tab nav scrolls horizontally
- [ ] Desktop: sidebar collapse/expand works

#### `e2e/navigation.spec.ts`
- [ ] Sidebar links navigate to correct pages
- [ ] Breadcrumbs work on property detail page
- [ ] Back navigation preserves state
- [ ] Disabled sidebar items (Proposals, Voting, Reports) are not clickable

---

### P4 — Future: Advanced Scenarios

#### Multi-Organization
- [ ] User with multiple org memberships can switch context
- [ ] Role is scoped per organization (admin in one, member in another)

#### Onboarding (Real Auth)
- [ ] New user without organization sees onboarding flow
- [ ] Complete onboarding creates org + properties + redirects to dashboard

#### Accessibility
- [ ] Keyboard navigation through all interactive elements
- [ ] Screen reader compatibility (ARIA labels, roles)
- [ ] Focus management on modal/dialog open/close

#### Performance
- [ ] Dashboard loads within 3 seconds
- [ ] Property list with 50+ items loads and scrolls smoothly

---

## Implementation Order

```
Phase 1 (P0): Real auth fixtures + backend authorization tests
  └── Estimated: 2 spec files, ~15 test cases
  └── Prerequisite: Update auth.ts to support multi-user login

Phase 2 (P1): Role-specific UI tests with real auth
  └── Estimated: 4 spec files, ~25 test cases
  └── Can reuse Phase 1 auth fixtures

Phase 3 (P2): End-to-end functional flows
  └── Estimated: 4 spec files, ~20 test cases
  └── Requires test data setup/teardown strategy

Phase 4 (P3-P4): Edge cases, responsive, accessibility
  └── Estimated: 4+ spec files, ~25 test cases
  └── Can be done incrementally
```

## Infrastructure Changes Needed

### 1. Multi-Role Auth Fixture (auth.ts update)

Add support for logging in as different roles:

```typescript
// New test users
const TEST_USERS = {
  admin:    { email: 'admin@agora.com',    password: '3AgF…XrXqBX0Qa' },
  resident: { email: 'resident@agora.com', password: '3AgF…XrXqBX0Qa' },
  member:   { email: 'member@agora.com',   password: '3AgF…XrXqBX0Qa' },
};

// Separate auth state files per role
const AUTH_STATE_PATHS = {
  admin:    path.join(__dirname, '../.auth/admin.json'),
  resident: path.join(__dirname, '../.auth/resident.json'),
  member:   path.join(__dirname, '../.auth/member.json'),
};

// New fixtures: adminPage, residentPage, memberPage
```

### 2. Test Data Management

For P2+ tests that create/modify data:
- GraphQL helper to create/delete test properties before/after tests
- Consistent test data naming convention (e.g., `[E2E] Test Property`)
- Cleanup in `afterAll` or `globalTeardown`

### 3. Environment Variables

```bash
E2E_ADMIN_EMAIL=admin@agora.com
E2E_RESIDENT_EMAIL=resident@agora.com
E2E_MEMBER_EMAIL=member@agora.com
E2E_USER_PASSWORD=3AgF…XrXqBX0Qa
```

---

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Total E2E test cases | ~35 | ~120 |
| Real-auth test cases | 0 | ~60 |
| Role-specific test cases | ~8 (mocked) | ~40 (real + mocked) |
| Backend auth enforcement tests | 0 | ~12 |
| Page coverage | 7/11 routes | 11/11 routes |
| Mobile-specific tests | 1 (landing) | ~10 |
| Bugs found in manual testing | 4 | 0 |
