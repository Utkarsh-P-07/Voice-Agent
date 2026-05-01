from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.models import TodoCreate, TodoUpdate
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/todos", tags=["todos"])


def _serialize(todo: dict) -> dict:
    todo["id"] = str(todo.pop("_id"))
    todo["user_id"] = str(todo["user_id"])
    if todo.get("due_at") and isinstance(todo["due_at"], datetime):
        todo["due_at"] = todo["due_at"].isoformat()
    if todo.get("created_at") and isinstance(todo["created_at"], datetime):
        todo["created_at"] = todo["created_at"].isoformat()
    if todo.get("updated_at") and isinstance(todo["updated_at"], datetime):
        todo["updated_at"] = todo["updated_at"].isoformat()
    return todo


@router.post("/")
async def create_todo(body: TodoCreate, user=Depends(get_current_user)):
    db = get_db()
    doc = {
        "user_id": ObjectId(str(user["_id"])),
        "title": body.title,
        "description": body.description or "",
        "category": body.category or "Personal",
        "priority": body.priority,
        "done": False,
        "due_at": body.due_at,
        "reminder_sent": False,
        "calendar_event_id": None,
        "created_at": datetime.utcnow(),
    }
    result = await db.todos.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Create Google Calendar event if user has connected calendar and due date is set
    if body.due_at and user.get("calendar_token"):
        try:
            from app.routers.calendar import create_calendar_event
            event_id = await create_calendar_event(
                user, doc["title"], doc["priority"], body.due_at.isoformat()
            )
            if event_id:
                await db.todos.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {"calendar_event_id": event_id}},
                )
                doc["calendar_event_id"] = event_id
        except Exception as e:
            print(f"Calendar event creation failed (non-fatal): {e}")

    return _serialize(doc)


@router.get("/")
async def list_todos(done: bool = None, user=Depends(get_current_user)):
    db = get_db()
    query = {"user_id": ObjectId(str(user["_id"]))}
    if done is not None:
        query["done"] = done
    todos = await db.todos.find(query).sort("created_at", -1).to_list(500)
    return [_serialize(t) for t in todos]


@router.patch("/{todo_id}")
async def update_todo(todo_id: str, body: TodoUpdate, user=Depends(get_current_user)):
    db = get_db()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if "title" in updates and not updates["title"].strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    updates["updated_at"] = datetime.utcnow()
    if "due_at" in updates:
        updates["reminder_sent"] = False
    result = await db.todos.find_one_and_update(
        {"_id": ObjectId(todo_id), "user_id": ObjectId(str(user["_id"]))},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Todo not found")
    return _serialize(result)


@router.delete("/{todo_id}")
async def delete_todo(todo_id: str, user=Depends(get_current_user)):
    db = get_db()
    todo = await db.todos.find_one(
        {"_id": ObjectId(todo_id), "user_id": ObjectId(str(user["_id"]))}
    )
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    # Delete associated calendar event (non-fatal)
    if todo.get("calendar_event_id") and user.get("calendar_token"):
        try:
            from app.routers.calendar import delete_calendar_event
            await delete_calendar_event(user, todo["calendar_event_id"])
        except Exception as e:
            print(f"Calendar event deletion failed (non-fatal): {e}")

    await db.todos.delete_one({"_id": ObjectId(todo_id)})
    return {"status": "deleted"}
