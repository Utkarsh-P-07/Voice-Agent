from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# --- Auth ---
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# --- Todos ---
class TodoCreate(BaseModel):
    title: str
    priority: str = "medium"
    due_at: Optional[datetime] = None
    description: Optional[str] = None   # stored but not required
    category: Optional[str] = "Personal"

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Title cannot be empty")
        if len(v) > 500:
            raise ValueError("Title too long (max 500 chars)")
        return v.strip()

    @field_validator("priority")
    @classmethod
    def valid_priority(cls, v):
        if v not in ("low", "medium", "high"):
            raise ValueError("Priority must be low, medium, or high")
        return v


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[str] = None
    done: Optional[bool] = None
    due_at: Optional[datetime] = None
    description: Optional[str] = None
    category: Optional[str] = None


# --- Memory ---
class MemoryCreate(BaseModel):
    content: str
    category: str = "general"


# --- Push Subscription ---
class PushSubscriptionCreate(BaseModel):
    subscription: dict

    @field_validator("subscription")
    @classmethod
    def has_endpoint(cls, v):
        if not v.get("endpoint"):
            raise ValueError("Subscription must have an endpoint")
        return v


# --- Notification Preferences ---
class NotificationPrefs(BaseModel):
    push: bool = True
    whatsapp: bool = False
    sms: bool = False
    email: bool = False
    phone_number: Optional[str] = None
    email_address: Optional[str] = None


# --- User profile update ---
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip() if v else v


# --- Agent ---
class AgentTextRequest(BaseModel):
    text: str
