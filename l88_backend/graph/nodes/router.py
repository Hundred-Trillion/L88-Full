"""
Router node — pure logic, no LLM.

Determines the route based on selected_doc_ids and web_mode:
  summarize intent + docs selected  → "summarize"
  docs selected                     → "rag"
  0 docs + web ON                   → "chat"
  0 docs + web OFF                  → "chat"  (LLM answers from trained knowledge)
"""

from l88_backend.graph.state import L88State

_SUMMARIZE_KEYWORDS = {
    "summarize", "summary", "summarise", "overview",
    "tldr", "tl;dr", "tl-dr", "brief", "outline", "recap",
    "summerize", "summerise"
}

def router_node(state: L88State) -> dict:
    """Classify the request route without calling the LLM."""
    has_docs = bool(state.get("selected_doc_ids"))
    query_lower = state["query"].lower()

    is_summarize = any(kw in query_lower for kw in _SUMMARIZE_KEYWORDS)
    web_mode = state.get("web_mode", False)

    # ── Logic ──────────────────────────────────────────────
    # WEB MODE OVERRIDE: If hit, we ALWAYS go to RAG/Library regardless of session type.
    if web_mode:
        return {"route": "rag"}

    if has_docs and is_summarize:
        route = "summarize"
    elif has_docs:
        route = "rag"
    else:
        route = "chat"

    return {"route": route}
