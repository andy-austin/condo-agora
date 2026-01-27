# Backend Architecture

The backend is a Python FastAPI application with Strawberry GraphQL, located in `apps/api/`.

## Entry Point

**File**: `apps/api/index.py`

```python
app = FastAPI(root_path="/api")
```

The FastAPI app is configured with:
- Root path `/api` for all routes
- CORS middleware (all origins allowed)
- GraphQL router at `/graphql`
- Lifecycle hooks for database connection

### REST Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Simple health check returning `{"ok": true}` |
| `/api/debug` | GET | Debug info (platform, paths, Prisma engine status) |
| `/api/graphql` | POST | GraphQL endpoint |

## Directory Structure

```
apps/api/
├── index.py              # FastAPI application entry
├── database.py           # Prisma client initialization
├── schema.py             # Root GraphQL schema
├── src/                  # Core Business Logic
│   └── auth/
│       ├── dependencies.py # Auth dependencies (get_current_user)
│       ├── router.py       # Webhook routes
│       ├── service.py      # Auth services (invitations)
│       ├── utils.py        # Token verification
│       └── webhooks.py     # Clerk webhook handlers
├── graphql_types/        # Strawberry type definitions
│   ├── __init__.py
│   ├── auth.py           # User, Organization, Invitation
│   ├── health.py         # HealthStatus, ServiceStatus, DatabaseStatus
│   └── note.py           # Note, CreateNoteInput, UpdateNoteInput
├── schemas/              # GraphQL query/mutation generators
│   ├── __init__.py
│   ├── auth.py           # AuthMutations, AuthQueries
│   ├── base.py           # BaseSchemaGenerator (generic pattern)
│   ├── health.py         # HealthQueries
│   └── note.py           # NoteQueries, NoteMutations
├── resolvers/            # Business logic / data access
│   ├── __init__.py
│   ├── auth.py           # AuthResolver (me, create_invitation)
│   ├── base.py           # BaseResolver (generic CRUD)
│   ├── health.py         # HealthResolver
│   └── note.py           # NoteResolver
├── prisma/
│   ├── schema.prisma     # Database schema definition
│   └── migrations/       # Migration history
├── prisma_client/        # Generated Prisma Python client
└── tests/
    ├── test_health.py
    └── test_note.py
```

## Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GraphQL Layer                         │
│  schema.py → combines Query and Mutation classes         │
├─────────────────────────────────────────────────────────┤
│                    Schemas Layer                         │
│  schemas/*.py → Strawberry @strawberry.type classes      │
│  Contains query/mutation methods with @strawberry.field  │
├─────────────────────────────────────────────────────────┤
│                    Resolvers Layer                       │
│  resolvers/*.py → Business logic and data access         │
│  Generic CRUD operations via BaseResolver                │
├─────────────────────────────────────────────────────────┤
│                    Database Layer                        │
│  database.py → Prisma client instance                    │
│  prisma_client/ → Generated async Prisma client          │
└─────────────────────────────────────────────────────────┘
```

## Database Connection

**File**: `apps/api/database.py`

Key responsibilities:
1. Configure Prisma query engine binary for serverless (Linux) environments
2. Load environment variables from root `.env`
3. Provide `db` Prisma instance and `get_db()` async function

```python
from .prisma_client import Prisma

db = Prisma()

async def get_db():
    if not db.is_connected():
        await db.connect()
    return db
```

### Platform Detection

The `database.py` handles cross-platform Prisma binary:
- **macOS**: Uses native binary (development)
- **Linux**: Uses `rhel-openssl-3.0.x` binary (Vercel/Lambda)

Binary paths searched:
1. `apps/api/prisma_client/prisma-query-engine-rhel-openssl-3.0.x`
2. `apps/api/prisma-query-engine-rhel-openssl-3.0.x`
3. `/var/task/prisma_client/...` (Lambda)
4. `/var/task/apps/api/prisma_client/...`

## GraphQL Schema Composition

**File**: `apps/api/schema.py`

```python
@strawberry.type
class Query(NoteQueries, HealthQueries):
    pass

@strawberry.type
class Mutation(NoteMutations):
    pass

schema = strawberry.Schema(query=Query, mutation=Mutation)
```

Schema composition uses Python multiple inheritance to combine query/mutation classes.

## Adding New Features

To add a new entity (e.g., `User`):

1. **Add Prisma model** in `prisma/schema.prisma`
2. **Generate client**: `pnpm --filter api run prisma:generate`
3. **Create GraphQL types** in `graphql_types/user.py`
4. **Create resolver** in `resolvers/user.py` (extend `BaseResolver`)
5. **Create schema** in `schemas/user.py` (extend `BaseSchemaGenerator`)
6. **Register in schema.py**: Add to Query/Mutation classes

See [PATTERNS.md](./PATTERNS.md) for detailed implementation patterns.

## Dependencies

**Core**:
- `fastapi >= 0.104.0` - Web framework
- `uvicorn[standard] >= 0.24.0` - ASGI server
- `strawberry-graphql[fastapi] >= 0.213.0` - GraphQL framework
- `prisma >= 0.15.0` - Database ORM
- `pydantic >= 2.0.0` - Data validation
- `python-dotenv >= 1.0.0` - Environment loading

**Database**:
- `psycopg2-binary >= 2.9.0` - PostgreSQL adapter
- `asyncpg >= 0.29.0` - Async PostgreSQL
- `alembic >= 1.13.0` - Migrations (optional)

**Dev**:
- `black >= 24.0.0` - Code formatter
- `isort >= 5.13.0` - Import sorter
- `flake8 >= 7.0.0` - Linter
- `pytest >= 7.4.0` - Testing
- `pytest-asyncio >= 0.21.0` - Async test support
- `httpx >= 0.25.0` - HTTP client for testing

## Running the Backend

```bash
# Via TurboRepo (recommended)
pnpm --filter api dev

# Direct execution
cd apps/api && ../../.venv/bin/python -m uvicorn apps.api.index:app --reload --port 8000
```

## Code Style

- **Formatter**: Black (line length 88)
- **Import sorting**: isort (black profile)
- **Linting**: flake8 (max line 120)
- **Type hints**: Required for all functions
- **Async**: All database operations use async/await
