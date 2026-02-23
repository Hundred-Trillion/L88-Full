"""
Members router — manage session members.

All operations require admin role in the session.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from l88_backend.services.auth_service import get_current_user, require_session_role
from l88_backend.database import get_session
from l88_backend.models.user import User
from l88_backend.models.member import SessionMember

router = APIRouter(prefix="/sessions/{session_id}/members", tags=["members"])

_check_admin = require_session_role("admin")


class AddMemberRequest(BaseModel):
    username: str
    role: str       # "admin" | "chat" | "read_only"


@router.get("")
def list_members(session_id: str, user: User = Depends(get_current_user)):
    """List all members of a session with their roles."""
    with get_session() as db:
        members = db.exec(
            select(SessionMember).where(SessionMember.session_id == session_id)
        ).all()
        result = []
        for m in members:
            u = db.get(User, m.user_id)
            result.append({
                "user_id": m.user_id,
                "username": u.username if u else "unknown",
                "display_name": u.display_name if u else "Unknown",
                "role": m.role,
            })
    return result


@router.post("")
def add_member(session_id: str, body: AddMemberRequest, user: User = Depends(get_current_user)):
    """Add a member to the session. Requires admin role."""
    _check_admin(user, session_id)

    if body.role not in ("admin", "chat", "read_only"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid role")

    # Look up user by username
    with get_session() as db:
        target = db.exec(
            select(User).where(User.username == body.username)
        ).first()
        if not target:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"User '{body.username}' not found")

        # Check if already a member
        existing = db.exec(
            select(SessionMember).where(
                SessionMember.session_id == session_id,
                SessionMember.user_id == target.id,
            )
        ).first()
        if existing:
            existing.role = body.role
            db.add(existing)
        else:
            member = SessionMember(
                session_id=session_id,
                user_id=target.id,
                role=body.role,
            )
            db.add(member)
        db.commit()

    return {"detail": f"User '{body.username}' added with role '{body.role}'"}


@router.delete("/{user_id}")
def remove_member(session_id: str, user_id: int, user: User = Depends(get_current_user)):
    """Remove a member from the session. Requires admin role."""
    _check_admin(user, session_id)

    with get_session() as db:
        member = db.exec(
            select(SessionMember).where(
                SessionMember.session_id == session_id,
                SessionMember.user_id == user_id,
            )
        ).first()
        if not member:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
        db.delete(member)
        db.commit()

    return {"detail": "Member removed"}
