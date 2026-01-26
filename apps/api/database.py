import os

from dotenv import load_dotenv
from prisma import Prisma

# Load environment variables from the root directory
env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".env",
)
load_dotenv(env_path)

db = Prisma()


async def get_db():
    if not db.is_connected():
        await db.connect()
    return db
