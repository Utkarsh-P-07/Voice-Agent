"""
Agent core — system prompt, function-calling loop, tool dispatch using Groq.
"""
import json
from groq import Groq

from core.tools  import TOOL_SCHEMAS, TOOL_MAP
from core.memory import MEMORY_TOOL_SCHEMAS, MEMORY_TOOL_MAP, get_memory_context

ALL_TOOL_SCHEMAS = TOOL_SCHEMAS + MEMORY_TOOL_SCHEMAS
ALL_TOOL_MAP = {**TOOL_MAP, **MEMORY_TOOL_MAP}

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a helpful, friendly voice assistant that manages the user's To-Do list and remembers important things about them.

## Your Capabilities
- Add, list, update, and delete to-do items using the provided tools.
- Save important facts, preferences, or events the user mentions to long-term memory.
- Recall past memories when relevant to the conversation.

## Behavior Guidelines
- Always use tools for to-do operations — never make up task IDs or statuses.
- When the user mentions something personal and important (e.g., "I have a meeting tomorrow", "I prefer mornings"), save it to memory.
- When the user asks about past events or preferences, use recall_memories first.
- Keep responses concise and conversational — this is a voice interface, avoid markdown or long lists.
- When listing todos, read them out naturally (e.g., "You have 3 tasks: buy groceries, call the dentist, and finish the report").
- If a task ID is needed and the user doesn't know it, list todos first to find it.

## Current Memory Context
{memory_context}
"""


def build_system_prompt() -> str:
    return SYSTEM_PROMPT.format(memory_context=get_memory_context())


def dispatch_tool(name: str, arguments: str) -> str:
    try:
        args = json.loads(arguments)
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid JSON arguments"})
    fn = ALL_TOOL_MAP.get(name)
    if fn is None:
        return json.dumps({"error": f"Unknown tool: {name}"})
    return json.dumps(fn(**args))


def run_agent_turn(client: Groq, conversation: list[dict], user_text: str) -> str:
    """Process one user turn, handling multi-step function calling with retry on bad tool calls."""
    conversation.append({"role": "user", "content": user_text})
    messages = [{"role": "system", "content": build_system_prompt()}] + conversation

    max_retries = 3
    retry_count = 0

    while True:
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=ALL_TOOL_SCHEMAS,
                tool_choice="auto",
            )
        except Exception as e:
            # Groq returns 400 when the model generates malformed tool call JSON
            if "tool_use_failed" in str(e) and retry_count < max_retries:
                retry_count += 1
                messages.append({
                    "role": "user",
                    "content": "Please try again, making sure to call the right tool with valid JSON arguments.",
                })
                continue
            raise

        message = response.choices[0].message

        if message.tool_calls:
            # Validate all arguments are parseable before proceeding
            bad_call = any(
                not _valid_json(tc.function.arguments)
                for tc in message.tool_calls
            )
            if bad_call and retry_count < max_retries:
                retry_count += 1
                messages.append({
                    "role": "user",
                    "content": "Please try again with valid JSON arguments for the tool call.",
                })
                continue

            assistant_msg = {
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in message.tool_calls
                ],
            }
            messages.append(assistant_msg)
            conversation.append(assistant_msg)

            for tool_call in message.tool_calls:
                name = tool_call.function.name
                arguments = tool_call.function.arguments
                result = dispatch_tool(name, arguments)

                tool_msg = {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                }
                messages.append(tool_msg)
                conversation.append(tool_msg)

            retry_count = 0  # reset after successful tool execution
            continue

        reply = message.content or ""
        conversation.append({"role": "assistant", "content": reply})
        return reply


def _valid_json(s: str) -> bool:
    try:
        json.loads(s)
        return True
    except json.JSONDecodeError:
        return False
