# Replace Clerk with NextAuth + WhatsApp OTP

**Date:** 2026-03-10
**Status:** Approved
**Motivation:** Cost — eliminate Clerk's per-MAU pricing by replacing with open-source auth (NextAuth) and self-hosted messaging (Chasqui for WhatsApp, Resend for email).

## Architecture Overview

Replace Clerk with three components:
1. **NextAuth** — session management, JWT signing, Google OAuth, route protection
2. **Chasqui** (existing WhatsApp bridge) — send OTP codes and invitation messages via WhatsApp Business API
3. **Resend** — send OTP codes and invitation emails as fallback

## Authentication Flow

### Primary: Phone OTP (WhatsApp)

1. User enters phone number on `/login`
2. Frontend calls `POST /api/auth/otp/request` with `{ identifier: "+56912345678", channel: "whatsapp" }`
3. Backend generates 6-digit code, stores in `otp_codes` collection (5-min TTL), rate-limits (3 requests/hour per identifier)
4. Backend calls Chasqui `POST /messages/send/template` with OTP template
5. User receives WhatsApp message, enters code
6. Frontend calls NextAuth `signIn("credentials", { identifier, code })`
7. NextAuth's `authorize()` function (running server-side in Next.js) makes an internal HTTP call to FastAPI `POST /api/auth/otp/verify` with a shared service secret (`INTERNAL_API_SECRET`) for trust — this is a server-to-server call, not exposed to clients
8. FastAPI validates code, returns/creates user data
9. NextAuth creates JWT session (HS256, signed with `NEXTAUTH_SECRET`)

### Fallback: Email OTP

Same flow, but user enters email instead of phone. Backend calls Resend API instead of Chasqui. Same `otp_codes` collection and verification endpoint.

### Google Sign-In

Handled by NextAuth's built-in GoogleProvider. On first login, a user record is created in MongoDB with the Google email.

**Account linking algorithm:**
1. User completes Google OAuth → NextAuth receives `{ email, name, image }`
2. Backend checks: does a user with this `email` already exist?
   - **Yes** → update existing record: set `avatar_url` from Google if missing, add `email` if it was null. Do NOT overwrite `auth_provider` — keep the original. Return existing user.
   - **No** → create new user with `auth_provider: "google"`, `email` from Google, `phone: null`
3. If a phone-registered user later adds Google (same email), they get linked to the same record.
4. A user can always log in via any method tied to their record (phone OTP if `phone` is set, email OTP if `email` is set, Google if `email` matches).

### Login = Signup

No separate signup flow. When a user verifies OTP for the first time, a new user record is created automatically.

## Session & Backend Auth

- NextAuth signs JWT with `NEXTAUTH_SECRET` (HS256)
- JWT stored in httpOnly cookie (automatic via NextAuth)
- **JWT expiry:** 30 days. NextAuth automatically extends the session on each request (sliding window). No explicit refresh token needed — the `jwt` callback re-signs on every request.
- Frontend reads session via `useSession()` hook
- **Frontend → Backend auth:** The NextAuth JWT lives in an httpOnly cookie and is not accessible to client-side JS. To attach it to GraphQL requests, create a Next.js API route (`/api/graphql`) that proxies to FastAPI — this route reads the JWT from the cookie server-side and forwards it in the Authorization header. This replaces the current `next.config.js` rewrite approach and the `useAuthToken()` hook entirely. Client-side GraphQL calls go to `/api/graphql` (same origin), and the proxy handles auth.
- FastAPI verifies JWT using shared `NEXTAUTH_SECRET` (HS256) — replaces Clerk JWKS/RS256 verification
- User looked up by `nextauth_id` in MongoDB

## Data Model

### Users Collection (fresh start — wipe existing)

```
{
  _id: ObjectId,
  nextauth_id: string (UUID, unique index),
  email: string | null (unique sparse index),
  phone: string | null (unique sparse index),
  first_name: string | null,
  last_name: string | null,
  avatar_url: string | null,
  auth_provider: "phone" | "email" | "google",
  created_at: datetime,
  updated_at: datetime
}
```

### OTP Codes Collection (new)

```
{
  _id: ObjectId,
  identifier: string (phone or email),
  code: string (6-digit),
  channel: "whatsapp" | "email",
  attempts: int (brute-force counter, max 3),
  created_at: datetime (TTL index, expires after 5 min)
}
```

### Invitations Collection (updated)

```
{
  _id: ObjectId,
  organization_id: ObjectId,
  identifier: string (phone or email),
  channel: "whatsapp" | "email",
  token: string (unique, URL-safe),
  role: string,
  status: "pending" | "accepted" | "revoked" | "expired",
  invited_by: ObjectId (user._id),
  created_at: datetime,
  expires_at: datetime (7 days)
}
```

## Invitation System

1. Admin enters phone number or email in dashboard
2. Backend creates `invitations` record with unique token
3. If phone → Chasqui sends WhatsApp template with invite link
4. If email → Resend sends email with invite link
5. Link points to `/invite/[token]`
6. If not logged in → redirect to `/login` with `callbackUrl=/invite/[token]`
7. After login → backend validates token, matches user by `identifier`:
   - If `channel == "whatsapp"` → match `invitation.identifier == user.phone`
   - If `channel == "email"` → match `invitation.identifier == user.email`
   - Auto-joins user to org, marks invitation accepted

## Backend Changes (apps/api/src/auth/)

### Delete

| File | Reason |
|------|--------|
| `clerk_utils.py` | Clerk API calls (invitations, user deletion) |
| `webhooks.py` | Clerk webhook handlers (user.created, user.updated) |
| `router.py` | `POST /webhooks/clerk` endpoint |
| `svix` dependency | Webhook signature verification |

### Rewrite

| File | Before | After |
|------|--------|-------|
| `utils.py` | Fetch Clerk JWKS, verify RS256 JWT | Verify NextAuth HS256 JWT with shared secret |
| `dependencies.py` | JIT provision from Clerk API, lookup by `clerk_id` | Simple lookup by `nextauth_id`, no external API calls |
| `service.py` | Calls Clerk API for invitations/user deletion | Calls Chasqui (WhatsApp) and Resend (email) |
| `permissions.py` | No changes needed — already uses `user._id` internally |

### Create

| File | Purpose |
|------|---------|
| `otp.py` | OTP lifecycle: generate, store, verify, rate limit |
| `channels.py` | Messaging abstraction: `send_whatsapp()` → Chasqui, `send_email()` → Resend |
| `otp_router.py` | REST endpoints: `POST /api/auth/otp/request`, `POST /api/auth/otp/verify` |
| `invite_router.py` | REST endpoint: `POST /api/invite/{token}/accept` |
| `rate_limit.py` | MongoDB-based rate limiting (counter + TTL) |

### Modify

| File | Change |
|------|--------|
| `database.py` | Update `_create_indexes()`: remove `clerk_id` unique index, add `nextauth_id` unique index, `email` unique sparse index, `phone` unique sparse index, TTL indexes for `otp_codes` and `rate_limits` |

## Frontend Changes (apps/web/)

### Component Migration

| Clerk (Remove) | File | NextAuth / Custom (Replace) |
|-----------------|------|-----------------------------|
| `<ClerkProvider>` | `app/layout.tsx` | `<SessionProvider>` |
| `<SignIn />` | `app/sign-in/page.tsx` | Custom OTP login page |
| `<SignUp />` | `app/sign-up/page.tsx` | Same OTP page (login = signup) |
| `<UserButton />` | `Header.tsx`, `Sidebar.tsx` | Custom `UserMenu.tsx` |
| `<SignedIn>` / `<SignedOut>` | `Header.tsx` | `{ session ? ... : ... }` |
| `<SignInButton />` | `Header.tsx` | `<Link href="/login">` |
| `useAuth()` | `dashboard/layout.tsx`, `Sidebar.tsx` | `useSession()` |
| `useUser()` | `Sidebar.tsx`, `dashboard/page.tsx` | `useSession().data.user` |
| `useAuthToken()` | `hooks/use-auth-token.ts` | Remove — no longer needed (GraphQL proxy handles auth server-side) |
| `clerkMiddleware()` | `middleware.ts` | NextAuth `withAuth` middleware |
| `<RedirectToSignIn />` | `dashboard/layout.tsx` | `redirect("/login")` server-side |

### Route Changes

| Remove | Add |
|--------|-----|
| `/sign-in/[[...sign-in]]` | `/login` — OTP login page |
| `/sign-up/[[...sign-up]]` | `/invite/[token]` — invitation acceptance |
| `/api/webhooks/clerk` | `/api/auth/[...nextauth]` — NextAuth API routes |

### New Files

| File | Purpose |
|------|---------|
| `app/login/page.tsx` | Phone input → OTP input → verify, email toggle, Google button |
| `app/invite/[token]/page.tsx` | Shows org info, accept button, redirects to login if unauthenticated |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth config: CredentialsProvider (OTP), GoogleProvider, JWT/session callbacks |
| `app/api/graphql/route.ts` | Server-side proxy: reads NextAuth JWT from cookie, forwards to FastAPI with Authorization header |
| `components/auth/UserMenu.tsx` | Avatar + dropdown replacing Clerk's UserButton |

### Package Changes

| Remove | Add |
|--------|-----|
| `@clerk/nextjs` | `next-auth` |

## Environment Variables

### Remove

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_ISSUER_URL`
- `CLERK_WEBHOOK_SECRET`

### Add (Frontend)

- `NEXTAUTH_SECRET` — JWT signing secret (min 32 chars, shared with backend)
- `NEXTAUTH_URL` — canonical app URL
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret

### Add (Backend)

- `NEXTAUTH_SECRET` — same secret, shared with frontend
- `CHASQUI_API_URL` — Chasqui base URL
- `CHASQUI_API_TOKEN` — Chasqui JWT bearer token
- `RESEND_API_KEY` — Resend API key
- `INTERNAL_API_SECRET` — shared secret for server-to-server calls (NextAuth authorize → FastAPI OTP verify)

## Security

### OTP Brute-Force Protection

- Max 3 verification attempts per code — code invalidated after
- Max 3 OTP requests per identifier per hour — prevents spam
- 5-minute TTL on codes — auto-expire via MongoDB TTL index

### Rate Limiting

Rate limiting implemented via MongoDB counters (since Vercel serverless has no shared in-memory state):
- `rate_limits` collection with TTL index on `window_start`
- `POST /api/auth/otp/request` — rate limit by IP (10/hour), by identifier (3/hour)
- `POST /api/auth/otp/verify` — rate limit by IP + identifier (10/hour)
- Each request increments a counter doc `{ key: "otp_request:{ip}", count: N, window_start: datetime }` with 1-hour TTL

### JWT Security

- NextAuth signs with `NEXTAUTH_SECRET` (HS256)
- Min 32 chars, randomly generated
- Shared between Next.js and FastAPI — no JWKS endpoint needed

### Account Enumeration

- No risk: login = signup, OTP always sent regardless of whether identifier exists

## Migration Strategy

Fresh start — wipe all user-related data.

**Collections to wipe:**
- `users` — all user records
- `organization_members` — all memberships
- `invitations` — all pending invitations
- `houses` — unit assignments reference users
- Any voting/proposal data that references users

**Collections to preserve:**
- `organizations` — org structure survives, members re-join via invitations
- App configuration / static data

## E2E Tests

The existing E2E tests (`apps/web/e2e/`) use Clerk auth fixtures (`e2e/fixtures/auth.ts`). These must be rewritten:
- Replace Clerk auth fixture with NextAuth session mocking or direct OTP login flow
- Update E2E env vars: remove `E2E_ADMIN_EMAIL`, `E2E_RESIDENT_EMAIL`, etc. — replace with test accounts that use the new OTP flow
- Consider a test-mode bypass: when `NODE_ENV=test`, accept a fixed OTP code (e.g., `000000`) to simplify E2E automation
