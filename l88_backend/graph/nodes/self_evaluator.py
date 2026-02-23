"""
Self-Evaluator node — LLM re-reads answer against source chunks.

Returns GOOD / UNSURE / BAD verdict + sets confident flag.
Writes last_verdict from verdict before returning.
"""

from l88_backend.graph.state import L88State
from l88_backend.llm.client import call_llm

_EVAL_PROMPT = """You are a quality evaluator for a scientific RAG system.

User question: {query}

Generated answer:
{answer}

Source chunks used:
{chunks_text}

Evaluate the answer:
- GOOD: Answer is accurate, well-supported by the sources, and complete.
- UNSURE: Answer is partially supported or may contain inaccuracies.
- BAD: Answer is not supported by the sources or is clearly wrong.

Reply with ONLY one word: GOOD, UNSURE, or BAD."""


def self_evaluator_node(state: L88State) -> dict:
    """
    Evaluate the generated answer against the source chunks.

    Writes last_verdict from verdict for the Rewriter on retries.
    """
    chunks = state.get("chunks", [])
    chunks_text = "\n\n".join(
        f"[{c.get('filename', '?')}, page {c.get('page', '?')}]:\n{c.get('text', '')}"
        for c in chunks
    )

    prompt = _EVAL_PROMPT.format(
        query=state["query"],
        answer=state.get("answer", ""),
        chunks_text=chunks_text,
    )

    response = call_llm(prompt).strip().upper()

    # Parse verdict — accept only valid values
    if response in ("GOOD", "UNSURE", "BAD"):
        verdict = response
    else:
        # Try to extract from longer response
        for v in ("GOOD", "UNSURE", "BAD"):
            if v in response:
                verdict = v
                break
        else:
            verdict = "UNSURE"

    confident = verdict == "GOOD"

    return {
        "verdict": verdict,
        "confident": confident,
        "last_verdict": verdict,
    }
