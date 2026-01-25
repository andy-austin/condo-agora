# Code Patterns & Conventions

This document describes the patterns and conventions used throughout the codebase for consistency and rapid development.

## Backend Patterns

### Generic Resolver Pattern

**Location**: `apps/api/resolvers/base.py`

The `BaseResolver` provides generic CRUD operations for any Prisma model:

```python
from typing import Generic, List, Optional, TypeVar
from ..prisma_client import Prisma

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")

class BaseResolver(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    model_name: str  # e.g., 'note', 'user'

    @classmethod
    async def get_all(cls, db: Prisma) -> List[ModelType]:
        model_delegate = getattr(db, cls.model_name)
        return await model_delegate.find_many()

    @classmethod
    async def get_by_id(cls, db: Prisma, id: int) -> Optional[ModelType]:
        model_delegate = getattr(db, cls.model_name)
        return await model_delegate.find_unique(where={"id": id})

    @classmethod
    async def create(cls, db: Prisma, obj_in: CreateSchemaType) -> ModelType:
        model_delegate = getattr(db, cls.model_name)
        obj_data = obj_in.__dict__
        # Handle field name conversion if needed
        return await model_delegate.create(data=obj_data)

    @classmethod
    async def update(cls, db: Prisma, id: int, obj_in: UpdateSchemaType) -> Optional[ModelType]:
        model_delegate = getattr(db, cls.model_name)
        obj_data = {k: v for k, v in obj_in.__dict__.items() if v is not None}
        return await model_delegate.update(where={"id": id}, data=obj_data)

    @classmethod
    async def delete(cls, db: Prisma, id: int) -> bool:
        model_delegate = getattr(db, cls.model_name)
        try:
            await model_delegate.delete(where={"id": id})
            return True
        except Exception:
            return False
```

**Usage**: Create entity-specific resolver:

```python
# resolvers/note.py
from .base import BaseResolver

class NoteResolver(BaseResolver):
    model_name = "note"
```

### Generic Schema Generator Pattern

**Location**: `apps/api/schemas/base.py`

The `BaseSchemaGenerator` bridges resolvers to GraphQL:

```python
class BaseSchemaGenerator(Generic[ResolverType, GraphQLType, CreateInputType, UpdateInputType]):
    resolver_class: Type[ResolverType]
    graphql_type: Type[GraphQLType]

    @classmethod
    def model_to_graphql(cls, model_instance: Any) -> GraphQLType:
        """Convert Prisma model to GraphQL type with field mapping"""
        model_dict = {}
        graphql_fields = getattr(cls.graphql_type, "__annotations__", {})

        for field_name in graphql_fields.keys():
            # Map snake_case (GraphQL) to camelCase (Prisma)
            prisma_field_name = field_name
            if field_name == "is_published":
                prisma_field_name = "isPublished"
            elif field_name == "created_at":
                prisma_field_name = "createdAt"
            # ... add more mappings as needed

            if hasattr(model_instance, prisma_field_name):
                model_dict[field_name] = getattr(model_instance, prisma_field_name)

        return cls.graphql_type(**model_dict)

    @classmethod
    async def get_all_query(cls) -> List[GraphQLType]:
        db = await get_db()
        models = await cls.resolver_class.get_all(db)
        return [cls.model_to_graphql(model) for model in models]

    # ... other methods: get_by_id_query, create_mutation, update_mutation, delete_mutation
```

### Adding a New Entity (Complete Example)

#### 1. Prisma Model

```prisma
// prisma/schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("user")
}
```

#### 2. GraphQL Types

```python
# graphql_types/user.py
from datetime import datetime
from typing import Optional
import strawberry

@strawberry.type
class User:
    id: int
    email: str
    name: Optional[str]
    created_at: datetime
    updated_at: datetime

@strawberry.input
class CreateUserInput:
    email: str
    name: Optional[str] = None

@strawberry.input
class UpdateUserInput:
    email: Optional[str] = None
    name: Optional[str] = None
```

#### 3. Resolver

```python
# resolvers/user.py
from .base import BaseResolver

class UserResolver(BaseResolver):
    model_name = "user"
```

#### 4. Schema

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

    @strawberry.field
    async def update_user(self, id: int, input: UpdateUserInput) -> Optional[User]:
        return await UserSchemaGenerator.update_mutation(id, input)

    @strawberry.field
    async def delete_user(self, id: int) -> bool:
        return await UserSchemaGenerator.delete_mutation(id)
```

#### 5. Register in Root Schema

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

## Frontend Patterns

### UI Component Pattern (CVA)

Using `class-variance-authority` for variant-based components:

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

### Custom Hook Pattern

```typescript
// hooks/useGraphQLStatus.ts
import { useState, useEffect, useCallback } from 'react'

interface HealthData {
  status: string
  timestamp: string
  api: { status: string }
  database: { status: string; connection: boolean; details: string | null }
}

export function useGraphQLStatus() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [healthData, setHealthData] = useState<HealthData | undefined>()
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const fetchHealth = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { health { status timestamp api { status } database { status connection details } } }`
        })
      })

      if (!response.ok) throw new Error('Failed to fetch')

      const { data, errors } = await response.json()
      if (errors) throw new Error(errors[0].message)

      setHealthData(data.health)
      setLastChecked(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  return {
    isConnected: healthData?.database?.connection ?? false,
    isLoading,
    error,
    lastChecked,
    apiUrl: '/api/graphql',
    healthData,
    refetch: fetchHealth,
  }
}
```

### Composable Section Pattern

Landing pages use composable sections:

```typescript
// app/page.tsx
import { Header } from '@/components/landing/Header'
import { HeroSection } from '@/components/landing/HeroSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { Footer } from '@/components/landing/Footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <Footer />
    </main>
  )
}
```

Each section is self-contained with its own data and styling.

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| React Component | PascalCase | `GraphQLStatusCard.tsx` |
| Hook | camelCase with `use` prefix | `useGraphQLStatus.ts` |
| Utility | camelCase | `utils.ts` |
| Test | `.test.tsx` suffix | `Button.test.tsx` |
| Python module | snake_case | `health.py` |

### Code

| Language | Variables | Functions | Classes | Constants |
|----------|-----------|-----------|---------|-----------|
| TypeScript | camelCase | camelCase | PascalCase | SCREAMING_SNAKE |
| Python | snake_case | snake_case | PascalCase | SCREAMING_SNAKE |
| GraphQL | snake_case | snake_case | PascalCase | - |

### Field Name Mapping

| Layer | Convention | Example |
|-------|------------|---------|
| GraphQL Schema | snake_case | `is_published` |
| Prisma Model | camelCase | `isPublished` |
| Database Column | snake_case | `is_published` |

The `BaseSchemaGenerator.model_to_graphql()` handles conversion.

## Error Handling

### Backend

```python
@classmethod
async def delete(cls, db: Prisma, id: int) -> bool:
    try:
        await model_delegate.delete(where={"id": id})
        return True
    except Exception:
        return False
```

### Frontend

```typescript
try {
  const response = await fetch('/api/graphql', { ... })
  if (!response.ok) throw new Error('Network error')

  const { data, errors } = await response.json()
  if (errors) throw new Error(errors[0].message)

  return data
} catch (err) {
  setError(err instanceof Error ? err.message : 'Unknown error')
}
```

## Code Style Enforcement

### Python
- **Black**: Auto-formatting (line length 88)
- **isort**: Import sorting (black profile)
- **flake8**: Linting (max line 120)

### TypeScript
- **ESLint**: Linting with Next.js config
- **TypeScript**: Strict mode

### Pre-commit
Configured in `lint-staged` (package.json):
- TypeScript files: ESLint --fix
- Python files: Black, isort, flake8
