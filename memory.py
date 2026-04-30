"""
Memory system — stores important user interactions as timestamped entries.
The agent can save and recall memories via function calling.
"""
import json
from datetime import datetime
from pathlib import Path

MEMORY_FILE = Path(__file__).parent / "data" / "memory.json"
MAX_MEMORIES = 50  # cap to avoid unbounded growth


def _load() -> list[dict]:
    if not MEMORY_FILE.exists():
        return []
    return json.loads(MEMORY_FILE.read_text())


def _save(memories: list[dict]) -> None:
    MEMORY_FILE.parent.mkdir(exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(memories, indent=2))


def save_memory(content: str, category: str = "general") -> dict:
    """Persist an important fact or interaction to long-term memory."""
    memories = _load()
    entry = {
        "id": len(memories) + 1,
        "content": content,
        "category": category,
        "timestamp": datetime.now().isoformat(),
    }
    memories.append(entry)
    # keep only the most recent MAX_MEMORIES
    if len(memories) > MAX_MEMORIES:
        memories = memories[-MAX_MEMORIES:]
    _save(memories)
    return {"status": "saved", "entry": entry}


def recall_memories(query: str = "", category: str = "") -> dict:
    """Retrieve stored memories, optionally filtered by keyword or category."""
    memories = _load()
    if category:
        memories = [m for m in memories if m.get("category") == category]
    if query:
        q = query.lower()
        memories = [m for m in memories if q in m["content"].lower()]
    return {"memories": memories, "count": len(memories)}


def get_memory_context() -> str:
    """Return a compact string of recent memories to inject into the system prompt."""
    memories = _load()
    if not memories:
        return "No memories stored yet."
    recent = memories[-10:]  # last 10 for context window efficiency
    lines = [f"- [{m['category']}] {m['content']} (at {m['timestamp'][:16]})" for m in recent]
    return "\n".join(lines)


# --- Tool schemas ---

MEMORY_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": (
                "Save an important fact, preference, or event about the user to long-term memory. "
                "Use this when the user shares something worth remembering for future sessions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "The fact or event to remember"},
                    "category": {
                        "type": "string",
                        "enum": ["preference", "event", "goal", "general"],
                        "description": "Category of the memory",
                    },
                },
                "required": ["content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recall_memories",
            "description": "Search and retrieve stored memories about the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Keyword to search memories"},
                    "category": {
                        "type": "string",
                        "enum": ["preference", "event", "goal", "general"],
                    },
                },
            },
        },
    },
]

MEMORY_TOOL_MAP = {
    "save_memory": save_memory,
    "recall_memories": recall_memories,
}
