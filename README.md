# L88 — Agentic RAG Knowledge Engine

> **100% Local. Zero Cloud. Full Intelligence.**

L88 is an agentic RAG system designed to run entirely on local hardware. It provides researchers with a secure, high-performance environment for document analysis, knowledge synthesis, and multi-user collaboration — all without any cloud dependency.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Frontend (React + Vite)                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Sidebar   │  │  ChatPanel   │  │  RightPanel  │  │  Library   │  │
│  │ Sessions  │  │  Messages    │  │  Documents   │  │  Curated   │  │
│  │ Members   │  │  Markdown    │  │  Scratchpad  │  │  Global KB │  │
│  └──────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                        Backend (FastAPI + SQLModel)                   │
│  ┌────────┐  ┌──────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │  Auth   │  │ Sessions │  │  Members   │  │  Admin / Library   │  │
│  │  JWT    │  │  CRUD    │  │  Per-Sesn  │  │  Curated Docs      │  │
│  └────────┘  └──────────┘  └────────────┘  └────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                     Intelligence (LangGraph + Ollama)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Router  │  │ Analyzer │  │ Retriever │  │ Self-Evaluator    │  │
│  │  Intent  │  │ Rewriter │  │ FAISS+BGE │  │ Hallucination Chk │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 6, Tailwind CSS 4, Framer Motion |
| **Backend** | FastAPI, SQLModel (SQLite), Pydantic |
| **Intelligence** | LangGraph (Agentic Orchestration), Ollama (Local LLM) |
| **Retrieval** | FAISS (Vector Store), BGE (Embeddings + Reranking) |
| **LLM** | Qwen2.5-AWQ (4-bit quantized, GPU-optimized) |

---

## The Agentic RAG Pipeline

L88 doesn't just retrieve — it reasons. The backend implements a cyclic agentic graph:

1. **Router** — Determines if the query requires RAG, direct chat, or system commands
2. **Analyzer & Rewriter** — Deconstructs complex queries into search-optimized sub-tasks
3. **Multi-Source Retrieval** — Queries session documents and the global curated library concurrently via FAISS
4. **Self-Evaluator** — Critiques generated answers against retrieved evidence to eliminate hallucinations
5. **Generator** — Synthesizes the final answer with LaTeX support and cited evidence

---

## Features

- **Session-based Workspaces** — Create isolated research sessions with their own documents and chat history
- **Per-Session Collaboration** — Add other users to a session with role-based access (Admin, Chat, Read Only)
- **Curated Library** — Admin-managed global knowledge base. Upload PDFs anytime to grow the shared library
- **Document Management** — Upload PDFs per session, toggle selection, and manage your evidence base
- **Scratchpad** — Per-session research notes with save/download functionality
- **Web Mode** — Toggle internet-augmented retrieval per session
- **Dark/Light Theme** — System-aware with manual toggle
- **100% Offline** — Self-hosted fonts, local LLM, local vector store. No external calls

---

## Roles & Permissions

| Capability | Admin | Chat | Read Only |
|-----------|-------|------|-----------|
| Send messages | ✅ | ✅ | ❌ |
| Upload/delete documents | ✅ | ❌ | ❌ |
| Toggle document selection | ✅ | ✅ | ❌ |
| Manage session members | ✅ | ❌ | ❌ |
| Edit scratchpad | ✅ | ❌ | ❌ |
| View everything | ✅ | ✅ | ✅ |
| Manage curated library | ✅ | ❌ | ❌ |

---

## Getting Started

### Prerequisites

- **GPU**: NVIDIA GPU with ≥8 GB VRAM (RTX 4000 confirmed)
- **RAM**: 16 GB+ recommended
- **Python**: 3.10+
- **Node.js**: 18+
- **Ollama**: [Install Ollama](https://ollama.com/)

### 1. Clone

```bash
git clone git@github.com:Hundred-Trillion/L88-Full.git
cd L88-Full
```

### 2. Backend

```bash
cd l88_backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start Ollama (separate terminal)
ollama serve &

# Start backend
uvicorn l88_backend.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd l88_frontend
npm install
npm run dev
```

The app will be served at **http://localhost:8888**.

---

## Project Structure

```
L88-Full/
├── l88_backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py             # Model & storage configuration
│   ├── database.py           # SQLModel setup + user seeding
│   ├── routers/
│   │   ├── auth.py           # JWT authentication
│   │   ├── sessions.py       # Session CRUD
│   │   ├── chat.py           # Chat + RAG pipeline trigger
│   │   ├── documents.py      # Per-session document management
│   │   ├── members.py        # Per-session member management
│   │   ├── scratchpad.py     # Per-session notes
│   │   └── admin/            # Admin-only endpoints
│   │       ├── library.py    # Curated library management
│   │       ├── users.py      # User administration
│   │       ├── sessions.py   # Session administration
│   │       └── system.py     # System status
│   ├── services/             # Business logic layer
│   ├── graph/                # LangGraph agentic pipeline
│   ├── ingestion/            # PDF parsing, chunking, embedding
│   └── retrieval/            # FAISS vector store operations
├── l88_frontend/
│   ├── src/
│   │   ├── App.tsx           # Root component + state management
│   │   ├── components/
│   │   │   ├── LoginPage.tsx     # Authentication portal
│   │   │   ├── Sidebar.tsx       # Navigation + members
│   │   │   ├── ChatPanel.tsx     # Chat interface
│   │   │   ├── RightPanel.tsx    # Documents + scratchpad
│   │   │   └── LibraryPanel.tsx  # Curated library management
│   │   ├── services/api.ts   # Backend API client
│   │   ├── context/          # Auth + Theme providers
│   │   └── types.ts          # TypeScript domain types
│   └── public/fonts/         # Self-hosted Inter font (offline)
└── README.md
```

---

## License

This project is proprietary to L88 Laboratories / Hundred Trillion.
