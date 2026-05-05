# -*- coding: utf-8 -*-
"""
To-Do CRUD tools.

Storage backend: MongoDB Atlas (via Motor async driver).
Falls back to JSON files if MONGODB_URI is not set (offline / testing).

Async functions are used by FastAPI endpoints.
Sync wrappers (_sync suffix) are used by the agent tool-call loop.
"""
import asyncio
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

# ── Determine active backend ──────────────────────────────────────────────────
_USE_MONGO = bool(os.getenv("MONGODB_URI", ""))

# ── JSON fallback (used when MONGODB_URI is not set) ─────────────────────────
TODO_FILE = Path(__file__).parent.parent / "data" / "todos.json"

def _json_load() -> list[dict]:
    if not TODO_FILE.exists():
        return []
    return json.loads(TODO_FILE.read_text(encoding="utf-8"))

def _json_save(todos: list[dict]) -> None:
    TODO_FILE.parent.mkdir(exist_ok=True)
    TODO_FILE.write_text(json.dumps(todos, indent=2), encoding="utf-8")

_DEFAULT_USER = "default"

# ─────────────────────────────────────────────────────────────────────────────
# ASYNC PUBLIC API  (await these from FastAPI endpoints)
# ─────────────────────────────────────────────────────────────────────────────

async def add_todo(title: str, priority: str = "medium", category: str = "general",
                   user_id: str = _DEFAULT_USER) -> dict:
    """Add a new to-do item."""
    if _USE_MONGO:
        from backend.database import db_add_todo
        return await db_add_todo(user_id, title, priority)

    todos = _json_load()
    item  = {
        "id":         str(uuid.uuid4())[:8],
        "title":      title,
        "priority":   priority,
        "category":   category,
        "done":       False,
        "created_at": datetime.now().isoformat(),
    }
    todos.append(item)
    _json_save(todos)
    return {"status": "added", "item": item}


async def list_todos(filter_done: Optional[bool] = None, user_id: str = _DEFAULT_USER) -> dict:
    """List all to-do items, optionally filtered by completion status."""
    if _USE_MONGO:
        from backend.database import db_list_todos
        return await db_list_todos(user_id, filter_done)

    todos = _json_load()
    if filter_done is not None:
        todos = [t for t in todos if t["done"] == filter_done]
    return {"todos": todos, "count": len(todos)}


async def update_todo(
    todo_id: str,
    title: Optional[str]    = None,
    priority: Optional[str] = None,
    done: Optional[bool]    = None,
    user_id: str            = _DEFAULT_USER,
) -> dict:
    """Update an existing to-do item by ID."""
    if _USE_MONGO:
        from backend.database import db_update_todo
        return await db_update_todo(user_id, todo_id, title, priority, done)

    todos = _json_load()
    for item in todos:
        if item["id"] == todo_id:
            if title    is not None: item["title"]    = title
            if priority is not None: item["priority"] = priority
            if done     is not None: item["done"]     = done
            item["updated_at"] = datetime.now().isoformat()
            _json_save(todos)
            return {"status": "updated", "item": item}
    return {"status": "not_found", "id": todo_id}


async def delete_todo(todo_id: str, user_id: str = _DEFAULT_USER) -> dict:
    """Delete a to-do item by ID."""
    if _USE_MONGO:
        from backend.database import db_delete_todo
        return await db_delete_todo(user_id, todo_id)

    todos     = _json_load()
    remaining = [t for t in todos if t["id"] != todo_id]
    if len(remaining) == len(todos):
        return {"status": "not_found", "id": todo_id}
    _json_save(remaining)
    return {"status": "deleted", "id": todo_id}


# ─────────────────────────────────────────────────────────────────────────────
# SYNC WRAPPERS  (used by core/agent.py tool-call loop)
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


def add_todo_sync(title: str, priority: str = "medium", category: str = "general",
                  user_id: str = _DEFAULT_USER) -> dict:
    return _run_sync(add_todo(title, priority, category, user_id))


def list_todos_sync(filter_done: Optional[bool] = None, user_id: str = _DEFAULT_USER) -> dict:
    return _run_sync(list_todos(filter_done, user_id))


def update_todo_sync(todo_id: str, title: Optional[str] = None,
                     priority: Optional[str] = None, done: Optional[bool] = None,
                     user_id: str = _DEFAULT_USER) -> dict:
    return _run_sync(update_todo(todo_id, title, priority, done, user_id))


def delete_todo_sync(todo_id: str, user_id: str = _DEFAULT_USER) -> dict:
    return _run_sync(delete_todo(todo_id, user_id))


# ─────────────────────────────────────────────────────────────────────────────
# TOOL SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "add_todo",
            "description": "Add a new item to the to-do list.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title":    {"type": "string", "description": "The task description"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"],
                                 "description": "Task priority level"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_todos",
            "description": "List to-do items. Optionally filter by completion status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filter_done": {
                        "type": "boolean",
                        "description": "If true, show only completed. If false, show only pending. Omit for all.",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_todo",
            "description": "Update a to-do item's title, priority, or mark it done/undone.",
            "parameters": {
                "type": "object",
                "properties": {
                    "todo_id":  {"type": "string", "description": "The 8-char item ID"},
                    "title":    {"type": "string"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                    "done":     {"type": "boolean"},
                },
                "required": ["todo_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_todo",
            "description": "Delete a to-do item by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "todo_id": {"type": "string", "description": "The 8-char item ID"}
                },
                "required": ["todo_id"],
            },
        },
    },
]

TOOL_MAP = {
    "add_todo":    add_todo_sync,
    "list_todos":  list_todos_sync,
    "update_todo": update_todo_sync,
    "delete_todo": delete_todo_sync,
}
