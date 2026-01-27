# Project Context: Condo Agora

## Overview

This is a full-stack monorepo combining **Next.js** (frontend) and **FastAPI** (backend), designed for deployment on
Vercel. It uses **Turborepo** for build and task management.

- **Frontend**: `apps/web` - Next.js 14 (App Router), TypeScript, Tailwind CSS.
- **Backend**: `apps/api` - Python FastAPI, Strawberry GraphQL, Prisma (Python client).
- **Database**: PostgreSQL (managed via Prisma in `apps/api`).

## Architecture & Communication

- **Development Routing**:
    - The frontend (`localhost:3000`) rewrites `/api/graphql` requests to the backend (`localhost:8000/graphql`) via
      `next.config.js`.
    - The backend runs on port `8000` via `uvicorn`.
- **Production Routing**: handled by Vercel configuration (likely `vercel.json`) routing `/api/*` to the Python
  serverless functions.
- **Data Fetching**: The frontend uses GraphQL (Apollo Client / graphql-request) to communicate with the FastAPI
  backend.

## Key Directories

- `apps/web/`: Frontend application.
- `apps/api/`: Backend application.
    - `prisma/`: Database schema and migrations.
    - `graphql_types/`, `resolvers/`, `schemas/`: GraphQL implementation details.
- `node_modules/`: Shared Node.js dependencies.
- `.venv/`: Python virtual environment (created by `setup.sh`).

## Development Workflow

### Prerequisites

- Node.js (>=18)
- Python (>=3.8)
- pnpm
- PostgreSQL (running locally or via a cloud provider)

### Setup

1. **Initialize**: Run `./setup.sh` to install Python dependencies, Node dependencies, and setup hooks.
2. **Environment**: Copy `.env.local.example` to `.env.local` and configure your database URL.

### Common Commands (Run from Root)

| Action               | Command      | Details                                                |
|:---------------------|:-------------|:-------------------------------------------------------|
| **Start Dev Server** | `pnpm dev`   | Starts both Next.js and FastAPI in parallel via Turbo. |
| **Build**            | `pnpm build` | Builds the frontend and any necessary artifacts.       |
| **Lint & Format**    | `pnpm lint`  | Runs ESLint (web) and Black/Isort/Flake8 (api).        |
| **Test**             | `pnpm test`  | Runs Jest (web) and Pytest (api).                      |

### Backend Specifics (`apps/api`)

*Commands should generally be run from the root, but defined in `apps/api/package.json`*

- **Database Migration**: `pnpm --filter api run prisma:migrate` (or via `scripts` in root `package.json`).
- **Generate Client**: `pnpm --filter api run prisma:generate`.
- **Direct Run**: `source .venv/bin/activate && python -m uvicorn apps.api.index:app --reload`

### Frontend Specifics (`apps/web`)

- **Direct Run**: `pnpm --filter web dev`
- **Test**: `pnpm --filter web test`

## Coding Conventions

- **Python**: Follows PEP 8. enforced by `black`, `isort`, and `flake8`.
- **TypeScript**: Strict mode enabled.
- **GraphQL**: Used for all API communication. Schema defined in Python (`strawberry`), consumed by React.
- **Styling**: Tailwind CSS for the frontend.

## Active Technologies

- Python 3.11 (Backend), TypeScript 5 (Frontend) (001-user-auth-integration)
- PostgreSQL (via Prisma) (001-user-auth-integration)

## Recent Changes

- 001-user-auth-integration: Added Python 3.11 (Backend), TypeScript 5 (Frontend)
