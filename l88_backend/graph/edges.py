"""
Graph edges — all conditional routing functions.

Pure logic, no LLM. Determines next node based on state.
"""

from l88_backend.graph.state import L88State
from l88_backend.config import MAX_REWRITES


def route_after_router(state: L88State) -> str:
    """
    After Router node.

    "rag"   → query_analyzer
    "chat"  → generator (direct LLM, no chunks)
    "summarize" → summarize
    "error" → error (terminal)
    """
    return state["route"]


def route_after_generator(state: L88State) -> str:
    """
    After Generator node.

    SUFFICIENT                      → self_evaluator
    GAP + rewrite_count < MAX       → query_rewriter (retry)
    GAP + exhausted                 → self_evaluator (proceed with caveat)
    EMPTY + rewrite_count < MAX     → query_rewriter (retry)
    EMPTY + exhausted               → not_found (terminal)
    """
    # Simple queries skip self-evaluator entirely
    if state.get("query_type") == "simple" and state.get("context_verdict") == "SUFFICIENT":
        return "output"

    verdict = state.get("context_verdict", "SUFFICIENT")
    rewrite_count = state.get("rewrite_count", 0)

    if verdict == "SUFFICIENT":
        return "self_evaluator"

    if rewrite_count < MAX_REWRITES:
        return "query_rewriter"

    if verdict == "EMPTY":
        return "not_found"

    # GAP exhausted — proceed with caveat
    return "self_evaluator"

def route_after_self_eval(state: L88State) -> str:
    """
    After Self-Evaluator node.

    GOOD                            → output (terminal)
    UNSURE/BAD + rewrite_count < MAX → query_rewriter (retry)
    UNSURE/BAD + exhausted          → output (with ⚠ warning)
    """
    verdict = state.get("verdict", "GOOD")
    rewrite_count = state.get("rewrite_count", 0)

    if verdict == "GOOD":
        return "output"

    if rewrite_count < MAX_REWRITES:
        return "query_rewriter"

    return "output"
