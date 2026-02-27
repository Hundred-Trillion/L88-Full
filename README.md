# L88 — Agentic RAG Knowledge Engine

> **100% Local · Zero Cloud · Fully Private**

L88 is a locally-hosted agentic RAG system for researchers. Upload PDFs, ask questions, and get cited answers — powered by a self-correcting LangGraph pipeline running entirely on your own hardware. Multi-user, multi-session, role-based access control.

---

## Architecture

For a deep dive into models, retrieval logic, and graph orchestration see [ARCHITECTURE.md](./ARCHITECTURE.md).

```
┌────────────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                       │
│   Sidebar (Sessions)  │  ChatPanel (Messages)  │  RightPanel       │
│   Role Switcher       │  Pipeline Status HUD   │  Docs · Notes     │
│   Session CRUD        │  Stop Generation       │  Members          │
├────────────────────────────────────────────────────────────────────┤
│                    Backend (FastAPI + SQLModel)                     │
│   Auth (JWT)  │  Sessions  │  Documents  │  Members  │  Scratchpad │
├────────────────────────────────────────────────────────────────────┤
│                  Intelligence (LangGraph + Ollama)                  │
│   Router → Analyzer → Rewriter → Retriever → Generator             │
│                              ↑          Self-Evaluator ↓           │
│                              └──── retry loop ─────────┘           │
└────────────────────────────────────────────────────────────────────┘
```

| Layer | Stack |
|---|---|
| **Frontend** | React 19, Vite 6, Tailwind CSS 4, Framer Motion, Lucide |
| **Backend** | FastAPI, SQLModel (SQLite), Pydantic, JWT |
| **Intelligence** | LangGraph (agentic orchestration), Ollama (local LLM) |
| **Retrieval** | FAISS (vector store) + BM25 (keyword) + BGE (embed + rerank) |
| **LLM** | Qwen2.5-7B-AWQ (4-bit quantized, GPU-optimized) |

---

## Agentic RAG Pipeline

L88 doesn't just retrieve — it **reasons**. The backend runs a cyclic LangGraph that self-corrects:

1. **Router** — Routes to RAG (docs selected), general chat, or summarization
2. **Analyzer & Rewriter** — Classifies query type, expands acronyms, decomposes into sub-queries
3. **Retrieval** — Hybrid FAISS + BM25 with score normalization and cross-encoder reranking
4. **Generator** — Produces structured answers with reasoning trace and inline citations
5. **Self-Evaluator** — Validates confidence; retries the rewriter loop if evidence gaps are found

When no documents are uploaded, L88 falls back to the LLM's trained knowledge for general conversation.

---

## Features

- **Session Workspaces** — Isolated research sessions with their own documents and chat history
- **Per-Session Collaboration** — Add users with role-based access (Admin / Chat / Read Only)
- **Document Management** — Upload PDFs, toggle selection, delete — per session (async index rebuild)
- **Scratchpad** — Per-session research notes with autosave and `.txt` download
- **Stop Generation** — Cancel an in-flight AI response at any time
- **Live Pipeline Status** — Ambient status text shows what the pipeline is doing while generating
- **Web Mode** — Toggle internet-augmented retrieval
- **General Chat** — Works without docs — the LLM answers from trained knowledge
- **100% Offline** — Local LLM, local vector store, no external API calls
- **Hardened Retrieval** — Header/footer stripping, stopword-aware BM25, score normalization, acronym expansion

---

## Roles & Permissions

| Capability | Admin | Chat | Read Only |
|---|:---:|:---:|:---:|
| Send messages | ✅ | ✅ | ❌ |
| Upload / delete documents | ✅ | ❌ | ❌ |
| Toggle document selection | ✅ | ✅ | ❌ |
| Manage session members | ✅ | ❌ | ❌ |
| Edit scratchpad | ✅ | ❌ | ❌ |
| View everything | ✅ | ✅ | ✅ |

---

## Getting Started

### Prerequisites

- **GPU**: NVIDIA with ≥8 GB VRAM (embedder + reranker on CPU; LLM on GPU)
- **RAM**: 16 GB+ recommended
- **Python**: 3.10+
- **Node.js**: 18+
- **Ollama**: [ollama.com](https://ollama.com/)

### 1. Clone

```bash
git clone https://github.com/Hundred-Trillion/L88-Full.git
cd L88-Full
```

### 2. Pull the LLM

```bash
ollama pull qwen2.5-7b-awq      # Primary (GPU, fast)
# or
ollama pull qwen2.5:14b         # CPU fallback (~2-4 tok/s)
```

### 3. Backend

```bash
# Create and activate virtualenv
python -m venv .venv
source .venv/bin/activate
pip install -r l88_backend/requirements.txt

# Terminal 1: Ollama
ollama serve

# Terminal 2: API server (run from project root, not l88_backend/)
uvicorn l88_backend.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd l88_frontend
npm install
npm run dev
```

Open **http://localhost:8888**

### Default Credentials

| Username | Password | Role |
|---|---|---|
| `adithya` | `adithya` | admin |
| `chetan` | `chetan` | admin |
| `sirius` | `sirius` | chat |
| `joker` | `whysoserious` | chat |

> Edit `l88_backend/config.py` → `HARDCODED_USERS` to change users. Restart required.

---

## Project Structure

```
L88-Full/
├── l88_backend/
│   ├── main.py                 # FastAPI entry point
│   ├── config.py               # Single source of truth: models, chunk sizes, params
│   ├── database.py             # SQLModel engine + user seeding
│   ├── routers/
│   │   ├── auth.py             # JWT authentication
│   │   ├── sessions.py         # Session CRUD
│   │   ├── chat.py             # Chat + RAG trigger
│   │   ├── documents.py        # Upload, delete (async rebuild), select
│   │   ├── members.py          # Member management
│   │   ├── scratchpad.py       # Session notes
│   │   └── admin/              # Admin-only endpoints
│   ├── services/
│   │   ├── auth_service.py     # JWT + RBAC helpers
│   │   ├── document_service.py # Ingestion pipeline + async index rebuild
│   │   ├── chat_service.py     # Graph runner + response serialization
│   │   └── session_service.py  # Session state helpers
│   ├── graph/                  # LangGraph agentic pipeline
│   │   ├── nodes/
│   │   │   ├── router.py       # Intent routing (RAG / chat / summarize)
│   │   │   ├── query_analyzer.py
│   │   │   ├── query_rewriter.py  # Acronym expansion + multi-query generation
│   │   │   ├── retrieval.py    # Hybrid FAISS + BM25 with score normalization
│   │   │   ├── generator.py    # Structured JSON generation
│   │   │   └── self_evaluator.py
│   │   ├── edges.py            # Conditional routing logic
│   │   └── graph.py            # Graph assembly
│   ├── ingestion/
│   │   ├── parser.py           # PyMuPDF + header/footer stripping
│   │   ├── chunker.py          # pysbd sentence splitting + token sizing
│   │   └── embedder.py         # BGE-base-en-v1.5 embeddings
│   ├── retrieval/
│   │   ├── vectorstore.py      # FAISS IndexFlatIP wrapper
│   │   ├── bm25store.py        # BM25Okapi with stopword tokenizer
│   │   └── reranker.py         # BGE-reranker-v2-m3 cross-encoder
│   └── models/                 # SQLModel table definitions
├── l88_frontend/
│   ├── src/
│   │   ├── App.tsx             # Root + state management + AbortController
│   │   ├── components/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── Sidebar.tsx     # Sessions + role switcher
│   │   │   ├── ChatPanel.tsx   # Chat, PipelineStatus HUD, stop button
│   │   │   └── RightPanel.tsx  # Docs (with delete spinner) + scratchpad + members
│   │   ├── services/api.ts     # Backend API client with AbortSignal support
│   │   ├── context/            # Auth + Theme providers
│   │   └── types.ts            # TypeScript types
│   └── vite.config.ts
├── ARCHITECTURE.md
├── RAG_ARCHITECTURE.md
└── README.md
```

---

## Configuration

All tunable parameters live in `l88_backend/config.py`:

| Parameter | Default | Description |
|---|---|---|
| `CHUNK_SIZE` | 380 | Tokens per chunk |
| `CHUNK_OVERLAP` | 45 | Token overlap between chunks |
| `RETRIEVE_TOP_K` | 20 | FAISS + BM25 candidates per query |
| `RERANK_TOP_N` | 7 | Final chunks after cross-encoder reranking |
| `MAX_ALT_QUERIES` | 3 | Rewritten queries per attempt |
| `MAX_REWRITES` | 2 | Max retry loops |
| `LLM_NUM_CTX` | 16384 | Ollama context window override |
| `LLM_TEMPERATURE` | 0 | Sampling temperature (deterministic) |

---

## License

Proprietary — L88 Laboratories / Hundred Trillion.
