"""
Query Rewriter node — LLM call with retry awareness.

Owns rewrite_count increment. Uses last_verdict on retries to take
a genuinely different angle. Outputs 1-3 rewritten queries.
"""

import json

from l88_backend.graph.state import L88State
from l88_backend.llm.client import call_llm

_REWRITER_PROMPT = """You are a scientific research assistant and query optimizer.
Classify the user query and provide search-friendly rewrites.

Categories:
- "simple" → single concept, direct lookup
- "multi_hop" → requires combining information from multiple sources
- "math" → involves equations, derivations, or numerical reasoning
- "comparison" → comparing two or more concepts

Rewriting Strategies:
- "single": Rewrite into one clear, search-friendly query. Expand abbreviations.
- "decompose": Break into 2-3 sub-questions.
- "step_back": Ask a broader principle question.

Attempt: {attempt} of 3
{verdict_context}

Return ONLY valid JSON:
{{
  "query_type": "simple|multi_hop|math|comparison",
  "strategy": "single|decompose|step_back",
  "rewritten_queries": ["query 1", "query 2"]
}}

User query: {query}"""

_RETRY_HINT = """This is a RETRY. Previous verdict: "{last_verdict}".
You MUST take a genuinely different angle.
- If too narrow, go broader.
- If too broad, be specific.
- NEVER repeat a previous query."""


def query_rewriter_node(state: L88State) -> dict:
    """
    Unified node: Classify query type AND generate rewrites in one call.
    Reduces latency by saving one sequential LLM call.
    """
    current_count = state.get("rewrite_count", 0)
    last_verdict = state.get("last_verdict", "")
    is_retry = current_count > 0

    verdict_context = ""
    if is_retry and last_verdict:
        verdict_context = _RETRY_HINT.format(last_verdict=last_verdict)

    prompt = _REWRITER_PROMPT.format(
        query=state["query"],
        attempt=current_count + 1,
        verdict_context=verdict_context,
    )

    response = call_llm(prompt, small_ctx=True)
    
    # Parse JSON
    try:
        # Simple extraction if LLM adds markdown
        text = response.strip()
        if "```" in text:
            text = text.split("```")[1].replace("json", "").strip()
        
        result = json.loads(text)
        query_type = result.get("query_type", "simple")
        strategy = result.get("strategy", "single")
        queries = result.get("rewritten_queries", [state["query"]])
    except:
        # Fallback
        query_type = state.get("query_type", "simple")
        strategy = "single"
        queries = [state["query"]]

    # Validations
    if query_type not in ("simple", "multi_hop", "math", "comparison"): query_type = "simple"
    if not isinstance(queries, list): queries = [str(queries)]
    queries = [str(q) for q in queries[:3]]

    return {
        "query_type": query_type,
        "strategy": strategy,
        "rewritten_queries": queries,
        "rewrite_count": current_count + 1,
    }
