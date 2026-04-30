"""
To-Do CRUD tools — backed by a simple JSON file.
"""
import json
import uuid
from datetime import datetime
from pathlib import Path

TODO_FILE = Path(__file__).parent / "data" / "todos.json"


def _load() -> list[dict]:
    if not TODO_FILE.exists():
        return []
    return json.loads(TODO_FILE.read_text())


def _save(todos: list[dict]) -> None:
    TODO_FILE.parent.mkdir(exist_ok=True)
    TODO_FILE.write_text(json.dumps(todos, indent=2))


def add_todo(title: str, priority: str = "medium") -> dict:
    """Add a new to-do item."""
    todos = _load()
    item = {
        "id": str(uuid.uuid4())[:8],
        "title": title,
        "priority": priority,
        "done": False,
        "created_at": datetime.now().isoformat(),
    }
    todos.append(item)
    _save(todos)
    return {"status": "added", "item": item}


def list_todos(filter_done: bool | None = None) -> dict:
    """List all to-do items, optionally filtered by completion status."""
    todos = _load()
    if filter_done is not None:
        todos = [t for t in todos if t["done"] == filter_done]
    return {"todos": todos, "count": len(todos)}


def update_todo(todo_id: str, title: str | None = None,
                priority: str | None = None, done: bool | None = None) -> dict:
    """Update an existing to-do item by ID."""
    todos = _load()
    for item in todos:
        if item["id"] == todo_id:
            if title is not None:
                item["title"] = title
            if priority is not None:
                item["priority"] = priority
            if done is not None:
                item["done"] = done
            item["updated_at"] = datetime.now().isoformat()
            _save(todos)
            return {"status": "updated", "item": item}
    return {"status": "not_found", "id": todo_id}


def delete_todo(todo_id: str) -> dict:
    """Delete a to-do item by ID."""
    todos = _load()
    remaining = [t for t in todos if t["id"] != todo_id]
    if len(remaining) == len(todos):
        return {"status": "not_found", "id": todo_id}
    _save(remaining)
    return {"status": "deleted", "id": todo_id}


# --- Tool schemas for OpenAI function calling ---

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "add_todo",
            "description": "Add a new item to the to-do list.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "The task description"},
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": "Task priority level",
                    },
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
                    "todo_id": {"type": "string", "description": "The 8-char item ID"},
                    "title": {"type": "string"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                    "done": {"type": "boolean"},
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
    "add_todo": add_todo,
    "list_todos": list_todos,
    "update_todo": update_todo,
    "delete_todo": delete_todo,
}
