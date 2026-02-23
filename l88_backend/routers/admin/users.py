"""
Admin users router — view hardcoded users.

GET /admin/users — list all users (no passwords).
"""

from fastapi import APIRouter, Depends
from sqlmodel import select

from l88_backend.services.auth_service import get_current_user, require_role
from l88_backend.database import get_session
from l88_backend.models.user import User

router = APIRouter(prefix="/admin/users", tags=["admin"])


@router.get("", dependencies=[Depends(require_role("admin"))])
def list_users(user: User = Depends(get_current_user)):
    """List all users (admin only). Passwords excluded."""
    with get_session() as db:
        users = db.exec(select(User)).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "display_name": u.display_name,
            "active": u.active,
        }
        for u in users
    ]
