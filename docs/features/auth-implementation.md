# Feature: User Authentication & Organization

**Implemented**: January 2026
**Provider**: Clerk
**Backend**: FastAPI (Webhooks + JWT Verification)
**Frontend**: Next.js (Clerk Components + Middleware)

## Overview

The authentication system uses a "Split Responsibility" model:
- **Identity (AuthN)**: Managed by **Clerk** (Sign-in, Sign-up, SSO, Password Reset).
- **Data/Authorization (AuthZ)**: Managed by our **Python Backend** (FastAPI + Prisma).
- **Bridge**: Webhooks sync Identity to Data.

## Architecture

### Data Flow

1.  **Registration**: User signs up via Clerk Frontend (`<SignUp />`).
2.  **Sync**: Clerk triggers `user.created` webhook -> FastAPI (`/webhooks/clerk`) -> Creates `User` in Postgres.
3.  **Login**: User signs in via Clerk Frontend (`<SignIn />`).
4.  **API Access**: Frontend requests API with Clerk Token (Bearer) -> FastAPI validates Token + looks up `User`.

### Data Model

- **User**: Linked to Clerk via `clerk_id`. Contains profile data.
- **Organization**: Multi-tenant container.
- **OrganizationMember**: Links User to Organization with a `Role` (ADMIN, RESIDENT, MEMBER).
- **Invitation**: Pending invites (Email, Role, Org) with 7-day expiration.

## Backend Implementation (`apps/api`)

### Webhooks (`src/auth/webhooks.py`)
- Endpoint: `POST /webhooks/clerk`
- Verification: Uses `svix` to verify Clerk headers (`svix-id`, `svix-timestamp`, `svix-signature`).
- Events handled:
  - `user.created`: Creates local user, checks for pending invitations.
  - `user.updated`: Updates email/profile.
  - `user.deleted`: Soft-deletes local user.

### Authentication (`src/auth/dependencies.py`)
- `get_current_user`: Fast dependency for protected routes.
- Verifies JWT using `jwks` from Clerk.
- Fetches `User` from DB using `clerk_id` from token `sub`.

### GraphQL
- **Types** (`graphql_types/auth.py`): `User`, `Organization`, `OrganizationMember`, `Invitation`.
- **Query** (`me`): Returns current user with organization memberships.
- **Mutation** (`createInvitation`): Sends an invite (creates record).

## Frontend Implementation (`apps/web`)

### Pages
- `/sign-in/*`: Clerk Sign In component.
- `/sign-up/*`: Clerk Sign Up component.
- `/dashboard/settings`: User settings and Invitation UI.

### Integration
- **Middleware** (`middleware.ts`): Protects dashboard routes using `@clerk/nextjs`.
- **Provider** (`layout.tsx`): `<ClerkProvider>` wraps the app.
- **API Client** (`lib/api.ts`): Injects `Authorization: Bearer <token>` into GraphQL requests.
- **Hooks** (`hooks/use-auth-token.ts`): Helper to retrieve valid tokens.

## Configuration

### Environment Variables
**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

**Backend** (`.env`):
```env
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_ISSUER_URL=https://...
```

## Security

- **Webhooks**: Signature verification prevents spoofing. Idempotency handling prevents duplicate processing.
- **API**: Stateless JWT validation. Local `User` record required for access.
- **Invitations**: Token-based, expires in 7 days. Verified against email on acceptance.
