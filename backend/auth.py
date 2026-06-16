"""Unified authentication: email/password using opaque session tokens."""
import uuid
import secrets
import bcrypt
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

import config
from db import db

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ----------------------------- helpers -----------------------------
def now() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def new_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"


async def create_session(user_id: str, provider: str) -> str:
    token = secrets.token_urlsafe(40)
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "provider": provider,
        "created_at": now().isoformat(),
        "expires_at": (now() + timedelta(days=config.SESSION_TTL_DAYS)).isoformat(),
    })
    return token


def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=config.SESSION_TTL_DAYS * 24 * 3600,
        path="/",
    )


def public_user(user: dict) -> dict:
    user = dict(user)
    user.pop("_id", None)
    user.pop("password_hash", None)
    return user


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Brak autoryzacji")

    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Nieprawid\u0142owa sesja")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now():
        raise HTTPException(status_code=401, detail="Sesja wygas\u0142a")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="U\u017cytkownik nie istnieje")
    return public_user(user)


# ----------------------------- schemas -----------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


# ----------------------------- endpoints -----------------------------
@router.post("/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Konto z tym adresem email ju\u017c istnieje")
    user_id = new_user_id()
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "auth_provider": "password",
        "role": "user",
        "picture": "",
        "created_at": now().isoformat(),
    }
    await db.users.insert_one(doc)
    token = await create_session(user_id, "password")
    set_session_cookie(response, token)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": public_user(user), "session_token": token}


@router.post("/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Nieprawid\u0142owy email lub has\u0142o")
    token = await create_session(user["user_id"], "password")
    set_session_cookie(response, token)
    return {"user": public_user(user), "session_token": token}




@router.get("/me")
async def me(current=Depends(get_current_user)):
    return current


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"success": True}


# ----------------------------- startup helpers -----------------------------
async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    for coll in ("companies", "clients", "invoices", "expenses", "templates", "audit_events"):
        await db[coll].create_index("user_id")


async def seed_admin():
    existing = await db.users.find_one({"email": config.ADMIN_EMAIL.lower()})
    if existing is None:
        user_id = new_user_id()
        await db.users.insert_one({
            "user_id": user_id,
            "email": config.ADMIN_EMAIL.lower(),
            "name": "Administrator",
            "password_hash": hash_password(config.ADMIN_PASSWORD),
            "auth_provider": "password",
            "role": "admin",
            "picture": "",
            "created_at": now().isoformat(),
        })
        await seed_default_data(user_id)
    elif not verify_password(config.ADMIN_PASSWORD, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": config.ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(config.ADMIN_PASSWORD)}},
        )


# Placeholder; real demo-data seeding is provided by seed module (Phase 2).
async def seed_default_data(user_id: str):
    try:
        from seed_data import seed_for_user
        await seed_for_user(user_id)
    except Exception:
        # During POC the seed module may not exist yet; ignore.
        pass
