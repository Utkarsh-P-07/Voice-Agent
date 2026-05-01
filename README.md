# VoiceTodo Agent — Full Web App

Voice-powered AI todo assistant with cross-device reminders.

## Stack
- Frontend: React + Tailwind + Vite (PWA)
- Backend: FastAPI + Motor (async MongoDB)
- Database: MongoDB Atlas
- AI: Groq (Whisper STT + LLaMA 3.3-70b agent)
- Reminders: PWA Push + WhatsApp/SMS (Twilio) + Email (Resend)
- Calendar: Google Calendar API

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in all keys
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Generate VAPID keys (for push notifications)
```bash
python -c "
from pywebpush import Vapid
v = Vapid()
v.generate_keys()
print('Public:', v.public_key)
print('Private:', v.private_key)
"
```
Paste both into your `.env`.

## Environment Variables
See `backend/.env.example` for all required variables.

## Features
- Sign up / login with JWT auth
- Voice input (hold mic button) → Whisper STT → LLaMA agent → spoken reply
- Full todo CRUD by voice or manually
- Due dates + priority
- Per-user long-term memory
- Conversation history persists across sessions
- Push notifications on all devices (Android, desktop, iOS via PWA)
- WhatsApp + SMS + email reminders via Twilio/Resend
- Google Calendar sync
- Installable as PWA (add to home screen)
