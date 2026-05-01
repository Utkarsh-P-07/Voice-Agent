"""
Push notification subscription management + notification preferences.
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.auth import get_current_user
from app.database import get_db
from app.models import PushSubscriptionCreate, NotificationPrefs
from app.config import settings

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/subscribe")
async def subscribe(body: PushSubscriptionCreate, user=Depends(get_current_user)):
    """Save browser push subscription for this user/device."""
    db = get_db()
    await db.push_subscriptions.update_one(
        {"user_id": ObjectId(str(user["_id"])), "endpoint": body.subscription.get("endpoint")},
        {"$set": {"user_id": ObjectId(str(user["_id"])), "subscription": body.subscription}},
        upsert=True,
    )
    return {"status": "subscribed"}


@router.delete("/unsubscribe")
async def unsubscribe(endpoint: str, user=Depends(get_current_user)):
    db = get_db()
    await db.push_subscriptions.delete_one(
        {"user_id": ObjectId(str(user["_id"])), "endpoint": endpoint}
    )
    return {"status": "unsubscribed"}


@router.patch("/preferences")
async def update_preferences(body: NotificationPrefs, user=Depends(get_current_user)):
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(str(user["_id"]))},
        {"$set": {"notification_prefs": body.model_dump()}},
    )
    return {"status": "updated"}


@router.get("/vapid-public-key")
async def get_vapid_key():
    """Frontend needs this to create a push subscription."""
    return {"public_key": settings.vapid_public_key}
