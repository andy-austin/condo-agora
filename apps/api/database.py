import os
import stat
import platform
from pathlib import Path

from dotenv import load_dotenv

# Set up Prisma query engine binary path for serverless environments (Linux)
# This must be done BEFORE importing Prisma
# Only use the bundled Linux binary when running on Linux (e.g., Vercel/AWS Lambda)
if platform.system() == "Linux":
    _api_dir = Path(__file__).parent
    _engine_name = "prisma-query-engine-rhel-openssl-3.0.x"

    # Try multiple possible locations for the binary
    _possible_paths = [
        _api_dir / "prisma_client" / _engine_name,  # Standard location
        _api_dir / _engine_name,  # Direct in api directory
        Path("/var/task") / "prisma_client" / _engine_name,  # Lambda deployment
        Path("/var/task") / "apps" / "api" / "prisma_client" / _engine_name,
    ]

    for _engine_path in _possible_paths:
        if _engine_path.exists():
            # Make binary executable if not already
            _current_mode = _engine_path.stat().st_mode
            if not (_current_mode & stat.S_IXUSR):
                _engine_path.chmod(_current_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
            os.environ["PRISMA_QUERY_ENGINE_BINARY"] = str(_engine_path)
            break

from .prisma_client import Prisma

# Load environment variables from the root directory
env_path = os.path.join(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ),  # noqa: E501
    ".env.local",
)
load_dotenv(env_path)

db = Prisma()


async def get_db():
    if not db.is_connected():
        await db.connect()
    return db