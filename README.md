# Condo Agora

**Full-stack condo management platform** combining React and Python, deployed on Vercel.

## Features

- **Frontend**: Next.js 14 (App Router) with TypeScript & Tailwind CSS
- **Backend**: Python FastAPI with Strawberry GraphQL
- **Database**: MongoDB Atlas with Motor (async driver)
- **Auth**: Clerk for authentication and user management
- **Type Safety**: End-to-end type safety with GraphQL and Pydantic models
- **Testing**: Jest/React Testing Library for frontend, Pytest for backend, Playwright for E2E
- **Monorepo**: TurboRepo for efficient build and dependency management
- **Linting**: ESLint (frontend), Black, isort, and flake8 (backend)
- **CI/CD**: GitHub Actions for automated testing and linting

## Prerequisites

- Node.js >= 18
- pnpm (install with `npm install -g pnpm`)
- Python 3.11+ (managed via [uv](https://docs.astral.sh/uv/))
- A MongoDB Atlas account (free tier works for development)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/andy-austin/condo-agora.git
cd condo-agora
```

### 2. Run the setup script

```bash
./setup.sh
```

This script will:

- Install Node.js dependencies (pnpm)
- Install Python dependencies (uv + virtual environment)
- Create `.env` from `.env.example`
- Set up git pre-commit hooks

### 3. Configure environment variables

Update `.env` with your MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=condo_agora
```

### 4. Start development servers

```bash
pnpm dev
```

The application will be available at:

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API (direct)**: [http://localhost:8000](http://localhost:8000)
- **GraphQL Playground**: [http://localhost:8000/graphql](http://localhost:8000/graphql)

## Common Commands

| Command          | Description               |
|------------------|---------------------------|
| `pnpm dev`       | Start development servers |
| `pnpm build`     | Build for production      |
| `pnpm lint`      | Run all linters           |
| `pnpm lint:fix`  | Fix linting issues        |
| `pnpm test`      | Run unit tests            |
| `pnpm typecheck` | Check TypeScript types    |

### E2E Tests

```bash
cd apps/web
pnpm test:e2e            # Run all E2E tests
pnpm test:e2e:ui         # Interactive UI mode
pnpm test:e2e:headed     # Headed browser mode
```

Requires Chromium browser installed: `npx playwright install chromium`

## Project Structure

```
condo-agora/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/             # App router pages
│   │   └── ...
│   └── api/                 # FastAPI backend
│       ├── models/          # Pydantic document models
│       ├── graphql_types/   # Strawberry GraphQL types
│       ├── schemas/         # Query/Mutation definitions
│       ├── resolvers/       # Data access layer (Motor)
│       ├── schema.py        # Root GraphQL schema
│       ├── database.py      # MongoDB connection & indexes
│       └── index.py         # FastAPI entry point
├── docs/                    # Detailed documentation
├── .env.example             # Example environment variables
├── setup.sh                 # Development setup script
└── ...
```

## Environment Variables

| Variable         | Description                    | Default       |
|------------------|--------------------------------|---------------|
| `MONGODB_URI`    | MongoDB Atlas connection string | *(required)*  |
| `MONGODB_DB_NAME`| Database name                  | `condo_agora` |

## Deployment

The project is configured for deployment on Vercel:

- **Frontend**: Deployed as a Next.js application
- **Backend**: Deployed as a Python serverless function
- **Database**: MongoDB Atlas (cloud-hosted)

Set `MONGODB_URI` and `MONGODB_DB_NAME` in your Vercel project settings.

## Documentation

For comprehensive documentation, see the `docs/` folder:

| Document                                 | Purpose                                  |
|------------------------------------------|------------------------------------------|
| [docs/OVERVIEW.md](docs/OVERVIEW.md)     | System architecture and data flow        |
| [docs/BACKEND.md](docs/BACKEND.md)       | FastAPI, GraphQL, resolver patterns      |
| [docs/FRONTEND.md](docs/FRONTEND.md)     | Next.js, React components, hooks         |
| [docs/DATABASE.md](docs/DATABASE.md)     | MongoDB schema and queries               |
| [docs/GRAPHQL.md](docs/GRAPHQL.md)       | GraphQL types, queries, mutations        |
| [docs/TESTING.md](docs/TESTING.md)       | Jest, Pytest, and Playwright E2E testing |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel deployment configuration          |
| [docs/PATTERNS.md](docs/PATTERNS.md)     | Code patterns for extending the codebase |

## License

MIT
