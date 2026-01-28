import os
import platform
from pathlib import Path

from dotenv import load_dotenv

# Set PRISMA_QUERY_ENGINE_BINARY for Linux (Vercel/serverless) before importing Prisma
if platform.system() == "Linux":
    _api_dir = Path(__file__).parent
    _bin_dir = _api_dir / "bin"
    for _f in _bin_dir.iterdir() if _bin_dir.exists() else []:
        if _f.name.startswith("query-engine-") and _f.is_file():
            os.environ["PRISMA_QUERY_ENGINE_BINARY"] = str(_f)
            break

from .prisma_client import Prisma  # noqa: E402

# Load environment variables from the root directory
env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".env",
)
load_dotenv(env_path)

# Load environment variables from the api directory
api_env_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    ".env",
)
load_dotenv(api_env_path)

db = Prisma()


async def get_db():
    if not db.is_connected():
        await db.connect()
    return db
