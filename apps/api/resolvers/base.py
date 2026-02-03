from datetime import datetime
from typing import Generic, List, Optional, Type, TypeVar

from bson import ObjectId

from ..database import MongoDB
from ..models.base import BaseDocument

ModelType = TypeVar("ModelType", bound=BaseDocument)
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class BaseResolver(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    collection_name: str  # e.g., 'notes'
    model_class: Type[ModelType]  # Pydantic model class

    @classmethod
    async def get_all(cls, db: MongoDB) -> List[ModelType]:
        """Get all documents from the collection."""
        collection = db.db[cls.collection_name]
        cursor = collection.find({})
        results = []
        async for doc in cursor:
            results.append(cls.model_class.from_mongo(doc))
        return results

    @classmethod
    async def get_by_id(cls, db: MongoDB, id: str) -> Optional[ModelType]:
        """Get a document by its ID."""
        collection = db.db[cls.collection_name]
        try:
            doc = await collection.find_one({"_id": ObjectId(id)})
            return cls.model_class.from_mongo(doc)
        except Exception:
            return None

    @classmethod
    async def create(cls, db: MongoDB, obj_in: CreateSchemaType) -> ModelType:
        """Create a new document."""
        collection = db.db[cls.collection_name]
        now = datetime.utcnow()

        # Convert input to dict, handling both Pydantic models and dataclasses
        if hasattr(obj_in, "model_dump"):
            obj_data = obj_in.model_dump(exclude_none=True)
        elif hasattr(obj_in, "__dict__"):
            obj_data = {k: v for k, v in obj_in.__dict__.items() if v is not None}
        else:
            obj_data = dict(obj_in)

        # Add timestamps
        obj_data["created_at"] = now
        obj_data["updated_at"] = now

        result = await collection.insert_one(obj_data)
        obj_data["_id"] = str(result.inserted_id)

        return cls.model_class.from_mongo(obj_data)

    @classmethod
    async def update(
        cls, db: MongoDB, id: str, obj_in: UpdateSchemaType
    ) -> Optional[ModelType]:
        """Update an existing document."""
        collection = db.db[cls.collection_name]

        # Convert input to dict, handling both Pydantic models and dataclasses
        if hasattr(obj_in, "model_dump"):
            obj_data = obj_in.model_dump(exclude_none=True)
        elif hasattr(obj_in, "__dict__"):
            obj_data = {k: v for k, v in obj_in.__dict__.items() if v is not None}
        else:
            obj_data = dict(obj_in)

        # Add updated timestamp
        obj_data["updated_at"] = datetime.utcnow()

        try:
            result = await collection.find_one_and_update(
                {"_id": ObjectId(id)},
                {"$set": obj_data},
                return_document=True,
            )
            return cls.model_class.from_mongo(result)
        except Exception:
            return None

    @classmethod
    async def delete(cls, db: MongoDB, id: str) -> bool:
        """Delete a document by ID."""
        collection = db.db[cls.collection_name]
        try:
            result = await collection.delete_one({"_id": ObjectId(id)})
            return result.deleted_count > 0
        except Exception:
            return False
