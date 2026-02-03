import os
from typing import Optional

import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

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


class MongoDB:
    """Async MongoDB client wrapper using Motor."""

    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    _connected: bool = False

    def __init__(self):
        self.uri = os.getenv("MONGODB_URI")
        self.db_name = os.getenv("MONGODB_DB_NAME", "condo_agora")

    async def connect(self) -> None:
        """Connect to MongoDB Atlas."""
        if self._connected:
            return

        if not self.uri:
            raise ValueError(
                "MONGODB_URI environment variable is not set. "
                "Please set it to your MongoDB Atlas connection string."
            )

        self.client = AsyncIOMotorClient(self.uri, tlsCAFile=certifi.where())
        self.db = self.client[self.db_name]
        self._connected = True

        # Create indexes for unique constraints
        await self._create_indexes()

    async def disconnect(self) -> None:
        """Disconnect from MongoDB."""
        if self.client:
            self.client.close()
            self._connected = False
            self.client = None
            self.db = None

    async def health_check(self) -> bool:
        """Check if the database connection is healthy."""
        if not self._connected or not self.client:
            return False
        try:
            await self.client.admin.command("ping")
            return True
        except Exception:
            return False

    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self._connected

    async def _create_indexes(self) -> None:
        """Create indexes for unique constraints and query optimization."""
        if self.db is None:
            return

        # Users collection indexes
        await self.db.users.create_index("clerk_id", unique=True)
        await self.db.users.create_index("email")

        # Organizations collection indexes
        await self.db.organizations.create_index("slug", unique=True)

        # Organization members collection indexes
        await self.db.organization_members.create_index(
            [("user_id", 1), ("organization_id", 1)], unique=True
        )
        await self.db.organization_members.create_index("user_id")
        await self.db.organization_members.create_index("organization_id")

        # Invitations collection indexes
        await self.db.invitations.create_index("token", unique=True)
        await self.db.invitations.create_index("email")
        await self.db.invitations.create_index("organization_id")

        # Houses collection indexes
        await self.db.houses.create_index("organization_id")

        # Notes collection indexes
        await self.db.notes.create_index("created_at")


# Global database instance
db = MongoDB()


async def get_db() -> MongoDB:
    """Get the database instance, connecting if necessary."""
    if not db.is_connected():
        await db.connect()
    return db
