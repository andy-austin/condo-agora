# Database & Prisma

The application uses PostgreSQL with Prisma Python Client for database operations.

## Prisma Schema

**Location**: `apps/api/prisma/schema.prisma`

### Generator Configuration

```prisma
generator client {
  provider             = "prisma-client-py"
  interface            = "asyncio"
  recursive_type_depth = 5
  output               = "../prisma_client"
  binaryTargets        = ["native", "rhel-openssl-3.0.x"]
}
```

- **provider**: Python Prisma client
- **interface**: Async/await (asyncio)
- **output**: Generated client location
- **binaryTargets**: macOS (native) + Linux (Vercel/Lambda)

### Datasource

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Current Models

### Note Model

```prisma
model Note {
  id          Int      @id @default(autoincrement())
  title       String
  content     String?
  isPublished Boolean  @default(false) @map("is_published")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("note")
}
```

**Field Mapping**:
- Prisma uses camelCase: `isPublished`, `createdAt`, `updatedAt`
- Database uses snake_case: `is_published`, `created_at`, `updated_at`
- `@@map("note")` maps model to `note` table

## Database Commands

```bash
# Generate Prisma client after schema changes
pnpm --filter api run prisma:generate

# Create and apply migrations
pnpm --filter api run prisma:migrate

# Open Prisma Studio (database GUI)
pnpm --filter api run prisma:studio

# Root-level migration command
pnpm migrate
```

## Generated Client

**Location**: `apps/api/prisma_client/`

The generated client provides typed async operations:

```python
from .prisma_client import Prisma

db = Prisma()

# Connect
await db.connect()

# Query
notes = await db.note.find_many()
note = await db.note.find_unique(where={"id": 1})

# Create
note = await db.note.create(data={"title": "New Note"})

# Update
note = await db.note.update(
    where={"id": 1},
    data={"title": "Updated"}
)

# Delete
await db.note.delete(where={"id": 1})

# Disconnect
await db.disconnect()
```

## Database Connection Pattern

**File**: `apps/api/database.py`

```python
from .prisma_client import Prisma

db = Prisma()

async def get_db():
    if not db.is_connected():
        await db.connect()
    return db
```

### Lifecycle Hooks

In `apps/api/index.py`:

```python
@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    if db.is_connected():
        await db.disconnect()
```

## Adding New Models

### 1. Define Model in Schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  notes     Note[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("user")
}

model Note {
  // ... existing fields
  authorId  Int?     @map("author_id")
  author    User?    @relation(fields: [authorId], references: [id])
}
```

### 2. Generate Client

```bash
pnpm --filter api run prisma:generate
```

### 3. Create Migration

```bash
pnpm --filter api run prisma:migrate
# Enter migration name when prompted
```

### 4. Use in Resolvers

```python
# In resolvers/user.py
from ..prisma_client import Prisma

class UserResolver(BaseResolver):
    model_name = "user"
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `POSTGRES_URL_NON_POOLING` | Vercel Postgres | Auto-set by Vercel |

### Local Development

```bash
# Start PostgreSQL with Docker
docker run --name condo-agora-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=condo_agora \
  -p 5432:5432 \
  -d postgres:15

# .env file
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/condo_agora
```

## Query Patterns

### Find Many with Filtering

```python
notes = await db.note.find_many(
    where={"isPublished": True},
    order={"createdAt": "desc"},
    take=10,
    skip=0
)
```

### Find with Relations

```python
notes = await db.note.find_many(
    include={"author": True}
)
```

### Transactions

```python
async with db.tx() as tx:
    user = await tx.user.create(data={"email": "test@example.com"})
    note = await tx.note.create(data={
        "title": "First Note",
        "authorId": user.id
    })
```

## Serverless Considerations

### Binary Configuration

The Prisma query engine binary must be available in serverless environments:

```python
# In database.py
if platform.system() == "Linux":
    _engine_name = "prisma-query-engine-rhel-openssl-3.0.x"
    # Search for binary in multiple locations
    # Set PRISMA_QUERY_ENGINE_BINARY environment variable
```

### Cold Starts

- Prisma client initialization adds latency on cold starts
- Connection pooling handled by Vercel Postgres
- Use `POSTGRES_URL_NON_POOLING` for direct connections when needed

## Migration Best Practices

1. **Always generate client** after schema changes
2. **Test migrations locally** before deploying
3. **Use descriptive migration names**: `add_user_model`, `add_author_to_notes`
4. **Review generated SQL** in `prisma/migrations/*/migration.sql`
5. **Don't edit migrations** after they're applied to production
