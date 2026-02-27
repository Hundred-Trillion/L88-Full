"""
Retrieval node — no LLM.

Orchestrates: embed queries → FAISS search → dedup → filter by doc IDs → rerank → top-5.
"""

import os

from l88_backend.graph.state import L88State
from l88_backend.config import RETRIEVE_TOP_K, RERANK_TOP_N, SESSION_STORAGE, LIBRARY_STORAGE
from l88_backend.ingestion.embedder import embed_texts
from l88_backend.retrieval.vectorstore import VectorStore
from l88_backend.retrieval.bm25store import BM25Store
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
    queries = state.get("rewritten_queries") or [state["query"]]
    selected_doc_ids = state.get("selected_doc_ids", [])
    session_id = state["session_id"]
    web_mode = state.get("web_mode", False)

    all_chunks = []
    seen = set()

    # Load session FAISS + BM25 indexes
    session_index_path = os.path.join(SESSION_STORAGE, session_id, "index")
    session_store = VectorStore.load(session_index_path)
    bm25_store = BM25Store.load(session_index_path)

    # Blend ratio by query type — more BM25 for exact match, more vector for conceptual
    query_type = state.get("query_type", "simple")
    bm25_weight = 0.6 if query_type == "simple" else 0.2
    vector_weight = 1.0 - bm25_weight

    # Load library FAISS index (if web mode)
    library_store = None
    if web_mode:
        library_index_path = os.path.join(LIBRARY_STORAGE, "index")
        if os.path.exists(os.path.join(library_index_path, "index.faiss")):
            library_store = VectorStore.load(library_index_path)

    # Embed and search for each query
    for q in queries:
        q_embedding = embed_texts([q], is_query=True)

        if web_mode:
            # EXCLUSIVE WEB MODE: Search Library FAISS Only
            if library_store and library_store.count > 0:
                lib_results = library_store.search(q_embedding[0], top_k=RETRIEVE_TOP_K)
                for chunk in lib_results:
                    key = (chunk.get("doc_id", ""), chunk.get("chunk_idx", 0))
                    if key not in seen:
                        seen.add(key)
                        all_chunks.append(chunk)
        else:
            # SESSION MODE: Session FAISS + BM25
            faiss_results = {}
            if session_store.count > 0:
                results = session_store.search(q_embedding[0], top_k=RETRIEVE_TOP_K)
                for chunk in results:
                    key = (chunk.get("doc_id", ""), chunk.get("chunk_idx", 0))
                    faiss_results[key] = chunk

            bm25_results = {}
            if bm25_store.count > 0:
                results = bm25_store.search(q, top_k=RETRIEVE_TOP_K)
                for chunk in results:
                    key = (chunk.get("doc_id", ""), chunk.get("chunk_idx", 0))
                    bm25_results[key] = chunk

            # Blend scores
            all_keys = set(faiss_results) | set(bm25_results)
            
            # Adaptive weighting
            current_vector_weight = vector_weight
            current_bm25_weight = bm25_weight
            
            if not faiss_results and bm25_results:
                current_vector_weight, current_bm25_weight = 0.0, 1.0
            elif faiss_results and not bm25_results:
                current_vector_weight, current_bm25_weight = 1.0, 0.0

            for key in all_keys:
                if key in seen:
                    continue
                seen.add(key)

                faiss_chunk = faiss_results.get(key)
                bm25_chunk = bm25_results.get(key)

                chunk = dict(faiss_chunk or bm25_chunk)
                faiss_score = faiss_chunk.get("score", 0.0) if faiss_chunk else 0.0
                bm25_score = bm25_chunk.get("bm25_score", 0.0) if bm25_chunk else 0.0

                chunk["score"] = (current_vector_weight * faiss_score) + (current_bm25_weight * bm25_score)
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

    # Rerank and capture confidence score
    confident = False
    top_score = 0.0
    if all_chunks:
        original_query = state["query"]
        all_chunks, top_score = rerank(original_query, all_chunks, top_n=RERANK_TOP_N)
        confident = top_score >= 0.7

    found = len(all_chunks) > 0
    print(f"[RETRIEVAL] Found {len(all_chunks)} chunks for {len(queries)} queries. Top score: {top_score:.2f}. Confident: {confident}")
    return {"chunks": all_chunks, "found": found, "confident": confident}
