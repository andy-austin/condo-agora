from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from .database import db
from .schema import schema

app = FastAPI(root_path="/api")


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

router = GraphQLRouter(schema, path="/graphql")
app.include_router(router)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/debug")
def debug():
    import os
    import platform
    from pathlib import Path

    api_dir = Path(__file__).parent
    prisma_dir = api_dir / "prisma_client"

    files_info = []
    if prisma_dir.exists():
        for f in prisma_dir.iterdir():
            if f.is_file():
                files_info.append({
                    "name": f.name,
                    "size": f.stat().st_size,
                    "mode": oct(f.stat().st_mode),
                })

    return {
        "platform": platform.system(),
        "cwd": os.getcwd(),
        "api_dir": str(api_dir),
        "api_dir_exists": api_dir.exists(),
        "prisma_dir": str(prisma_dir),
        "prisma_dir_exists": prisma_dir.exists(),
        "engine_env": os.environ.get("PRISMA_QUERY_ENGINE_BINARY"),
        "database_url_set": bool(os.environ.get("POSTGRES_URL_NON_POOLING")),
        "files": files_info[:20],  # Limit output
    }
