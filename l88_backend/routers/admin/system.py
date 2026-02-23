"""
Admin system status router.

GET /admin/system/status — returns Ollama model status, FAISS index sizes,
                           disk usage, user list.
"""

import os
import shutil

import httpx
from fastapi import APIRouter, Depends
from sqlmodel import select

from l88_backend.services.auth_service import get_current_user, require_role
from l88_backend.database import get_session
from l88_backend.config import (
    STORAGE_DIR, SESSION_STORAGE, LIBRARY_STORAGE,
    LLM_MODEL, LLM_MODEL_FALLBACK,
)
from l88_backend.models.user import User

router = APIRouter(prefix="/admin/system", tags=["admin"])


def _get_dir_size(path: str) -> int:
    """Get total size of a directory in bytes."""
    total = 0
    if not os.path.exists(path):
        return 0
    for dirpath, _, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.isfile(fp):
                total += os.path.getsize(fp)
    return total


def _check_ollama() -> dict:
    """Check if Ollama is running and list available models."""
    try:
        resp = httpx.get("http://localhost:11434/api/tags", timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            models = [m["name"] for m in data.get("models", [])]
            return {
                "running": True,
                "models": models,
                "primary_available": any(LLM_MODEL in m for m in models),
                "fallback_available": any(LLM_MODEL_FALLBACK in m for m in models),
            }
    except Exception:
        pass
    return {
        "running": False,
        "models": [],
        "primary_available": False,
        "fallback_available": False,
    }


def _count_faiss_vectors(index_dir: str) -> int:
    """Count vectors in a FAISS index directory."""
    index_path = os.path.join(index_dir, "index.faiss")
    if not os.path.exists(index_path):
        return 0
    try:
        import faiss
        idx = faiss.read_index(index_path)
        return idx.ntotal
    except Exception:
        return -1


@router.get("/status", dependencies=[Depends(require_role("admin"))])
def system_status(user: User = Depends(get_current_user)):
    """Full system status: Ollama, FAISS indexes, disk usage, users."""

    # Users
    with get_session() as db:
        users = db.exec(select(User)).all()
        user_list = [
            {"username": u.username, "role": u.role, "active": u.active}
            for u in users
        ]

    # Disk usage
    storage_size = _get_dir_size(STORAGE_DIR)
    disk = shutil.disk_usage("/")

    # FAISS — library index
    library_vectors = _count_faiss_vectors(
        os.path.join(LIBRARY_STORAGE, "index")
    )

    # FAISS — session indexes
    session_indexes = {}
    sessions_dir = SESSION_STORAGE
    if os.path.exists(sessions_dir):
        for sid in os.listdir(sessions_dir):
            idx_dir = os.path.join(sessions_dir, sid, "index")
            if os.path.isdir(idx_dir):
                session_indexes[sid] = _count_faiss_vectors(idx_dir)

    return {
        "ollama": _check_ollama(),
        "faiss": {
            "library_vectors": library_vectors,
            "session_indexes": session_indexes,
        },
        "disk": {
            "storage_bytes": storage_size,
            "storage_mb": round(storage_size / (1024 * 1024), 2),
            "disk_free_gb": round(disk.free / (1024 ** 3), 2),
            "disk_total_gb": round(disk.total / (1024 ** 3), 2),
        },
        "users": user_list,
    }
