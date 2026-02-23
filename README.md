# L88: Noctis — Agentic Scientific Intelligence

**Full system. Local. No cloud. Zen Minimalism.**

L88 (Intelligence Layer) with Noctis (Interaction Portal) represents a leap in autonomous scientific discovery. It is an agentic RAG system designed to run entirely on local hardware (optimized for Nvidia RTX 4000), providing researchers with a secure, high-performance environment for document analysis and knowledge synthesis.

---

## 🏗 Architecture: Noctis v1

Noctis v1 is built on the **"Zen Minimalist"** philosophy — an achromatic, high-contrast interface designed to minimize cognitive load and focus entirely on the data.

### Tech Stack
- **Frontend**: React 19, Vite 6, Tailwind 4, Framer Motion (Transitions).
- **Backend**: FastAPI (Python 3.10+), SQLModel (SQLite), FAISS (Vector Store).
- **Intelligence**: LangGraph (Agentic Orchestration), Ollama (Local LLM), BGE (Embeddings & Reranking).

---

## 🧠 The Agentic RAG Pipeline

L88 doesn't just retrieve; it reasons. The backend implements a cyclic agentic graph:
1. **Router**: Determines if the query requires RAG, direct chat, or system commands.
2. **Analyzer & Rewriter**: Deconstructs complex scientific queries into search-optimized sub-tasks.
3. **Multi-Source Retrieval**: Queries session-specific documents and the global "Curated Library" concurrently.
4. **Self-Evaluator**: Critiques generated answers against the retrieved evidence to eliminate hallucinations.
5. **Generator (Qwen2.5-AWQ)**: Synthesizes the final answer with LaTeX support and cited evidence.

---

## 🚀 Getting Started

### 1. Hardware Prerequisites
- **GPU**: Nvidia GPU with ≥8GB VRAM (RTX 4000 8GB confirmed).
- **RAM**: 16GB+ recommended for BGE reranking and embedding.
- **LLM Engine**: [Ollama](https://ollama.com/) must be installed and running.

### 2. Backend Setup
```bash
cd l88_backend
pip install -r requirements.txt

# Register Models with Ollama (Required)
# See project.md for detailed Modelfile setup
ollama serve &
```

### 3. Frontend Setup
```bash
cd l88_frontend
npm install
npm run dev
# Noctis will be served at http://localhost:8888
```

---

## 🛡 Security & Roles
L88 implements a tiered permission system (Admin, Chat, Read Only).
- **Admin**: Full control over session documentation, personnel, and Knowledge Ledger.
- **Chat**: Can participate in investigations and toggle evidence sources.
- **Read Only**: Passive observer mode.

---
*Authored by L88 Laboratories — Redefining Scientific Collaboration.*
