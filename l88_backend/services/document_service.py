"""
Document service — ingestion pipeline + FAISS storage.

Handles: validate PDF → save to disk → parse → chunk → embed → FAISS store → DB record.
Also handles delete: remove from FAISS + disk + DB.
"""

import os
import uuid
import json
import shutil
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from sqlmodel import select

from l88_backend.config import SESSION_STORAGE
from l88_backend.database import get_session
from l88_backend.models.document import Document
from l88_backend.ingestion.parser import parse_pdf
from l88_backend.ingestion.chunker import chunk_pages
from l88_backend.ingestion.embedder import embed_texts
from l88_backend.retrieval.vectorstore import VectorStore
from l88_backend.services.session_service import update_session_type
from l88_backend.cache import cache_invalidate_session
from l88_backend.retrieval.bm25store import BM25Store

def ingest_document(session_id: str, file: UploadFile, user_id: int) -> Document:
    """
    Full ingestion pipeline for a session document.

    1. Validate: PDF only
    2. Save to storage/sessions/{session_id}/docs/{doc_id}.pdf
    3. Parse with PyMuPDF
    4. Chunk with pysbd + RecursiveCharacterTextSplitter
    5. Embed with BGE-base
    6. Add to session FAISS index
    7. Save Document record
    8. Update session type (general → rag)
    """
    # Validate
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only PDF files are accepted")

    doc_id = str(uuid.uuid4())
    filename = file.filename

    # Save file to disk
    doc_dir = os.path.join(SESSION_STORAGE, session_id, "docs")
    os.makedirs(doc_dir, exist_ok=True)
    filepath = os.path.join(doc_dir, f"{doc_id}.pdf")

    with open(filepath, "wb") as f:
        content = file.file.read()
        f.write(content)

    # Parse
    pages = parse_pdf(filepath, filename)

    # Chunk
    chunks = chunk_pages(pages)

    # Add doc_id and source to chunk metadata
    for chunk in chunks:
        chunk["doc_id"] = doc_id
        chunk["source"] = "session"

    # Embed
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts) if texts else None

    # FAISS store
    index_dir = os.path.join(SESSION_STORAGE, session_id, "index")
    store = VectorStore.load(index_dir)
    if embeddings is not None:
        store.add_chunks(chunks, embeddings)
    store.save(index_dir)

    # BM25 store
    bm25_store = BM25Store.load(index_dir)
    bm25_store.add_chunks(chunks)
    bm25_store.save(index_dir)

    # DB record
    doc = Document(
        id=doc_id,
        session_id=session_id,
        filename=filename,
        source="session",
        uploaded_by=user_id,
        uploaded_at=datetime.now(timezone.utc),
        page_count=len(pages),
        chunk_count=len(chunks),
        selected=True,
    )
    with get_session() as db:
        db.add(doc)
        db.commit()
        db.refresh(doc)

    # Update session type
    update_session_type(session_id)

    # Invalidate cache — new doc changes what the session knows
    cache_invalidate_session(session_id)

    return doc


def delete_document(session_id: str, doc_id: str):
    """
    Delete a document: remove from DB, then rebuild the session FAISS index
    without the deleted document's chunks.
    """
    with get_session() as db:
        doc = db.get(Document, doc_id)
        if not doc or doc.session_id != session_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
        db.delete(doc)
        db.commit()

    # Remove PDF file
    filepath = os.path.join(SESSION_STORAGE, session_id, "docs", f"{doc_id}.pdf")
    if os.path.exists(filepath):
        os.remove(filepath)

    # Rebuild FAISS index without deleted doc
    _rebuild_session_index(session_id)

    # Update session type
    update_session_type(session_id)

    # Invalidate cache — deleted doc changes what the session knows
    cache_invalidate_session(session_id)


def toggle_document_selection(session_id: str, doc_id: str, selected: bool) -> Document:
    """Toggle the selected checkbox for a document."""
    with get_session() as db:
        doc = db.get(Document, doc_id)
        if not doc or doc.session_id != session_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
        doc.selected = selected
        db.add(doc)
        db.commit()
        db.refresh(doc)
    return doc


def list_session_documents(session_id: str) -> list[Document]:
    """List all documents for a session."""
    with get_session() as db:
        docs = db.exec(
            select(Document).where(
                Document.session_id == session_id,
                Document.source == "session",
            )
        ).all()
    return list(docs)


def get_selected_doc_ids(session_id: str) -> list[str]:
    """Get IDs of all selected documents in a session."""
    with get_session() as db:
        docs = db.exec(
            select(Document).where(
                Document.session_id == session_id,
                Document.source == "session",
                Document.selected == True,
            )
        ).all()
    return [d.id for d in docs]


def _rebuild_session_index(session_id: str):
    """Rebuild the FAISS index for a session from remaining docs on disk."""
    index_dir = os.path.join(SESSION_STORAGE, session_id, "index")
    doc_dir = os.path.join(SESSION_STORAGE, session_id, "docs")

    # Get remaining docs from DB
    with get_session() as db:
        docs = db.exec(
            select(Document).where(
                Document.session_id == session_id,
                Document.source == "session",
            )
        ).all()

    store = VectorStore()
    bm25_store = BM25Store()

    for doc in docs:
        filepath = os.path.join(doc_dir, f"{doc.id}.pdf")
        if not os.path.exists(filepath):
            continue

        pages = parse_pdf(filepath, doc.filename)
        chunks = chunk_pages(pages)
        for chunk in chunks:
            chunk["doc_id"] = doc.id
            chunk["source"] = "session"

        texts = [c["text"] for c in chunks]
        if texts:
            embeddings = embed_texts(texts)
            store.add_chunks(chunks, embeddings)
            bm25_store.add_chunks(chunks)

    store.save(index_dir)
    bm25_store.save(index_dir)