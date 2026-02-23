"""Document model — tracks uploaded PDFs (session-scoped or library)."""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class Document(SQLModel, table=True):
    """
    A PDF document.

    source="session" → belongs to a session (session_id set).
    source="library" → curated library doc (session_id is None).
    selected=True → included in next RAG query for that session.
    """

    id: str = Field(primary_key=True)                # UUID string
    session_id: Optional[str] = Field(default=None, index=True)  # FK → Session
    filename: str
    source: str                                      # "session" | "library"
    uploaded_by: int                                 # FK → User.id
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    page_count: int = 0
    chunk_count: int = 0
    selected: bool = True                            # checkbox state
