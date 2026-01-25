# Research: Authentication Strategy

**Decision**: **Reject** `better-auth` integration; **Adopt** standard FastAPI + OAuth2 + JWT (using `python-jose` and `passlib`) with Next.js middleware.

**Rationale**: 
1. `better-auth` is a TypeScript-only framework designed for Node.js backends. It is structurally incompatible with our Python/FastAPI backend.
2. Integrating a TypeScript auth server alongside Python adds unnecessary infrastructure complexity (running two backend runtimes) and violates our "Simplicity" principle.
3. The Python ecosystem has robust, standard tools (`python-jose`, `passlib`, `fastapi.security`) that provide the same features (JWT, Hashing, OAuth2 flows) natively within our existing stack.

**Alternatives Considered**:
- **Better-Auth (Typescript)**: Rejected due to language mismatch. Requires running a separate Node.js server for auth, complicating deployment and latency.
- **FastAPI-Users**: A popular library, but often introduces "magic" abstractions that can be hard to customize for specific multi-tenant requirements (like our Condo/Org model).
- **Custom Implementation (Selected)**: Using standard libraries allows full control over the `User` -> `Organization` -> `Role` data model and precise handling of the "Invite" flow, which is core to our domain.

## Architecture: Custom FastAPI Auth

### 1. Data Model (Prisma)
We will define the following entities in `schema.prisma`:
- `User`: Credentials (email, password_hash) and profile.
- `Session`: (Optional) Refresh tokens for revocation support.
- `Organization`: The multi-tenant container.
- `OrganizationMember`: Link table `User` <-> `Organization` with `role`.
- `Invitation`: Pending invites with `token`, `email`, `org_id`, `role`, `expires_at`.

### 2. Backend Implementation (FastAPI)
- **Hashing**: `bcrypt` via `passlib`.
- **Tokens**: `JWT` (Access + Refresh) via `python-jose`.
- **Flows**:
  - `POST /auth/register`: Create user + mandatory Organization creation/join.
  - `POST /auth/login`: Return `access_token` (short-lived) + `refresh_token` (httpOnly cookie).
  - `POST /auth/refresh`: Rotate access token.
  - `POST /auth/invite`: Admin creates `Invitation` record.
  - `POST /auth/accept-invite`: Validate token -> Create User -> Add to Org.

### 3. Frontend Implementation (Next.js)
- **Middleware**: `middleware.ts` to check `refresh_token` cookie presence for protected routes.
- **Client**: `next-auth` is NOT needed. We will use a lightweight React Context + specialized hooks (`useAuth`).
- **Google SSO**: Use standard OAuth2 flow (`/auth/google/login` -> redirect -> `/auth/google/callback` -> issue JWTs).

## Unknowns Resolved
- **Language/Version**: Python 3.11 (Standard).
- **Primary Dependencies**: `python-jose`, `passlib[bcrypt]`, `pydantic`.
- **Testing**: `pytest` for auth flows (critical path).
