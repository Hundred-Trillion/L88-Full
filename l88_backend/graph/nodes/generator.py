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

_GENERATOR_PROMPT = """You are Paramanandha, a scientific research assistant developed by L88 Laboratories.
Answer the user's question using ONLY the provided source chunks.

User question: {query}

Source chunks:
{chunks_text}

Instructions:
1. First, evaluate whether the chunks contain SUFFICIENT information to answer.
2. Then answer the question with inline citations [filename, page N].
3. ALWAYS use LaTeX for mathematical and physics expressions.
   - Use SINGLE dollar signs for inline math: $E=mc^2$.
   - Use DOUBLE dollar signs for block math: $$\\int f(x) dx$$.
   - Do NOT use other delimiters like [ ], ( ), \\( \\), or \\[ \\].
   - Do NOT explicitly mention you are using LaTeX or explain the formatting. Just use it.
4. Show your full reasoning in a <think> block.

Return ONLY valid JSON:
{{
  "context_verdict": "SUFFICIENT" or "GAP" or "EMPTY",
  "reasoning": "<think>your chain of thought</think>",
  "answer": "your direct answer with citations",
  "missing_info": "what is absent (only if GAP, else empty string)",
  "sources": [{{"filename": "...", "page": N, "excerpt": "relevant quote"}}]
}}"""

_CHAT_PROMPT = """You are Paramanandha, a helpful scientific research assistant developed by L88 Laboratories. 
Answer the following question using your training knowledge.

Question: {query}

Instructions:
1. Provide a clear, polite, and accurate answer.
2. ALWAYS use LaTeX for mathematical and physics expressions.
   - Use SINGLE dollar signs for inline math: $E=mc^2$.
   - Use DOUBLE dollar signs for block math: $$\\int f(x) dx$$.
   - Do NOT use other delimiters like [ ], ( ), \\( \\), or \\[ \\].
   - Do NOT explicitly mention you are using LaTeX or explain the formatting. Just use it.
3. If you're uncertain, say so.
4. IMPORTANT: Do NOT use JSON formatting, code blocks for reasoning, or structured fields. Answer in plain natural language."""


import re

def _extract_json(text: str) -> str:
    """Robustly extract and clean JSON from a string."""
    text = text.strip()
    
    # 1. Remove markdown code fences
    if "```" in text:
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        else:
            parts = text.split("```")
            if len(parts) >= 3:
                text = parts[1].strip()

    # 2. Find the first '{' and last '}'
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end <= start:
        return text
    
    json_str = text[start:end+1]

    # 3. CRITICAL: Handle unescaped newlines in JSON strings (common with LLMs)
    try:
        json.loads(json_str)
        return json_str
    except json.JSONDecodeError:
        # LLMs often forget to escape newlines in long text fields.
        # We target known string fields and escape newlines within them.
        for field in ["reasoning", "answer", "missing_info", "excerpt"]:
            # Pattern: "field": " ... " (greedy matching inside quotes, but careful with closing)
            # This regex looks for the field name, followed by a colon, then a quote,
            # then anything UNTIL it sees a quote followed by a comma or closing brace.
            pattern = f'("{field}"\\s*:\\s*")(.*?)("(?=\\s*[,}}]))'
            def replace_nl(match):
                prefix, content, suffix = match.groups()
                # Replace literal newlines with escaped \n
                return prefix + content.replace("\n", "\\n").replace("\r", "\\n") + suffix
            
            json_str = re.sub(pattern, replace_nl, json_str, flags=re.DOTALL)
            
        return json_str


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
        # Use small_ctx=True for general chat to minimize latency.
        response = call_llm(prompt, small_ctx=True)
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
    clean_json = _extract_json(response)

    # Parse JSON response
    try:
        result = json.loads(clean_json)
        context_verdict = result.get("context_verdict", "SUFFICIENT")
        reasoning = result.get("reasoning", "")
        answer = result.get("answer", "")
        missing_info = result.get("missing_info", "")
        sources = result.get("sources", [])
        
        # Attach source metadata (session vs library) by matching filenames
        source_map = {c.get("filename"): c.get("source", "session") for c in chunks}
        for s in sources:
            fname = s.get("filename")
            s["source"] = source_map.get(fname, "session")

    except (json.JSONDecodeError, KeyError):
        # Fallback: treat raw response as the answer
        context_verdict = "SUFFICIENT"
        reasoning = ""
        answer = response.strip()
        missing_info = ""
        sources = []

    # Validate verdict
    if context_verdict not in ("SUFFICIENT", "GAP", "EMPTY"):
        # If the LLM returned something else, it might have just put the answer in the field
        # or we might need to search for keywords.
        if "sufficient" in context_verdict.lower(): context_verdict = "SUFFICIENT"
        elif "gap" in context_verdict.lower(): context_verdict = "GAP"
        elif "empty" in context_verdict.lower(): context_verdict = "EMPTY"
        else: context_verdict = "SUFFICIENT"

    return {
        "context_verdict": context_verdict,
        "reasoning": reasoning,
        "answer": answer,
        "sources": sources,
        "missing_info": missing_info,
        "last_verdict": context_verdict,
    }
