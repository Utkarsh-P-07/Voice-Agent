# Voice Todo Agent — Web App

Full-stack web version of the Voice Todo Agent.

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Backend  | FastAPI + Uvicorn (Python)                |
| AI       | Groq (llama-3.3-70b + Whisper large-v3)  |
| Frontend | React 18 + Vite + Tailwind CSS            |
| Charts   | Recharts                                  |
| Icons    | Lucide React                              |

## Project Structure

```
├── backend/
│   ├── main.py          # FastAPI app — all REST + WebSocket endpoints
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, Todos, Memory, Stats, Profile, Settings
│   │   ├── components/  # Sidebar, ChatPanel, TodoRow, MemoryCard, StatCard…
│   │   ├── hooks/       # useVoiceRecorder (MediaRecorder API)
│   │   └── api.js       # Axios API client
│   ├── package.json
│   └── vite.config.js
├── agent.py             # Groq agent (shared)
├── tools.py             # Todo CRUD (shared)
├── memory.py            # Memory system (shared)
├── voice.py             # STT/TTS (shared)
└── data/                # JSON data files
```

## Setup

```bash
# 1. Make sure .env has your key
echo "GROQ_API_KEY=your_key_here" > .env

# 2. Install backend deps (if not already)
pip install -r backend/requirements.txt

# 3. Install frontend deps
cd frontend && npm install
```

## Run

### Option A — PowerShell script (opens two windows)
```powershell
.\start.ps1
```

### Option B — Manual (two terminals)

Terminal 1 — Backend:
```bash
python backend/main.py
```

Terminal 2 — Frontend:
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173**

## API Endpoints

| Method | Path                  | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | /api/health           | Health check + config status   |
| GET    | /api/todos            | List todos (optional ?done=)   |
| POST   | /api/todos            | Create todo                    |
| PATCH  | /api/todos/{id}       | Update todo                    |
| DELETE | /api/todos/{id}       | Delete todo                    |
| GET    | /api/memories         | List memories                  |
| POST   | /api/memories         | Save memory                    |
| DELETE | /api/memories         | Clear all memories             |
| POST   | /api/chat             | Text chat with agent           |
| POST   | /api/voice            | Upload audio → transcribe + chat |
| GET    | /api/conversation     | Get chat history               |
| DELETE | /api/conversation     | Clear chat history             |
| GET    | /api/stats            | Dashboard statistics           |
| WS     | /ws/chat              | Real-time WebSocket chat       |

Interactive API docs: **http://localhost:8000/docs**
