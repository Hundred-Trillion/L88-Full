"""
Query cache — exact-match hashing with TTL.

Checks cache before the graph runs. If hit, returns immediately.
Keys are SHA256(session_id + query). TTL default: 1 hour.
"""

import hashlib
import time

_cache: dict = {}
TTL_SECONDS = 60 * 60  # 1 hour


def _make_key(session_id: str, query: str) -> str:
    raw = f"{session_id}:{query.strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def cache_get(session_id: str, query: str) -> dict | None:
    """Return cached result if it exists and hasn't expired."""
    key = _make_key(session_id, query)
    entry = _cache.get(key)
    if not entry:
        return None
    if time.time() - entry["ts"] > TTL_SECONDS:
        del _cache[key]
        return None
    return entry["result"]


def cache_set(session_id: str, query: str, result: dict) -> None:
    """Store a result in the cache."""
    key = _make_key(session_id, query)
    _cache[key] = {"result": result, "ts": time.time()}


def cache_invalidate_session(session_id: str) -> None:
    """
    Clear all cache entries for a session.
    Call this when a new document is uploaded to the session.
    """
    prefix = hashlib.sha256(f"{session_id}:".encode()).hexdigest()[:8]
    to_delete = [k for k in _cache if _cache[k].get("session_id") == session_id]
    for k in to_delete:
        del _cache[k]
