"""
Router node — pure logic, no LLM.

Determines the route based on selected_doc_ids and web_mode:
  0 docs + web OFF  → "error"
  0 docs + web ON   → "chat"
  docs selected     → "rag"
"""

from l88_backend.graph.state import L88State


def router_node(state: L88State) -> dict:
    """Classify the request route without calling the LLM."""
    has_docs = bool(state.get("selected_doc_ids"))
    web_on = state.get("web_mode", False)

    if has_docs:
        route = "rag"
    elif web_on:
        route = "chat"
    else:
        route = "error"

    return {"route": route}
