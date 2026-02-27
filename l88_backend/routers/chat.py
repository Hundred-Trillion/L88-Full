"""
Chat router — send messages and get history.

POST /sessions/{id}/chat — run agentic RAG graph.
GET  /sessions/{id}/messages — fetch chat history.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select

from l88_backend.services.auth_service import get_current_user, require_session_role
from l88_backend.services.chat_service import run_chat
from l88_backend.database import get_session
from l88_backend.models.user import User
from l88_backend.models.message import Message, Citation

router = APIRouter(prefix="/sessions/{session_id}", tags=["chat"])

_check_chat = require_session_role("chat")


class ChatRequest(BaseModel):
    query: str


@router.post("/chat")
def send_message(session_id: str, body: ChatRequest, user: User = Depends(get_current_user)):
    """Send a query and get the agentic RAG response."""
    _check_chat(user, session_id)
    return run_chat(session_id, body.query, user.id)


@router.get("/messages")
def get_messages(session_id: str, user: User = Depends(get_current_user)):
    """Get all messages for a session, with citations."""
    with get_session() as db:
        messages = db.exec(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at)
        ).all()

        result = []
        for msg in messages:
            msg_dict = {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "reasoning": msg.reasoning,
                "confident": msg.confident,
                "context_verdict": msg.context_verdict,
                "missing_info": msg.missing_info,
                "created_at": msg.created_at.isoformat(),
            }
            if msg.role == "assistant":
                citations = db.exec(
                    select(Citation).where(Citation.message_id == msg.id)
                ).all()
                msg_dict["sources"] = [
                    {
                        "filename": c.filename,
                        "page": c.page,
                        "source": c.source,
                        "excerpt": c.excerpt,
                    }
                    for c in citations
                ]
            result.append(msg_dict)

    return result
