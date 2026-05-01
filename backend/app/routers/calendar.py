"""
Google Calendar OAuth + event creation.
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from bson import ObjectId

from app.auth import get_current_user
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/calendar", tags=["calendar"])
SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def _make_flow():
    from google_auth_oauthlib.flow import Flow
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uris": [settings.google_redirect_uri],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.google_redirect_uri,
    )


@router.get("/connect")
async def connect_calendar(user=Depends(get_current_user)):
    if not settings.google_client_id:
        return {"auth_url": None, "message": "Google Calendar not configured on this server"}
    try:
        flow = _make_flow()
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            state=str(user["_id"]),
        )
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start OAuth flow: {e}")


@router.get("/callback")
async def calendar_callback(code: str, state: str, error: str = None):
    if error:
        return RedirectResponse(url=f"{settings.frontend_url}/settings?calendar=error&reason={error}")
    try:
        flow = _make_flow()
        flow.fetch_token(code=code)
        creds = flow.credentials
        token_data = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": list(creds.scopes or []),
        }
        db = get_db()
        await db.users.update_one(
            {"_id": ObjectId(state)},
            {"$set": {"calendar_token": token_data}},
        )
        return RedirectResponse(url=f"{settings.frontend_url}/settings?calendar=connected")
    except Exception as e:
        print(f"Calendar callback error: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/settings?calendar=error")


@router.delete("/disconnect")
async def disconnect_calendar(user=Depends(get_current_user)):
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(str(user["_id"]))},
        {"$set": {"calendar_token": None}},
    )
    return {"status": "disconnected"}


def _create_event_sync(token_data: dict, title: str, priority: str, due_iso: str) -> str | None:
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        creds = Credentials(
            token=token_data["token"],
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data["token_uri"],
            client_id=token_data["client_id"],
            client_secret=token_data["client_secret"],
        )
        service = build("calendar", "v3", credentials=creds)
        event = {
            "summary": title,
            "description": f"Priority: {priority} | Added via VoiceTodo",
            "start": {"dateTime": due_iso, "timeZone": "UTC"},
            "end": {"dateTime": due_iso, "timeZone": "UTC"},
            "reminders": {"useDefault": True},
        }
        result = service.events().insert(calendarId="primary", body=event).execute()
        return result.get("id")
    except Exception as e:
        print(f"Calendar event creation failed: {e}")
        return None


def _delete_event_sync(token_data: dict, event_id: str) -> None:
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        creds = Credentials(
            token=token_data["token"],
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data["token_uri"],
            client_id=token_data["client_id"],
            client_secret=token_data["client_secret"],
        )
        service = build("calendar", "v3", credentials=creds)
        service.events().delete(calendarId="primary", eventId=event_id).execute()
    except Exception as e:
        print(f"Calendar event deletion failed: {e}")


async def create_calendar_event(user: dict, title: str, priority: str, due_iso: str) -> str | None:
    token_data = user.get("calendar_token")
    if not token_data:
        return None
    return await asyncio.to_thread(_create_event_sync, token_data, title, priority, due_iso)


async def delete_calendar_event(user: dict, event_id: str) -> None:
    token_data = user.get("calendar_token")
    if not token_data or not event_id:
        return
    await asyncio.to_thread(_delete_event_sync, token_data, event_id)
