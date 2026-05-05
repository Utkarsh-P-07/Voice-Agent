# -*- coding: utf-8 -*-
"""
Memory system.

Storage backend: MongoDB Atlas (via Motor async driver).
Falls back to JSON files if MONGODB_URI is not set.
"""
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

_USE_MONGO = bool(os.getenv("MONGODB_URI", ""))

# ── JSON fallback ─────────────────────────────────────────────────────────────
MEMORY_FILE   = Path(__file__).parent.parent / "data" / "memory.json"
MAX_MEMORIES  = 50
_DEFAULT_USER = "default"


def _json_load() -> list[dict]:
    if not MEMORY_FILE.exists():
        return []
    return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))


def _json_save(memories: list[dict]) -> None:
    MEMORY_FILE.parent.mkdir(exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(memories, indent=2), encoding="utf-8")


# ─────────────────────────────────────────────────────────────────────────────
# ASYNC PUBLIC API  (await these from FastAPI endpoints)
# ─────────────────────────────────────────────────────────────────────────────

async def save_memory(content: str, category: str = "general", user_id: str = _DEFAULT_USER) -> dict:
    """Persist an important fact or interaction to long-term memory."""
    if _USE_MONGO:
        from backend.database import db_save_memory
        return await db_save_memory(user_id, content, category)

    memories = _json_load()
    entry = {
        "id":        len(memories) + 1,
        "content":   content,
        "category":  category,
        "timestamp": datetime.now().isoformat(),
    }
    memories.append(entry)
    if len(memories) > MAX_MEMORIES:
        memories = memories[-MAX_MEMORIES:]
    _json_save(memories)
    return {"status": "saved", "entry": entry}


async def recall_memories(query: str = "", category: str = "", user_id: str = _DEFAULT_USER) -> dict:
    """Retrieve stored memories, optionally filtered by keyword or category."""
    if _USE_MONGO:
        from backend.database import db_recall_memories
        return await db_recall_memories(user_id, query, category)

    memories = _json_load()
    if category:
        memories = [m for m in memories if m.get("category") == category]
    if query:
        q = query.lower()
        memories = [m for m in memories if q in m["content"].lower()]
    return {"memories": memories, "count": len(memories)}


async def get_memory_context(user_id: str = _DEFAULT_USER) -> str:
    """Return a compact string of recent memories for the system prompt."""
    if _USE_MONGO:
        from backend.database import db_get_memory_context
        return await db_get_memory_context(user_id)

    memories = _json_load()
    if not memories:
        return "No memories stored yet."
    recent = memories[-10:]
    lines  = [f"- [{m['category']}] {m['content']} (at {m['timestamp'][:16]})" for m in recent]
    return "\n".join(lines)


async def _load() -> list[dict]:
    """Internal helper used by stats endpoint."""
    if _USE_MONGO:
        from backend.database import db_recall_memories
        result = await db_recall_memories(_DEFAULT_USER)
        return result.get("memories", [])
    return _json_load()


# ─────────────────────────────────────────────────────────────────────────────
# SYNC WRAPPERS  (used by core/agent.py which runs in a sync context)
# ─────────────────────────────────────────────────────────────────────────────

def _run_sync(coro):
    """Run an async coroutine from a sync context safely."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def get_memory_context_sync(user_id: str = _DEFAULT_USER) -> str:
    return _run_sync(get_memory_context(user_id))


def save_memory_sync(content: str, category: str = "general", user_id: str = _DEFAULT_USER) -> dict:
    return _run_sync(save_memory(content, category, user_id))


def recall_memories_sync(query: str = "", category: str = "", user_id: str = _DEFAULT_USER) -> dict:
    return _run_sync(recall_memories(query, category, user_id))


# ─────────────────────────────────────────────────────────────────────────────
# TOOL SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

MEMORY_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": (
                "Save an important fact, preference, or event about the user to long-term memory. "
                "Use this when the user shares something worth remembering for future sessions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "content":  {"type": "string", "description": "The fact or event to remember"},
                    "category": {
                        "type": "string",
                        "enum": ["preference", "event", "goal", "general"],
                        "description": "Category of the memory",
                    },
                },
                "required": ["content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recall_memories",
            "description": "Search and retrieve stored memories about the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query":    {"type": "string", "description": "Keyword to search memories"},
                    "category": {"type": "string", "enum": ["preference", "event", "goal", "general"]},
                },
            },
        },
    },
]

MEMORY_TOOL_MAP = {
    "save_memory":     save_memory_sync,
    "recall_memories": recall_memories_sync,
}
