"""
Library service — curated library management.

Admin-managed global library. Not session-scoped.
Lives at storage/library/. Has its own FAISS index.
"""

import os
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from sqlmodel import select

from l88_backend.config import LIBRARY_STORAGE
from l88_backend.database import get_session
from l88_backend.models.document import Document
from l88_backend.ingestion.parser import parse_pdf
from l88_backend.ingestion.chunker import chunk_pages
from l88_backend.ingestion.embedder import embed_texts
from l88_backend.retrieval.vectorstore import VectorStore


def upload_library_doc(file: UploadFile, user_id: int) -> Document:
    """
    Upload a PDF to the curated library.

    Same ingestion pipeline as session docs, but:
    - Saved to storage/library/docs/
    - Added to shared library FAISS index
    - Document record: source="library", session_id=None
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only PDF files are accepted")

    doc_id = str(uuid.uuid4())
    filename = file.filename

    # Save file
    doc_dir = os.path.join(LIBRARY_STORAGE, "docs")
    os.makedirs(doc_dir, exist_ok=True)
    filepath = os.path.join(doc_dir, f"{doc_id}.pdf")

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    # Parse → chunk → embed
    pages = parse_pdf(filepath, filename)
    chunks = chunk_pages(pages)
    for chunk in chunks:
        chunk["doc_id"] = doc_id
        chunk["source"] = "library"

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts) if texts else None

    # Add to library FAISS index
    index_dir = os.path.join(LIBRARY_STORAGE, "index")
    store = VectorStore.load(index_dir)
    if embeddings is not None:
        store.add_chunks(chunks, embeddings)
    store.save(index_dir)

    # DB record
    doc = Document(
        id=doc_id,
        session_id=None,
        filename=filename,
        source="library",
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

    return doc


def delete_library_doc(doc_id: str):
    """Delete a library doc and rebuild the library FAISS index."""
    with get_session() as db:
        doc = db.get(Document, doc_id)
        if not doc or doc.source != "library":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Library document not found")
        db.delete(doc)
        db.commit()

    # Remove file
    filepath = os.path.join(LIBRARY_STORAGE, "docs", f"{doc_id}.pdf")
    if os.path.exists(filepath):
        os.remove(filepath)

    # Rebuild library index
    _rebuild_library_index()


def list_library_docs() -> list[Document]:
    """List all curated library documents."""
    with get_session() as db:
        docs = db.exec(
            select(Document).where(Document.source == "library")
        ).all()
    return list(docs)


def _rebuild_library_index():
    """Rebuild the entire library FAISS index from remaining docs."""
    index_dir = os.path.join(LIBRARY_STORAGE, "index")
    doc_dir = os.path.join(LIBRARY_STORAGE, "docs")

    with get_session() as db:
        docs = db.exec(
            select(Document).where(Document.source == "library")
        ).all()

    store = VectorStore()

    for doc in docs:
        filepath = os.path.join(doc_dir, f"{doc.id}.pdf")
        if not os.path.exists(filepath):
            continue

        pages = parse_pdf(filepath, doc.filename)
        chunks = chunk_pages(pages)
        for chunk in chunks:
            chunk["doc_id"] = doc.id
            chunk["source"] = "library"

        texts = [c["text"] for c in chunks]
        if texts:
            embeddings = embed_texts(texts)
            store.add_chunks(chunks, embeddings)

    store.save(index_dir)
