"""
Router node — pure logic, no LLM.

Determines the route based on selected_doc_ids and web_mode:
  docs selected     → "rag"
  0 docs + web ON   → "chat"
  0 docs + web OFF  → "chat"  (LLM answers from trained knowledge)
"""

from l88_backend.graph.state import L88State


def router_node(state: L88State) -> dict:
    """Classify the request route without calling the LLM."""
    has_docs = bool(state.get("selected_doc_ids"))

    if has_docs:
        route = "rag"
    else:
        # No docs → general chat (LLM uses trained knowledge)
        route = "chat"

    return {"route": route}
