# VoiceTodo — Frontend

React PWA frontend for the VoiceTodo Agent.

## Stack
- React 18 + Vite
- Tailwind CSS v4
- React Router v6
- Axios
- Web Speech API (TTS)
- PWA Service Worker (push notifications)

## Setup

```bash
npm install
npm run dev
```

Runs on http://localhost:5173 (or next available port).

## Structure

```
src/
├── api.js                  # Axios instance with JWT interceptor
├── main.jsx                # App entry, routing, service worker registration
├── index.css               # Tailwind import
├── context/
│   └── AuthContext.jsx     # Auth state (login, signup, logout)
├── hooks/
│   └── useVoiceAgent.js    # Mic recording → Whisper → agent → TTS
├── components/
│   ├── VoiceButton.jsx     # Hold-to-speak button with status states
│   ├── TodoList.jsx        # Todo list with filter tabs
│   └── AddTodoForm.jsx     # Manual todo creation form
└── pages/
    ├── Login.jsx
    ├── Signup.jsx
    ├── Dashboard.jsx       # Main page: voice + todo list
    └── Settings.jsx        # Push notifications, reminders, Google Calendar
```
