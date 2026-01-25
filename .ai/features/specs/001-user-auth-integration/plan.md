# Implementation Plan: User Authentication Integration

**Branch**: `001-user-auth-integration` | **Date**: 2026-01-25 | **Spec**: [User Authentication Integration](spec.md)
**Input**: Feature specification from `/.ai/features/specs/001-user-auth-integration/spec.md`

## Summary

Implement a secure, token-based authentication system using Python/FastAPI native tools (OAuth2, JWT) instead of the incompatible `better-auth` library. The solution will support Email/Password registration, Google SSO, Organization-based multi-tenancy, and secure Invitation/Password Reset flows.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5 (Frontend)
**Primary Dependencies**: 
- Backend: `fastapi`, `python-jose`, `passlib[bcrypt]`, `pydantic`
- Frontend: `next`, `lucide-react` (icons), React Context (no external auth lib)
**Storage**: PostgreSQL (via Prisma)
**Testing**: `pytest` (Backend Auth Flows), `jest` (Frontend Components)
**Target Platform**: Vercel (Next.js) + Vercel Functions (FastAPI)
**Project Type**: Full-stack Monorepo (Turborepo)
**Performance Goals**: Login < 500ms, JWT validation < 10ms
**Constraints**: Strict Type Safety, 100% Test Coverage for Auth Logic

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality**: Uses standard Python typing and Next.js strict mode.
- **II. Testing**: Includes comprehensive `pytest` plan for all auth flows.
- **III. UX**: Adheres to existing design system; standard auth patterns.
- **IV. Performance**: JWT is stateless and fast; no extra DB hits for session validation on read-heavy routes (unless checking revocation).

## Project Structure

### Documentation (this feature)

```text
.ai/features/specs/001-user-auth-integration/
├── plan.md              # This file
├── research.md          # Strategy decision (Reject better-auth, use Custom JWT)
├── data-model.md        # User, Organization, Invitation entities
├── quickstart.md        # Setup guide for Auth
├── contracts/           # OpenAPI spec
│   └── openapi.yaml
└── tasks.md             # To be generated
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── auth/
│   │   ├── router.py       # Auth endpoints
│   │   ├── service.py      # Business logic (login, register, invite)
│   │   ├── utils.py        # Hashing, JWT generation
│   │   └── dependencies.py # current_user dependency
│   └── ...
└── prisma/
    └── schema.prisma       # Updated models

apps/web/
├── app/
│   ├── (auth)/             # Auth pages layout
│   │   ├── login/
│   │   ├── register/
│   │   ├── invite/
│   │   └── forgot-password/
│   └── ...
├── lib/
│   ├── auth-context.tsx    # React Context for auth state
│   └── api.ts              # API client with interceptors
└── middleware.ts           # Route protection
```

**Structure Decision**: Standard "Service-Controller" pattern in FastAPI for backend logic. Next.js App Router with Route Groups `(auth)` for frontend pages.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Custom Auth Implementation | `better-auth` is Node-only. | `FastAPI-Users` was rejected due to complex customization requirements for the "Organization" multi-tenant model. |