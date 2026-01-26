#!/bin/bash

set -e

echo "Setting up development environment..."

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
pnpm install

# Set up uv and Python dependencies
echo "Setting up Python environment..."
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi

# Create or activate virtual environment in root
echo "Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
    echo "Creating .venv in root directory..."
    uv venv .venv
else
    echo ".venv already exists"
fi

# Install Python dependencies (dev + production)
if [ -f "apps/api/requirements-dev.txt" ]; then
    echo "Installing Python dependencies..."
    uv pip install -r apps/api/requirements-dev.txt --python .venv/bin/python
    echo "Python dependencies installed in .venv!"
else
    echo "Warning: No requirements-dev.txt found in apps/api/"
fi

# Set up environment variables
echo "Setting up environment variables..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo "Please update .env with your actual database credentials if needed."
    else
        echo "Warning: .env.example not found. Skipping .env creation."
    fi
else
    echo ".env already exists"
fi

# Start Docker Postgres if Docker is available and no database is running
echo "Checking database..."
if command -v docker &> /dev/null; then
    if ! docker ps --format '{{.Names}}' | grep -q "^condo-agora-db$"; then
        echo "Starting PostgreSQL in Docker..."
        # Remove stopped container if exists
        docker rm -f condo-agora-db 2>/dev/null || true
        docker run --name condo-agora-db \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=condo_agora \
            -p 5432:5432 \
            -d postgres:15
        echo "Waiting for PostgreSQL to be ready..."
        sleep 3
        echo "PostgreSQL is running on localhost:5432"
    else
        echo "PostgreSQL container 'condo-agora-db' is already running"
    fi
else
    echo "Docker not found. Please ensure PostgreSQL is running manually."
    echo "Expected connection: postgresql://postgres:postgres@localhost:5432/condo_agora"
fi

# Generate Prisma client
echo "Generating Prisma client..."
if [ -d "apps/api/prisma" ]; then
    pnpm --filter api run prisma:generate
    echo "Prisma client generated!"
else
    echo "Warning: Prisma schema directory not found in apps/api/prisma"
fi

# Run database migrations
echo "Running database migrations..."
pnpm migrate || echo "Warning: Migration failed. You may need to check your database connection."

# Set up pre-commit hooks (optional)
echo "Setting up pre-commit hooks..."
if command -v python3 &> /dev/null; then
    if ! command -v pre-commit &> /dev/null; then
        echo "Installing pre-commit..."
        uv tool install pre-commit 2>/dev/null || pip install pre-commit
    fi

    echo "Installing pre-commit hooks..."
    pre-commit install 2>/dev/null || echo "Warning: Could not install pre-commit hooks"

    echo "Pre-commit hooks installed!"
else
    echo "Warning: Python not found. Skipping pre-commit setup."
fi

echo ""
echo "Setup complete! You're ready to develop."
echo ""
echo "Quick commands:"
echo "  pnpm dev          - Start development servers"
echo "  pnpm lint         - Run all linters"
echo "  pnpm lint:fix     - Fix linting issues"
echo "  pnpm test         - Run tests"
echo "  pnpm migrate      - Run database migrations"
echo ""
echo "Database:"
echo "  Docker container: condo-agora-db"
echo "  Connection: postgresql://postgres:postgres@localhost:5432/condo_agora"
echo ""
