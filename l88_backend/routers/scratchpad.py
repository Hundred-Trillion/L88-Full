"""
Scratch Pad router — per-session notepad.

GET   — get content
PATCH — update (admin only)
GET   /download — download as .txt
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlmodel import select

from l88_backend.services.auth_service import get_current_user, require_session_role
from l88_backend.database import get_session
from l88_backend.models.user import User
from l88_backend.models.scratchpad import ScratchPad

router = APIRouter(prefix="/sessions/{session_id}/scratchpad", tags=["scratchpad"])

_check_admin = require_session_role("admin")


class ScratchPadUpdate(BaseModel):
    content: str


def _get_pad(session_id: str) -> ScratchPad:
    """Fetch scratchpad for a session or raise 404."""
    with get_session() as db:
        pad = db.exec(
            select(ScratchPad).where(ScratchPad.session_id == session_id)
        ).first()
    if not pad:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scratch pad not found")
    return pad


@router.get("")
def get_scratchpad(session_id: str, user: User = Depends(get_current_user)):
    """Get the scratch pad content. Any authenticated user can read."""
    return _get_pad(session_id)


@router.patch("")
def update_scratchpad(
    session_id: str,
    body: ScratchPadUpdate,
    user: User = Depends(get_current_user),
):
    """Update the scratch pad. Admin only."""
    _check_admin(user, session_id)

    with get_session() as db:
        pad = db.exec(
            select(ScratchPad).where(ScratchPad.session_id == session_id)
        ).first()
        if not pad:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Scratch pad not found")
        pad.content = body.content
        pad.updated_at = datetime.now(timezone.utc)
        pad.updated_by = user.id
        db.add(pad)
        db.commit()
        db.refresh(pad)

    return pad


@router.get("/download")
def download_scratchpad(session_id: str, user: User = Depends(get_current_user)):
    """Download the scratch pad as a .txt file."""
    pad = _get_pad(session_id)
    return PlainTextResponse(
        content=pad.content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=scratchpad_{session_id[:8]}.txt"},
    )
