"""
Graph state — L88State TypedDict.

Single source of truth for all data flowing through the agentic RAG graph.
"""

from typing import TypedDict


class L88State(TypedDict):
    """Full state passed between graph nodes."""

    # ── Core Inputs ──────────────────────────────────────────────
    query: str
    session_id: str
    selected_doc_ids: list[str]
    web_mode: bool

    # ── Router ───────────────────────────────────────────────────
    route: str                      # "rag" | "chat" | "error"

    # ── Query Analyzer ───────────────────────────────────────────
    query_type: str                 # "simple" | "multi_hop" | "math" | "comparison"
    strategy: str                   # "single" | "decompose" | "step_back"

    # ── Query Rewriter ───────────────────────────────────────────
    rewritten_queries: list[str]
    rewrite_count: int              # max 2 — incremented by query_rewriter
    last_verdict: str               # written by generator + self_evaluator

    # ── Retrieval ────────────────────────────────────────────────
    chunks: list[dict]              # {text, doc_id, filename, page, chunk_idx, score}
    found: bool

    # ── Generator (collapsed) ────────────────────────────────────
    context_verdict: str            # "SUFFICIENT" | "GAP" | "EMPTY"
    reasoning: str                  # <think> block, shown in UI
    answer: str
    sources: list[dict]             # {filename, page, excerpt}
    missing_info: str               # populated if GAP

    # ── Self-Evaluator ───────────────────────────────────────────
    verdict: str                    # "GOOD" | "UNSURE" | "BAD"
    confident: bool                 # False → ⚠ in UI
