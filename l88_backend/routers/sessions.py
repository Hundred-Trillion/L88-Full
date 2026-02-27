"""
Sessions router — CRUD + web-mode toggle.

All authenticated users can list/create sessions.
Session admin required for delete.
Chat+ required for web-mode toggle.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from l88_backend.services.auth_service import get_current_user, require_session_role
from l88_backend.services.session_service import (
    create_session, list_sessions, get_session_by_id,
    delete_session, toggle_web_mode, rename_session,
)
from l88_backend.models.user import User

router = APIRouter(prefix="/sessions", tags=["sessions"])

_check_chat = require_session_role("chat")
_check_admin = require_session_role("admin")


class CreateSessionRequest(BaseModel):
    name: str
    web_mode: bool = False


class WebModeRequest(BaseModel):
    web_mode: bool


class RenameSessionRequest(BaseModel):
    name: str


@router.get("")
def list_all_sessions(user: User = Depends(get_current_user)):
    """List sessions the current user belongs to."""
    return list_sessions(user.id)


@router.post("")
def create_new_session(body: CreateSessionRequest, user: User = Depends(get_current_user)):
    """Create a session. Creator becomes session admin."""
    return create_session(body.name, body.web_mode, user.id)


@router.get("/{session_id}")
def get_session(session_id: str, user: User = Depends(get_current_user)):
    """Get a session by ID."""
    return get_session_by_id(session_id)


@router.delete("/{session_id}")
def remove_session(session_id: str, user: User = Depends(get_current_user)):
    """Delete a session. Requires admin role in that session."""
    _check_admin(user, session_id)
    delete_session(session_id)
    return {"detail": "Session deleted"}


@router.patch("/{session_id}/web-mode")
def set_web_mode(session_id: str, body: WebModeRequest, user: User = Depends(get_current_user)):
    """Toggle web mode. Requires chat role minimum."""
    _check_chat(user, session_id)
    return toggle_web_mode(session_id, body.web_mode)


@router.patch("/{session_id}/rename")
def rename_current_session(session_id: str, body: RenameSessionRequest, user: User = Depends(get_current_user)):
    """Rename a session. Requires admin role in that session."""
    _check_admin(user, session_id)
    return rename_session(session_id, body.name)
