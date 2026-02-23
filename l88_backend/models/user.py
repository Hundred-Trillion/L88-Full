"""User model — hardcoded users seeded from config.py on first run."""

from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    """Application user. No registration — managed via config.py only."""

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    role: str                   # "admin" | "chat" | "read_only"
    display_name: str
    active: bool = True
