"""
L88-Full Backend — FastAPI entry point.

Mounts all routers. On startup:
  1. Creates database tables
  2. Seeds hardcoded users
  3. Checks Ollama connectivity (warns if unreachable)
"""

import logging

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from l88_backend.config import LLM_MODEL
from l88_backend.database import create_db_and_tables, seed_users

# Routers
from l88_backend.routers import auth, sessions, chat, documents, members, scratchpad
from l88_backend.routers.admin import users as admin_users
from l88_backend.routers.admin import library as admin_library
from l88_backend.routers.admin import sessions as admin_sessions
from l88_backend.routers.admin import system as admin_system

logger = logging.getLogger("l88")

app = FastAPI(
    title="L88 — Agentic RAG Backend",
    description="Full local agentic RAG system. No cloud. No auth complexity.",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development; can be restricted later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routers ────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(members.router)
app.include_router(scratchpad.router)
app.include_router(admin_users.router)
app.include_router(admin_library.router)
app.include_router(admin_sessions.router)
app.include_router(admin_system.router)


# ── Startup Event ────────────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    """Initialize database and check dependencies."""
    # 1. Create tables
    create_db_and_tables()
    logger.info("Database tables created.")

    # 2. Seed users
    seed_users()
    logger.info("Hardcoded users seeded.")

    # 3. Ollama health check
    try:
        resp = httpx.get("http://localhost:11434/api/tags", timeout=5.0)
        if resp.status_code == 200:
            models = [m["name"] for m in resp.json().get("models", [])]
            if any(LLM_MODEL in m for m in models):
                logger.info(f"Ollama OK — '{LLM_MODEL}' available.")
            else:
                logger.warning(
                    f"⚠ Ollama running but '{LLM_MODEL}' not found. "
                    f"Available: {models}. Run the Modelfile setup."
                )
        else:
            logger.warning("⚠ Ollama responded with non-200. Check Ollama status.")
    except Exception:
        logger.warning(
            "⚠ Ollama is not reachable at localhost:11434. "
            "Start Ollama with 'ollama serve &' before sending queries."
        )


# ── Root ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    """Health check."""
    return {"status": "ok", "service": "L88 Agentic RAG Backend"}
