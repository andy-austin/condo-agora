# Architecture Overview

This document provides a high-level overview of the Condo Agora application architecture for AI agents working on this codebase.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel Platform                          │
├─────────────────────────────┬───────────────────────────────────┤
│      Next.js Frontend       │      Python Serverless Function   │
│      (apps/web)             │      (apps/api)                   │
│                             │                                   │
│  ┌─────────────────────┐    │    ┌─────────────────────────┐   │
│  │   App Router        │    │    │   FastAPI               │   │
│  │   /app/*            │    │    │   /api/*                │   │
│  └─────────────────────┘    │    └─────────────────────────┘   │
│            │                │               │                   │
│  ┌─────────────────────┐    │    ┌─────────────────────────┐   │
│  │   React Components  │────┼───▶│   Strawberry GraphQL    │   │
│  │   GraphQL Client    │    │    │   /api/graphql          │   │
│  └─────────────────────┘    │    └─────────────────────────┘   │
│                             │               │                   │
│                             │    ┌─────────────────────────┐   │
│                             │    │   Prisma Python Client  │   │
│                             │    └─────────────────────────┘   │
│                             │               │                   │
└─────────────────────────────┴───────────────┼───────────────────┘
                                              │
                              ┌───────────────▼───────────────┐
                              │       PostgreSQL Database      │
                              │       (Vercel Postgres)        │
                              └───────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | Next.js 14, React 18, TypeScript | `apps/web/` |
| Styling | Tailwind CSS, Radix UI | `apps/web/` |
| API Layer | GraphQL (Strawberry) | `apps/api/` |
| Backend | FastAPI (Python) | `apps/api/` |
| ORM | Prisma (Python Client) | `apps/api/prisma/` |
| Database | PostgreSQL | External |
| Monorepo | TurboRepo, pnpm | Root |
| Deployment | Vercel | `vercel.json` |

## Directory Structure

```
condo-agora/
├── apps/
│   ├── web/                    # Next.js frontend application
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   │   ├── landing/        # Landing page sections
│   │   │   └── ui/             # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utility functions
│   │   └── tests/              # Jest tests
│   │
│   └── api/                    # FastAPI backend application
│       ├── graphql_types/      # Strawberry type definitions
│       ├── schemas/            # GraphQL query/mutation classes
│       ├── resolvers/          # Data access layer
│       ├── prisma/             # Database schema
│       ├── prisma_client/      # Generated Prisma client
│       └── tests/              # Pytest tests
│
├── docs/                        # AI agent documentation (this folder)
├── .env                        # Environment variables
├── package.json                # Root monorepo scripts
├── turbo.json                  # TurboRepo configuration
└── vercel.json                 # Vercel deployment config
```

## Request Flow

### Development Mode
1. Browser requests `/api/graphql`
2. Next.js rewrites to `http://localhost:8000/graphql`
3. FastAPI processes GraphQL query
4. Prisma executes database operations
5. Response flows back through the chain

### Production Mode
1. Browser requests `/api/graphql`
2. Vercel routes to Python serverless function
3. FastAPI processes GraphQL query
4. Prisma connects to Vercel Postgres
5. Response returns to browser

## Key Integration Points

### Frontend → Backend Communication
- **Protocol**: GraphQL over HTTP POST
- **Endpoint**: `/api/graphql`
- **Client**: Native fetch in custom hooks

### Backend → Database Communication
- **ORM**: Prisma Python Client (async)
- **Connection**: `DATABASE_URL` environment variable
- **Interface**: Async/await throughout

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `POSTGRES_URL_NON_POOLING` | Vercel Postgres (production) | Production |

## Related Documentation

- [Backend Architecture](./BACKEND.md)
- [Frontend Architecture](./FRONTEND.md)
- [Database & Prisma](./DATABASE.md)
- [GraphQL API](./GRAPHQL.md)
- [Testing Guide](./TESTING.md)
- [Deployment](./DEPLOYMENT.md)
- [Code Patterns](./PATTERNS.md)
