# Condo Agora

**Production-ready full-stack template** combining React and Python, designed for high performance and scalability.
Deployed on Vercel.

## Features

- **Frontend**: Next.js 14 (App Router) with TypeScript & Tailwind CSS
- **Backend**: Python FastAPI with Strawberry GraphQL
- **Database**: PostgreSQL managed by Prisma (Python Client)
- **Type Safety**: End-to-end type safety with GraphQL and Prisma generated models
- **Testing**: Jest/React Testing Library for frontend, Pytest for backend
- **Monorepo**: TurboRepo for efficient build and dependency management
- **Linting**: ESLint, Prettier, Black, and Flake8
- **CI/CD**: GitHub Actions for automated testing and linting

## Prerequisites

- Node.js >= 18
- pnpm (install with `npm install -g pnpm`)
- Docker (for local PostgreSQL database)

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
- Start a PostgreSQL database in Docker
- Create `.env` with default database configuration
- Generate the Prisma client
- Run database migrations
- Set up git pre-commit hooks

### 3. Start development servers

```bash
pnpm dev
```

The application will be available at:

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API (direct)**: [http://localhost:8000](http://localhost:8000)
- **GraphQL Playground**: [http://localhost:8000/graphql](http://localhost:8000/graphql)

## Manual Database Setup

If you prefer to manage the database manually instead of using the setup script:

```bash
# Start PostgreSQL in Docker
docker run --name condo-agora-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=condo_agora \
  -p 5432:5432 \
  -d postgres:15

# Create .env with the connection string
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/condo_agora" > .env

# Run migrations
pnpm migrate
```

## Common Commands

| Command          | Description               |
|------------------|---------------------------|
| `pnpm dev`       | Start development servers |
| `pnpm build`     | Build for production      |
| `pnpm lint`      | Run all linters           |
| `pnpm lint:fix`  | Fix linting issues        |
| `pnpm test`      | Run tests                 |
| `pnpm typecheck` | Check TypeScript types    |
| `pnpm migrate`   | Run database migrations   |

## Project Structure

```
condo-agora/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/             # App router pages
│   │   └── ...
│   └── api/                 # FastAPI backend
│       ├── prisma/          # Prisma schema
│       ├── prisma_client/   # Generated Prisma client
│       ├── resolvers/       # GraphQL resolvers
│       └── ...
├── .env                     # Environment variables (created by setup.sh)
├── .env.example             # Example environment variables
├── setup.sh                 # Development setup script
└── ...
```

## Environment Variables

| Variable       | Description                  | Default                                                     |
|----------------|------------------------------|-------------------------------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/condo_agora` |

## Deployment

The project is configured for deployment on Vercel:

- **Frontend**: Deployed as a Next.js application
- **Backend**: Deployed as a Python serverless function
- **Database**: Use Vercel Postgres or any PostgreSQL provider

Set the `DATABASE_URL` environment variable in your Vercel project settings.

## Documentation

- [Frontend](./apps/web/README.md)
- [Backend](./apps/api/README.md)

## License

MIT
