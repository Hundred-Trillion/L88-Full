"""
Chat service — orchestrates the agentic RAG graph.

Validates sources → resolves selected docs → runs graph → saves messages + citations.
"""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status

from l88_backend.database import get_session
from l88_backend.models.session import Session
from l88_backend.models.message import Message, Citation
from l88_backend.services.document_service import get_selected_doc_ids
from l88_backend.graph.graph import build_graph
from l88_backend.cache import cache_get, cache_set

# Build graph once at import time
_graph = build_graph()


def run_chat(session_id: str, query: str, user_id: int) -> dict:
    """
    Run the full chat flow.

    1. Load session (type, web_mode)
    2. Validate sources
    3. Load selected_doc_ids
    4. Run graph
    5. Save messages + citations
    6. Return response
    """
    # Load session
    with get_session() as db:
        session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    # NOTE: No source validation — if no docs and no web, the router
    # will route to "chat" and the LLM answers from trained knowledge.
    selected_doc_ids = get_selected_doc_ids(session_id)


    # Save user message
    user_msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    user_msg = Message(
        id=user_msg_id,
        session_id=session_id,
        user_id=user_id,
        role="user",
        content=query,
        created_at=now,
    )
    with get_session() as db:
        db.add(user_msg)
        db.commit()

    # Run graph
    initial_state = {
        "query": query,
        "session_id": session_id,
        "selected_doc_ids": selected_doc_ids,
        "web_mode": session.web_mode,
        "rewrite_count": 0,
        "last_verdict": "",
        "chunks": [],
        "found": False,
        "rewritten_queries": None,
    }

    # Check cache before running graph
    cached = cache_get(session_id, query)
    if cached:
        return cached

    result = _graph.invoke(initial_state)

    # Save assistant message
    asst_msg_id = str(uuid.uuid4())
    asst_msg = Message(
        id=asst_msg_id,
        session_id=session_id,
        user_id=user_id,
        role="assistant",
        content=result.get("answer", ""),
        reasoning=result.get("reasoning", ""),
        confident=result.get("confident", True),
        context_verdict=result.get("context_verdict", ""),
        missing_info=result.get("missing_info", ""),
        created_at=datetime.now(timezone.utc),
    )

    # Save citations
    citations = []
    for src in result.get("sources", []):
        citation = Citation(
            message_id=asst_msg_id,
            document_id=src.get("doc_id", ""),
            filename=src.get("filename", ""),
            page=src.get("page", 0),
            excerpt=src.get("excerpt", ""),
        )
        citations.append(citation)

    with get_session() as db:
        db.add(asst_msg)
        for c in citations:
            db.add(c)
        db.commit()

    # Return response
    response = {
        "message_id": asst_msg_id,
        "answer": result.get("answer", ""),
        "reasoning": result.get("reasoning", ""),
        "sources": result.get("sources", []),
        "confident": result.get("confident", True),
        "context_verdict": result.get("context_verdict", ""),
        "verdict": result.get("verdict", ""),
        "missing_info": result.get("missing_info", ""),
    }

    cache_set(session_id, query, response)
    return response
