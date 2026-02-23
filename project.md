# L88 — Complete Backend Specification
**Full system. Local. No cloud. No auth complexity.**

---

## What This Document Covers

- Project structure
- All backend features from the spec
- User system (hardcoded, local)
- Admin panel (document management, curated library)
- Session management
- RAG pipeline (references agentic RAG doc)
- Web toggle behavior
- Role enforcement
- API surface (FastAPI)
- Data storage strategy

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | FastAPI | Async, fast, clean |
| Database | SQLite via `SQLModel` | Local, no infra, simple schema |
| Vector Store | FAISS `IndexFlatIP` (per session + library) | Local, no server |
| File Storage | Local filesystem | Simple, no S3 |
| LLM | `qwen2.5-7b-awq` via Ollama (GPU) | Confirmed on RTX 4000, ~15–25 tok/s |
| LLM Fallback | `qwen2.5:14b` via Ollama (CPU) | Deep reasoning tasks, confirmed installed |
| Reranker | `BAAI/bge-reranker-v2-m3` | Confirmed installed, CPU, newer architecture |
| Auth | Hardcoded users + JWT | No registration flow needed |
| Admin Panel | Separate FastAPI router `/admin` | Same backend, different prefix |

---

## Hardware Fit (RTX 4000 — 8GB VRAM + i7-10700)

**Confirmed Hardware (nvidia-smi verified):**
- GPU: Nvidia Quadro RTX 4000 — 8.0 GiB total, **7.0 GiB available** to Ollama at idle
- CPU: Intel Core i7-10700 @ 2.90GHz — 8 cores / 16 threads (4.8GHz boost)
- CUDA: 12.6 | Driver: 560.35.03 | Compute: 7.5

```
GPU (7.0 GiB available to Ollama at idle)
  Desktop (Xorg + gnome-shell)          ~0.6 GB  ← always consumed
  Qwen2.5-7B-AWQ                        ~6.0 GB  ← fits fully on GPU
  BGE embedder (CPU — no VRAM used)      0.0 GB
  BGE reranker (CPU — no VRAM used)      0.0 GB
  ─────────────────────────────────────────────
  Remaining headroom                    ~0.4 GB  ⚠ tight

CPU RAM
  FAISS indexes                        ~1-2 GB
  BGE-base embedder                    ~0.4 GB
  BGE-reranker-v2-m3                   ~1.0 GB
  FastAPI + Python overhead            ~1.0 GB
  OS                                   ~4.0 GB
```

**⚠ Ollama Low VRAM Mode:** Ollama detects 8GB < 20GB threshold and enters low VRAM mode automatically. This is normal — it does not prevent GPU inference, but means Ollama will be more aggressive about offloading layers to CPU if VRAM pressure increases.

**⚠ Context Window Default:** Ollama defaults to `OLLAMA_CONTEXT_LENGTH=4096`. For RAG (5 chunks + reasoning + answer), this is too tight. **Set to 16384 in the Modelfile** — gives 3× headroom over realistic RAG payloads (~3000–5000 tokens) while staying well within VRAM limits (~2GB KV cache):

```bash
# In Modelfile (the right approach — permanent, documented, single source of truth)
PARAMETER num_ctx 16384
```

**Speed:** Qwen2.5-7B-AWQ on GPU: ~15–25 tok/s | Qwen2.5-14B on CPU: ~2–4 tok/s

---

### Ollama Setup — Models Not Yet Registered

**Important:** HuggingFace model weights are downloaded but Ollama has 0 models registered (only 5 blobs present). Every model needs to be created via Modelfile before use.

```bash
# Step 1 — Get the snapshot ID
ls ~/.cache/huggingface/hub/models--Qwen--Qwen2.5-7B-Instruct-AWQ/snapshots/
# → copy the hash, e.g. cd8af32e1c912b9ed88a6a0fcd9f13e7cb123fa1

# Step 2 — Create Modelfile (replace <SNAPSHOT-ID>)
cat > ~/Modelfile-qwen7b << 'EOF'
FROM /home/aid-pc/.cache/huggingface/hub/models--Qwen--Qwen2.5-7B-Instruct-AWQ/snapshots/<SNAPSHOT-ID>/model.safetensors

TEMPLATE """{{ .Prompt }}"""

PARAMETER temperature 0
PARAMETER top_p 0.9
PARAMETER num_ctx 16384
PARAMETER stop "</s>"
EOF

# Step 3 — Register with Ollama
ollama create qwen2.5-7b-awq -f ~/Modelfile-qwen7b

# Step 4 — Verify
ollama list
# Should show: qwen2.5-7b-awq

# Step 5 — Test
ollama run qwen2.5-7b-awq "Say hello"
```

Same process needed for `qwen2.5:14b` fallback (use its snapshot path).

**Run Ollama as a background service** (so it survives terminal close):
```bash
ollama serve &
# Or add to systemd for auto-start on boot
```

---

## Project Structure

```
l88_backend/
│
├── main.py                    # FastAPI app entry point
├── config.py                  # All constants — one place
├── database.py                # SQLite setup, SQLModel engine
│
├── routers/
│   ├── auth.py                # Login, token
│   ├── sessions.py            # CRUD for sessions
│   ├── documents.py           # Upload, delete, list, toggle checkbox
│   ├── chat.py                # Send message, get response
│   ├── library.py             # Approved library (read)
│   ├── members.py             # Add/remove session members
│   ├── scratchpad.py          # Get/update/download scratch pad
│   └── admin/
│       ├── users.py           # View hardcoded users
│       ├── library.py         # Upload/delete curated library docs
│       └── sessions.py        # View all sessions (oversight)
│
├── models/
│   ├── user.py                # User, Role
│   ├── session.py             # Session, SessionType
│   ├── document.py            # Document, DocumentSource
│   ├── message.py             # Message, Citation
│   ├── member.py              # SessionMember
│   └── scratchpad.py          # ScratchPad
│
├── services/
│   ├── auth_service.py        # Token creation, role checking
│   ├── session_service.py     # Session logic, type transitions
│   ├── document_service.py    # Ingest, embed, FAISS store
│   ├── chat_service.py        # Orchestrates agentic RAG graph
│   ├── library_service.py     # Curated library management
│   └── source_service.py      # Web toggle source resolution
│
├── graph/                     # Agentic RAG (see RAG spec doc)
│   ├── state.py               # L88State TypedDict
│   ├── nodes/
│   │   ├── router.py
│   │   ├── query_analyzer.py
│   │   ├── query_rewriter.py
│   │   ├── retrieval.py
│   │   ├── generator.py       # collapsed: context eval + generation
│   │   └── self_evaluator.py
│   ├── edges.py               # All routing functions
│   └── graph.py               # LangGraph assembly (cyclic)
│
├── ingestion/
│   ├── parser.py              # PyMuPDF
│   ├── chunker.py             # pysbd + RecursiveCharacterTextSplitter
│   └── embedder.py            # BGE-base-en-v1.5 (CPU)
│
├── retrieval/
│   ├── vectorstore.py         # FAISS IndexFlatIP
│   └── reranker.py            # BAAI/bge-reranker-v2-m3 (CPU)
│
├── llm/
│   └── client.py              # Ollama wrapper — GPU primary, CPU fallback, num_ctx=16384 on every call
│
└── storage/
    ├── sessions/              # Per-session docs + FAISS indexes
    │   └── {session_id}/
    │       ├── docs/          # Raw uploaded files
    │       └── index/         # FAISS index + chunk metadata JSON
    └── library/               # Curated library docs + FAISS index
        ├── docs/
        └── index/
```

---

## Database Schema (SQLite via SQLModel)

### User
```python
class User(SQLModel, table=True):
    id: int = Field(primary_key=True)
    username: str = Field(unique=True)
    password_hash: str
    role: str                  # "admin" | "chat" | "read_only"
    display_name: str
    active: bool = True
```

Hardcoded at startup — no registration endpoint.
Seeded from `config.py` on first run. Never touched again unless config changes.

---

### Session
```python
class Session(SQLModel, table=True):
    id: str = Field(primary_key=True)   # UUID
    name: str
    session_type: str                   # "general" | "rag"
    created_by: int                     # FK → User.id
    created_at: datetime
    web_mode: bool = False
```

---

### Document
```python
class Document(SQLModel, table=True):
    id: str = Field(primary_key=True)   # UUID
    session_id: Optional[str]           # FK → Session (null for library docs)
    filename: str
    source: str                         # "session" | "library"
    uploaded_by: int                    # FK → User.id
    uploaded_at: datetime
    page_count: int
    chunk_count: int
    selected: bool = True               # checkbox state, per spec §5
```

---

### SessionMember
```python
class SessionMember(SQLModel, table=True):
    id: int = Field(primary_key=True)
    session_id: str                     # FK → Session
    user_id: int                        # FK → User
    role: str                           # "admin" | "chat" | "read_only"
                                        # session-level, overrides User.role
```

---

### Message
```python
class Message(SQLModel, table=True):
    id: str = Field(primary_key=True)   # UUID
    session_id: str                     # FK → Session
    user_id: int                        # FK → User
    role: str                           # "user" | "assistant"
    content: str                        # final answer
    reasoning: str                      # <think> block — shown in UI
    confident: bool = True              # False → ⚠ in UI
    context_verdict: str                # "SUFFICIENT" | "GAP" | "EMPTY"
    missing_info: str                   # populated if GAP
    created_at: datetime
```

---

### Citation
```python
class Citation(SQLModel, table=True):
    id: int = Field(primary_key=True)
    message_id: str                     # FK → Message
    document_id: str                    # FK → Document
    filename: str
    page: int
    excerpt: str
```

---

### ScratchPad
```python
class ScratchPad(SQLModel, table=True):
    id: int = Field(primary_key=True)
    session_id: str = Field(unique=True)  # FK → Session, one per session
    content: str = ""
    updated_at: datetime
    updated_by: int                       # FK → User
```

---

## Users & Roles

### Hardcoded in config.py

```python
HARDCODED_USERS = [
    {"username": "alice", "password": "xxxx", "role": "admin",     "display_name": "Alice"},
    {"username": "bob",   "password": "xxxx", "role": "chat",      "display_name": "Bob"},
    {"username": "carol", "password": "xxxx", "role": "read_only", "display_name": "Carol"},
]
```

To add a user: edit config, restart. No UI for user management.

---

### Role Permissions

| Action | Admin | Chat | Read Only |
|---|---|---|---|
| Chat | ✓ | ✓ | ✗ |
| Upload documents | ✓ | ✗ | ✗ |
| Delete documents | ✓ | ✗ | ✗ |
| Toggle doc checkboxes | ✓ | ✓ | ✗ |
| Toggle web mode | ✓ | ✓ | ✗ |
| Edit Scratch Pad | ✓ | ✗ | ✗ |
| Manage members | ✓ | ✗ | ✗ |
| Access admin panel | ✓ | ✗ | ✗ |

### Session-Level Role Override
`SessionMember.role` overrides `User.role` for that session.
Example: Bob is globally `chat` but can be made session-level `admin` by Alice.
Effective role = `SessionMember.role` if exists, else `User.role`.

### Role Enforcement
Every protected endpoint resolves effective role before executing:

```python
def get_effective_role(user_id, session_id=None) -> str:
    if session_id:
        member = get_session_member(user_id, session_id)
        if member:
            return member.role
    return get_user(user_id).role

def require_role(minimum: str):
    # Raises HTTP 403 if effective role is below minimum
    # Order: read_only < chat < admin
```

---

## Session Management

### Session Types
```
general  →  No documents. Chat only. Uses training data (+ library if web ON).
rag      →  Has documents. Full agentic RAG pipeline.
```

### Automatic Type Transitions
```
Create session, no docs uploaded  →  general
Upload first document             →  switches to rag
Delete all documents              →  switches back to general
                                     (if web OFF and user tries to chat → error)
```

### Session Creation
```
POST /sessions
  body: { name: str, web_mode: bool }
  requires: any authenticated user

1. Create Session record (type = "general")
2. Create empty ScratchPad for session
3. Add creator as session Admin (SessionMember)
4. Return session object
```

---

## Document Upload & Ingestion

```
POST /sessions/{session_id}/documents
  body: multipart/form-data (PDF file)
  requires: admin role in session

1. Validate: PDF only
2. Save to storage/sessions/{session_id}/docs/{doc_id}.pdf
3. Parse with PyMuPDF → extract text blocks, preserve page numbers
4. Tokenize sentences with pysbd
5. Chunk with RecursiveCharacterTextSplitter (380 tokens, 45 overlap)
6. Embed chunks with BGE-small (batch, GPU)
7. Add vectors to session FAISS IndexFlatIP
8. Save chunk metadata JSON (chunk_id, doc_id, page, text)
9. Save Document record (selected=True, chunk_count=N)
10. If session.type == "general" → update to "rag"
11. Return document metadata
```

---

## Web Toggle

Stored on `Session.web_mode`. Toggled via:

```
PATCH /sessions/{session_id}/web-mode
  body: { web_mode: bool }
  requires: chat role minimum
```

### Source Resolution at Query Time

```python
def resolve_sources(session_id, selected_doc_ids, web_mode):
    sources = []

    # Always: selected session docs
    if selected_doc_ids:
        sources.append({
            "type": "session",
            "doc_ids": selected_doc_ids,
            "index_path": f"storage/sessions/{session_id}/index"
        })

    if web_mode:
        # Curated library — retrieved explicitly
        sources.append({
            "type": "library",
            "index_path": "storage/library/index"
        })
        # Training data — implicit. Generator prompt is not restricted
        # to chunks only when web=ON, so Qwen uses background knowledge
        # only when chunks don't cover the question.

    return sources
```

Priority: session docs → library → training data (implicit).

---

## Approved Library (Curated Web)

Global. Not session-scoped. Admin-managed only.
Lives at `storage/library/`. Has its own FAISS index.
Rebuilt on every upload or delete.

When `web_mode=ON`, Retrieval node queries both session FAISS and library FAISS.
Results are merged before reranking. Session docs always retrieved first.

### Admin Endpoints
```
GET    /admin/library              → list all library docs
POST   /admin/library              → upload PDF (admin only)
DELETE /admin/library/{doc_id}     → delete doc + rebuild library index
```

### Upload Flow
Same as session doc ingestion but:
- Saved to `storage/library/docs/`
- Added to shared library FAISS index
- Document record: `source = "library"`, `session_id = null`

---

## Chat Flow (Full)

```
POST /sessions/{session_id}/chat
  body: { query: str }
  requires: chat role minimum

1. Load session (type, web_mode)
2. Validate:
   - If type == "general" and web OFF → error "No sources available"
   - If type == "rag" and 0 docs selected and web OFF → error "Select at least one document"
3. Load selected_doc_ids from Document table
4. Run agentic RAG graph:
   Inputs:  query, session_id, selected_doc_ids, web_mode
   Outputs: answer, reasoning, sources, confident, context_verdict, missing_info
5. Save Message (role="user", content=query)
6. Save Message (role="assistant", all fields)
7. Save Citations
8. Return full response object
```

---

## Scratch Pad

One per session. Autosaves on every PATCH.

```
GET   /sessions/{session_id}/scratchpad           → get content
PATCH /sessions/{session_id}/scratchpad           → update (admin only)
  body: { content: str }
GET   /sessions/{session_id}/scratchpad/download  → returns .txt file
```

Role enforcement:
- Admin → read + write
- Chat → read only
- Read Only → read only

---

## Members

```
GET    /sessions/{session_id}/members              → list members + roles
POST   /sessions/{session_id}/members              → add member
  body: { username: str, role: str }
DELETE /sessions/{session_id}/members/{user_id}    → remove member

All: admin role in session required
```

---

## Document Checkbox Toggle

```
PATCH /sessions/{session_id}/documents/{doc_id}/select
  body: { selected: bool }
  requires: chat role minimum

Updates Document.selected.
Next query uses updated selection.
Footer count ("X docs selected") derives from this.
```

---

## Admin Panel

Prefix: `/admin`. Global admin role required on all routes.

```
# Users (view only — managed via config)
GET  /admin/users

# Sessions (oversight — view all, not just own)
GET  /admin/sessions
GET  /admin/sessions/{id}

# Library
GET    /admin/library
POST   /admin/library
DELETE /admin/library/{doc_id}

# System status
GET  /admin/system/status
  Returns: Ollama model status, FAISS index sizes, disk usage, user list
```

---

## Full API Surface

```
# Auth
POST   /auth/login

# Sessions
GET    /sessions
POST   /sessions
GET    /sessions/{id}
DELETE /sessions/{id}
PATCH  /sessions/{id}/web-mode

# Documents
GET    /sessions/{id}/documents
POST   /sessions/{id}/documents
DELETE /sessions/{id}/documents/{doc_id}
PATCH  /sessions/{id}/documents/{doc_id}/select

# Chat
POST   /sessions/{id}/chat
GET    /sessions/{id}/messages

# Members
GET    /sessions/{id}/members
POST   /sessions/{id}/members
DELETE /sessions/{id}/members/{user_id}

# Scratch Pad
GET    /sessions/{id}/scratchpad
PATCH  /sessions/{id}/scratchpad
GET    /sessions/{id}/scratchpad/download

# Admin
GET    /admin/users
GET    /admin/sessions
GET    /admin/sessions/{id}
GET    /admin/library
POST   /admin/library
DELETE /admin/library/{doc_id}
GET    /admin/system/status
```

---

## config.py — Complete

```python
# Hardcoded users
HARDCODED_USERS = [
    {"username": "alice", "password": "xxxx", "role": "admin",     "display_name": "Alice"},
    {"username": "bob",   "password": "xxxx", "role": "chat",      "display_name": "Bob"},
    {"username": "carol", "password": "xxxx", "role": "read_only", "display_name": "Carol"},
]

# Storage
STORAGE_DIR         = "./storage"
SESSION_STORAGE     = "./storage/sessions"
LIBRARY_STORAGE     = "./storage/library"
DATABASE_URL        = "sqlite:///./l88.db"

# Ingestion
CHUNK_SIZE          = 380
CHUNK_OVERLAP       = 45

# Retrieval
RETRIEVE_TOP_K      = 20
RERANK_TOP_N        = 5
MAX_REWRITES        = 2
MAX_ALT_QUERIES     = 3

# Models
EMBED_MODEL         = "BAAI/bge-base-en-v1.5"          # CPU, confirmed installed
EMBED_PREFIX        = "Represent this sentence for searching relevant passages: "
RERANKER_MODEL      = "BAAI/bge-reranker-v2-m3"        # CPU, confirmed installed
LLM_MODEL           = "qwen2.5-7b-awq"                 # GPU: ~15-25 tok/s on RTX 4000
LLM_MODEL_FALLBACK  = "qwen2.5:14b"                    # CPU fallback: ~2-4 tok/s
LLM_TEMPERATURE     = 0
LLM_NUM_CTX         = 16384   # Override Ollama default of 4096 — required for RAG

# Auth
JWT_SECRET          = "change-this"
JWT_EXPIRE_MINUTES  = 60 * 8

# Confirmed HuggingFace models installed at ~/.cache/huggingface/hub:
#   BAAI/bge-base-en-v1.5          ← embedder (primary)
#   BAAI/bge-large-en-v1.5         ← embedder (alternative)
#   BAAI/bge-reranker-base         ← reranker (fallback)
#   BAAI/bge-reranker-v2-m3        ← reranker (primary)
#   Qwen/Qwen2.5-7B-Instruct-AWQ   ← LLM primary (GPU)
#   Qwen/Qwen2.5-14B-Instruct      ← LLM fallback (CPU)
#   Qwen/Qwen2.5-3B-Instruct-AWQ   ← LLM fast fallback (GPU, if needed)
#   Qwen/Qwen3-235B-A22B-...       ← too large for this hardware
#   meta-llama/Llama-3.2-3B        ← available but not used
#   meta-llama/Llama-4-Scout-17B   ← CPU only, very slow
#   mistralai/Mixtral-8x7B         ← CPU only, slow
#   zai-org/GLM-4.7-Flash          ← available but not used
#
# ⚠ None of the above are registered in Ollama yet.
#   Run the Modelfile setup (see Hardware section) before first use.
```

---

## Dependencies

```txt
fastapi
uvicorn
sqlmodel
python-jose[cryptography]
passlib[bcrypt]
python-multipart
langchain>=0.3
langgraph>=0.2
faiss-cpu
sentence-transformers>=3.0
pysbd
tiktoken
pymupdf
```

```bash
pip install -r requirements.txt

# ⚠ Ollama models must be registered before use (HuggingFace weights are present
# but Ollama has 0 models registered — see Hardware section for Modelfile setup)
#
# After running the Modelfile setup:
ollama list   # should show qwen2.5-7b-awq (and qwen2.5:14b if created)

# Ollama must be running before starting the backend:
ollama serve &
```

---

## Build Order

```
1.  database.py + models/          → schema, seed users
2.  routers/auth.py                → login + JWT works
3.  routers/sessions.py            → create, list sessions
4.  ingestion/                     → parser → chunker → embedder
5.  retrieval/                     → FAISS + BGE-reranker
6.  graph/                         → full agentic pipeline (see RAG doc)
7.  routers/chat.py                → wire graph to endpoint
8.  routers/documents.py           → upload, select, delete
9.  routers/library.py             → read library docs
10. routers/admin/library.py       → upload/delete curated docs
11. routers/members.py             → add/remove members
12. routers/scratchpad.py          → get, update, download
13. routers/admin/                 → admin panel endpoints
14. Wire to frontend
```

---

## What Is Not Here

- No email / notifications
- No file types beyond PDF
- No user registration (config only)
- No cloud storage
- No rate limiting (local, not needed yet)
- No multi-tenancy