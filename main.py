"""
Voice-Based AI Agent with Memory & Tools (Groq-powered)

Behavior:
  - Each run: listen once, answer once, then exit.
  - Conversation history is persisted so follow-up context is preserved across runs.

Usage:
    python main.py
"""
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("❌ GROQ_API_KEY not set. Add it to your .env file.")
    sys.exit(1)

client = Groq(api_key=GROQ_API_KEY)

CONVERSATION_FILE = Path(__file__).parent / "data" / "conversation.json"


def load_conversation() -> list[dict]:
    if not CONVERSATION_FILE.exists():
        return []
    try:
        return json.loads(CONVERSATION_FILE.read_text())
    except Exception:
        return []


def save_conversation(conversation: list[dict]) -> None:
    CONVERSATION_FILE.parent.mkdir(exist_ok=True)
    # Only persist serialisable messages (skip raw assistant objects with tool_calls)
    serialisable = []
    for msg in conversation:
        if isinstance(msg, dict):
            serialisable.append(msg)
    CONVERSATION_FILE.write_text(json.dumps(serialisable, indent=2))


def main() -> None:
    from voice import record_until_silence, transcribe, speak
    from agent import run_agent_turn

    print("=" * 50)
    print("  🤖 Voice Todo Agent — Powered by Groq")
    print("  Listening for one question, then will exit.")
    print("=" * 50 + "\n")

    # Load previous conversation for follow-up context
    conversation = load_conversation()
    if conversation:
        print(f"📂 Resuming conversation ({len(conversation)} previous messages)\n")

    try:
        # Listen for one question
        audio = record_until_silence()
        user_text = transcribe(client, audio)

        if not user_text:
            speak("I didn't catch that. Please run me again and try once more.")
            sys.exit(0)

        print(f"👤 You said: {user_text}\n")

        # Run agent for this single turn
        reply = run_agent_turn(client, conversation, user_text)

        # Speak the answer
        speak(reply)

        # Persist updated conversation for next run
        save_conversation(conversation)

    except KeyboardInterrupt:
        print("\n👋 Cancelled.")
    except Exception as e:
        print(f"\n⚠️  Error: {e}\n")
        try:
            from voice import speak
            speak("Sorry, something went wrong. Please try again.")
        except Exception:
            pass


if __name__ == "__main__":
    main()
