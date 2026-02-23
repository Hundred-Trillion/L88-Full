"""Message and Citation models — stores chat history + source references."""

from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class Message(SQLModel, table=True):
    """A single chat message (user or assistant)."""

    id: str = Field(primary_key=True)                # UUID string
    session_id: str = Field(index=True)              # FK → Session
    user_id: int                                     # FK → User
    role: str                                        # "user" | "assistant"
    content: str = ""                                # final answer text
    reasoning: str = ""                              # <think> block for UI
    confident: bool = True                           # False → ⚠ in UI
    context_verdict: str = ""                        # "SUFFICIENT" | "GAP" | "EMPTY"
    missing_info: str = ""                           # populated when GAP
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Citation(SQLModel, table=True):
    """A source reference attached to an assistant message."""

    id: int | None = Field(default=None, primary_key=True)
    message_id: str = Field(index=True)              # FK → Message
    document_id: str                                 # FK → Document
    filename: str
    page: int
    excerpt: str = ""
