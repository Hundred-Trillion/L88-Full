"""
Query Rewriter node — LLM call with retry awareness.

Owns rewrite_count increment. Uses last_verdict on retries to take
a genuinely different angle. Outputs 1-3 rewritten queries.
"""

import json

from l88_backend.graph.state import L88State
from l88_backend.llm.client import call_llm

_REWRITER_PROMPT = """You are a query rewriter for a scientific RAG system.

Original query: {query}
Query type: {query_type}
Strategy: {strategy}
Attempt: {attempt} of 3
{verdict_context}

Instructions by strategy:
- "single": Rewrite into one clear, search-friendly query. Expand abbreviations.
- "decompose": Break into 2-3 sub-questions that together answer the original.
- "step_back": Ask a broader principle question that would contain the answer.

{retry_instructions}

Return ONLY a JSON array of query strings, no other text:
["rewritten query 1", "rewritten query 2"]"""

_RETRY_HINT = """This is a RETRY. The previous attempt returned: "{last_verdict}".
You MUST take a genuinely different angle:
- If previous was too narrow, go broader
- If previous was too broad, be more specific
- Reframe the question entirely if needed
- NEVER repeat a previous query"""


def query_rewriter_node(state: L88State) -> dict:
    """
    Rewrite the query. Increments rewrite_count on every call.

    First pass: apply strategy from Analyzer.
    Retry: use last_verdict to take a different angle.
    """
    current_count = state.get("rewrite_count", 0)
    last_verdict = state.get("last_verdict", "")
    is_retry = current_count > 0

    verdict_context = ""
    retry_instructions = ""
    if is_retry and last_verdict:
        verdict_context = f"Previous verdict: {last_verdict}"
        retry_instructions = _RETRY_HINT.format(last_verdict=last_verdict)

    prompt = _REWRITER_PROMPT.format(
        query=state["query"],
        query_type=state.get("query_type", "simple"),
        strategy=state.get("strategy", "single"),
        attempt=current_count + 1,
        verdict_context=verdict_context,
        retry_instructions=retry_instructions,
    )

    response = call_llm(prompt)

    # Parse the JSON array
    try:
        queries = json.loads(response.strip())
        if not isinstance(queries, list):
            queries = [str(queries)]
        # Cap at 3
        queries = [str(q) for q in queries[:3]]
    except (json.JSONDecodeError, TypeError):
        # Fallback: use the raw response as a single query
        queries = [response.strip()]

    if not queries:
        queries = [state["query"]]

    return {
        "rewritten_queries": queries,
        "rewrite_count": current_count + 1,
    }
