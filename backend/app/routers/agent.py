"""
Agent router — voice (audio file) and text endpoints.
"""
import tempfile
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from groq import AsyncGroq
from app.auth import get_current_user
from app.database import get_db
from app.agent.core import run_agent_turn
from app.config import settings
from app.models import AgentTextRequest

router = APIRouter(prefix="/agent", tags=["agent"])
groq_client = AsyncGroq(api_key=settings.groq_api_key)


@router.post("/voice")
async def voice_turn(audio: UploadFile = File(...), user=Depends(get_current_user)):
    """Accept an audio file, transcribe it, run agent, return text reply."""
    if not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be audio")

    # Save to temp file for Whisper
    suffix = Path(audio.filename).suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = Path(tmp.name)
        tmp_path.write_bytes(await audio.read())

    try:
        with open(tmp_path, "rb") as f:
            transcription = await groq_client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=f,
                language="en",
            )
        user_text = transcription.text.strip()
    finally:
        tmp_path.unlink(missing_ok=True)

    if not user_text:
        return {"reply": "I didn't catch that. Could you try again?", "transcript": ""}

    db = get_db()
    user_id = str(user["_id"])
    reply = await run_agent_turn(user_id, user_text, db)
    return {"reply": reply, "transcript": user_text}


@router.post("/text")
async def text_turn(body: AgentTextRequest, user=Depends(get_current_user)):
    """Text input fallback — useful for testing."""
    db = get_db()
    reply = await run_agent_turn(str(user["_id"]), body.text, db)
    return {"reply": reply, "transcript": body.text}
