"""
Retrieval node — no LLM.

Orchestrates: embed queries → FAISS search → dedup → filter by doc IDs → rerank → top-5.
"""

import os

from l88_backend.graph.state import L88State
from l88_backend.config import RETRIEVE_TOP_K, RERANK_TOP_N, SESSION_STORAGE, LIBRARY_STORAGE
from l88_backend.ingestion.embedder import embed_texts
from l88_backend.retrieval.vectorstore import VectorStore
from l88_backend.retrieval.reranker import rerank


def retrieval_node(state: L88State) -> dict:
    """
    Retrieve and rerank chunks for the rewritten queries.

    Steps:
      1. Embed each rewritten query with BGE prefix
      2. FAISS search → top-K per query
      3. Union → deduplicate by chunk_idx + doc_id
      4. Filter by selected_doc_ids
      5. If web_mode: also search library FAISS
      6. BGE reranker → top-N
      7. found = len(chunks) > 0
    """
    queries = state.get("rewritten_queries", [state["query"]])
    selected_doc_ids = state.get("selected_doc_ids", [])
    session_id = state["session_id"]
    web_mode = state.get("web_mode", False)

    all_chunks = []
    seen = set()

    # Load session FAISS index
    session_index_path = os.path.join(SESSION_STORAGE, session_id, "index")
    session_store = VectorStore.load(session_index_path)

    # Load library FAISS index (if web mode)
    library_store = None
    if web_mode:
        library_index_path = os.path.join(LIBRARY_STORAGE, "index")
        if os.path.exists(os.path.join(library_index_path, "index.faiss")):
            library_store = VectorStore.load(library_index_path)

    # Embed and search for each query
    for q in queries:
        q_embedding = embed_texts([q], is_query=True)

        # Session FAISS
        if session_store.count > 0:
            results = session_store.search(q_embedding[0], top_k=RETRIEVE_TOP_K)
            for chunk in results:
                key = (chunk.get("doc_id", ""), chunk.get("chunk_idx", 0))
                if key not in seen:
                    seen.add(key)
                    all_chunks.append(chunk)

        # Library FAISS (web mode)
        if library_store and library_store.count > 0:
            lib_results = library_store.search(q_embedding[0], top_k=RETRIEVE_TOP_K)
            for chunk in lib_results:
                key = (chunk.get("doc_id", ""), chunk.get("chunk_idx", 0))
                if key not in seen:
                    seen.add(key)
                    all_chunks.append(chunk)

    # Filter by selected doc IDs (session docs only — library docs always included)
    if selected_doc_ids:
        filtered = []
        for chunk in all_chunks:
            doc_id = chunk.get("doc_id", "")
            source = chunk.get("source", "session")
            if source == "library" or doc_id in selected_doc_ids:
                filtered.append(chunk)
        all_chunks = filtered

    # Rerank
    if all_chunks:
        original_query = state["query"]
        all_chunks = rerank(original_query, all_chunks, top_n=RERANK_TOP_N)

    found = len(all_chunks) > 0
    return {"chunks": all_chunks, "found": found}
