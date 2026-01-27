from fastapi import APIRouter, BackgroundTasks, Request

from .webhooks import handle_user_created, handle_user_updated, verify_clerk_webhook

router = APIRouter(prefix="/webhooks")


@router.post("/clerk")
async def clerk_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Endpoint that Clerk calls when user events occur.
    """
    msg = await verify_clerk_webhook(request)

    event_type = msg.get("type")
    data = msg.get("data")

    if event_type == "user.created":
        # Use background tasks to respond quickly to Clerk
        background_tasks.add_task(handle_user_created, data)
    elif event_type == "user.updated":
        background_tasks.add_task(handle_user_updated, data)

    return {"status": "ok"}
