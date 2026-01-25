# Implementation Plan: User Authentication Integration (Clerk)

**Branch**: `001-user-auth-integration` | **Date**: 2026-01-25 | **Spec**: [User Authentication Integration](spec.md)
**Input**: Feature specification from `/docs/features/specs/001-user-auth-integration/spec.md`

## Summary

Integrate **Clerk** for authentication to offload complexity (security, UI, SSO, password management). The architecture relies on a "Split Responsibility" model:
- **Identity (AuthN)**: Managed by Clerk.
- **Data/Authorization (AuthZ)**: Managed by our Python Backend (FastAPI + Prisma).
- **Bridge**: Webhooks sync Identity to Data.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5 (Frontend)
**Primary Dependencies**: 
- Backend: `svix` (Webhook verification), `httpx` (JWKS fetching), `pydantic`
- Frontend: `@clerk/nextjs`
**Storage**: PostgreSQL (via Prisma)
**Testing**: `pytest` (Webhook handling, Token verification), `jest` (Component integration)
**Target Platform**: Vercel
**Performance Goals**: API Token validation < 10ms (using cached JWKS).

## Constitution Check

- **I. Code Quality**: Uses strict typing. Python will define Pydantic models for Clerk Webhook payloads.
- **II. Testing**: Webhook logic will be unit tested with mock payloads.
- **III. UX**: Uses Clerk's pre-built components (consistent, accessible).
- **IV. Performance**: API uses stateless JWT validation (fast).

## Project Structure

### Documentation (this feature)

```text
docs/features/specs/001-user-auth-integration/
├── plan.md              # This file
├── research.md          # Decision to use Clerk
├── data-model.md        # Updated User model (clerk_id)
└── tasks.md             # To be generated
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── auth/
│   │   ├── webhooks.py     # Clerk Webhook Handler (User Sync)
│   │   ├── router.py       # Exposes /webhooks/clerk
│   │   ├── utils.py        # JWT Verification Logic
│   │   └── dependencies.py # get_current_user (extracts clerk_id from token)
│   └── ...
└── prisma/
    └── schema.prisma       # User model with clerk_id

apps/web/
├── app/
│   ├── sign-in/[[...sign-in]]/page.tsx  # Clerk Page
│   ├── sign-up/[[...sign-up]]/page.tsx  # Clerk Page
│   └── layout.tsx                       # ClerkProvider wrapper
└── middleware.ts                        # Clerk Middleware
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| External Auth Provider | Reduces code liability (security). | Building own auth is error-prone and maintenance heavy. |
| Webhooks | Necessary to keep local DB in sync. | Fetching user data on every request is too slow (latency). |

## Data Flow

1.  **Sign Up**: User -> Clerk Frontend -> Clerk Backend.
2.  **Sync**: Clerk Backend -> Webhook (POST /api/webhooks/clerk) -> FastAPI -> DB (Create User).
3.  **API Call**: Frontend -> API (Bearer Token) -> FastAPI (Verify Token + Lookup User by `clerk_id`) -> Response.
