"""
Generator node — collapsed context evaluation + answer generation.

Single LLM call producing structured JSON: context_verdict, reasoning,
answer, sources, missing_info.

Handles:
  - found=False → returns immediately, no LLM call (EMPTY)
  - route=="chat" → direct LLM call with no chunks
  - found=True → structured generation with context evaluation

Writes last_verdict from context_verdict before returning.
"""

import json

from l88_backend.graph.state import L88State
from l88_backend.llm.client import call_llm

_GENERATOR_PROMPT = """You are a scientific research assistant. Answer the user's question using ONLY the provided source chunks.

User question: {query}

Source chunks:
{chunks_text}

Instructions:
1. First, evaluate whether the chunks contain SUFFICIENT information to answer.
2. Then answer the question with inline citations [filename, page N].
3. Show your full reasoning in a <think> block.

Return ONLY valid JSON:
{{
  "context_verdict": "SUFFICIENT" or "GAP" or "EMPTY",
  "reasoning": "<think>your chain of thought</think>",
  "answer": "your direct answer with citations",
  "missing_info": "what is absent (only if GAP, else empty string)",
  "sources": [{{"filename": "...", "page": N, "excerpt": "relevant quote"}}]
}}"""

_CHAT_PROMPT = """You are a helpful scientific research assistant. Answer the following question using your training knowledge.

Question: {query}

Provide a clear, accurate answer. If you're uncertain, say so."""


def generator_node(state: L88State) -> dict:
    """
    Generate an answer. Evaluates context sufficiency in the same LLM call.

    Writes last_verdict from context_verdict for the Rewriter on retries.
    """
    route = state.get("route", "rag")
    found = state.get("found", False)

    # ── Chat route: direct LLM, no chunks ────────────────────────
    if route == "chat":
        prompt = _CHAT_PROMPT.format(query=state["query"])
        response = call_llm(prompt)
        return {
            "context_verdict": "SUFFICIENT",
            "reasoning": "",
            "answer": response,
            "sources": [],
            "missing_info": "",
            "last_verdict": "SUFFICIENT",
        }

    # ── No chunks found: return immediately, no LLM ─────────────
    if not found:
        return {
            "context_verdict": "EMPTY",
            "reasoning": "",
            "answer": "No information found in the selected sources.",
            "sources": [],
            "missing_info": "No relevant chunks retrieved.",
            "last_verdict": "EMPTY",
        }

    # ── RAG generation: single structured LLM call ───────────────
    chunks = state.get("chunks", [])
    chunks_text = "\n\n".join(
        f"[{c.get('filename', '?')}, page {c.get('page', '?')}]:\n{c.get('text', '')}"
        for c in chunks
    )

    prompt = _GENERATOR_PROMPT.format(
        query=state["query"],
        chunks_text=chunks_text,
    )

    response = call_llm(prompt)

    # Parse JSON response
    try:
        result = json.loads(response.strip())
        context_verdict = result.get("context_verdict", "SUFFICIENT")
        reasoning = result.get("reasoning", "")
        answer = result.get("answer", "")
        missing_info = result.get("missing_info", "")
        sources = result.get("sources", [])
    except (json.JSONDecodeError, KeyError):
        # Fallback: treat raw response as the answer
        context_verdict = "SUFFICIENT"
        reasoning = ""
        answer = response.strip()
        missing_info = ""
        sources = []

    # Validate verdict
    if context_verdict not in ("SUFFICIENT", "GAP", "EMPTY"):
        context_verdict = "SUFFICIENT"

    return {
        "context_verdict": context_verdict,
        "reasoning": reasoning,
        "answer": answer,
        "sources": sources,
        "missing_info": missing_info,
        "last_verdict": context_verdict,
    }
