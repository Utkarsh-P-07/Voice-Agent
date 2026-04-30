# Voice-Based AI Agent with Memory & Tools

A voice-enabled AI agent that manages your To-Do list and remembers important interactions.

## Features
- 🎤 Voice input via microphone (Whisper STT)
- 🔊 Voice output (OpenAI TTS)
- ✅ Full To-Do CRUD (add, list, update, delete)
- 🧠 Persistent memory across sessions
- 🤖 GPT-4o agent with function calling

## Setup

```bash
cd voice-todo-agent
pip install -r requirements.txt
cp .env.example .env
# Add your OpenAI API key to .env
```

## Run

```bash
# Voice mode (microphone + speaker)
python main.py

# Text mode (no mic needed — great for testing)
python main.py --text
```

## Project Structure

```
voice-todo-agent/
├── main.py       # Entry point, voice/text loop
├── agent.py      # GPT-4o agent, function-calling loop, system prompt
├── tools.py      # To-Do CRUD tools + OpenAI tool schemas
├── memory.py     # Save/recall memory tools
├── voice.py      # Whisper STT + TTS playback
└── data/
    ├── todos.json
    └── memory.json
```

## Example Interactions

| You say | What happens |
|---|---|
| "Add buy groceries to my list" | Calls `add_todo` |
| "What's on my list?" | Calls `list_todos` |
| "Mark the groceries task as done" | Calls `list_todos` then `update_todo` |
| "Delete the groceries task" | Calls `delete_todo` |
| "I prefer working in the mornings" | Calls `save_memory` |
| "What do you know about my preferences?" | Calls `recall_memories` |
