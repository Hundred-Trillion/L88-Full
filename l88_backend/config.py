"""
L88-Full configuration — single source of truth for all constants.

Edit HARDCODED_USERS to add/remove users. Restart required.
Edit model names, chunk sizes, retrieval params here only.
"""

# ── Hardcoded Users ──────────────────────────────────────────────────
# No registration flow. Add a user → edit this list → restart.

HARDCODED_USERS = [
    {"username": "alice", "password": "xxxx", "role": "admin",     "display_name": "Alice"},
    {"username": "bob",   "password": "xxxx", "role": "chat",      "display_name": "Bob"},
    {"username": "carol", "password": "xxxx", "role": "read_only", "display_name": "Carol"},
]

# ── Storage Paths ────────────────────────────────────────────────────

STORAGE_DIR         = "./storage"
SESSION_STORAGE     = "./storage/sessions"
LIBRARY_STORAGE     = "./storage/library"
DATABASE_URL        = "sqlite:///./l88.db"

# ── Ingestion ────────────────────────────────────────────────────────

CHUNK_SIZE          = 380       # tokens per chunk
CHUNK_OVERLAP       = 45        # token overlap between chunks

# ── Retrieval ────────────────────────────────────────────────────────

RETRIEVE_TOP_K      = 20        # FAISS candidates per query
RERANK_TOP_N        = 5         # final chunks after reranking
MAX_REWRITES        = 2         # max retry loops (0, 1, 2)
MAX_ALT_QUERIES     = 3         # max rewritten queries per pass

# ── Models ───────────────────────────────────────────────────────────

EMBED_MODEL         = "BAAI/bge-base-en-v1.5"
EMBED_PREFIX        = "Represent this sentence for searching relevant passages: "
RERANKER_MODEL      = "BAAI/bge-reranker-v2-m3"

LLM_MODEL           = "qwen2.5-7b-awq"         # GPU: ~15-25 tok/s on RTX 4000
LLM_MODEL_FALLBACK  = "qwen2.5:14b"            # CPU fallback: ~2-4 tok/s
LLM_TEMPERATURE     = 0
LLM_NUM_CTX         = 16384                     # override Ollama default of 4096

# ── Auth ─────────────────────────────────────────────────────────────

JWT_SECRET          = "change-this"
JWT_ALGORITHM       = "HS256"
JWT_EXPIRE_MINUTES  = 60 * 8                    # 8 hours

# ── Role Hierarchy ───────────────────────────────────────────────────

ROLE_HIERARCHY = {"read_only": 0, "chat": 1, "admin": 2}
