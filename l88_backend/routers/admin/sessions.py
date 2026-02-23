"""
Admin sessions router — oversight view of all sessions.

GET /admin/sessions      — list all sessions
GET /admin/sessions/{id} — get session details
"""

from fastapi import APIRouter, Depends

from l88_backend.services.auth_service import get_current_user, require_role
from l88_backend.services.session_service import list_sessions, get_session_by_id
from l88_backend.models.user import User

router = APIRouter(prefix="/admin/sessions", tags=["admin"])


@router.get("", dependencies=[Depends(require_role("admin"))])
def list_all_sessions(user: User = Depends(get_current_user)):
    """List ALL sessions (not just the user's). Admin oversight."""
    return list_sessions(user_id=None)


@router.get("/{session_id}", dependencies=[Depends(require_role("admin"))])
def get_session_detail(session_id: str, user: User = Depends(get_current_user)):
    """Get details of any session. Admin oversight."""
    return get_session_by_id(session_id)
