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
# PROFILE OTP — email / contact change verification
# ─────────────────────────────────────────────────────────────────────────────
import random
import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# In-memory OTP store: { "email:field": { otp, expires, verified_token } }
_otp_store: dict = {}

OTP_TTL     = 10 * 60          # 10 minutes
TOKEN_TTL   = 5  * 60          # 5 minutes to use the verified token
SMTP_HOST   = os.getenv("SMTP_HOST",  "smtp.gmail.com")
SMTP_PORT   = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER   = os.getenv("SMTP_USER",  "")
SMTP_PASS   = os.getenv("SMTP_PASS",  "")
SMTP_FROM   = os.getenv("SMTP_FROM",  SMTP_USER)


class OtpRequest(BaseModel):
    field: str          # "email" or "contact"
    new_value: str      # the new email / phone the user wants to set


class OtpVerify(BaseModel):
    field: str
    new_value: str
    otp: str


def _send_otp_email(to_email: str, otp: str, field: str) -> None:
    """Send OTP via SMTP. Raises if SMTP not configured."""
    if not SMTP_USER or not SMTP_PASS:
        raise HTTPException(503, "SMTP not configured. Add SMTP_USER and SMTP_PASS to .env")

    subject = f"Your verification code — {field.title()} change"
    body    = (
        f"Hi,\n\n"
        f"Your one-time verification code to change your {field} is:\n\n"
        f"  {otp}\n\n"
        f"This code expires in 10 minutes. If you did not request this, ignore this email.\n\n"
        f"— Voice Agent"
    )
    msg = MIMEMultipart()
    msg["From"]    = SMTP_FROM
    msg["To"]      = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_FROM, to_email, msg.as_string())


@app.post("/api/profile/request-otp")
async def request_otp(body: OtpRequest, user_id: str = Depends(_get_user_id)):
    if body.field not in ("email", "contact"):
        raise HTTPException(400, "field must be 'email' or 'contact'")

    otp = str(random.randint(100000, 999999))
    key = f"{user_id}:{body.field}"
    _otp_store[key] = {
        "otp":     otp,
        "value":   body.new_value,
        "expires": time.time() + OTP_TTL,
    }

    # Determine where to send the OTP
    # For email change → send to the NEW email so they prove they own it
    # For contact change → send to the account email on file
    send_to = body.new_value if body.field == "email" else user_id  # user_id is email

    try:
        _send_otp_email(send_to, otp, body.field)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to send OTP email: {e}")

    return {"status": "otp_sent", "message": f"OTP sent to {send_to}"}


@app.post("/api/profile/verify-otp")
async def verify_otp(body: OtpVerify, user_id: str = Depends(_get_user_id)):
    if body.field not in ("email", "contact"):
        raise HTTPException(400, "field must be 'email' or 'contact'")

    key   = f"{user_id}:{body.field}"
    entry = _otp_store.get(key)

    if not entry:
        raise HTTPException(400, "No OTP requested for this field")
    if time.time() > entry["expires"]:
        _otp_store.pop(key, None)
        raise HTTPException(400, "OTP has expired. Please request a new one.")
    if entry["otp"] != body.otp.strip():
        raise HTTPException(400, "Incorrect OTP")
    if entry["value"] != body.new_value:
        raise HTTPException(400, "Value mismatch")

    # Issue a short-lived verified token the frontend stores and sends with save
    from oauth import create_token
    verified_token = create_token({
        "user_id":   user_id,
        "field":     body.field,
        "new_value": body.new_value,
        "exp":       time.time() + TOKEN_TTL,
    })
    _otp_store.pop(key, None)
    return {"status": "verified", "verified_token": verified_token}


class ApplyChangeRequest(BaseModel):
    verified_token: str


@app.post("/api/profile/apply-change")
async def apply_change(body: ApplyChangeRequest, user_id: str = Depends(_get_user_id)):
    """
    Apply a previously OTP-verified field change.
    The verified_token must have been issued by /verify-otp and not yet expired.
    """
    from oauth import verify_token as _verify_token
    payload = _verify_token(body.verified_token)
    if not payload:
        raise HTTPException(400, "Invalid or expired verified token")

    token_user  = payload.get("user_id")
    field       = payload.get("field")
    new_value   = payload.get("new_value")
    token_exp   = payload.get("exp", 0)

    if token_user != user_id:
        raise HTTPException(403, "Token does not belong to this user")
    if field not in ("email", "contact"):
        raise HTTPException(400, "Invalid field in token")
    if time.time() > token_exp:
        raise HTTPException(400, "Verified token has expired. Please restart the verification flow.")
    if not new_value:
        raise HTTPException(400, "Missing new_value in token")

    mongo_uri = os.getenv("MONGODB_URI", "")
    if mongo_uri:
        from backend.database import db_update_user_field
        updated = await db_update_user_field(user_id, field, new_value)
    else:
        # JSON-file fallback: nothing to persist server-side; client handles it
        updated = {"email": new_value if field == "email" else user_id,
                   "contact": new_value if field == "contact" else None}

    return {
        "status":    "updated",
        "field":     field,
        "new_value": new_value,
        "user":      updated,
    }


@app.get("/api/profile/me")
async def get_profile_me(user_id: str = Depends(_get_user_id)):
    """Return the current user's stored profile fields (contact, etc.)."""
    mongo_uri = os.getenv("MONGODB_URI", "")
    if mongo_uri:
        from backend.database import db_get_user_by_email
        doc = await db_get_user_by_email(user_id)
        if doc:
            return {"contact": doc.get("contact", ""), "email": doc.get("email", user_id)}
    return {"contact": "", "email": user_id}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True,
                reload_dirs=[str(Path(__file__).parent)])

