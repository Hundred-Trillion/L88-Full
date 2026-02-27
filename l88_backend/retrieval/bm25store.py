"""
BM25 store — keyword search alongside FAISS vector search.

Singleton per session. Built from chunk texts at ingestion time.
Saved/loaded as JSON to persist across restarts.
"""

import json
import os
import pickle
import re

from rank_bm25 import BM25Okapi


# Common English stopwords — removing them improves BM25 precision for
# scientific text where function words add noise.
_STOPWORDS = {
    "a", "an", "the", "is", "it", "its", "in", "on", "at", "to", "for",
    "of", "and", "or", "but", "with", "by", "from", "as", "this", "that",
    "these", "those", "be", "was", "were", "are", "has", "have", "had",
    "will", "would", "can", "could", "may", "might", "shall", "should",
    "do", "does", "did", "not", "so", "if", "then", "than", "into",
    "through", "about", "up", "out", "which", "who", "what", "how",
    "when", "where", "their", "they", "he", "she", "we", "you", "i",
    "also", "such", "other", "used", "using", "use",
}


def _tokenize(text: str) -> list[str]:
    """
    Improved tokenizer:
    - lowercase
    - split on whitespace and punctuation (not hyphens — keep compound terms)
    - remove stopwords
    - drop single-character tokens
    """
    # Split on whitespace + most punctuation, keep hyphens and underscores
    tokens = re.split(r'[\s,;:.!?()\[\]{}/\\|@#$%^&*+=<>"\']', text.lower())
    return [t for t in tokens if t and t not in _STOPWORDS and len(t) > 1]


class BM25Store:
    """BM25 index with metadata, mirroring VectorStore interface."""

    def __init__(self):
        self.chunks: list[dict] = []
        self._bm25: BM25Okapi | None = None

    def add_chunks(self, chunks: list[dict]):
        """Add chunks and rebuild BM25 index."""
        self.chunks.extend(chunks)
        self._build()

    def _build(self):
        """Rebuild BM25 index from all chunks."""
        if not self.chunks:
            self._bm25 = None
            return
        corpus = [_tokenize(c["text"]) for c in self.chunks]
        self._bm25 = BM25Okapi(corpus)

    def search(self, query: str, top_k: int = 20) -> list[dict]:
        """
        Search for top-k chunks by BM25 score.

        Returns chunks with added 'bm25_score' field.
        """
        if not self._bm25 or not self.chunks:
            return []

        tokens = _tokenize(query)
        if not tokens:
            return []

        scores = self._bm25.get_scores(tokens)

        scored = []
        for chunk, score in zip(self.chunks, scores):
            c = dict(chunk)
            c["bm25_score"] = float(score)
            scored.append(c)

        scored.sort(key=lambda c: c["bm25_score"], reverse=True)
        return scored[:top_k]

    def save(self, directory: str):
        """Save BM25 index and chunks to disk."""
        os.makedirs(directory, exist_ok=True)
        with open(os.path.join(directory, "bm25.pkl"), "wb") as f:
            pickle.dump(self._bm25, f)
        with open(os.path.join(directory, "bm25_chunks.json"), "w") as f:
            json.dump(self.chunks, f)

    @classmethod
    def load(cls, directory: str) -> "BM25Store":
        """Load BM25 index from disk."""
        pkl_path = os.path.join(directory, "bm25.pkl")
        chunks_path = os.path.join(directory, "bm25_chunks.json")

        store = cls()
        if not os.path.exists(pkl_path):
            return store

        with open(pkl_path, "rb") as f:
            store._bm25 = pickle.load(f)
        with open(chunks_path) as f:
            store.chunks = json.load(f)

        return store

    @property
    def count(self) -> int:
        return len(self.chunks)