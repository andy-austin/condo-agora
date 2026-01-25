---
description: "Task list for User Authentication Integration (Clerk)"
---

# Tasks: User Authentication Integration (Clerk)

**Input**: Design documents from `/docs/features/specs/001-user-auth-integration/`
**Prerequisites**: Clerk Account Created (Manual Step), API Keys obtained.

## Phase 1: Setup & Infrastructure

**Purpose**: Install dependencies and configure environment.

- [ ] T001 [P] Install `@clerk/nextjs` in apps/web/package.json
- [ ] T002 [P] Install `svix` and `pyjwt` (or `python-jose`) in apps/api/package.json
- [ ] T003 [P] Configure Clerk Env Vars (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY) in apps/web/.env.local
- [ ] T004 [P] Configure Backend Env Vars (CLERK_WEBHOOK_SECRET, CLERK_ISSUER_URL) in apps/api/.env
- [ ] T005 [P] Wrap Root Layout with `<ClerkProvider>` in apps/web/app/layout.tsx
- [ ] T006 [P] Add Clerk Middleware for route protection in apps/web/middleware.ts

---

## Phase 2: Backend Core (The "Bridge")

**Purpose**: Connect Clerk Identity to Local Database via Webhooks.

**⚠️ CRITICAL**: Must be reliable to ensure data consistency.

- [ ] T007 Update Prisma Schema: Add `User` model with `@unique clerk_id` and `email` in apps/api/prisma/schema.prisma
- [ ] T008 Run Prisma Migration to create User table
- [ ] T009 Implement `verify_webhook` utility using `svix` in apps/api/src/auth/webhooks.py
- [ ] T010 Implement `handle_user_created` and `handle_user_updated` logic in apps/api/src/auth/webhooks.py
- [ ] T011 Create Webhook Endpoint `POST /webhooks/clerk` in apps/api/src/auth/router.py
- [ ] T012 Create `get_current_user` dependency (verifies JWT & fetches DB user) in apps/api/src/auth/dependencies.py
- [ ] T013 Create Unit Tests for Webhook logic (mocking Svix) in apps/api/tests/auth/test_webhooks.py

---

## Phase 3: Frontend Implementation

**Purpose**: User Interface for Authentication.

- [ ] T014 Create Sign In Page (`app/sign-in/[[...sign-in]]/page.tsx`) using `<SignIn />`
- [ ] T015 Create Sign Up Page (`app/sign-up/[[...sign-up]]/page.tsx`) using `<SignUp />`
- [ ] T016 Add `<UserButton />` to the main Dashboard Navbar
- [ ] T017 Create `useAuthToken` hook to easily get the token for API calls in apps/web/hooks/use-auth-token.ts
- [ ] T018 Update API Client (`lib/api.ts`) to inject Clerk Token into Authorization header

---

## Phase 4: Invitation System (Custom)

**Purpose**: Allow inviting users to specific Organizations.

- [ ] T019 Update Prisma Schema: Add `Invitation` model
- [ ] T020 Implement `create_invitation` mutation in apps/api/src/auth/service.py (GraphQL)
- [ ] T021 Implement `accept_invite` logic: Check for pending invites on `user.created` webhook event OR explicit endpoint
- [ ] T022 Create Invite UI in Dashboard (Settings Page)

---

## Phase 5: Verification

- [ ] T023 Manual Test: Sign Up a new user and verify `User` record appears in Postgres
- [ ] T024 Manual Test: Log in and verify "Protected" API call succeeds
- [ ] T025 Run `pytest` for Webhook coverage