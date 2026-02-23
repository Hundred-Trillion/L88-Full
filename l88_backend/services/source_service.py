"""
Source service — resolve which FAISS indexes to query at query time.

Determines source indexes based on web_mode + selected docs.
"""

import os

from l88_backend.config import SESSION_STORAGE, LIBRARY_STORAGE


def resolve_sources(session_id: str, selected_doc_ids: list[str], web_mode: bool) -> list[dict]:
    """
    Determine which FAISS indexes to query.

    Priority: session docs → library → training data (implicit).

    Args:
        session_id: Current session ID.
        selected_doc_ids: IDs of selected documents.
        web_mode: Whether web/library mode is enabled.

    Returns:
        List of source dicts with type and index_path.
    """
    sources = []

    # Session docs — always when selected
    if selected_doc_ids:
        sources.append({
            "type": "session",
            "doc_ids": selected_doc_ids,
            "index_path": os.path.join(SESSION_STORAGE, session_id, "index"),
        })

    if web_mode:
        # Curated library
        library_index = os.path.join(LIBRARY_STORAGE, "index")
        if os.path.exists(os.path.join(library_index, "index.faiss")):
            sources.append({
                "type": "library",
                "index_path": library_index,
            })
        # Training data — implicit when web_mode=ON
        # Generator prompt is not restricted to chunks only

    return sources
