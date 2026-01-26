from typing import Generic, List, Optional, TypeVar

from ..prisma_client import Prisma

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class BaseResolver(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    model_name: str  # e.g., 'note'

    @classmethod
    async def get_all(cls, db: Prisma) -> List[ModelType]:
        model_delegate = getattr(db, cls.model_name)
        return await model_delegate.find_many()

    @classmethod
    async def get_by_id(cls, db: Prisma, id: int) -> Optional[ModelType]:
        model_delegate = getattr(db, cls.model_name)
        return await model_delegate.find_unique(where={"id": id})

    @classmethod
    async def create(cls, db: Prisma, obj_in: CreateSchemaType) -> ModelType:
        model_delegate = getattr(db, cls.model_name)
        obj_data = obj_in.__dict__
        # Convert GraphQL casing to Prisma model casing if needed
        if "is_published" in obj_data:
            obj_data["isPublished"] = obj_data.pop("is_published")

        return await model_delegate.create(data=obj_data)

    @classmethod
    async def update(
        cls, db: Prisma, id: int, obj_in: UpdateSchemaType
    ) -> Optional[ModelType]:
        model_delegate = getattr(db, cls.model_name)
        obj_data = {k: v for k, v in obj_in.__dict__.items() if v is not None}

        if "is_published" in obj_data:
            obj_data["isPublished"] = obj_data.pop("is_published")

        return await model_delegate.update(where={"id": id}, data=obj_data)

    @classmethod
    async def delete(cls, db: Prisma, id: int) -> bool:
        model_delegate = getattr(db, cls.model_name)
        try:
            await model_delegate.delete(where={"id": id})
            return True
        except Exception:
            return False
