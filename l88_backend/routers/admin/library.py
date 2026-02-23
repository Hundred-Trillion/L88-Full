"""
Admin library router — manage curated library documents.

GET    /admin/library          — list all library docs
POST   /admin/library          — upload PDF (admin only)
DELETE /admin/library/{doc_id} — delete doc + rebuild index
"""

from fastapi import APIRouter, Depends, UploadFile, File

from l88_backend.services.auth_service import get_current_user, require_role
from l88_backend.services.library_service import (
    upload_library_doc, delete_library_doc, list_library_docs,
)
from l88_backend.models.user import User

router = APIRouter(prefix="/admin/library", tags=["admin"])


@router.get("", dependencies=[Depends(require_role("admin"))])
def list_library(user: User = Depends(get_current_user)):
    """List all curated library documents."""
    return list_library_docs()


@router.post("", dependencies=[Depends(require_role("admin"))])
def upload_to_library(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload a PDF to the curated library."""
    return upload_library_doc(file, user.id)


@router.delete("/{doc_id}", dependencies=[Depends(require_role("admin"))])
def remove_from_library(doc_id: str, user: User = Depends(get_current_user)):
    """Delete a library document and rebuild the index."""
    delete_library_doc(doc_id)
    return {"detail": "Library document deleted"}
