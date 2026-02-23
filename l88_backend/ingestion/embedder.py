"""
Embedder — BAAI/bge-base-en-v1.5 on CPU.

Singleton model loader. L2-normalizes vectors for cosine similarity via FAISS IP.
Prepends the BGE query prefix for retrieval queries.
"""

import numpy as np
from sentence_transformers import SentenceTransformer

from l88_backend.config import EMBED_MODEL, EMBED_PREFIX

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Lazy-load the embedding model (CPU)."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBED_MODEL, device="cpu")
    return _model


def embed_texts(texts: list[str], is_query: bool = False) -> np.ndarray:
    """
    Embed a list of texts.

    Args:
        texts: Raw text strings to embed.
        is_query: If True, prepends the BGE query prefix (required for retrieval).

    Returns:
        np.ndarray of shape (len(texts), embed_dim), L2-normalized.
    """
    model = _get_model()

    if is_query:
        texts = [EMBED_PREFIX + t for t in texts]

    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return np.array(embeddings, dtype=np.float32)
