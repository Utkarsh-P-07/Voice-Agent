from fastapi import APIRouter, Depends
from bson import ObjectId
from datetime import datetime
from app.models import MemoryCreate
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/memory", tags=["memory"])


@router.post("/")
async def save_memory(body: MemoryCreate, user=Depends(get_current_user)):
    db = get_db()
    doc = {
        "user_id": ObjectId(str(user["_id"])),
        "content": body.content,
        "category": body.category,
        "timestamp": datetime.utcnow(),
    }
    result = await db.memories.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


@router.get("/")
async def recall_memories(query: str = "", category: str = "", user=Depends(get_current_user)):
    db = get_db()
    filter_q = {"user_id": ObjectId(str(user["_id"]))}
    if category:
        filter_q["category"] = category
    if query:
        filter_q["content"] = {"$regex": query, "$options": "i"}
    memories = await db.memories.find(filter_q).sort("timestamp", -1).to_list(50)
    for m in memories:
        m["id"] = str(m.pop("_id"))
        m["user_id"] = str(m["user_id"])
    return memories
