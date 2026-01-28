# Implementation Plan: House Account Management

**Branch**: `002-house-account-management` | **Date**: 2026-01-26 | **Spec**: [House Account Management](spec.md)
**Input**: Feature specification from `/docs/features/specs/002-house-account-management/spec.md`

## Summary

Implement **House Inventory** and **Resident Assignment** to structure the community.
- **House Management**: CRUD operations for `House` entities (linked to Organization).
- **Resident Assignment**: Link `OrganizationMember` to `House`.
- **Invitation Flow**: Extend invitations to include optional `house_id`.
- **UI Adaptation**: "Smart Defaulting" for single-house organizations.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5 (Frontend)
**Primary Dependencies**: 
- Backend: `prisma` (ORM), `strawberry-graphql` (API)
- Frontend: `@clerk/nextjs` (Auth), `lucide-react` (Icons)
**Storage**: PostgreSQL (via Prisma)
**Testing**: `pytest` (Backend), `jest` (Frontend)
**Target Platform**: Vercel (Next.js + Python Serverless)
**Project Type**: Full-stack Monorepo (`apps/api` + `apps/web`)
**Performance Goals**: <200ms API response for inventory lists.
**Constraints**: UI must simplify gracefully for single-house orgs (no complex selectors).

## Constitution Check

- **I. Code Quality**: Uses strict typing. Python Pydantic models for House inputs.
- **II. Testing**: Backend tests for House CRUD and Invitation acceptance. Frontend tests for UI adaptation.
- **III. UX**: "Smart Defaulting" reduces friction for small communities.
- **IV. Performance**: Efficient Prisma queries (relations).

## Project Structure

### Documentation (this feature)

```text
docs/features/specs/002-house-account-management/
├── plan.md              # This file
├── research.md          # Implementation decisions
├── data-model.md        # Schema updates
├── quickstart.md        # Usage guide
├── contracts/           # GraphQL schema extensions
└── tasks.md             # Task breakdown
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── house/              # New Module
│   │   ├── service.py      # House CRUD
│   │   └── router.py       # (Optional if REST needed, likely GraphQL only)
│   └── auth/
│       └── service.py      # Update invitation logic
├── graphql_types/
│   └── house.py            # House Type
├── schemas/
│   └── house.py            # House Queries/Mutations
└── prisma/
    └── schema.prisma       # Add House model

apps/web/
├── app/
│   └── dashboard/
│       └── properties/     # House Management UI
│           ├── page.tsx    # List / Create
│           └── [id]/       # Detail / Edit
└── components/
    └── properties/         # House components
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New Entity (House) | Core domain requirement. | Storing as string metadata on User prevents inventory management. |
| Smart Defaulting UI | UX for single-family homes. | Forcing "Select House" on a list of 1 is bad UX. |