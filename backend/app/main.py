from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_db, connect_db
from app.routers import agent, auth, calendar, memory, notifications, todos
from app.services.reminders import check_and_send_reminders

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    scheduler.add_job(check_and_send_reminders, "interval", seconds=60, id="reminders")
    scheduler.start()
    print("✅ Scheduler started")
    yield
    scheduler.shutdown()
    await close_db()


app = FastAPI(title="Voice Todo Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(todos.router)
app.include_router(memory.router)
app.include_router(agent.router)
app.include_router(notifications.router)
app.include_router(calendar.router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Voice Todo Agent API"}
