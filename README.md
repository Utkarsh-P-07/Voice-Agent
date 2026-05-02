# Voice Todo Agent

AI-powered voice assistant for task management — built with Groq, FastAPI, React, and MongoDB Atlas.

## Project Structure

```
voice-todo-agent/
├── backend/                  # FastAPI REST API
│   ├── main.py               # App entry point, all routes
│   ├── database.py           # MongoDB Atlas async data layer (Motor)
│   ├── oauth.py              # Google & GitHub OAuth2
│   └── requirements.txt      # Python dependencies
│
├── core/                     # Shared agent logic (used by backend + desktop)
│   ├── agent.py              # Groq LLM agent, function-calling loop
│   ├── tools.py              # Todo CRUD tools (MongoDB + JSON fallback)
│   ├── memory.py             # Long-term memory (MongoDB + JSON fallback)
│   └── voice.py              # Whisper STT + pyttsx3 TTS
│
├── frontend/                 # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/            # Dashboard, Todos, Memory, Stats, Profile, Settings
│   │   │   └── auth/         # SignIn, SignUp, OAuthCallback
│   │   ├── components/       # Sidebar, ChatPanel, TodoRow, MemoryCard …
│   │   ├── context/          # AuthContext (JWT + OAuth)
│   │   ├── hooks/            # useVoiceRecorder
│   │   └── api.js            # Axios API client
│   ├── package.json
│   └── vite.config.js
│
├── desktop/                  # Tkinter desktop app (standalone)
│   ├── main.py               # CLI voice loop
│   └── ui.py                 # Full neumorphic dashboard UI
│
├── data/                     # Runtime JSON fallback (gitignored)
│   ├── todos.json
│   ├── memory.json
│   └── conversation.json
│
├── docs/                     # Documentation
│   └── WEB_README.md         # Web app setup guide
│
├── scripts/
│   └── start.ps1             # Windows quick-start script
│
├── .env.example              # Environment variable template
├── .gitignore
└── requirements.txt          # Root Python deps (desktop + core)
```

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/Utkarsh-P-07/Voice-Agent.git
cd Voice-Agent
cp .env.example .env
# Fill in GROQ_API_KEY and optionally MONGODB_URI
```

### 2. Web App (FastAPI + React)

```bash
# Terminal 1 — Backend
pip install -r backend/requirements.txt
cd backend
python -m uvicorn main:app --reload --reload-dir .

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### 3. Desktop App (tkinter)

```bash
pip install -r requirements.txt
python desktop/main.py        # CLI voice mode
python desktop/ui.py          # Full dashboard UI
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ | [console.groq.com](https://console.groq.com) |
| `MONGODB_URI` | Optional | Atlas connection string — uses JSON files if unset |
| `MONGODB_DB` | Optional | Database name (default: `voiceagent`) |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth |
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth |
| `JWT_SECRET` | Optional | Token signing secret |

## Tech Stack

| Layer | Tech |
|---|---|
| AI / LLM | Groq — llama-3.3-70b-versatile |
| STT | Groq Whisper large-v3 |
| TTS | pyttsx3 (local, offline) |
| Backend | FastAPI + Uvicorn |
| Database | MongoDB Atlas (Motor async driver) |
| Auth | Google OAuth2 + GitHub OAuth + JWT |
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts |
| Desktop UI | tkinter (neumorphic design) |
