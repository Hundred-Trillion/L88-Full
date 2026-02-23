"""SessionMember model — per-session role overrides."""

from sqlmodel import SQLModel, Field


class SessionMember(SQLModel, table=True):
    """
    Links a user to a session with a session-level role.

    Effective role = SessionMember.role if exists, else User.role.
    This allows Bob (global 'chat') to be session-level 'admin'.
    """

    id: int | None = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)              # FK → Session
    user_id: int = Field(index=True)                 # FK → User
    role: str                                        # "admin" | "chat" | "read_only"
