"""
Summarizer node — full document summarization, bypasses retrieval.

Loads raw text directly from stored chunks for selected docs,
sends full context to LLM. No retrieval, no reranking.
"""

import os
import json

from l88_backend.graph.state import L88State
from l88_backend.llm.client import call_llm
from l88_backend.config import SESSION_STORAGE

_SUMMARIZE_PROMPT = """You are a research assistant. Summarize the following document clearly and concisely.

User request: {query}

Document content:
{content}

Write a well-structured summary covering the main points, methodology (if any), and key findings or conclusions."""


def summarizer_node(state: L88State) -> dict:
    """Load full document text and summarize directly, bypassing retrieval."""
    session_id = state["session_id"]
    selected_doc_ids = state.get("selected_doc_ids", [])

    # Load chunks from disk for selected docs
    metadata_path = os.path.join(SESSION_STORAGE, session_id, "index", "metadata.json")
    all_text = ""

    try:
        with open(metadata_path, "r") as f:
            all_chunks = json.load(f)

        doc_chunks = [
            c for c in all_chunks
            if c.get("doc_id") in selected_doc_ids
        ]

        all_text = "\n\n".join(c.get("text", "") for c in doc_chunks)
    except (FileNotFoundError, json.JSONDecodeError):
        all_text = ""

    if not all_text.strip():
        return {
            "answer": "Could not load document content for summarization.",
            "confident": False,
            "context_verdict": "EMPTY",
            "sources": [],
            "reasoning": "",
            "missing_info": "",
        }

    prompt = _SUMMARIZE_PROMPT.format(
        query=state["query"],
        content=all_text[:12000],  # cap to stay within context window
    )

    answer = call_llm(prompt)

    return {
        "answer": answer,
        "confident": True,
        "context_verdict": "SUFFICIENT",
        "sources": [],
        "reasoning": "",
        "missing_info": "",
    }