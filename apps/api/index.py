import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from .database import db
from .schema import schema
from .src.auth.dependencies import get_current_user_optional
from .src.auth.invite_router import invite_router
from .src.auth.otp_router import router as otp_router

root_path = "/api" if os.getenv("VERCEL") else ""
app = FastAPI(root_path=root_path)


async def get_context(user=Depends(get_current_user_optional)):
    return {"user": user}


@app.on_event("startup")
async def startup():
    await db.connect()


@app.on_event("shutdown")
async def shutdown():
    if db.is_connected():
        await db.disconnect()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(otp_router, prefix="/api/auth")
app.include_router(invite_router, prefix="/api")
router = GraphQLRouter(schema, path="/graphql", context_getter=get_context)
app.include_router(router)


@app.get("/health")
async def health():
    is_healthy = await db.health_check()
    return {"ok": is_healthy, "database": "mongodb"}


@app.get("/debug")
async def debug():
    import os

    return {
        "database": "mongodb",
        "mongodb_uri_set": bool(os.environ.get("MONGODB_URI")),
        "mongodb_db_name": os.environ.get("MONGODB_DB_NAME", "condo_agora"),
        "connected": db.is_connected(),
    }
