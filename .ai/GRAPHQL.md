# GraphQL API

The API uses Strawberry GraphQL with FastAPI, providing a type-safe GraphQL endpoint.

## Endpoint

- **URL**: `/api/graphql`
- **Method**: POST
- **Playground**: Available at `/api/graphql` (GET) in development

## Schema Structure

**File**: `apps/api/schema.py`

```python
import strawberry
from .schemas.health import HealthQueries
from .schemas.note import NoteMutations, NoteQueries

@strawberry.type
class Query(NoteQueries, HealthQueries):
    pass

@strawberry.type
class Mutation(NoteMutations):
    pass

schema = strawberry.Schema(query=Query, mutation=Mutation)
```

## Types

### Health Types (`graphql_types/health.py`)

```graphql
type ServiceStatus {
  status: String!
}

type DatabaseStatus {
  status: String!
  connection: Boolean!
  details: String
}

type HealthStatus {
  status: String!
  timestamp: String!
  api: ServiceStatus!
  database: DatabaseStatus!
}
```

### Note Types (`graphql_types/note.py`)

```graphql
type Note {
  id: Int!
  title: String!
  content: String
  is_published: Boolean!
  created_at: DateTime!
  updated_at: DateTime!
}

input CreateNoteInput {
  title: String!
  content: String
  is_published: Boolean = false
}

input UpdateNoteInput {
  title: String
  content: String
  is_published: Boolean
}
```

## Queries

### Health Query

```graphql
query {
  health {
    status
    timestamp
    api {
      status
    }
    database {
      status
      connection
      details
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "health": {
      "status": "healthy",
      "timestamp": "2024-01-25T12:00:00Z",
      "api": { "status": "operational" },
      "database": {
        "status": "connected",
        "connection": true,
        "details": null
      }
    }
  }
}
```

### Notes Query

```graphql
query {
  notes {
    id
    title
    content
    is_published
    created_at
    updated_at
  }
}
```

### Note by ID Query

```graphql
query {
  note(id: 1) {
    id
    title
    content
    is_published
  }
}
```

## Mutations

### Create Note

```graphql
mutation {
  createNote(input: {
    title: "New Note"
    content: "Note content"
    is_published: false
  }) {
    id
    title
    content
    is_published
    created_at
  }
}
```

### Update Note

```graphql
mutation {
  updateNote(id: 1, input: {
    title: "Updated Title"
    is_published: true
  }) {
    id
    title
    is_published
    updated_at
  }
}
```

### Delete Note

```graphql
mutation {
  deleteNote(id: 1)
}
```

Returns `true` on success, `false` on failure.

## Type Definitions in Python

### Output Type

```python
import strawberry
from datetime import datetime
from typing import Optional

@strawberry.type
class Note:
    id: int
    title: str
    content: Optional[str]
    is_published: bool
    created_at: datetime
    updated_at: datetime
```

### Input Type

```python
@strawberry.input
class CreateNoteInput:
    title: str
    content: Optional[str] = None
    is_published: bool = False

@strawberry.input
class UpdateNoteInput:
    title: Optional[str] = None
    content: Optional[str] = None
    is_published: Optional[bool] = None
```

## Schema Generator Pattern

### Query Class

```python
@strawberry.type
class NoteQueries:
    @strawberry.field
    async def notes(self) -> List[Note]:
        return await NoteSchemaGenerator.get_all_query()

    @strawberry.field
    async def note(self, id: int) -> Optional[Note]:
        return await NoteSchemaGenerator.get_by_id_query(id)
```

### Mutation Class

```python
@strawberry.type
class NoteMutations:
    @strawberry.field
    async def create_note(self, input: CreateNoteInput) -> Note:
        return await NoteSchemaGenerator.create_mutation(input)

    @strawberry.field
    async def update_note(self, id: int, input: UpdateNoteInput) -> Optional[Note]:
        return await NoteSchemaGenerator.update_mutation(id, input)

    @strawberry.field
    async def delete_note(self, id: int) -> bool:
        return await NoteSchemaGenerator.delete_mutation(id)
```

## Adding New GraphQL Types

### 1. Create Type File

```python
# graphql_types/user.py
from datetime import datetime
from typing import Optional, List
import strawberry

@strawberry.type
class User:
    id: int
    email: str
    name: Optional[str]
    created_at: datetime

@strawberry.input
class CreateUserInput:
    email: str
    name: Optional[str] = None

@strawberry.input
class UpdateUserInput:
    email: Optional[str] = None
    name: Optional[str] = None
```

### 2. Create Resolver

```python
# resolvers/user.py
from .base import BaseResolver

class UserResolver(BaseResolver):
    model_name = "user"
```

### 3. Create Schema

```python
# schemas/user.py
from typing import List, Optional
import strawberry
from ..graphql_types.user import User, CreateUserInput, UpdateUserInput
from ..resolvers.user import UserResolver
from .base import BaseSchemaGenerator

class UserSchemaGenerator(BaseSchemaGenerator[UserResolver, User, CreateUserInput, UpdateUserInput]):
    resolver_class = UserResolver
    graphql_type = User

@strawberry.type
class UserQueries:
    @strawberry.field
    async def users(self) -> List[User]:
        return await UserSchemaGenerator.get_all_query()

    @strawberry.field
    async def user(self, id: int) -> Optional[User]:
        return await UserSchemaGenerator.get_by_id_query(id)

@strawberry.type
class UserMutations:
    @strawberry.field
    async def create_user(self, input: CreateUserInput) -> User:
        return await UserSchemaGenerator.create_mutation(input)
```

### 4. Register in Schema

```python
# schema.py
from .schemas.user import UserQueries, UserMutations

@strawberry.type
class Query(NoteQueries, HealthQueries, UserQueries):
    pass

@strawberry.type
class Mutation(NoteMutations, UserMutations):
    pass
```

## Field Naming Convention

| Layer | Convention | Example |
|-------|------------|---------|
| GraphQL | snake_case | `is_published`, `created_at` |
| Prisma Model | camelCase | `isPublished`, `createdAt` |
| Database Column | snake_case | `is_published`, `created_at` |

Conversion happens in `BaseSchemaGenerator.model_to_graphql()`.

## Error Handling

GraphQL errors are returned in standard format:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Error message",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["note"]
    }
  ]
}
```

## Frontend Usage

### Using fetch

```typescript
async function fetchNotes() {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query {
          notes {
            id
            title
            content
          }
        }
      `
    })
  })
  const { data, errors } = await response.json()
  if (errors) throw new Error(errors[0].message)
  return data.notes
}
```

### With Variables

```typescript
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      mutation CreateNote($input: CreateNoteInput!) {
        createNote(input: $input) {
          id
          title
        }
      }
    `,
    variables: {
      input: {
        title: "New Note",
        content: "Content here"
      }
    }
  })
})
```
