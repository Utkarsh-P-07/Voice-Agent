"""
Reminder service — fires push, WhatsApp, SMS, and email notifications for due todos.
Runs as an APScheduler background job every 60 seconds.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

from pywebpush import webpush, WebPushException

from app.config import settings
from app.database import get_db

logger = logging.getLogger(__name__)


async def check_and_send_reminders():
    """Called every minute by the scheduler."""
    db = get_db()
    if db is None:
        return
    now = datetime.now(timezone.utc)

    try:
        due_todos = await db.todos.find({
            "done": False,
            "reminder_sent": False,
            "due_at": {"$lte": now},
        }).to_list(100)
    except Exception as e:
        logger.error(f"Failed to query due todos: {e}")
        return

    for todo in due_todos:
        try:
            user_id = todo["user_id"]
            user = await db.users.find_one({"_id": user_id})
            if not user:
                continue

            prefs = user.get("notification_prefs", {})
            title = todo["title"]

            if prefs.get("push", True) and settings.vapid_private_key:
                await _send_push(db, user_id, title)

            if prefs.get("whatsapp") and prefs.get("phone_number") and settings.twilio_account_sid:
                await asyncio.to_thread(_send_whatsapp, prefs["phone_number"], title)

            if prefs.get("sms") and prefs.get("phone_number") and settings.twilio_account_sid:
                await asyncio.to_thread(_send_sms, prefs["phone_number"], title)

            if prefs.get("email") and prefs.get("email_address") and settings.resend_api_key:
                await _send_email(prefs["email_address"], user.get("name", ""), title)

            await db.todos.update_one(
                {"_id": todo["_id"]},
                {"$set": {"reminder_sent": True}},
            )
        except Exception as e:
            logger.error(f"Failed to process reminder for todo {todo.get('_id')}: {e}")


async def _send_push(db, user_id, task_title: str):
    try:
        subscriptions = await db.push_subscriptions.find({"user_id": user_id}).to_list(20)
    except Exception as e:
        logger.error(f"Failed to fetch push subscriptions: {e}")
        return

    payload = json.dumps({
        "title": "⏰ Task Reminder",
        "body": task_title,
        "icon": "/icon-192.png",
    })
    for sub in subscriptions:
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info=sub["subscription"],
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_claims_email},
            )
        except WebPushException as e:
            logger.warning(f"Push failed for subscription: {e}")
            # Remove expired/invalid subscriptions
            if "410" in str(e) or "404" in str(e):
                try:
                    await db.push_subscriptions.delete_one({"_id": sub["_id"]})
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Unexpected push error: {e}")


def _send_whatsapp(phone: str, task_title: str):
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=f"⏰ Reminder: {task_title}",
            from_=settings.twilio_whatsapp_from,
            to=f"whatsapp:{phone}",
        )
        logger.info(f"WhatsApp reminder sent to {phone}")
    except Exception as e:
        logger.error(f"WhatsApp failed: {e}")


def _send_sms(phone: str, task_title: str):
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=f"⏰ Reminder: {task_title}",
            from_=settings.twilio_sms_from,
            to=phone,
        )
        logger.info(f"SMS reminder sent to {phone}")
    except Exception as e:
        logger.error(f"SMS failed: {e}")


async def _send_email(to_email: str, name: str, task_title: str):
    try:
        import resend
        resend.api_key = settings.resend_api_key
        from_email = f"VoiceTodo <reminders@{settings.resend_api_key.split('_')[0]}.resend.dev>" \
            if settings.resend_api_key else "reminders@voicetodo.app"
        await asyncio.to_thread(resend.Emails.send, {
            "from": from_email,
            "to": to_email,
            "subject": f"⏰ Reminder: {task_title}",
            "html": f"""
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                  <h2 style="color:#e8533a">⏰ Task Reminder</h2>
                  <p>Hi {name},</p>
                  <p>This is a reminder for your task:</p>
                  <div style="background:#fff0ee;border-radius:12px;padding:16px;margin:16px 0">
                    <strong style="font-size:16px">{task_title}</strong>
                  </div>
                  <p style="color:#888;font-size:12px">Sent by VoiceTodo</p>
                </div>
            """,
        })
        logger.info(f"Email reminder sent to {to_email}")
    except Exception as e:
        logger.error(f"Email failed: {e}")
