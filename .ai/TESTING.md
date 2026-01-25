# Testing Guide

The project uses Jest for frontend testing and Pytest for backend testing.

## Running Tests

```bash
# Run all tests (both frontend and backend)
pnpm test

# Run frontend tests only
pnpm --filter web test

# Run backend tests only
pnpm --filter api test

# Watch mode (frontend)
cd apps/web && pnpm test:watch

# Watch mode (backend)
cd apps/api && pnpm test:watch

# Coverage (frontend)
cd apps/web && pnpm test:coverage

# Coverage (backend)
cd apps/api && pnpm test:coverage
```

## Frontend Testing (Jest)

### Configuration

**File**: `apps/web/jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/tests/**/*.test.{js,jsx,ts,tsx}'],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/tests/**',
    '!**/jest.config.js',
    '!**/jest.setup.js',
  ],
}
```

**Setup**: `apps/web/jest.setup.js`

```javascript
import '@testing-library/jest-dom'
```

### Test Structure

```
apps/web/tests/
├── components/
│   ├── GraphQLStatusCard.test.tsx
│   └── ui/
│       └── Button.test.tsx
```

### Writing Component Tests

```typescript
// tests/components/ui/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click me</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
  })
})
```

### Testing Hooks

```typescript
// tests/hooks/useGraphQLStatus.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { useGraphQLStatus } from '@/hooks/useGraphQLStatus'

describe('useGraphQLStatus', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('returns loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useGraphQLStatus())
    expect(result.current.isLoading).toBe(true)
  })

  it('returns health data on success', async () => {
    const mockData = {
      data: {
        health: {
          status: 'healthy',
          api: { status: 'operational' },
          database: { status: 'connected', connection: true }
        }
      }
    }

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData)
    })

    const { result } = renderHook(() => useGraphQLStatus())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
  })
})
```

### Mocking GraphQL Requests

```typescript
describe('GraphQLStatusCard', () => {
  it('displays healthy status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          health: {
            status: 'healthy',
            timestamp: '2024-01-25T12:00:00Z',
            api: { status: 'operational' },
            database: { status: 'connected', connection: true, details: null }
          }
        }
      })
    })

    render(<GraphQLStatusCard />)

    await waitFor(() => {
      expect(screen.getByText(/healthy/i)).toBeInTheDocument()
    })
  })
})
```

## Backend Testing (Pytest)

### Configuration

**File**: `apps/api/pytest.ini`

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

### Test Structure

```
apps/api/tests/
├── __init__.py
├── test_health.py
└── test_note.py
```

### Writing Tests

```python
# tests/test_note.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

class TestNoteQueries:
    @pytest.mark.asyncio
    async def test_notes_query(self):
        """Test fetching all notes via GraphQL"""
        from apps.api.schema import schema

        # Mock the database
        mock_notes = [
            MagicMock(
                id=1,
                title="Test Note",
                content="Content",
                isPublished=True,
                createdAt="2024-01-25T12:00:00Z",
                updatedAt="2024-01-25T12:00:00Z"
            )
        ]

        with patch('apps.api.database.get_db') as mock_get_db:
            mock_db = AsyncMock()
            mock_db.note.find_many = AsyncMock(return_value=mock_notes)
            mock_get_db.return_value = mock_db

            result = await schema.execute("""
                query {
                    notes {
                        id
                        title
                        content
                    }
                }
            """)

            assert result.errors is None
            assert len(result.data['notes']) == 1
            assert result.data['notes'][0]['title'] == "Test Note"

    @pytest.mark.asyncio
    async def test_create_note_mutation(self):
        """Test creating a note via GraphQL"""
        from apps.api.schema import schema

        mock_note = MagicMock(
            id=1,
            title="New Note",
            content=None,
            isPublished=False,
            createdAt="2024-01-25T12:00:00Z",
            updatedAt="2024-01-25T12:00:00Z"
        )

        with patch('apps.api.database.get_db') as mock_get_db:
            mock_db = AsyncMock()
            mock_db.note.create = AsyncMock(return_value=mock_note)
            mock_get_db.return_value = mock_db

            result = await schema.execute("""
                mutation {
                    createNote(input: { title: "New Note" }) {
                        id
                        title
                    }
                }
            """)

            assert result.errors is None
            assert result.data['createNote']['title'] == "New Note"
```

### Testing REST Endpoints

```python
# tests/test_health.py
import pytest
from httpx import AsyncClient, ASGITransport

class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_endpoint(self):
        """Test REST health endpoint"""
        from apps.api.index import app

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get("/api/health")

            assert response.status_code == 200
            assert response.json() == {"ok": True}
```

### Fixtures

```python
# tests/conftest.py
import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_db():
    """Provides a mocked database instance"""
    with patch('apps.api.database.get_db') as mock:
        db = AsyncMock()
        mock.return_value = db
        yield db

@pytest.fixture
def sample_note():
    """Returns a sample note mock object"""
    from unittest.mock import MagicMock
    return MagicMock(
        id=1,
        title="Test Note",
        content="Test content",
        isPublished=False,
        createdAt="2024-01-25T12:00:00Z",
        updatedAt="2024-01-25T12:00:00Z"
    )
```

Using fixtures:

```python
class TestNoteQueries:
    @pytest.mark.asyncio
    async def test_get_note_by_id(self, mock_db, sample_note):
        mock_db.note.find_unique = AsyncMock(return_value=sample_note)

        from apps.api.schema import schema
        result = await schema.execute("""
            query {
                note(id: 1) { id title }
            }
        """)

        assert result.data['note']['id'] == 1
```

## Running Single Tests

### Frontend

```bash
# Run tests matching pattern
cd apps/web && pnpm test -- --testPathPattern="Button"

# Run specific test file
cd apps/web && pnpm test -- tests/components/ui/Button.test.tsx

# Run tests matching name
cd apps/web && pnpm test -- --testNamePattern="renders with text"
```

### Backend

```bash
# Run specific test file
cd ../.. && .venv/bin/python -m pytest apps/api/tests/test_note.py -v

# Run specific test class
cd ../.. && .venv/bin/python -m pytest apps/api/tests/test_note.py::TestNoteQueries -v

# Run specific test function
cd ../.. && .venv/bin/python -m pytest apps/api/tests/test_note.py::TestNoteQueries::test_notes_query -v

# Run tests matching pattern
cd ../.. && .venv/bin/python -m pytest apps/api/tests/ -k "health" -v
```

## Best Practices

### Frontend
1. Test component behavior, not implementation
2. Use `screen` queries over container queries
3. Prefer `userEvent` over `fireEvent`
4. Mock external dependencies (fetch, APIs)
5. Test accessibility with `getByRole`

### Backend
1. Always use `@pytest.mark.asyncio` for async tests
2. Mock database at the `get_db` level
3. Test GraphQL through schema execution
4. Use fixtures for common test data
5. Test both success and error cases
