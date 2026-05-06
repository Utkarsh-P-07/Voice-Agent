# -*- coding: utf-8 -*-
"""
MongoDB Atlas data layer — async Motor client.

Collections:
  todos        — { _id, id, user_id, title, priority, done, created_at, updated_at }
  memories     — { _id, id, user_id, content, category, timestamp }
  conversations— { _id, user_id, messages: [...], updated_at }
  users        — { _id, email, name, password_hash, provider, picture, created_at }

All public-facing IDs use a short UUID string (8 chars) stored in the `id` field.
MongoDB's _id is kept internal and never sent to the client.
"""
import os
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel

MONGO_URI = os.getenv("MONGODB_URI", "")
DB_NAME   = os.getenv("MONGODB_DB",  "voiceagent")

# ── Singleton client ──────────────────────────────────────────────────────────
_client: Optional[AsyncIOMotorClient] = None
_db:     Optional[AsyncIOMotorDatabase] = None


def get_db() -> AsyncIOMotorDatabase:
    global _client, _db
    if _db is None:
        if not MONGO_URI:
            raise RuntimeError(
                "MONGODB_URI is not set. Add it to your .env file.\n"
                "Get it from: https://cloud.mongodb.com → Connect → Drivers"
            )
        _client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        _db = _client[DB_NAME]
    return _db


async def init_indexes() -> None:
    """Create indexes on startup — idempotent."""
    db = get_db()
    await db.todos.create_indexes([
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("id", ASCENDING)], unique=True),
        IndexModel([("user_id", ASCENDING), ("done", ASCENDING)]),
    ])
    await db.memories.create_indexes([
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("user_id", ASCENDING), ("category", ASCENDING)]),
    ])
    await db.conversations.create_indexes([
        IndexModel([("user_id", ASCENDING)], unique=True),
    ])
    await db.users.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True),
    ])
    await db.push_subscriptions.create_indexes([
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("endpoint", ASCENDING)], unique=True),
    ])
    await db.device_tokens.create_indexes([
        IndexModel([("token", ASCENDING)], unique=True),
        IndexModel([("expires_at", ASCENDING)]),
    ])


async def ping() -> bool:
    """Return True if Atlas is reachable."""
    try:
        db = get_db()
        await db.command("ping")
        return True
    except Exception:
        return False


# ── Serialiser helper ─────────────────────────────────────────────────────────
def _clean(doc: dict) -> dict:
    """Remove MongoDB _id and convert datetime to ISO string."""
    doc = dict(doc)
    doc.pop("_id", None)
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ═════════════════════════════════════════════════════════════════════════════
# TODOS
# ═════════════════════════════════════════════════════════════════════════════

async def db_add_todo(user_id: str, title: str, priority: str = "medium") -> dict:
    import uuid
    db   = get_db()
    item = {
        "id":         str(uuid.uuid4())[:8],
        "user_id":    user_id,
        "title":      title,
        "priority":   priority,
        "done":       False,
        "created_at": _now(),
        "updated_at": None,
    }
    await db.todos.insert_one(item)
    return {"status": "added", "item": _clean(item)}


async def db_list_todos(user_id: str, filter_done: Optional[bool] = None) -> dict:
    db     = get_db()
    query  = {"user_id": user_id}
    if filter_done is not None:
        query["done"] = filter_done
    cursor = db.todos.find(query).sort("created_at", ASCENDING)
    todos  = [_clean(t) async for t in cursor]
    return {"todos": todos, "count": len(todos)}


async def db_update_todo(
    user_id: str, todo_id: str,
    title: Optional[str]    = None,
    priority: Optional[str] = None,
    done: Optional[bool]    = None,
) -> dict:
    db      = get_db()
    updates = {"updated_at": _now()}
    if title    is not None: updates["title"]    = title
    if priority is not None: updates["priority"] = priority
    if done     is not None: updates["done"]     = done

    result = await db.todos.find_one_and_update(
        {"id": todo_id, "user_id": user_id},
        {"$set": updates},
        return_document=True,
    )
    if result is None:
        return {"status": "not_found", "id": todo_id}
    return {"status": "updated", "item": _clean(result)}


async def db_delete_todo(user_id: str, todo_id: str) -> dict:
    db     = get_db()
    result = await db.todos.delete_one({"id": todo_id, "user_id": user_id})
    if result.deleted_count == 0:
        return {"status": "not_found", "id": todo_id}
    return {"status": "deleted", "id": todo_id}


async def db_clear_todos(user_id: str) -> dict:
    db = get_db()
    r  = await db.todos.delete_many({"user_id": user_id})
    return {"status": "cleared", "deleted": r.deleted_count}


# ═════════════════════════════════════════════════════════════════════════════
# MEMORIES
# ═════════════════════════════════════════════════════════════════════════════

MAX_MEMORIES = 50


async def db_save_memory(user_id: str, content: str, category: str = "general") -> dict:
    db    = get_db()
    count = await db.memories.count_documents({"user_id": user_id})
    entry = {
        "id":        count + 1,
        "user_id":   user_id,
        "content":   content,
        "category":  category,
        "timestamp": _now(),
    }
    await db.memories.insert_one(entry)

    # Enforce cap — delete oldest beyond MAX_MEMORIES
    if count + 1 > MAX_MEMORIES:
        oldest = await db.memories.find(
            {"user_id": user_id},
            sort=[("timestamp", ASCENDING)],
            limit=(count + 1 - MAX_MEMORIES),
        ).to_list(length=count + 1 - MAX_MEMORIES)
        ids = [d["_id"] for d in oldest]
        if ids:
            await db.memories.delete_many({"_id": {"$in": ids}})

    return {"status": "saved", "entry": _clean(entry)}


async def db_recall_memories(
    user_id: str, query: str = "", category: str = ""
) -> dict:
    db    = get_db()
    filt  = {"user_id": user_id}
    if category:
        filt["category"] = category
    if query:
        filt["content"] = {"$regex": query, "$options": "i"}
    cursor   = db.memories.find(filt).sort("timestamp", DESCENDING)
    memories = [_clean(m) async for m in cursor]
    return {"memories": memories, "count": len(memories)}


async def db_get_memory_context(user_id: str) -> str:
    db     = get_db()
    cursor = db.memories.find({"user_id": user_id}).sort("timestamp", DESCENDING).limit(10)
    mems   = [_clean(m) async for m in cursor]
    if not mems:
        return "No memories stored yet."
    lines = [f"- [{m['category']}] {m['content']} (at {m['timestamp'][:16]})" for m in mems]
    return "\n".join(lines)


async def db_clear_memories(user_id: str) -> dict:
    db = get_db()
    r  = await db.memories.delete_many({"user_id": user_id})
    return {"status": "cleared", "deleted": r.deleted_count}


# ═════════════════════════════════════════════════════════════════════════════
# CONVERSATIONS
# ═════════════════════════════════════════════════════════════════════════════

async def db_load_conversation(user_id: str) -> list[dict]:
    db  = get_db()
    doc = await db.conversations.find_one({"user_id": user_id})
    if not doc:
        return []
    return doc.get("messages", [])


async def db_save_conversation(user_id: str, messages: list[dict]) -> None:
    db = get_db()
    # Only persist serialisable role messages
    clean = [m for m in messages if isinstance(m, dict)]
    await db.conversations.update_one(
        {"user_id": user_id},
        {"$set": {"messages": clean, "updated_at": _now()}},
        upsert=True,
    )


async def db_clear_conversation(user_id: str) -> dict:
    db = get_db()
    await db.conversations.update_one(
        {"user_id": user_id},
        {"$set": {"messages": [], "updated_at": _now()}},
        upsert=True,
    )
    return {"status": "cleared"}


# ═════════════════════════════════════════════════════════════════════════════
# USERS
# ═════════════════════════════════════════════════════════════════════════════

async def db_upsert_user(email: str, name: str, provider: str, picture: str = "") -> dict:
    """Insert or update a user record (used after OAuth login)."""
    db  = get_db()
    doc = {
        "email":      email,
        "name":       name,
        "provider":   provider,
        "picture":    picture,
        "updated_at": _now(),
    }
    result = await db.users.find_one_and_update(
        {"email": email},
        {"$set": doc, "$setOnInsert": {"created_at": _now()}},
        upsert=True,
        return_document=True,
    )
    return _clean(result)


async def db_get_user_by_email(email: str) -> Optional[dict]:
    db  = get_db()
    doc = await db.users.find_one({"email": email})
    return _clean(doc) if doc else None


async def db_create_user(name: str, email: str, password_hash: str) -> dict:
    """Create a local (email/password) user."""
    import uuid
    db  = get_db()
    doc = {
        "id":            str(uuid.uuid4()),
        "name":          name,
        "email":         email,
        "password_hash": password_hash,
        "provider":      "email",
        "picture":       "",
        "created_at":    _now(),
        "updated_at":    _now(),
    }
    await db.users.insert_one(doc)
    return _clean(doc)


async def db_update_user_field(current_email: str, field: str, new_value: str) -> dict:
    """
    Update a single verified field (email or contact) on a user document.
    For email changes the document is re-keyed to the new address.
    Returns the updated user document.
    """
    db = get_db()

    if field == "email":
        # Make sure the new email isn't already taken
        existing = await db.users.find_one({"email": new_value})
        if existing:
            from fastapi import HTTPException
            raise HTTPException(409, "That email address is already in use.")
        result = await db.users.find_one_and_update(
            {"email": current_email},
            {"$set": {"email": new_value, "updated_at": _now()}},
            return_document=True,
        )
    elif field == "contact":
        result = await db.users.find_one_and_update(
            {"email": current_email},
            {"$set": {"contact": new_value, "updated_at": _now()}},
            return_document=True,
        )
    else:
        from fastapi import HTTPException
        raise HTTPException(400, f"Unsupported field: {field}")

    if result is None:
        from fastapi import HTTPException
        raise HTTPException(404, "User not found.")
    return _clean(result)


# ═════════════════════════════════════════════════════════════════════════════
# PUSH SUBSCRIPTIONS
# ═════════════════════════════════════════════════════════════════════════════

async def db_save_push_subscription(user_id: str, subscription: dict, device_name: str = "") -> dict:
    """Upsert a push subscription (keyed by endpoint)."""
    db  = get_db()
    doc = {
        "user_id":     user_id,
        "endpoint":    subscription["endpoint"],
        "keys":        subscription.get("keys", {}),
        "device_name": device_name or "Unknown device",
        "created_at":  _now(),
        "last_used":   _now(),
    }
    await db.push_subscriptions.update_one(
        {"endpoint": subscription["endpoint"]},
        {"$set": doc},
        upsert=True,
    )
    return {"status": "subscribed", "endpoint": subscription["endpoint"]}


async def db_delete_push_subscription(user_id: str, endpoint: str) -> dict:
    db = get_db()
    r  = await db.push_subscriptions.delete_one({"user_id": user_id, "endpoint": endpoint})
    return {"status": "unsubscribed" if r.deleted_count else "not_found"}


async def db_list_push_subscriptions(user_id: str) -> list[dict]:
    db     = get_db()
    cursor = db.push_subscriptions.find({"user_id": user_id}).sort("created_at", ASCENDING)
    return [_clean(s) async for s in cursor]


async def db_get_all_subscriptions_for_user(user_id: str) -> list[dict]:
    """Return raw subscription dicts (with keys) for sending pushes."""
    db     = get_db()
    cursor = db.push_subscriptions.find({"user_id": user_id})
    return [_clean(s) async for s in cursor]


# ═════════════════════════════════════════════════════════════════════════════
# DEVICE LINK TOKENS
# ═════════════════════════════════════════════════════════════════════════════

async def db_create_device_token(user_id: str, token: str, expires_at: str) -> dict:
    db  = get_db()
    doc = {
        "user_id":    user_id,
        "token":      token,
        "expires_at": expires_at,
        "claimed":    False,
        "created_at": _now(),
    }
    await db.device_tokens.insert_one(doc)
    return _clean(doc)


async def db_claim_device_token(token: str) -> Optional[dict]:
    """Return the token doc if valid & unclaimed, then mark claimed."""
    db  = get_db()
    doc = await db.device_tokens.find_one({"token": token, "claimed": False})
    if not doc:
        return None
    # Mark claimed
    await db.device_tokens.update_one({"token": token}, {"$set": {"claimed": True}})
    return _clean(doc)


async def db_cleanup_expired_tokens() -> None:
    db = get_db()
    await db.device_tokens.delete_many({"expires_at": {"$lt": _now()}})
