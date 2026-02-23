"""
Query Analyzer node — single LLM call.

Classifies query complexity so the Rewriter knows what strategy to apply:
  "simple"     → one direct rewrite
  "multi_hop"  → decompose into sub-questions
  "math"       → step-back: what general principle does this involve?
  "comparison" → one query per concept being compared
"""

import json

from l88_backend.graph.state import L88State
from l88_backend.llm.client import call_llm

_ANALYZER_PROMPT = """You are a query classifier for a scientific RAG system.

Classify the following user query into exactly one category and one strategy.

Categories:
- "simple" → single concept, direct lookup
- "multi_hop" → requires combining information from multiple sources
- "math" → involves equations, derivations, or numerical reasoning
- "comparison" → comparing two or more concepts, methods, or results

Strategies (matched to category):
- "simple" → "single"
- "multi_hop" → "decompose"
- "math" → "step_back"
- "comparison" → "decompose"

Return ONLY valid JSON, no other text:
{{"query_type": "...", "strategy": "..."}}

User query: {query}"""


def query_analyzer_node(state: L88State) -> dict:
    """Classify the query and determine rewriting strategy."""
    prompt = _ANALYZER_PROMPT.format(query=state["query"])
    response = call_llm(prompt)

    # Parse the JSON response
    try:
        result = json.loads(response.strip())
        query_type = result.get("query_type", "simple")
        strategy = result.get("strategy", "single")
    except (json.JSONDecodeError, KeyError):
        # Fallback: treat as simple
        query_type = "simple"
        strategy = "single"

    # Validate
    if query_type not in ("simple", "multi_hop", "math", "comparison"):
        query_type = "simple"
    if strategy not in ("single", "decompose", "step_back"):
        strategy = "single"

    return {"query_type": query_type, "strategy": strategy}
