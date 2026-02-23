"""Session model — general (chat only) or rag (has documents)."""

from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class Session(SQLModel, table=True):
    """
    A conversation workspace.

    session_type transitions:
      - Created with no docs → "general"
      - First doc uploaded    → "rag"
      - All docs deleted      → back to "general"
    """

    id: str = Field(primary_key=True)               # UUID string
    name: str
    session_type: str = "general"                    # "general" | "rag"
    created_by: int                                  # FK → User.id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    web_mode: bool = False
