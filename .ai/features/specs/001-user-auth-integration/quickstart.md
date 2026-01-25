# Quickstart: User Authentication

## Prerequisites
- PostgreSQL running locally (via `docker-compose` or system service).
- `DATABASE_URL` set in `apps/api/.env`.
- `SECRET_KEY` and `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` set in `apps/api/.env`.

## Setup
1. **Migrations**: Apply the new Prisma schema changes.
   ```bash
   pnpm --filter api prisma:migrate
   ```
2. **Environment**: Ensure `.env` has:
   ```env
   SECRET_KEY=super-secret-dev-key
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   REFRESH_TOKEN_EXPIRE_DAYS=7
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   FRONTEND_URL=http://localhost:3000
   ```

## Running
1. Start the backend:
   ```bash
   pnpm --filter api dev
   ```
2. Start the frontend:
   ```bash
   pnpm --filter web dev
   ```

## Testing Authentication

### Manual Testing (Swagger UI)
1. Go to `http://localhost:8000/docs`.
2. **Register**: Use `POST /auth/register` with `{ "email": "test@example.com", "password": "password123", "full_name": "Test User", "org_name": "My Condo" }`.
3. **Login**: Use `POST /auth/login` to get an `access_token`.
4. **Protected Route**: Authorize in Swagger (Green "Authorize" button) with the token, then try `GET /users/me` (if implemented) or `POST /auth/invite`.

### Automated Tests
Run the auth-specific test suite:
```bash
pytest apps/api/tests/test_auth.py
```
