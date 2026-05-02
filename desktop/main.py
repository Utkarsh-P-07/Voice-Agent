# -*- coding: utf-8 -*-
"""
Voice-Based AI Agent — CLI / Desktop entry point.
Listens once via microphone, answers once, then exits.

Usage:
    python desktop/main.py
"""
import json
import os
import sys
from pathlib import Path

# Project root on path so core/ and backend/ are importable
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("❌ GROQ_API_KEY not set. Add it to your .env file.")
    sys.exit(1)

client = Groq(api_key=GROQ_API_KEY)

CONVERSATION_FILE = ROOT / "data" / "conversation.json"


def load_conversation() -> list[dict]:
    if not CONVERSATION_FILE.exists():
        return []
    try:
        return json.loads(CONVERSATION_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_conversation(conversation: list[dict]) -> None:
    CONVERSATION_FILE.parent.mkdir(exist_ok=True)
    serialisable = [m for m in conversation if isinstance(m, dict)]
    CONVERSATION_FILE.write_text(json.dumps(serialisable, indent=2), encoding="utf-8")


def main() -> None:
    from core.voice import record_until_silence, transcribe, speak
    from core.agent import run_agent_turn

    print("=" * 50)
    print("  🤖 Voice Todo Agent — Powered by Groq")
    print("  Listening for one question, then will exit.")
    print("=" * 50 + "\n")

    conversation = load_conversation()
    if conversation:
        print(f"📂 Resuming conversation ({len(conversation)} previous messages)\n")

    try:
        audio     = record_until_silence()
        user_text = transcribe(client, audio)

        if not user_text:
            speak("I didn't catch that. Please run me again and try once more.")
            sys.exit(0)

        print(f"👤 You said: {user_text}\n")
        reply = run_agent_turn(client, conversation, user_text)
        speak(reply)
        save_conversation(conversation)

    except KeyboardInterrupt:
        print("\n👋 Cancelled.")
    except Exception as e:
        print(f"\n⚠️  Error: {e}\n")
        try:
            from core.voice import speak
            speak("Sorry, something went wrong. Please try again.")
        except Exception:
            pass


if __name__ == "__main__":
    main()
