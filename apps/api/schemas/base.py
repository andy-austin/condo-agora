from typing import Any, Generic, List, Optional, Type, TypeVar

from ..database import get_db
from ..resolvers.base import BaseResolver

ResolverType = TypeVar("ResolverType", bound=BaseResolver)
GraphQLType = TypeVar("GraphQLType")
CreateInputType = TypeVar("CreateInputType")
UpdateInputType = TypeVar("UpdateInputType")


class BaseSchemaGenerator(
    Generic[ResolverType, GraphQLType, CreateInputType, UpdateInputType]
):
    resolver_class: Type[ResolverType]
    graphql_type: Type[GraphQLType]

    @classmethod
    def model_to_graphql(cls, model_instance: Any) -> GraphQLType:
        """Convert MongoDB document or Pydantic model to GraphQL type"""
        model_dict = {}

        # Get all GraphQL type fields using __annotations__
        graphql_fields = getattr(cls.graphql_type, "__annotations__", {})

        for field_name in graphql_fields.keys():
            # Handle MongoDB documents (dicts) vs Pydantic models
            if isinstance(model_instance, dict):
                # Handle _id -> id conversion
                if field_name == "id" and "_id" in model_instance:
                    model_dict[field_name] = str(model_instance["_id"])
                elif field_name in model_instance:
                    model_dict[field_name] = model_instance[field_name]
            else:
                # Handle Pydantic models
                if hasattr(model_instance, field_name):
                    model_dict[field_name] = getattr(model_instance, field_name)

        return cls.graphql_type(**model_dict)

    @classmethod
    async def get_all_query(cls) -> List[GraphQLType]:
        db = await get_db()
        models = await cls.resolver_class.get_all(db)
        return [cls.model_to_graphql(model) for model in models]

    @classmethod
    async def get_by_id_query(cls, id: str) -> Optional[GraphQLType]:
        db = await get_db()
        model = await cls.resolver_class.get_by_id(db, id)
        if not model:
            return None
        return cls.model_to_graphql(model)

    @classmethod
    async def create_mutation(cls, input: CreateInputType) -> GraphQLType:
        db = await get_db()
        model = await cls.resolver_class.create(db, input)
        return cls.model_to_graphql(model)

    @classmethod
    async def update_mutation(
        cls, id: str, input: UpdateInputType
    ) -> Optional[GraphQLType]:
        db = await get_db()
        model = await cls.resolver_class.update(db, id, input)
        if not model:
            return None
        return cls.model_to_graphql(model)

    @classmethod
    async def delete_mutation(cls, id: str) -> bool:
        db = await get_db()
        return await cls.resolver_class.delete(db, id)
