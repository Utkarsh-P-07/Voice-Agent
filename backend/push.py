# -*- coding: utf-8 -*-
"""
Web Push notification router.

Endpoints:
  GET  /api/push/vapid-public-key   — returns the VAPID public key for the frontend
  POST /api/push/subscribe          — register a device's push subscription
  DELETE /api/push/unsubscribe      — remove a device subscription
  GET  /api/push/subscriptions      — list all registered devices for the user
  POST /api/push/test               — send a test notification to all user devices
"""
import base64
import json
import os

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from pywebpush import webpush, WebPushException
from typing import Optional

router = APIRouter(prefix="/api/push", tags=["push"])

# ── VAPID config ──────────────────────────────────────────────────────────────
VAPID_PUBLIC_KEY     = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_PEM_B64 = os.getenv("VAPID_PRIVATE_PEM_B64", "")
VAPID_MAILTO         = os.getenv("VAPID_MAILTO", "mailto:admin@voiceagent.ai")

def _get_private_pem() -> bytes:
    if not VAPID_PRIVATE_PEM_B64:
        raise RuntimeError("VAPID_PRIVATE_PEM_B64 not set in .env")
    return base64.b64decode(VAPID_PRIVATE_PEM_B64)


# ── Auth helper (reuse from main) ─────────────────────────────────────────────
def _get_user_id(authorization: Optional[str] = Header(default=None)) -> str:
    from oauth import verify_token
    if not authorization or not authorization.startswith("Bearer "):
        return "default"
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        return "default"
    return payload.get("email") or payload.get("sub") or "default"


# ── Models ────────────────────────────────────────────────────────────────────
class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth:   str

class PushSubscription(BaseModel):
    endpoint:    str
    keys:        PushSubscriptionKeys
    device_name: str = ""

class UnsubscribeRequest(BaseModel):
    endpoint: str


# ── Helpers ───────────────────────────────────────────────────────────────────
def _send_push(subscription_doc: dict, payload: dict) -> bool:
    """Send a single Web Push message. Returns True on success."""
    try:
        webpush(
            subscription_info={
                "endpoint": subscription_doc["endpoint"],
                "keys": subscription_doc.get("keys", {}),
            },
            data=json.dumps(payload),
            vapid_private_key=_get_private_pem(),
            vapid_claims={"sub": VAPID_MAILTO},
        )
        return True
    except WebPushException as e:
        # 410 Gone = subscription expired/revoked — caller should delete it
        if e.response and e.response.status_code == 410:
            return False
        return False
    except Exception:
        return False


async def send_push_to_user(user_id: str, title: str, body: str, data: dict = None):
    """Send a push notification to ALL devices registered for a user."""
    from backend.database import db_get_all_subscriptions_for_user, db_delete_push_subscription
    subs = await db_get_all_subscriptions_for_user(user_id)
    payload = {"title": title, "body": body, "data": data or {}}
    for sub in subs:
        ok = _send_push(sub, payload)
        if not ok:
            # Clean up dead subscriptions
            try:
                await db_delete_push_subscription(user_id, sub["endpoint"])
            except Exception:
                pass


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/vapid-public-key")
def get_vapid_public_key():
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(503, "VAPID not configured")
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe(body: PushSubscription, user_id: str = Depends(_get_user_id)):
    from backend.database import db_save_push_subscription
    sub_dict = {
        "endpoint": body.endpoint,
        "keys": {"p256dh": body.keys.p256dh, "auth": body.keys.auth},
    }
    result = await db_save_push_subscription(user_id, sub_dict, body.device_name)

    # Send a welcome notification
    _send_push({
        "endpoint": body.endpoint,
        "keys": {"p256dh": body.keys.p256dh, "auth": body.keys.auth},
    }, {
        "title": "VoiceAgent notifications enabled ✅",
        "body":  "You'll receive task reminders on this device.",
        "data":  {"type": "welcome"},
    })

    return result


@router.delete("/unsubscribe")
async def unsubscribe(body: UnsubscribeRequest, user_id: str = Depends(_get_user_id)):
    from backend.database import db_delete_push_subscription
    return await db_delete_push_subscription(user_id, body.endpoint)


@router.get("/subscriptions")
async def list_subscriptions(user_id: str = Depends(_get_user_id)):
    from backend.database import db_list_push_subscriptions
    subs = await db_list_push_subscriptions(user_id)
    # Strip sensitive keys before returning to client
    safe = [
        {
            "endpoint":    s["endpoint"],
            "device_name": s.get("device_name", "Unknown device"),
            "created_at":  s.get("created_at", ""),
            "last_used":   s.get("last_used", ""),
        }
        for s in subs
    ]
    return {"subscriptions": safe}


@router.post("/test")
async def send_test(user_id: str = Depends(_get_user_id)):
    await send_push_to_user(
        user_id,
        title="Test notification 🔔",
        body="Push notifications are working on this device!",
        data={"type": "test"},
    )
    return {"status": "sent"}
