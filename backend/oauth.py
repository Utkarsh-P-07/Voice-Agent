# -*- coding: utf-8 -*-
"""
OAuth2 routes — Google & GitHub.

Flow:
  1. Frontend clicks button → window.location = /auth/google (or /auth/github)
  2. Backend redirects user to provider's consent screen
  3. Provider redirects back to /auth/google/callback (or /auth/github/callback)
  4. Backend exchanges code for token, fetches user profile
  5. Backend creates a signed JWT, redirects to frontend with ?token=...
  6. Frontend reads token from URL, stores in localStorage, marks user as logged in

Setup (add to .env):
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  GITHUB_CLIENT_ID=...
  GITHUB_CLIENT_SECRET=...
  JWT_SECRET=any-random-string-at-least-32-chars
  FRONTEND_URL=http://localhost:5173
"""
import json
import os
import time
from pathlib import Path

import httpx
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from starlette.config import Config

# ── Config ────────────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID     = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
JWT_SECRET           = os.getenv("JWT_SECRET", "change-me-in-production-32chars!!")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL          = os.getenv("BACKEND_URL",  "http://localhost:8000")

# ── JWT helpers ───────────────────────────────────────────────────────────────
_signer = URLSafeTimedSerializer(JWT_SECRET)

def create_token(payload: dict) -> str:
    return _signer.dumps(payload)

def verify_token(token: str, max_age: int = 60 * 60 * 24 * 7) -> dict | None:
    try:
        return _signer.loads(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None

# ── OAuth client setup ────────────────────────────────────────────────────────
# authlib needs a starlette Config object for secrets
_config = Config(environ={
    "GOOGLE_CLIENT_ID":     GOOGLE_CLIENT_ID,
    "GOOGLE_CLIENT_SECRET": GOOGLE_CLIENT_SECRET,
    "GITHUB_CLIENT_ID":     GITHUB_CLIENT_ID,
    "GITHUB_CLIENT_SECRET": GITHUB_CLIENT_SECRET,
})

oauth = OAuth(_config)

if GOOGLE_CLIENT_ID:
    oauth.register(
        name="google",
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if GITHUB_CLIENT_ID:
    oauth.register(
        name="github",
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "read:user user:email"},
    )

# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/auth", tags=["auth"])

def _redirect_with_token(user: dict) -> RedirectResponse:
    """Create a signed token and redirect to the frontend callback page."""
    token = create_token(user)
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}")

def _redirect_with_error(msg: str) -> RedirectResponse:
    import urllib.parse
    return RedirectResponse(f"{FRONTEND_URL}/signin?error={urllib.parse.quote(msg)}")

# ── Google ────────────────────────────────────────────────────────────────────
@router.get("/google")
async def google_login(request: Request):
    if not GOOGLE_CLIENT_ID:
        return _redirect_with_error("Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env")
    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request):
    if not GOOGLE_CLIENT_ID:
        return _redirect_with_error("Google OAuth not configured.")
    try:
        token = await oauth.google.authorize_access_token(request)
        userinfo = token.get("userinfo") or {}
        user = {
            "name":     userinfo.get("name", "Google User"),
            "email":    userinfo.get("email", ""),
            "avatar":   (userinfo.get("name") or "G")[0].upper(),
            "provider": "google",
            "picture":  userinfo.get("picture", ""),
        }
        return _redirect_with_token(user)
    except Exception as e:
        return _redirect_with_error(f"Google login failed: {str(e)[:120]}")

# ── GitHub ────────────────────────────────────────────────────────────────────
@router.get("/github")
async def github_login(request: Request):
    if not GITHUB_CLIENT_ID:
        return _redirect_with_error("GitHub OAuth not configured. Add GITHUB_CLIENT_ID to .env")
    redirect_uri = f"{BACKEND_URL}/auth/github/callback"
    return await oauth.github.authorize_redirect(request, redirect_uri)

@router.get("/github/callback")
async def github_callback(request: Request):
    if not GITHUB_CLIENT_ID:
        return _redirect_with_error("GitHub OAuth not configured.")
    try:
        token = await oauth.github.authorize_access_token(request)
        # Fetch user profile
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token['access_token']}",
                       "Accept": "application/vnd.github+json"}
            resp = await client.get("https://api.github.com/user", headers=headers)
            resp.raise_for_status()
            gh_user = resp.json()

            # GitHub may hide email — fetch separately
            email = gh_user.get("email") or ""
            if not email:
                er = await client.get("https://api.github.com/user/emails", headers=headers)
                if er.status_code == 200:
                    emails = er.json()
                    primary = next((e["email"] for e in emails if e.get("primary")), None)
                    email = primary or (emails[0]["email"] if emails else "")

        name = gh_user.get("name") or gh_user.get("login") or "GitHub User"
        user = {
            "name":     name,
            "email":    email,
            "avatar":   name[0].upper(),
            "provider": "github",
            "picture":  gh_user.get("avatar_url", ""),
        }
        return _redirect_with_token(user)
    except Exception as e:
        return _redirect_with_error(f"GitHub login failed: {str(e)[:120]}")

# ── Token verify endpoint (frontend polls this) ───────────────────────────────
@router.get("/verify")
def verify(token: str):
    payload = verify_token(token)
    if not payload:
        from fastapi import HTTPException
        raise HTTPException(401, "Invalid or expired token")
    return payload
