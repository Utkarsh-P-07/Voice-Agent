"""
Agent tools wired to MongoDB (per-user).
"""
from datetime import datetime
from bson import ObjectId


async def add_todo(db, user_id: str, title: str, priority: str = "medium", due_at: str = None) -> dict:
    due = None
    if due_at:
        try:
            due = datetime.fromisoformat(due_at)
        except ValueError:
            pass
    doc = {
        "user_id": ObjectId(user_id),
        "title": title.strip(),
        "priority": priority if priority in ("low", "medium", "high") else "medium",
        "done": False,
        "due_at": due,
        "reminder_sent": False,
        "calendar_event_id": None,
        "created_at": datetime.utcnow(),
    }
    result = await db.todos.insert_one(doc)
    return {
        "status": "added",
        "id": str(result.inserted_id),
        "title": doc["title"],
        "priority": doc["priority"],
        "due_at": due.isoformat() if due else None,
    }


async def list_todos(db, user_id: str, filter_done: bool = None) -> dict:
    query = {"user_id": ObjectId(user_id)}
    if filter_done is not None:
        query["done"] = filter_done
    todos = await db.todos.find(query).sort("created_at", -1).to_list(100)
    return {
        "todos": [
            {
                "id": str(t["_id"]),
                "title": t["title"],
                "priority": t["priority"],
                "done": t["done"],
                "due_at": t["due_at"].isoformat() if t.get("due_at") else None,
            }
            for t in todos
        ],
        "count": len(todos),
    }


async def update_todo(db, user_id: str, todo_id: str, title: str = None,
                      priority: str = None, done: bool = None) -> dict:
    updates = {}
    if title is not None:
        updates["title"] = title.strip()
    if priority is not None and priority in ("low", "medium", "high"):
        updates["priority"] = priority
    if done is not None:
        updates["done"] = done
    if not updates:
        return {"status": "no_changes"}
    updates["updated_at"] = datetime.utcnow()
    result = await db.todos.find_one_and_update(
        {"_id": ObjectId(todo_id), "user_id": ObjectId(user_id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        return {"status": "not_found"}
    return {"status": "updated", "id": todo_id, "title": result["title"], "done": result["done"]}


async def delete_todo(db, user_id: str, todo_id: str) -> dict:
    result = await db.todos.delete_one(
        {"_id": ObjectId(todo_id), "user_id": ObjectId(user_id)}
    )
    return {"status": "deleted" if result.deleted_count else "not_found"}


async def save_memory(db, user_id: str, content: str, category: str = "general") -> dict:
    if category not in ("preference", "event", "goal", "general"):
        category = "general"
    await db.memories.insert_one({
        "user_id": ObjectId(user_id),
        "content": content.strip(),
        "category": category,
        "timestamp": datetime.utcnow(),
    })
    return {"status": "saved", "content": content}


async def recall_memories(db, user_id: str, query: str = "", category: str = "") -> dict:
    filter_q = {"user_id": ObjectId(user_id)}
    if category and category in ("preference", "event", "goal", "general"):
        filter_q["category"] = category
    if query:
        filter_q["content"] = {"$regex": query, "$options": "i"}
    memories = await db.memories.find(filter_q).sort("timestamp", -1).to_list(20)
    return {
        "memories": [{"content": m["content"], "category": m["category"]} for m in memories],
        "count": len(memories),
    }


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "add_todo",
            "description": "Add a new to-do item for the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                    "due_at": {"type": "string", "description": "ISO datetime e.g. 2024-06-01T09:00:00"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_todos",
            "description": "List the user's to-do items.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filter_done": {"type": "boolean", "description": "true=completed, false=pending, omit=all"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_todo",
            "description": "Update a to-do item's title, priority, or completion status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "todo_id": {"type": "string"},
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
            "description": "Delete a to-do item by ID.",
            "parameters": {
                "type": "object",
                "properties": {"todo_id": {"type": "string"}},
                "required": ["todo_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": "Save an important fact or preference about the user for future sessions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {"type": "string"},
                    "category": {"type": "string", "enum": ["preference", "event", "goal", "general"]},
                },
                "required": ["content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recall_memories",
            "description": "Search the user's stored memories.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "category": {"type": "string", "enum": ["preference", "event", "goal", "general"]},
                },
            },
        },
    },
]
