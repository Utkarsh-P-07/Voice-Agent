from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client.voicetodo
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.todos.create_index("user_id")
    await db.todos.create_index([("user_id", 1), ("due_at", 1)])
    await db.todos.create_index([("user_id", 1), ("done", 1)])
    await db.todos.create_index([("done", 1), ("reminder_sent", 1), ("due_at", 1)])
    await db.memories.create_index("user_id")
    await db.conversations.create_index("user_id", unique=True)
    await db.push_subscriptions.create_index("user_id")
    print("✅ Connected to MongoDB")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
