"""
Self-Evaluator node — uses cross-encoder confidence score from retrieval.

Replaces LLM-as-judge with the rerank_score already computed in retrieval.
Threshold: >= 0.7 → GOOD, >= 0.4 → UNSURE, < 0.4 → BAD.
No additional LLM call needed.
"""

from l88_backend.graph.state import L88State


def self_evaluator_node(state: L88State) -> dict:
    """
    Evaluate confidence using the cross-encoder score from retrieval.
    No LLM call — pure score thresholding.
    """
    chunks = state.get("chunks", [])

    if not chunks:
        return {
            "verdict": "BAD",
            "confident": False,
            "last_verdict": "BAD",
        }

    top_score = chunks[0].get("rerank_score", 0.0)

    if top_score >= 0.7:
        verdict = "GOOD"
    elif top_score >= 0.4:
        verdict = "UNSURE"
    else:
        verdict = "BAD"

    confident = verdict == "GOOD"

    return {
        "verdict": verdict,
        "confident": confident,
        "last_verdict": verdict,
    }