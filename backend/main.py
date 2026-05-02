# -*- coding: utf-8 -*-
"""
FastAPI backend — Voice Todo Agent.
All data stored in MongoDB Atlas. Falls back to JSON files if MONGODB_URI is unset.
"""
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "core"))   # core/ on path so imports work

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
import uvicorn

from core.tools  import add_todo, list_todos, update_todo, delete_todo
from core.memory import save_memory, recall_memories, _load as load_memories_sync, get_memory_context
from core.agent  import run_agent_turn
from oauth       import router as oauth_router, verify_token

from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client: Optional[Groq] = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Voice Todo Agent API", version="2.0.0")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("JWT_SECRET", "change-me-32chars!!"),
    same_site="lax",
    https_only=False,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(oauth_router)

# ── Startup: init MongoDB indexes ─────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    mongo_uri = os.getenv("MONGODB_URI", "")
    if mongo_uri:
        try:
            from backend.database import init_indexes, ping
            ok = await ping()
            if ok:
                await init_indexes()
                print("✅ MongoDB Atlas connected and indexes ready.")
            else:
                print("⚠️  MongoDB ping failed — check MONGODB_URI.")
        except Exception as e:
            print(f"⚠️  MongoDB startup error: {e}")
    else:
        print("ℹ️  MONGODB_URI not set — using JSON file fallback.")

# ─────────────────────────────────────────────────────────────────────────────
# AUTH HELPERS — extract user_id from Bearer token
# ─────────────────────────────────────────────────────────────────────────────

def _get_user_id(authorization: Optional[str] = Header(default=None)) -> str:
    """
    Extract user identity from Authorization: Bearer <token>.
    Falls back to 'default' so unauthenticated CLI / desktop usage still works.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return "default"
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        return "default"
    return payload.get("email") or payload.get("sub") or "default"

# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────────────────────────────────────

class TodoCreate(BaseModel):
    title:    str
    priority: str = "medium"
    category: str = "general"

class TodoUpdate(BaseModel):
    title:    Optional[str]  = None
    priority: Optional[str]  = None
    done:     Optional[bool] = None

class ChatMessage(BaseModel):
    message: str

class MemoryCreate(BaseModel):
    content:  str
    category: str = "general"

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    mongo_uri = os.getenv("MONGODB_URI", "")
    mongo_ok  = False
    if mongo_uri:
        try:
            from backend.database import ping
            mongo_ok = await ping()
        except Exception:
            pass
    return {
        "status":          "ok",
        "groq_configured": bool(GROQ_API_KEY),
        "model":           "llama-3.3-70b-versatile",
        "db":              "mongodb" if mongo_uri else "json_files",
        "db_connected":    mongo_ok if mongo_uri else None,
    }

# ─────────────────────────────────────────────────────────────────────────────
# TODOS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/todos")
async def get_todos(done: Optional[bool] = None, user_id: str = Depends(_get_user_id)):
    return list_todos(filter_done=done, user_id=user_id)

@app.post("/api/todos", status_code=201)
async def create_todo(body: TodoCreate, user_id: str = Depends(_get_user_id)):
    if body.priority not in ("low", "medium", "high"):
        raise HTTPException(400, "priority must be low, medium, or high")
    return add_todo(body.title, body.priority, category=body.category, user_id=user_id)

@app.patch("/api/todos/{todo_id}")
async def patch_todo(todo_id: str, body: TodoUpdate, user_id: str = Depends(_get_user_id)):
    result = update_todo(todo_id, title=body.title, priority=body.priority,
                         done=body.done, user_id=user_id)
    if result.get("status") == "not_found":
        raise HTTPException(404, f"Todo {todo_id} not found")
    return result

@app.delete("/api/todos/{todo_id}")
async def remove_todo(todo_id: str, user_id: str = Depends(_get_user_id)):
    result = delete_todo(todo_id, user_id=user_id)
    if result.get("status") == "not_found":
        raise HTTPException(404, f"Todo {todo_id} not found")
    return result

# ─────────────────────────────────────────────────────────────────────────────
# MEMORIES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/memories")
async def get_memories(query: str = "", category: str = "",
                       user_id: str = Depends(_get_user_id)):
    return recall_memories(query=query, category=category, user_id=user_id)

@app.post("/api/memories", status_code=201)
async def create_memory(body: MemoryCreate, user_id: str = Depends(_get_user_id)):
    valid_cats = ("preference", "event", "goal", "general")
    if body.category not in valid_cats:
        raise HTTPException(400, f"category must be one of {valid_cats}")
    return save_memory(body.content, body.category, user_id=user_id)

@app.delete("/api/memories")
async def clear_memories_endpoint(user_id: str = Depends(_get_user_id)):
    mongo_uri = os.getenv("MONGODB_URI", "")
    if mongo_uri:
        from backend.database import db_clear_memories
        return await db_clear_memories(user_id)
    from core.memory import MEMORY_FILE
    if MEMORY_FILE.exists():
        MEMORY_FILE.write_text("[]", encoding="utf-8")
    return {"status": "cleared"}

# ─────────────────────────────────────────────────────────────────────────────
# CONVERSATION
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/conversation")
async def get_conversation(user_id: str = Depends(_get_user_id)):
    mongo_uri = os.getenv("MONGODB_URI", "")
    if mongo_uri:
        from backend.database import db_load_conversation
        msgs = await db_load_conversation(user_id)
    else:
        msgs = _load_json_conversation()
    visible = [m for m in msgs if isinstance(m, dict) and m.get("role") in ("user", "assistant")]
    return {"messages": visible}

@app.delete("/api/conversation")
async def clear_conversation_endpoint(user_id: str = Depends(_get_user_id)):
    mongo_uri = os.getenv("MONGODB_URI", "")
    if mongo_uri:
        from backend.database import db_clear_conversation
        return await db_clear_conversation(user_id)
    _save_json_conversation([])
    return {"status": "cleared"}

# ─────────────────────────────────────────────────────────────────────────────
# CHAT
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(body: ChatMessage, user_id: str = Depends(_get_user_id)):
    if not groq_client:
        raise HTTPException(503, "GROQ_API_KEY not configured")
    conversation = await _load_conv(user_id)
    reply = run_agent_turn(groq_client, conversation, body.message)
    await _save_conv(user_id, conversation)
    return {"reply": reply}

# ─────────────────────────────────────────────────────────────────────────────
# VOICE
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/voice")
async def voice_chat(audio: UploadFile = File(...),
                     user_id: str = Depends(_get_user_id)):
    if not groq_client:
        raise HTTPException(503, "GROQ_API_KEY not configured")

    suffix = Path(audio.filename).suffix if audio.filename else ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = Path(tmp.name)

    try:
        with open(tmp_path, "rb") as f:
            result = groq_client.audio.transcriptions.create(
                model="whisper-large-v3", file=f, language="en")
        user_text = result.text.strip()
        if not user_text:
            return {"transcript": "", "reply": "I didn't catch that. Please try again."}

        conversation = await _load_conv(user_id)
        reply = run_agent_turn(groq_client, conversation, user_text)
        await _save_conv(user_id, conversation)
        return {"transcript": user_text, "reply": reply}
    finally:
        tmp_path.unlink(missing_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# STATS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
async def get_stats(user_id: str = Depends(_get_user_id)):
    todos_result = list_todos(user_id=user_id)
    todos        = todos_result["todos"]
    memories     = recall_memories(user_id=user_id)["memories"]

    total   = len(todos)
    done    = sum(1 for t in todos if t["done"])
    pending = total - done
    by_priority = {
        "high":   sum(1 for t in todos if t.get("priority") == "high"),
        "medium": sum(1 for t in todos if t.get("priority") == "medium"),
        "low":    sum(1 for t in todos if t.get("priority") == "low"),
    }
    by_category: dict[str, int] = {}
    for m in memories:
        c = m.get("category", "general")
        by_category[c] = by_category.get(c, 0) + 1

    return {
        "todos": {
            "total":          total,
            "done":           done,
            "pending":        pending,
            "completion_pct": round(done / total * 100, 1) if total else 0,
            "by_priority":    by_priority,
        },
        "memories": {
            "total":       len(memories),
            "by_category": by_category,
        },
    }

# ─────────────────────────────────────────────────────────────────────────────
# WEBSOCKET
# ─────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws/chat")
async def ws_chat(websocket: WebSocket):
    await websocket.accept()
    # Extract token from query param for WS (headers not easily set in browser WS)
    token   = websocket.query_params.get("token", "")
    payload = verify_token(token) if token else None
    user_id = (payload.get("email") or "default") if payload else "default"

    try:
        while True:
            data      = await websocket.receive_text()
            payload_d = json.loads(data)
            user_text = payload_d.get("message", "")
            if not user_text:
                continue
            if not groq_client:
                await websocket.send_text(json.dumps({"error": "GROQ_API_KEY not configured"}))
                continue
            conversation = await _load_conv(user_id)
            reply = run_agent_turn(groq_client, conversation, user_text)
            await _save_conv(user_id, conversation)
            await websocket.send_text(json.dumps({"reply": reply}))
    except WebSocketDisconnect:
        pass

# ─────────────────────────────────────────────────────────────────────────────
# CONVERSATION HELPERS
# ─────────────────────────────────────────────────────────────────────────────

_CONV_FILE = ROOT / "data" / "conversation.json"

def _load_json_conversation() -> list[dict]:
    if not _CONV_FILE.exists():
        return []
    try:
        return json.loads(_CONV_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

def _save_json_conversation(conv: list[dict]) -> None:
    _CONV_FILE.parent.mkdir(exist_ok=True)
    _CONV_FILE.write_text(
        json.dumps([m for m in conv if isinstance(m, dict)], indent=2),
        encoding="utf-8",
    )

async def _load_conv(user_id: str) -> list[dict]:
    if os.getenv("MONGODB_URI"):
        from backend.database import db_load_conversation
        return await db_load_conversation(user_id)
    return _load_json_conversation()

async def _save_conv(user_id: str, conv: list[dict]) -> None:
    if os.getenv("MONGODB_URI"):
        from backend.database import db_save_conversation
        await db_save_conversation(user_id, conv)
    else:
        _save_json_conversation(conv)

# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True,
                reload_dirs=[str(Path(__file__).parent)])

