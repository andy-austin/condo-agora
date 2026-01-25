---
description: "Task list for User Authentication Integration"
---

# Tasks: User Authentication Integration

**Input**: Design documents from `/docs/features/specs/001-user-auth-integration/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/openapi.yaml
**Tests**: Included as per "Strict Type Safety, 100% Test Coverage for Auth Logic" constraint.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create auth feature directory structure in apps/api/src/auth
- [ ] T002 [P] Install backend dependencies (python-jose, passlib[bcrypt]) in apps/api/package.json
- [ ] T003 [P] Configure environment variables (SECRET_KEY, GOOGLE_CLIENT_ID/SECRET) in apps/api/.env
- [ ] T004 [P] Create frontend auth layout and route groups in apps/web/app/(auth)/layout.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Update Prisma schema with User, Organization, OrganizationMember, Invitation models in apps/api/prisma/schema.prisma
- [ ] T006 Run migration to create auth tables in apps/api
- [ ] T007 [P] Implement password hashing utility in apps/api/src/auth/utils.py
- [ ] T008 [P] Implement JWT token generation/decoding in apps/api/src/auth/utils.py
- [ ] T009 [P] Create current_user dependency in apps/api/src/auth/dependencies.py
- [ ] T010 [P] Create React AuthContext provider in apps/web/lib/auth-context.tsx
- [ ] T011 [P] Create API client with token interceptors in apps/web/lib/api.ts

**Checkpoint**: Foundation ready - DB schema applied, Auth utils ready.

---

## Phase 3: User Story 1 - Email Registration & Login (Priority: P1) 🎯 MVP

**Goal**: Enable users to register with email/password, creating/joining an Organization, and login securely.

**Independent Test**: Register a new user -> Log out -> Log in with credentials -> Verify Dashboard access.

### Tests for User Story 1
- [ ] T012 [P] [US1] Create unit tests for registration logic in apps/api/tests/auth/test_register.py
- [ ] T013 [P] [US1] Create unit tests for login/token logic in apps/api/tests/auth/test_login.py

### Implementation for User Story 1
- [ ] T014 [US1] Implement registration logic (User+Org creation) in apps/api/src/auth/service.py
- [ ] T015 [US1] Implement login logic (Credential validation) in apps/api/src/auth/service.py
- [ ] T016 [US1] Create registration endpoint (POST /auth/register) in apps/api/src/auth/router.py
- [ ] T017 [US1] Create login endpoint (POST /auth/login) in apps/api/src/auth/router.py
- [ ] T018 [P] [US1] Create Registration page form in apps/web/app/(auth)/register/page.tsx
- [ ] T019 [P] [US1] Create Login page form in apps/web/app/(auth)/login/page.tsx
- [ ] T020 [US1] Connect Frontend Register/Login forms to API in apps/web/app/(auth)/hooks/use-auth-actions.ts

**Checkpoint**: User Story 1 fully functional.

---

## Phase 4: User Story 2 - User Invitation System (Priority: P2)

**Goal**: Allow authenticated users to invite others to their Organization via email.

**Independent Test**: Admin sends invite -> Recipient gets token -> Recipient uses token to Register -> Verifies Org membership.

### Tests for User Story 2
- [ ] T021 [P] [US2] Create unit tests for invitation creation/validation in apps/api/tests/auth/test_invite.py
- [ ] T022 [P] [US2] Create integration test for invite flow in apps/api/tests/integration/test_invite_flow.py

### Implementation for User Story 2
- [ ] T023 [US2] Implement create_invitation logic in apps/api/src/auth/service.py
- [ ] T024 [US2] Implement accept_invitation logic (add to Org) in apps/api/src/auth/service.py
- [ ] T025 [US2] Create invite endpoints (POST /auth/invite, POST /auth/accept-invite) in apps/api/src/auth/router.py
- [ ] T026 [P] [US2] Create Invite User UI in apps/web/app/dashboard/settings/invite-user.tsx
- [ ] T027 [P] [US2] Create Accept Invite page (Registration variant) in apps/web/app/(auth)/invite/[token]/page.tsx

**Checkpoint**: User Story 2 fully functional.

---

## Phase 5: User Story 3 - Single Sign-On (SSO) (Priority: P2)

**Goal**: Enable Google SSO login and automatic account linking.

**Independent Test**: Click "Login with Google" -> Authenticate with Google -> Redirect back -> Logged in (User created or linked).

### Tests for User Story 3
- [ ] T028 [P] [US3] Create mock tests for SSO flow in apps/api/tests/auth/test_sso.py

### Implementation for User Story 3
- [ ] T029 [US3] Implement Google OAuth2 flow logic in apps/api/src/auth/service.py
- [ ] T030 [US3] Create SSO endpoints (/auth/google/login, /callback) in apps/api/src/auth/router.py
- [ ] T031 [P] [US3] Add "Login with Google" button component in apps/web/components/auth/google-button.tsx
- [ ] T032 [US3] Integrate Google Button into Login/Register pages in apps/web/app/(auth)/login/page.tsx

**Checkpoint**: User Story 3 fully functional.

---

## Phase 6: User Story 4 - Forgot Password Flow (Priority: P3)

**Goal**: Secure password recovery via email.

**Independent Test**: Request reset -> Get Token -> Use Token to set new password -> Login with new password.

### Tests for User Story 4
- [ ] T033 [P] [US4] Create unit tests for password reset logic in apps/api/tests/auth/test_password_reset.py

### Implementation for User Story 4
- [ ] T034 [US4] Implement forgot/reset password logic in apps/api/src/auth/service.py
- [ ] T035 [US4] Create reset endpoints (POST /forgot, POST /reset) in apps/api/src/auth/router.py
- [ ] T036 [P] [US4] Create Forgot Password page in apps/web/app/(auth)/forgot-password/page.tsx
- [ ] T037 [P] [US4] Create Reset Password page in apps/web/app/(auth)/reset-password/[token]/page.tsx

**Checkpoint**: User Story 4 fully functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, security hardening, and documentation.

- [ ] T038 [P] Create middleware for route protection in apps/web/middleware.ts
- [ ] T039 [P] Update Quickstart guide with final auth details in docs/quickstart.md
- [ ] T040 Run full auth test suite (pytest) ensuring 100% coverage
- [ ] T041 Verify linting compliance (pnpm lint) across all new files

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 & 2** (Setup/Foundation) BLOCKS all User Stories.
- **Phase 3** (Registration/Login) BLOCKS Phase 4 (Invites) partially (need a user to invite).
- **Phase 4, 5, 6** can technically run in parallel after Phase 3, but P2 > P3 priority applies.

### Parallel Opportunities
- Backend and Frontend tasks within the same story (e.g., T016 and T018) can run in parallel.
- Tests (T012, T013) can be written alongside frontend scaffolding (T018, T019).

## Implementation Strategy
1. **MVP**: Complete Phase 1, 2, and 3. This gives a working app with Email/Password auth.
2. **Growth**: Add Phase 4 (Invites) to allow team expansion.
3. **Convenience**: Add Phase 5 (SSO) and Phase 6 (Reset) for better UX.
