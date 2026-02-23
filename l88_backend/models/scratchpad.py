"""ScratchPad model — one per session, autosaves on every update."""

from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class ScratchPad(SQLModel, table=True):
    """
    Session-scoped notepad. One per session.

    Admin → read + write.
    Chat / Read Only → read only.
    """

    id: int | None = Field(default=None, primary_key=True)
    session_id: str = Field(unique=True, index=True)  # FK → Session
    content: str = ""
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: int                                    # FK → User
