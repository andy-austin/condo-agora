---
description: "Task list for House Account Management"
---

# Tasks: House Account Management

**Input**: Design documents from `/docs/features/specs/002-house-account-management/`
**Prerequisites**: Feature 001 (User Auth) completed.

## Phase 1: Setup & Infrastructure

**Purpose**: Update database schema and generate clients.

- [X] T001 Update Prisma Schema: Add `House` model and update `OrganizationMember` and `Invitation` relations in apps/api/prisma/schema.prisma
- [X] T002 Run Prisma Migration to apply changes (migration name: `add_house_model`)
- [X] T003 Generate Prisma Client for API (`pnpm --filter api prisma:generate`)

---

## Phase 2: Foundational (Backend Core)

**Purpose**: Core logic for House management.

- [ ] T004 [P] Create `House` GraphQL type in apps/api/graphql_types/house.py
- [ ] T005 [P] Update `Organization` type to include `houses` and `housesCount` in apps/api/graphql_types/auth.py
- [ ] T006 [P] Update `OrganizationMember` type to include `house` field in apps/api/graphql_types/auth.py
- [ ] T007 Implement `House` CRUD service functions in apps/api/src/house/service.py
- [ ] T008 [P] Implement `removeResidentFromHouse` service logic with "last house" validation in apps/api/src/house/service.py
- [ ] T009 Create `House` resolvers (Query/Mutation) in apps/api/resolvers/house.py
- [ ] T010 Create `House` schema definitions in apps/api/schemas/house.py
- [ ] T011 Register `House` schema in root `apps/api/schema.py`
- [ ] T012 Create unit tests for House CRUD service in apps/api/tests/house/test_service.py

---

## Phase 3: House Inventory Management (User Story 1)

**Purpose**: Admin interface for managing houses.

- [ ] T013 [P] [US1] Create API Client queries for House management (`GET_HOUSES`, `CREATE_HOUSE`, `DELETE_HOUSE`) in apps/web/lib/api.ts
- [ ] T014 [P] [US1] Create `HouseList` component in apps/web/components/properties/HouseList.tsx
- [ ] T015 [US1] Create `CreateHouseDialog` component in apps/web/components/properties/CreateHouseDialog.tsx
- [ ] T016 [US1] Implement Properties Page (`/dashboard/properties`) in apps/web/app/dashboard/properties/page.tsx
- [ ] T017 [US1] Implement Single-House "Smart Default" redirection logic in `apps/web/app/dashboard/properties/page.tsx` (redirect to detail if count=1)
- [ ] T018 [US1] Create House Detail Page (`/dashboard/properties/[id]`) in apps/web/app/dashboard/properties/[id]/page.tsx

---

## Phase 4: Assigning Residents to Houses (User Story 2)

**Purpose**: Invitation flow extension and assignment.

- [ ] T019 [US2] Update `create_invitation` service to accept optional `house_id` in apps/api/src/auth/service.py
- [ ] T020 [US2] Update `createInvitation` mutation to accept `houseId` argument in apps/api/schemas/auth.py
- [ ] T021 [US2] Update `accept_invitation` logic to link user to House upon acceptance in apps/api/src/auth/service.py
- [ ] T022 [US2] Update Invitation UI in Settings Page to include "Assign to House" dropdown in apps/web/app/dashboard/settings/page.tsx
- [ ] T023 [US2] Implement "Smart Defaulting" in Invite UI (hide House selector if Org has only 1 House) in apps/web/app/dashboard/settings/page.tsx
- [ ] T024 [US2] Create integration test for Invitation flow with House assignment in apps/api/tests/auth/test_invitation_house.py

---

## Phase 5: Resident Identity (User Story 3)

**Purpose**: Display house info on profile.

- [ ] T025 [P] [US3] Create `useUser` hook (wrapping `me` query) including `memberships { house { name } }` in apps/web/hooks/use-user.ts
- [ ] T026 [P] [US3] Update `UserButton` or Profile display to show assigned House name in apps/web/components/UserButton.tsx (or relevant component)

---

## Phase 6: Verification & Polish

**Purpose**: Manual verification and cleanup.

- [ ] T027 Manual Test: Create Organization with 1 House and verify "Smart Default" behavior
- [ ] T028 Manual Test: Invite user to House, accept invite, verify assignment
- [ ] T029 Manual Test: Try to Delete House with residents (Verify: Action Blocked)
- [ ] T030 Run full backend test suite (`pytest`)

## Dependencies

- Phase 2 depends on Phase 1
- Phase 3, 4, 5 depend on Phase 2
- Phase 6 depends on all previous phases

## Parallel Execution

- T004, T005, T006 (Type definitions) can run in parallel.
- T013, T014, T015 (Frontend components) can run in parallel with backend implementation if contracts are agreed.
- T025, T026 (Frontend display) can run in parallel with invitation logic.