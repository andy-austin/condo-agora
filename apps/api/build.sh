#!/bin/bash
set -e # Exit on error

echo "Current directory: $(pwd)"
echo "Listing files in current directory:"
ls -la

echo "Installing dependencies..."
python3 -m pip install -r requirements.txt

echo "Generating Prisma Client..."
python3 -m prisma generate --schema=prisma/schema.prisma

echo "Listing generated files in prisma_client:"
if [ -d "prisma_client" ]; then
  ls -la prisma_client
else
  echo "ERROR: prisma_client directory not found!"
fi

echo "Checking if apps.api.prisma_client is importable..."
# We try to import it to fail the build early if it doesn't work
export PYTHONPATH=$(pwd)/../..
python3 -c "import sys; sys.path.append('$(pwd)'); print(sys.path); import prisma_client; print('Import successful')"