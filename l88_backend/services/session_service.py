"""
Session service — create, list, delete sessions with automatic type transitions.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import select

from l88_backend.database import get_session
from l88_backend.models.session import Session
from l88_backend.models.document import Document
from l88_backend.models.member import SessionMember
from l88_backend.models.scratchpad import ScratchPad
from l88_backend.models.message import Message, Citation


def create_session(name: str, web_mode: bool, user_id: int) -> Session:
    """
    Create a new session.

    Also creates:
      - An empty ScratchPad
      - A SessionMember entry making the creator an admin
    """
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    session = Session(
        id=session_id,
        name=name,
        session_type="general",
        created_by=user_id,
        created_at=now,
        web_mode=web_mode,
    )
    scratch = ScratchPad(
        session_id=session_id,
        content="",
        updated_at=now,
        updated_by=user_id,
    )
    member = SessionMember(
        session_id=session_id,
        user_id=user_id,
        role="admin",
    )

    with get_session() as db:
        db.add(session)
        db.add(scratch)
        db.add(member)
        db.commit()
        db.refresh(session)

    return session


def list_sessions(user_id: Optional[int] = None) -> list[Session]:
    """List all sessions, optionally filtered by user membership."""
    with get_session() as db:
        if user_id is not None:
            member_ids = db.exec(
                select(SessionMember.session_id).where(
                    SessionMember.user_id == user_id
                )
            ).all()
            sessions = db.exec(
                select(Session).where(Session.id.in_(member_ids))
            ).all()
        else:
            sessions = db.exec(select(Session)).all()
    return list(sessions)


def get_session_by_id(session_id: str) -> Session:
    """Get a session or raise 404."""
    with get_session() as db:
        session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return session


def delete_session(session_id: str):
    """Delete a session and all related records."""
    with get_session() as db:
        session = db.get(Session, session_id)
        if not session:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

        # Delete related records
        for model in [Citation, Message, Document, SessionMember, ScratchPad]:
            if model == Citation:
                # Citations link via message_id, need messages first
                msg_ids = db.exec(
                    select(Message.id).where(Message.session_id == session_id)
                ).all()
                if msg_ids:
                    citations = db.exec(
                        select(Citation).where(Citation.message_id.in_(msg_ids))
                    ).all()
                    for c in citations:
                        db.delete(c)
            else:
                field = "session_id"
                rows = db.exec(
                    select(model).where(getattr(model, field) == session_id)
                ).all()
                for row in rows:
                    db.delete(row)

        db.delete(session)
        db.commit()


def update_session_type(session_id: str):
    """
    Recalculate session type based on document count.

    Called after document upload or delete.
    """
    with get_session() as db:
        session = db.get(Session, session_id)
        if not session:
            return
        doc_count = len(db.exec(
            select(Document).where(
                Document.session_id == session_id,
                Document.source == "session",
            )
        ).all())
        new_type = "rag" if doc_count > 0 else "general"
        if session.session_type != new_type:
            session.session_type = new_type
            db.add(session)
            db.commit()


def toggle_web_mode(session_id: str, web_mode: bool) -> Session:
    """Toggle the web_mode flag on a session."""
    with get_session() as db:
        session = db.get(Session, session_id)
        if not session:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
        session.web_mode = web_mode
        db.add(session)
        db.commit()
        db.refresh(session)
    return session
