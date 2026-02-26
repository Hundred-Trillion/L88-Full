"""
Graph assembly — LangGraph StateGraph wiring.

Adds all nodes, conditional edges, compiles the graph.
Includes not_found and error terminal nodes wired to END.
"""

from langgraph.graph import StateGraph, END

from l88_backend.graph.state import L88State
from l88_backend.graph.nodes.router import router_node
from l88_backend.graph.nodes.query_analyzer import query_analyzer_node
from l88_backend.graph.nodes.query_rewriter import query_rewriter_node
from l88_backend.graph.nodes.retrieval import retrieval_node
from l88_backend.graph.nodes.generator import generator_node
from l88_backend.graph.nodes.self_evaluator import self_evaluator_node
from l88_backend.graph.edges import (
    route_after_router,
    route_after_analyzer,
    route_after_generator,
    route_after_self_eval,
)


def _not_found_node(state: L88State) -> dict:
    """Terminal node — no information found after all retries."""
    return {
        "answer": "No information found in the selected sources.",
        "confident": False,
        "context_verdict": "EMPTY",
        "reasoning": "",
        "missing_info": "All retrieval attempts returned no relevant results.",
    }


def _error_node(state: L88State) -> dict:
    """Terminal node — no sources available."""
    return {
        "answer": "No sources available. Upload documents or enable web mode.",
        "confident": False,
        "context_verdict": "EMPTY",
    }


def _output_node(state: L88State) -> dict:
    """Terminal node — pass through (answer already in state)."""
    return {}


def build_graph() -> StateGraph:
    """
    Build and compile the full agentic RAG graph.

    Flow:
      query_in → router → (rag|chat|error)
        error → END
        chat  → generator → END
        rag   → query_analyzer → query_rewriter → retrieval → generator
                  ↑                                              ↓
                  └──────────── (retry loop) ←── self_evaluator ─┘
    """
    graph = StateGraph(L88State)

    # ── Add nodes ────────────────────────────────────────────────
    graph.add_node("router", router_node)
    graph.add_node("query_analyzer", query_analyzer_node)
    graph.add_node("query_rewriter", query_rewriter_node)
    graph.add_node("retrieval", retrieval_node)
    graph.add_node("generator", generator_node)
    graph.add_node("self_evaluator", self_evaluator_node)
    graph.add_node("not_found", _not_found_node)
    graph.add_node("error", _error_node)
    graph.add_node("output", _output_node)

    # ── Entry point ──────────────────────────────────────────────
    graph.set_entry_point("router")

    # ── Conditional edges ────────────────────────────────────────

    # After router: rag → analyzer, chat → generator, error → error
    graph.add_conditional_edges(
        "router",
        route_after_router,
        {
            "rag": "query_analyzer",
            "chat": "generator",
            "error": "error",
        },
    )

    # After analyzer: simple → retrieval, complex → query_rewriter
    graph.add_conditional_edges(
        "query_analyzer",
        route_after_analyzer,
        {
            "retrieval": "retrieval",
            "query_rewriter": "query_rewriter",
        
        },
    )

    # After rewriter → retrieval
    graph.add_edge("query_rewriter", "retrieval")

    # After retrieval → generator
    graph.add_edge("retrieval", "generator")

    # After generator: sufficient → self_eval, retry → rewriter, empty → not_found
    graph.add_conditional_edges(
        "generator",
        route_after_generator,
        {
            "self_evaluator": "self_evaluator",
            "query_rewriter": "query_rewriter",
            "not_found": "not_found",
        },
    )

    # After self-evaluator: good → output, retry → rewriter, exhausted → output
    graph.add_conditional_edges(
        "self_evaluator",
        route_after_self_eval,
        {
            "output": "output",
            "query_rewriter": "query_rewriter",
        },
    )

    # ── Terminal edges ───────────────────────────────────────────
    graph.add_edge("not_found", END)
    graph.add_edge("error", END)
    graph.add_edge("output", END)

    return graph.compile()
