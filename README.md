# Condo Agora

**Production-ready full-stack template** combining React and Python, designed for high performance and scalability. Deployed on Vercel.

## Features

- **Frontend**: Next.js 14 (App Router) with TypeScript & Tailwind CSS
- **Backend**: Python FastAPI with Strawberry GraphQL
- **Database**: PostgreSQL managed by Prisma (Python Client)
- **Type Safety**: End-to-end type safety with GraphQL and Prisma generated models
- **Testing**: Jest/React Testing Library for frontend, Pytest for backend
- **Monorepo**: TurboRepo for efficient build and dependency management
- **Linting**: ESLint, Prettier, Black, and Flake8
- **CI/CD**: GitHub Actions for automated testing and linting

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/condo-agora.git
cd condo-agora
```

### 2. Install dependencies

```bash
./setup.sh
```

This script will:
- Install Python dependencies (including creating a virtual environment)
- Install Node.js dependencies
- Initialize `.env.local` from the example file
- Generate the Prisma client
- Set up git hooks

### 3. Configure Environment Variables

The setup script creates a `.env.local` file for you. Edit it to match your database configuration:

```bash
# Edit .env.local if needed
nano .env.local
```

**Note:** You must have a PostgreSQL database running. If you have Docker installed, you can start one easily:
```bash
docker run --name postgres-db -e POSTGRES_PASSWORD=docker -p 5432:5432 -d postgres
```

### 4. Run Development Server

Ensure your database is accessible and migrations are applied:

```bash
pnpm migrate
pnpm dev
```

The application will be available at:
- Frontend: [http://localhost:3000](http://localhost:3000)
- API GraphQL Playground: [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql) (Proxied) or [http://localhost:8000/graphql](http://localhost:8000/graphql) (Direct)

## Project Structure

```
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # FastAPI backend
└── ...
```

## Documentation

- [Frontend](./apps/web/README.md)
- [Backend](./apps/api/README.md)

## License

MIT