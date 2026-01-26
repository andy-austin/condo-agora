#!/bin/bash
# Install dependencies
python3 -m pip install -r requirements.txt

# Generate Prisma Client
python3 -m prisma generate --schema=prisma/schema.prisma
