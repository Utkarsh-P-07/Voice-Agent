# -*- coding: utf-8 -*-
"""
Web Push + Device Linking router.

Push endpoints:
  GET    /api/push/vapid-public-key     — VAPID public key for frontend
  POST   /api/push/subscribe            — register this device's push subscription
  DELETE /api/push/unsubscribe          — remove a subscription
  GET    /api/push/subscriptions        — list all registered devices
  POST   /api/push/test                 — send test notification to all devices

Device-link endpoints:
  POST   /api/devices/generate-qr       — generate a short-lived pairing token
  POST   /api/devices/claim             — scanned device claims the token + subscribes
  GET    /api/devices/list              — list all linked devices (alias for subscriptions)
  DELETE /api/devices/{endpoint}        — remove a linked device
"""
import base64
import json
import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from pywebpush import webpush, WebPushException

router = APIRouter(tags=["push"])

# ── VAPID config ──────────────────────────────────────────────────────────────
VAPID_PUBLIC_KEY      = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_PEM_B64 = os.getenv("VAPID_PRIVATE_PEM_B64", "")
VAPID_MAILTO          = os.getenv("VAPID_MAILTO", "mailto:admin@voiceagent.ai")
FRONTEND_URL          = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _get_private_pem() -> bytes:
    if not VAPID_PRIVATE_PEM_B64:
        raise RuntimeError("VAPID_PRIVATE_PEM_B64 not set in .env")
    return base64.b64decode(VAPID_PRIVATE_PEM_B64)


# ── Auth helper ───────────────────────────────────────────────────────────────
def _get_user_id(authorization: Optional[str] = Header(default=None)) -> str:
    from oauth import verify_token
    if not authorization or not authorization.startswith("Bearer "):
        return "default"
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        return "default"
    return payload.get("email") or payload.get("sub") or "default"


# ── Pydantic models ───────────────────────────────────────────────────────────
class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth:   str

class PushSubscription(BaseModel):
    endpoint:    str
    keys:        PushSubscriptionKeys
    device_name: str = ""

class UnsubscribeRequest(BaseModel):
    endpoint: str

class ClaimTokenRequest(BaseModel):
    token:       str
    endpoint:    str
    keys:        PushSubscriptionKeys
    device_name: str = ""
    # permissions the device granted
    allow_push:     bool = True
    allow_calendar: bool = False
    allow_alarm:    bool = False


# ── Core push helper ──────────────────────────────────────────────────────────
def _send_push(subscription_doc: dict, payload: dict) -> bool:
    """Send one Web Push message. Returns True on success."""
    try:
        webpush(
            subscription_info={
                "endpoint": subscription_doc["endpoint"],
                "keys":     subscription_doc.get("keys", {}),
            },
            data=json.dumps(payload),
            vapid_private_key=_get_private_pem(),
            vapid_claims={"sub": VAPID_MAILTO},
        )
        return True
    except WebPushException as e:
        if e.response and e.response.status_code == 410:
            return False   # subscription expired
        return False
    except Exception:
        return False


async def send_push_to_user(user_id: str, title: str, body: str, data: dict = None):
    """Fire a push to every device registered for user_id."""
    from backend.database import db_get_all_subscriptions_for_user, db_delete_push_subscription
    subs    = await db_get_all_subscriptions_for_user(user_id)
    payload = {"title": title, "body": body, "data": data or {}}
    for sub in subs:
        ok = _send_push(sub, payload)
        if not ok:
            try:
                await db_delete_push_subscription(user_id, sub["endpoint"])
            except Exception:
                pass


# ═════════════════════════════════════════════════════════════════════════════
# PUSH ROUTES  /api/push/…
# ═════════════════════════════════════════════════════════════════════════════
push_router = APIRouter(prefix="/api/push")


@push_router.get("/vapid-public-key")
def get_vapid_public_key():
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(503, "VAPID not configured")
    return {"publicKey": VAPID_PUBLIC_KEY}


@push_router.post("/subscribe")
async def subscribe(body: PushSubscription, user_id: str = Depends(_get_user_id)):
    from backend.database import db_save_push_subscription
    sub_dict = {
        "endpoint": body.endpoint,
        "keys":     {"p256dh": body.keys.p256dh, "auth": body.keys.auth},
    }
    result = await db_save_push_subscription(user_id, sub_dict, body.device_name)
    # Welcome ping
    _send_push({**sub_dict}, {
        "title": "VoiceAgent notifications enabled ✅",
        "body":  "You'll receive task reminders on this device.",
        "data":  {"type": "welcome"},
    })
    return result


@push_router.delete("/unsubscribe")
async def unsubscribe(body: UnsubscribeRequest, user_id: str = Depends(_get_user_id)):
    from backend.database import db_delete_push_subscription
    return await db_delete_push_subscription(user_id, body.endpoint)


@push_router.get("/subscriptions")
async def list_subscriptions(user_id: str = Depends(_get_user_id)):
    from backend.database import db_list_push_subscriptions
    subs = await db_list_push_subscriptions(user_id)
    safe = [
        {
            "endpoint":       s["endpoint"],
            "device_name":    s.get("device_name", "Unknown device"),
            "created_at":     s.get("created_at", ""),
            "last_used":      s.get("last_used", ""),
            "allow_calendar": s.get("allow_calendar", False),
            "allow_alarm":    s.get("allow_alarm", False),
        }
        for s in subs
    ]
    return {"subscriptions": safe}


@push_router.post("/test")
async def send_test(user_id: str = Depends(_get_user_id)):
    await send_push_to_user(
        user_id,
        title="Test notification 🔔",
        body="Push notifications are working on this device!",
        data={"type": "test"},
    )
    return {"status": "sent"}


# ═════════════════════════════════════════════════════════════════════════════
# DEVICE LINK ROUTES  /api/devices/…
# ═════════════════════════════════════════════════════════════════════════════
device_router = APIRouter(prefix="/api/devices")

QR_TTL_MINUTES = 5   # token expires after 5 minutes


@device_router.post("/generate-qr")
async def generate_qr(user_id: str = Depends(_get_user_id)):
    """
    Generate a short-lived pairing token.
    Returns the token + the full URL to encode in the QR code.
    """
    from backend.database import db_create_device_token, db_cleanup_expired_tokens
    await db_cleanup_expired_tokens()

    token      = secrets.token_urlsafe(24)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=QR_TTL_MINUTES)).isoformat()
    await db_create_device_token(user_id, token, expires_at)

    link = f"{FRONTEND_URL}/device-link?token={token}"
    return {
        "token":      token,
        "link":       link,
        "expires_in": QR_TTL_MINUTES * 60,   # seconds
    }


@device_router.post("/claim")
async def claim_device(body: ClaimTokenRequest):
    """
    Called by the scanned device after the user grants permissions.
    Validates the token, registers the push subscription under the token owner's user_id.
    No auth header needed — the token IS the auth.
    """
    from backend.database import db_claim_device_token, db_save_push_subscription

    token_doc = await db_claim_device_token(body.token)
    if not token_doc:
        raise HTTPException(400, "Invalid or expired pairing token.")

    # Check expiry
    exp = token_doc.get("expires_at", "")
    if exp and exp < datetime.now(timezone.utc).isoformat():
        raise HTTPException(400, "Pairing token has expired. Please generate a new QR code.")

    owner_user_id = token_doc["user_id"]

    if body.allow_push:
        sub_dict = {
            "endpoint": body.endpoint,
            "keys":     {"p256dh": body.keys.p256dh, "auth": body.keys.auth},
        }
        # Store extra permission flags alongside the subscription
        from backend.database import get_db, _now
        db  = get_db()
        doc = {
            "user_id":        owner_user_id,
            "endpoint":       body.endpoint,
            "keys":           sub_dict["keys"],
            "device_name":    body.device_name or "Linked device",
            "allow_calendar": body.allow_calendar,
            "allow_alarm":    body.allow_alarm,
            "created_at":     _now(),
            "last_used":      _now(),
        }
        await db.push_subscriptions.update_one(
            {"endpoint": body.endpoint},
            {"$set": doc},
            upsert=True,
        )

        # Send welcome push to the newly linked device
        _send_push(sub_dict, {
            "title": "Device linked to VoiceAgent ✅",
            "body":  "You'll now receive notifications when tasks are added.",
            "data":  {"type": "welcome"},
        })

    return {
        "status":      "linked",
        "owner":       owner_user_id,
        "permissions": {
            "push":     body.allow_push,
            "calendar": body.allow_calendar,
            "alarm":    body.allow_alarm,
        },
    }


@device_router.get("/list")
async def list_devices(user_id: str = Depends(_get_user_id)):
    """Alias for /api/push/subscriptions — returns all linked devices."""
    from backend.database import db_list_push_subscriptions
    subs = await db_list_push_subscriptions(user_id)
    devices = [
        {
            "endpoint":       s["endpoint"],
            "device_name":    s.get("device_name", "Unknown device"),
            "created_at":     s.get("created_at", ""),
            "allow_calendar": s.get("allow_calendar", False),
            "allow_alarm":    s.get("allow_alarm", False),
        }
        for s in subs
    ]
    return {"devices": devices, "count": len(devices)}


@device_router.delete("/{endpoint:path}")
async def remove_device(endpoint: str, user_id: str = Depends(_get_user_id)):
    from backend.database import db_delete_push_subscription
    return await db_delete_push_subscription(user_id, endpoint)


# ── Export both routers ───────────────────────────────────────────────────────
# main.py imports `router` for backward compat — point it at push_router
router = push_router
