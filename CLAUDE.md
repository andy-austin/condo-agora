# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Condo Agora is a full-stack monorepo combining Next.js (frontend) and FastAPI with Strawberry GraphQL (backend), deployed on Vercel. Uses TurboRepo for build orchestration.

## Commands

### Development
```bash
pnpm dev                    # Start both frontend (3000) and backend (8000)
pnpm build                  # Build all packages
pnpm lint                   # Run ESLint (web) + Black/Isort/Flake8 (api)
pnpm lint:fix               # Fix linting issues
pnpm test                   # Run Jest (web) + Pytest (api)
pnpm typecheck              # TypeScript type checking
pnpm migrate                # Run Prisma database migrations
```

### Single App Commands
```bash
pnpm --filter web dev       # Run frontend only
pnpm --filter api dev       # Run backend only
pnpm --filter web test      # Run frontend tests only
pnpm --filter api test      # Run backend tests only
```

### Database
```bash
pnpm --filter api run prisma:generate   # Generate Prisma client
pnpm --filter api run prisma:migrate    # Run migrations
pnpm --filter api run prisma:studio     # Open Prisma Studio
```

### Running Single Tests
```bash
# Frontend (Jest)
cd apps/web && pnpm test -- --testPathPattern="<pattern>"

# Backend (Pytest)
cd ../.. && .venv/bin/python -m pytest apps/api/tests/<test_file.py>::<test_function> -v
```

## Architecture

### Frontend (`apps/web/`)
- Next.js 14 with App Router, TypeScript, Tailwind CSS
- GraphQL client using Apollo Client / graphql-request
- Development: `/api/graphql` requests are rewritten to `localhost:8000/graphql` via `next.config.js`

### Backend (`apps/api/`)
- FastAPI with Strawberry GraphQL at `/api/graphql`
- Prisma Python Client for PostgreSQL (async)
- Entry point: `apps/api/index.py` with `app` FastAPI instance

### GraphQL Layer Structure
```
apps/api/
├── schema.py              # Strawberry schema combining all queries/mutations
├── graphql_types/         # Strawberry type definitions (input/output types)
├── schemas/               # Query/Mutation class definitions + BaseSchemaGenerator
│   └── base.py            # Generic schema generator for CRUD operations
└── resolvers/             # Data access layer using Prisma
    └── base.py            # Generic resolver with CRUD operations
```

**Pattern for adding new entities:**
1. Add model to `apps/api/prisma/schema.prisma`
2. Create GraphQL types in `graphql_types/<entity>.py`
3. Create resolver in `resolvers/<entity>.py` (extend `BaseResolver`)
4. Create schema in `schemas/<entity>.py` (extend `BaseSchemaGenerator`)
5. Register in `schema.py` Query/Mutation classes

### Production Routing
Handled by `vercel.json`: `/api/*` routes to Python serverless function, everything else to Next.js.

## Coding Conventions

### Python (Backend)
- Black formatter (line length 88)
- isort for imports (black profile)
- flake8 for linting (max line 120)
- Async/await throughout (Prisma async interface)
- GraphQL uses snake_case, Prisma models use camelCase - conversion handled in `BaseSchemaGenerator.model_to_graphql()`

### TypeScript (Frontend)
- Strict mode enabled
- Tailwind CSS for styling
- ESLint with Next.js config

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- For Vercel deployment: `POSTGRES_URL_NON_POOLING` is checked in `database.py`

## Detailed Documentation

For comprehensive documentation, see the `.ai/` folder:

| Document | Purpose |
|----------|---------|
| [.ai/OVERVIEW.md](.ai/OVERVIEW.md) | System architecture and data flow |
| [.ai/BACKEND.md](.ai/BACKEND.md) | FastAPI, GraphQL, resolver patterns |
| [.ai/FRONTEND.md](.ai/FRONTEND.md) | Next.js, React components, hooks |
| [.ai/DATABASE.md](.ai/DATABASE.md) | Prisma schema, migrations, queries |
| [.ai/GRAPHQL.md](.ai/GRAPHQL.md) | GraphQL types, queries, mutations |
| [.ai/TESTING.md](.ai/TESTING.md) | Jest and Pytest patterns |
| [.ai/DEPLOYMENT.md](.ai/DEPLOYMENT.md) | Vercel deployment configuration |
| [.ai/PATTERNS.md](.ai/PATTERNS.md) | Code patterns for extending the codebase |
