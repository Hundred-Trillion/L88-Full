# L88 — Agentic RAG Knowledge Engine

> **100% Local · Zero Cloud · Fully Private**

L88 is a locally-hosted agentic RAG system for researchers. Upload PDFs, ask questions, and get cited answers — powered by a self-correcting LangGraph pipeline running on your own hardware. Multi-user, multi-session, with role-based access control.

---

## Architecture

For a deep dive into the neural models, retrieval logic, and graph orchestration, see [ARCHITECTURE.md](file:///home/aid-pc/Desktop/Adithya/L88-Full/ARCHITECTURE.md).

```
┌────────────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                       │
│   Sidebar (Sessions)  │  ChatPanel (Messages)  │  RightPanel       │
│   Role Switcher       │  Web Toggle · Upload   │  Docs · Notes     │
│   Session CRUD        │  Markdown Rendering    │  Members           │
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
| **Retrieval** | FAISS (vector store), BGE (embeddings + reranking) |
| **LLM** | Qwen2.5-AWQ (4-bit quantized, GPU-optimized) |

---

## Agentic RAG Pipeline

L88 doesn't just retrieve — it **reasons**. The backend runs a cyclic graph that self-corrects:

1. **Router** — Routes to RAG (docs selected) or general chat (no docs, LLM trained knowledge)
2. **Analyzer & Rewriter** — Decomposes complex queries into search-optimized sub-tasks
3. **Retrieval** — Queries session documents via FAISS with BGE embeddings + reranking
4. **Generator** — Produces structured answers with context evaluation and inline citations
5. **Self-Evaluator** — Validates answers against evidence; retries with rewritten queries if gaps found

When no documents are uploaded, L88 falls back to the LLM's trained knowledge for general conversation.

---

## Features

- **Session Workspaces** — Isolated research sessions with their own documents and chat history
- **Per-Session Collaboration** — Add users with role-based access (Admin / Chat / Read Only)
- **Document Management** — Upload PDFs, toggle selection, delete — per session
- **Scratchpad** — Per-session research notes with autosave and `.txt` download
- **Web Mode** — Toggle internet-augmented retrieval
- **General Chat** — Works without docs — the LLM answers from trained knowledge
- **100% Offline** — Local LLM, local vector store, no external API calls

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

- **GPU**: NVIDIA with ≥8 GB VRAM
- **RAM**: 16 GB+ recommended
- **Python**: 3.10+
- **Node.js**: 18+
- **Ollama**: [ollama.com](https://ollama.com/)

### 1. Clone

```bash
git clone https://github.com/Hundred-Trillion/L88-Full.git
cd L88-Full
```

### 2. Backend

```bash
# Install dependencies
cd l88_backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start backend (from project root, not l88_backend/)
cd ~/path/to/L88-Full
uvicorn l88_backend.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd l88_frontend
npm install
npm run dev
```

Open **http://localhost:8888**

### Default Login

```
Username: admin
Password: admin123
```

---

## Project Structure

```
L88-Full/
├── l88_backend/
│   ├── main.py                # FastAPI entry point
│   ├── config.py              # Model & storage config
│   ├── database.py            # SQLModel + user seeding
│   ├── routers/
│   │   ├── auth.py            # JWT authentication
│   │   ├── sessions.py        # Session CRUD
│   │   ├── chat.py            # Chat + RAG trigger
│   │   ├── documents.py       # Document management
│   │   ├── members.py         # Member management
│   │   ├── scratchpad.py      # Session notes
│   │   └── admin/             # Admin endpoints
│   ├── services/              # Business logic
│   ├── graph/                 # LangGraph agentic pipeline
│   │   ├── nodes/
│   │   │   ├── router.py      # Intent routing
│   │   │   ├── query_analyzer.py
│   │   │   ├── query_rewriter.py
│   │   │   ├── retrieval.py   # FAISS search
│   │   │   ├── generator.py   # LLM generation
│   │   │   └── self_evaluator.py
│   │   ├── edges.py           # Conditional routing
│   │   └── graph.py           # Graph assembly
│   ├── ingestion/             # PDF parsing, chunking, embedding
│   └── retrieval/             # FAISS vector store
├── l88_frontend/
│   ├── src/
│   │   ├── App.tsx            # Root + state management
│   │   ├── components/
│   │   │   ├── LoginPage.tsx  # Auth screen
│   │   │   ├── Sidebar.tsx    # Sessions + role switcher
│   │   │   ├── ChatPanel.tsx  # Chat + input + web toggle
│   │   │   └── RightPanel.tsx # Docs + scratchpad + members
│   │   ├── services/api.ts    # Backend API client
│   │   ├── context/           # Auth + Theme providers
│   │   └── types.ts           # TypeScript types
│   └── vite.config.ts
└── README.md
```

---

## License

Proprietary — L88 Laboratories / Hundred Trillion.
