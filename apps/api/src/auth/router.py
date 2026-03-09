from fastapi import APIRouter, Request

from .webhooks import handle_user_created, handle_user_updated, verify_clerk_webhook

router = APIRouter(prefix="/webhooks")


@router.post("/clerk")
async def clerk_webhook(request: Request):
    """
    Endpoint that Clerk calls when user events occur.
    Handlers run synchronously to ensure they complete before the
    serverless function shuts down (BackgroundTasks are unreliable on Vercel).
    """
    msg = await verify_clerk_webhook(request)

    event_type = msg.get("type")
    data = msg.get("data")

    if event_type == "user.created":
        await handle_user_created(data)
    elif event_type == "user.updated":
        await handle_user_updated(data)

    return {"status": "ok"}
