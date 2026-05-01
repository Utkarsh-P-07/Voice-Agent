"""
Agent core — per-user, async, MongoDB-backed.
"""
import json
from groq import AsyncGroq
from app.config import settings
from app.agent.tools import TOOL_SCHEMAS, add_todo, list_todos, update_todo, delete_todo, save_memory, recall_memories

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a helpful, friendly voice assistant that manages the user's To-Do list and remembers important things about them.

## Capabilities
- Add, list, update, and delete to-do items using tools.
- Save important facts or preferences to memory.
- Recall past memories when relevant.

## Rules
- Always use tools for todo operations.
- Keep responses short and conversational — this is a voice interface.
- When listing todos, read them naturally.
- If a task ID is needed and unknown, list todos first.
- When user mentions something personal and worth remembering, save it to memory.

## User's Recent Memories
{memory_context}
"""

groq_client = AsyncGroq(api_key=settings.groq_api_key)


async def get_memory_context(db, user_id: str) -> str:
    from bson import ObjectId
    memories = await db.memories.find(
        {"user_id": ObjectId(user_id)}
    ).sort("timestamp", -1).to_list(10)
    if not memories:
        return "No memories yet."
    return "\n".join(f"- [{m['category']}] {m['content']}" for m in memories)


async def load_conversation(db, user_id: str) -> list[dict]:
    from bson import ObjectId
    doc = await db.conversations.find_one({"user_id": ObjectId(user_id)})
    return doc["messages"] if doc else []


async def save_conversation(db, user_id: str, messages: list[dict]):
    from bson import ObjectId
    await db.conversations.update_one(
        {"user_id": ObjectId(user_id)},
        {"$set": {"messages": messages[-40:]}},  # keep last 40 messages
        upsert=True,
    )


async def dispatch_tool(name: str, arguments: str, db, user_id: str) -> str:
    try:
        args = json.loads(arguments)
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid JSON"})

    tool_map = {
        "add_todo": lambda: add_todo(db, user_id, **args),
        "list_todos": lambda: list_todos(db, user_id, **args),
        "update_todo": lambda: update_todo(db, user_id, **args),
        "delete_todo": lambda: delete_todo(db, user_id, **args),
        "save_memory": lambda: save_memory(db, user_id, **args),
        "recall_memories": lambda: recall_memories(db, user_id, **args),
    }
    fn = tool_map.get(name)
    if not fn:
        return json.dumps({"error": f"Unknown tool: {name}"})
    result = await fn()
    return json.dumps(result)


async def run_agent_turn(user_id: str, user_text: str, db) -> str:
    conversation = await load_conversation(db, user_id)
    memory_context = await get_memory_context(db, user_id)

    conversation.append({"role": "user", "content": user_text})
    messages = [{"role": "system", "content": SYSTEM_PROMPT.format(memory_context=memory_context)}] + conversation

    max_retries = 3
    retry_count = 0

    while True:
        try:
            response = await groq_client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=TOOL_SCHEMAS,
                tool_choice="auto",
            )
        except Exception as e:
            if "tool_use_failed" in str(e) and retry_count < max_retries:
                retry_count += 1
                messages.append({"role": "user", "content": "Please retry with valid JSON tool arguments."})
                continue
            raise

        message = response.choices[0].message

        if message.tool_calls:
            bad = any(not _valid_json(tc.function.arguments) for tc in message.tool_calls)
            if bad and retry_count < max_retries:
                retry_count += 1
                messages.append({"role": "user", "content": "Please retry with valid JSON tool arguments."})
                continue

            assistant_msg = {
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {"id": tc.id, "type": "function",
                     "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in message.tool_calls
                ],
            }
            messages.append(assistant_msg)
            conversation.append(assistant_msg)

            for tc in message.tool_calls:
                result = await dispatch_tool(tc.function.name, tc.function.arguments, db, user_id)
                tool_msg = {"role": "tool", "tool_call_id": tc.id, "content": result}
                messages.append(tool_msg)
                conversation.append(tool_msg)

            retry_count = 0
            continue

        reply = message.content or ""
        conversation.append({"role": "assistant", "content": reply})
        await save_conversation(db, user_id, conversation)
        return reply


def _valid_json(s: str) -> bool:
    try:
        json.loads(s)
        return True
    except json.JSONDecodeError:
        return False
