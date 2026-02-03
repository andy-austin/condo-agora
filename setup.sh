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
        echo ""
        echo "IMPORTANT: Update .env with your MongoDB connection string!"
        echo "  - MONGODB_URI: Your MongoDB Atlas connection string"
        echo "  - MONGODB_DB_NAME: Database name (default: condo_agora)"
    else
        echo "Warning: .env.example not found. Skipping .env creation."
    fi
else
    echo ".env already exists"
fi

# Verify MongoDB connection string is configured
if [ -f ".env" ]; then
    if grep -q "^MONGODB_URI=" .env && ! grep -q "MONGODB_URI=mongodb+srv://username:password" .env; then
        echo "MongoDB URI appears to be configured."
    else
        echo ""
        echo "WARNING: MONGODB_URI not configured in .env"
        echo "Please update .env with your MongoDB Atlas connection string."
    fi
fi

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
echo ""
echo "Database:"
echo "  Using MongoDB Atlas (cloud-hosted)"
echo "  Connection configured via MONGODB_URI in .env"
echo ""
