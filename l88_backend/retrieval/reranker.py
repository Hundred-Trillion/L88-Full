"""
Reranker — BAAI/bge-reranker-v2-m3 on CPU.

Cross-encoder that scores (query, chunk) pairs for precise relevance ranking.
Singleton model loader.
"""

from sentence_transformers import CrossEncoder

from l88_backend.config import RERANKER_MODEL

_model: CrossEncoder | None = None


def _get_model() -> CrossEncoder:
    """Lazy-load the reranker model (CPU)."""
    global _model
    if _model is None:
        _model = CrossEncoder(RERANKER_MODEL, device="cpu")
    return _model


def rerank(query: str, chunks: list[dict], top_n: int = 5) -> list[dict]:
    """
    Rerank chunks by cross-encoder relevance to query.

    Args:
        query: The user's (or rewritten) query string.
        chunks: List of chunk dicts with at least a 'text' key.
        top_n: Number of top-scoring chunks to return.

    Returns:
        Top-N chunks sorted by reranker score (desc), with 'rerank_score' added.
    """
    if not chunks:
        return []

    model = _get_model()

    pairs = [(query, c["text"]) for c in chunks]
    scores = model.predict(pairs)

    for chunk, score in zip(chunks, scores):
        chunk["rerank_score"] = float(score)

    ranked = sorted(chunks, key=lambda c: c["rerank_score"], reverse=True)
    return ranked[:top_n]
