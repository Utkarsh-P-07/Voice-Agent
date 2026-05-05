"""
One-shot DB cleanup script.

What it does:
  1. Copies any documents from `voicetodo` that don't already exist in `voiceagent`
     (for todos, memories, conversations, users collections).
  2. Drops the `voicetodo` database.

Run once from the project root:
    python scripts/cleanup_db.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Load .env from project root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI  = os.getenv("MONGODB_URI", "")
KEEP_DB    = os.getenv("MONGODB_DB", "voiceagent")   # the one we keep
DROP_DB    = "voicetodo"                              # the stale duplicate

COLLECTIONS = ["todos", "memories", "conversations", "users", "push_subscriptions"]


async def main():
    if not MONGO_URI:
        print("❌  MONGODB_URI not set in .env — aborting.")
        sys.exit(1)

    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=8000)

    # Confirm both databases exist
    db_names = await client.list_database_names()
    print(f"Databases found: {db_names}")

    if DROP_DB not in db_names:
        print(f"✅  '{DROP_DB}' doesn't exist — nothing to clean up.")
        client.close()
        return

    keep = client[KEEP_DB]
    drop = client[DROP_DB]

    total_migrated = 0

    for col_name in COLLECTIONS:
        src_col  = drop[col_name]
        dst_col  = keep[col_name]
        src_docs = await src_col.find({}).to_list(length=None)

        if not src_docs:
            print(f"  [{col_name}] empty in '{DROP_DB}' — skipping.")
            continue

        migrated = 0
        for doc in src_docs:
            # Determine a unique key to avoid duplicates
            if col_name == "todos":
                key = {"id": doc.get("id")}
            elif col_name == "memories":
                key = {"user_id": doc.get("user_id"), "content": doc.get("content")}
            elif col_name in ("conversations", "users"):
                key = {"user_id": doc.get("user_id") or doc.get("email")}
            else:
                key = {"_id": doc["_id"]}

            exists = await dst_col.find_one(key)
            if not exists:
                doc.pop("_id", None)   # let MongoDB assign a new _id
                await dst_col.insert_one(doc)
                migrated += 1

        print(f"  [{col_name}] migrated {migrated}/{len(src_docs)} docs → '{KEEP_DB}'")
        total_migrated += migrated

    # Drop the stale database
    await client.drop_database(DROP_DB)
    print(f"\n✅  Dropped '{DROP_DB}' database.")
    print(f"✅  Total documents migrated: {total_migrated}")
    print(f"✅  '{KEEP_DB}' is now the single source of truth.")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
