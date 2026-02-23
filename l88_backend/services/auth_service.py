"""
Auth service — JWT token management, password verification, role enforcement.

Provides FastAPI dependencies for protecting endpoints by role.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlmodel import select

from l88_backend.config import (
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES, ROLE_HIERARCHY,
)
from l88_backend.database import get_session
from l88_backend.models.user import User
from l88_backend.models.member import SessionMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Password Helpers ─────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT Helpers ──────────────────────────────────────────────────────

def create_token(user_id: int, username: str) -> str:
    """Create a JWT with user_id and username in the payload."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ── User Lookup ──────────────────────────────────────────────────────

def authenticate_user(username: str, password: str) -> User:
    """Validate credentials. Returns User or raises 401."""
    with get_session() as db:
        user = db.exec(
            select(User).where(User.username == username)
        ).first()
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    if not verify_password(password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return user


# ── FastAPI Dependencies ─────────────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Resolve the current user from the JWT bearer token."""
    payload = decode_token(token)
    user_id = int(payload["sub"])
    with get_session() as db:
        user = db.get(User, user_id)
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


def get_effective_role(user_id: int, session_id: Optional[str] = None) -> str:
    """
    Resolve the effective role for a user.

    SessionMember.role overrides User.role for that session.
    """
    if session_id:
        with get_session() as db:
            member = db.exec(
                select(SessionMember).where(
                    SessionMember.user_id == user_id,
                    SessionMember.session_id == session_id,
                )
            ).first()
            if member:
                return member.role
    with get_session() as db:
        user = db.get(User, user_id)
    return user.role if user else "read_only"


def require_role(minimum: str, session_id: Optional[str] = None):
    """
    FastAPI dependency factory.

    Usage:
        @router.post("/...", dependencies=[Depends(require_role("admin"))])
        def endpoint(user=Depends(get_current_user)):
            ...

    Or per-endpoint:
        def endpoint(user=Depends(get_current_user)):
            require_role("chat", session_id)(user)
    """
    min_level = ROLE_HIERARCHY.get(minimum, 0)

    def checker(user: User = Depends(get_current_user)):
        effective = get_effective_role(user.id, session_id)
        if ROLE_HIERARCHY.get(effective, 0) < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires '{minimum}' role, you have '{effective}'",
            )
        return user

    return checker


def require_session_role(minimum: str):
    """
    Returns a callable that checks role within a specific session.

    Use inside an endpoint where session_id is a path param:
        check_role = require_session_role("chat")
        check_role(user, session_id)
    """
    min_level = ROLE_HIERARCHY.get(minimum, 0)

    def checker(user: User, session_id: str):
        effective = get_effective_role(user.id, session_id)
        if ROLE_HIERARCHY.get(effective, 0) < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires '{minimum}' role in this session, you have '{effective}'",
            )

    return checker
