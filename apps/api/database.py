import os
import platform
from pathlib import Path

from dotenv import load_dotenv

# Set up Prisma query engine binary path for serverless environments (Linux)
# This must be done BEFORE importing Prisma
# Only use the bundled Linux binary when running on Linux (e.g., Vercel/AWS Lambda)
if platform.system() == "Linux":
    _api_dir = Path(__file__).parent
    _engine_path = _api_dir / "prisma_client" / "prisma-query-engine-rhel-openssl-3.0.x"
    if _engine_path.exists():
        os.environ["PRISMA_QUERY_ENGINE_BINARY"] = str(_engine_path)

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