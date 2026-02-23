"""
FAISS vector store — IndexFlatIP wrapper (L2-normalized = cosine).

Stores vectors + chunk metadata side by side.
Supports save/load to disk for persistence across restarts.
"""

import json
import os

import faiss
import numpy as np


class VectorStore:
    """
    FAISS IndexFlatIP vector store with metadata.

    Vectors are expected to be L2-normalized (from embedder.py),
    so inner product == cosine similarity.
    """

    def __init__(self, dimension: int = 768):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)
        self.metadata: list[dict] = []

    def add_chunks(self, chunks: list[dict], embeddings: np.ndarray):
        """
        Add embedded chunks to the index.

        Args:
            chunks: List of chunk dicts (text, page, filename, chunk_idx, doc_id).
            embeddings: np.ndarray of shape (len(chunks), dimension).
        """
        if len(chunks) == 0:
            return
        self.index.add(embeddings)
        self.metadata.extend(chunks)

    def search(self, query_embedding: np.ndarray, top_k: int = 20) -> list[dict]:
        """
        Search for the nearest chunks.

        Args:
            query_embedding: np.ndarray of shape (1, dimension) or (dimension,).
            top_k: Number of results to return.

        Returns:
            List of chunk dicts with added 'score' field, sorted by score desc.
        """
        if self.index.ntotal == 0:
            return []

        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)

        k = min(top_k, self.index.ntotal)
        scores, indices = self.index.search(query_embedding, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            chunk = dict(self.metadata[idx])
            chunk["score"] = float(score)
            results.append(chunk)

        return results

    def save(self, directory: str):
        """Save the FAISS index and metadata to disk."""
        os.makedirs(directory, exist_ok=True)
        faiss.write_index(self.index, os.path.join(directory, "index.faiss"))
        with open(os.path.join(directory, "metadata.json"), "w") as f:
            json.dump(self.metadata, f)

    @classmethod
    def load(cls, directory: str) -> "VectorStore":
        """Load a saved FAISS index and metadata from disk."""
        index_path = os.path.join(directory, "index.faiss")
        meta_path = os.path.join(directory, "metadata.json")

        if not os.path.exists(index_path):
            return cls()

        index = faiss.read_index(index_path)
        with open(meta_path) as f:
            metadata = json.load(f)

        store = cls(dimension=index.d)
        store.index = index
        store.metadata = metadata
        return store

    @property
    def count(self) -> int:
        """Number of vectors in the index."""
        return self.index.ntotal
