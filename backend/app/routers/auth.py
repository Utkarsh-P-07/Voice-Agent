from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.models import UserSignup, UserLogin, TokenResponse, UserProfileUpdate
from app.auth import hash_password, verify_password, create_token, get_current_user
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(body: UserSignup):
    db = get_db()
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    result = await db.users.insert_one({
        "email": body.email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "notification_prefs": {
            "push": True, "whatsapp": False,
            "sms": False, "email": False,
            "phone_number": None, "email_address": None,
        },
        "calendar_token": None,
    })
    user_id = str(result.inserted_id)
    token = create_token(user_id)
    return {"access_token": token, "user": {"id": user_id, "email": body.email, "name": body.name}}


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = str(user["_id"])
    token = create_token(user_id)
    return {
        "access_token": token,
        "user": {"id": user_id, "email": user["email"], "name": user["name"]},
    }


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "name": current_user["name"],
        "notification_prefs": current_user.get("notification_prefs", {}),
        "calendar_connected": current_user.get("calendar_token") is not None,
    }


@router.patch("/me")
async def update_profile(body: UserProfileUpdate, current_user=Depends(get_current_user)):
    db = get_db()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.users.update_one(
        {"_id": ObjectId(str(current_user["_id"]))},
        {"$set": updates},
    )
    return {"status": "updated", **updates}
