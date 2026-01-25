# AI Agent Documentation

This folder contains comprehensive documentation for AI agents working on the Condo Agora codebase.

## Quick Start

1. Read [OVERVIEW.md](./OVERVIEW.md) for high-level architecture
2. Dive into domain-specific docs based on your task

## Documentation Index

| Document | Purpose | Read When |
|----------|---------|-----------|
| [OVERVIEW.md](./OVERVIEW.md) | System architecture, tech stack, directory structure | Starting any task |
| [BACKEND.md](./BACKEND.md) | FastAPI, Python structure, API layers | Working on backend |
| [FRONTEND.md](./FRONTEND.md) | Next.js, React components, hooks, styling | Working on frontend |
| [DATABASE.md](./DATABASE.md) | Prisma schema, models, migrations, queries | Modifying database |
| [GRAPHQL.md](./GRAPHQL.md) | GraphQL schema, types, queries, mutations | Adding/modifying API |
| [TESTING.md](./TESTING.md) | Jest, Pytest, test patterns, running tests | Writing tests |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel config, environment variables, troubleshooting | Deploying changes |
| [PATTERNS.md](./PATTERNS.md) | Code patterns, conventions, adding new features | Extending codebase |

## Common Tasks

### Add a New Backend Entity
1. Read [PATTERNS.md](./PATTERNS.md) - "Adding a New Entity" section
2. Reference [DATABASE.md](./DATABASE.md) for Prisma model syntax
3. Reference [GRAPHQL.md](./GRAPHQL.md) for type definitions

### Add a New Frontend Component
1. Read [FRONTEND.md](./FRONTEND.md) - Component patterns
2. Reference [PATTERNS.md](./PATTERNS.md) - UI Component Pattern

### Fix a Bug
1. Read [OVERVIEW.md](./OVERVIEW.md) to understand data flow
2. Reference domain-specific doc (BACKEND or FRONTEND)
3. Check [TESTING.md](./TESTING.md) for writing regression tests

### Deploy Changes
1. Read [DEPLOYMENT.md](./DEPLOYMENT.md) - Pre-deployment checklist
2. Verify environment variables and database migrations
