# Testing Guide

The project uses Jest for frontend unit/component testing, Pytest for backend testing, and Playwright for end-to-end testing.

## Running Tests

```bash
# Run all unit tests (both frontend and backend)
pnpm test

# Run frontend unit tests only
pnpm --filter web test

# Run backend tests only
pnpm --filter api test

# Run E2E tests
cd apps/web && pnpm test:e2e

# Run E2E tests with interactive UI
cd apps/web && pnpm test:e2e:ui

# Run E2E tests in headed browser
cd apps/web && pnpm test:e2e:headed

# Watch mode (frontend unit tests)
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

## E2E Testing (Playwright)

### Configuration

**File**: `apps/web/playwright.config.ts`

Playwright is configured with:
- **Test directory**: `apps/web/e2e/`
- **Browser projects**: Chromium (desktop) and Mobile Chrome
- **Dev server**: Auto-starts via `pnpm dev` if not already running
- **Screenshots**: Captured on failure
- **Traces**: Recorded on first retry

### Setup

```bash
# Install Playwright and browser binaries
cd apps/web
pnpm add -D @playwright/test
npx playwright install chromium

# Optionally install additional browsers
npx playwright install firefox webkit
```

### Test Structure

```
apps/web/e2e/
├── fixtures/
│   ├── auth.ts              # Clerk auth mocking + real login + multi-role fixtures
│   └── graphql.ts           # GraphQL route interception + API client
├── .auth/                   # Saved auth state per role (gitignored)
├── auth.spec.ts             # Authentication flow tests
├── dashboard.spec.ts        # Dashboard page tests
├── health.spec.ts           # Health check page tests
├── invitation.spec.ts       # Invitation flow tests
├── landing.spec.ts          # Landing page tests (desktop + mobile)
├── notes-api.spec.ts        # Notes CRUD API-level tests
├── properties.spec.ts       # Properties CRUD tests
├── real-auth.spec.ts        # Real Clerk login per role (admin, resident, member)
├── real-rbac.spec.ts        # Backend authorization enforcement tests
├── residents.spec.ts        # Residents management tests
└── rbac.spec.ts             # Role-based UI visibility tests (mocked)
```

### Test Fixtures

#### GraphQL Mocking (`fixtures/graphql.ts`)

Intercepts GraphQL requests and returns mock responses:

```typescript
import { mockGraphQL } from './fixtures/graphql';

test('shows properties', async ({ page }) => {
  await mockGraphQL(page, [
    { query: 'Me', response: { data: { me: { id: '1', memberships: [...] } } } },
    { query: 'GetHouses', response: { data: { houses: [...] } } },
  ]);

  await page.goto('/dashboard/properties');
  await expect(page.getByText('Unit 101')).toBeVisible();
});
```

Handlers match by `operationName` or by substring in the `query` body.

#### Auth Fixtures (`fixtures/auth.ts`)

Three authentication strategies:

1. **Mock Clerk Auth** (`authedPage`) — Intercepts Clerk API calls client-side. Used for isolated UI tests with GraphQL mocking.
2. **Real Clerk Login** (`realAuthedPage`) — Logs in through the actual Clerk sign-in page using test credentials. Session is cached in `.auth/user.json` for reuse.
3. **Role-specific Login** (`adminPage`, `residentPage`, `memberPage`) — Logs in as a specific role with separate cached auth state per role. Used for real backend authorization tests.

Test credentials are configured via environment variables:
- `E2E_ADMIN_EMAIL` (default: `admin@agora.com`)
- `E2E_RESIDENT_EMAIL` (default: `resident@agora.com`)
- `E2E_MEMBER_EMAIL` (default: `member@agora.com`)
- `E2E_USER_PASSWORD` (default: `3AgF…XrXqBX0Qa`)

#### API-Level Tests (`fixtures/graphql.ts`)

The `graphqlRequest()` utility sends GraphQL requests directly to the backend, bypassing the browser. Used for Notes CRUD tests.

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

test.describe('My Feature', () => {
  test('does something', async ({ page }) => {
    // Set up GraphQL mocks before navigation
    await mockGraphQL(page, [
      { query: 'MyQuery', response: { data: { ... } } },
    ]);

    await page.goto('/my-page');
    await expect(page.getByText('Expected content')).toBeVisible();
  });
});
```

### Running Single E2E Tests

```bash
# Run a specific spec file
cd apps/web && pnpm test:e2e -- e2e/landing.spec.ts

# Run a specific test by name
cd apps/web && pnpm test:e2e -- -g "hero section"

# Run only on a specific project
cd apps/web && pnpm test:e2e -- --project=chromium

# Debug a test with browser inspector
cd apps/web && pnpm test:e2e -- --debug e2e/health.spec.ts
```

### Notes on E2E Tests

- **Public pages** (landing, health) use standard `page` fixture with route interception for GraphQL
- **Protected pages** (dashboard, properties, settings) work in Clerk dev mode without real auth; GraphQL calls are mocked via route interception
- **Notes API tests** hit the backend directly and skip gracefully when the API is unavailable
- **Mobile tests** handle viewport-specific UI (hamburger menus, sticky nav overlap) with `isMobile` parameter

## Best Practices

### Frontend (Unit Tests)
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

### E2E Tests
1. Set up GraphQL mocks **before** navigating to the page
2. Use specific locators (`getByRole`, `getByLabel`) over generic ones (`getByText`)
3. Add `{ exact: true }` to `getByText` when the string is a substring of other elements
4. Scope locators with `.locator()` or `.filter()` to avoid strict mode violations
5. Use `isMobile` parameter to handle responsive layout differences
6. Keep API-level tests separate from browser tests for faster execution
