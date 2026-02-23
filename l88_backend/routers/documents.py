"""
Documents router — upload, list, select, delete session documents.
"""

from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel

from l88_backend.services.auth_service import get_current_user, require_session_role
from l88_backend.services.document_service import (
    ingest_document, delete_document,
    toggle_document_selection, list_session_documents,
)
from l88_backend.models.user import User

router = APIRouter(prefix="/sessions/{session_id}", tags=["documents"])

_check_admin = require_session_role("admin")
_check_chat = require_session_role("chat")


class SelectRequest(BaseModel):
    selected: bool


@router.get("/documents")
def list_documents(session_id: str, user: User = Depends(get_current_user)):
    """List all documents in a session."""
    return list_session_documents(session_id)


@router.post("/documents")
def upload_document(
    session_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload a PDF document. Requires admin role in session."""
    _check_admin(user, session_id)
    return ingest_document(session_id, file, user.id)


@router.delete("/documents/{doc_id}")
def remove_document(session_id: str, doc_id: str, user: User = Depends(get_current_user)):
    """Delete a document. Requires admin role."""
    _check_admin(user, session_id)
    delete_document(session_id, doc_id)
    return {"detail": "Document deleted"}


@router.patch("/documents/{doc_id}/select")
def select_document(
    session_id: str,
    doc_id: str,
    body: SelectRequest,
    user: User = Depends(get_current_user),
):
    """Toggle document selection. Requires chat role minimum."""
    _check_chat(user, session_id)
    return toggle_document_selection(session_id, doc_id, body.selected)
