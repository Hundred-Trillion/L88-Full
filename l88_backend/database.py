"""
Database setup — SQLite via SQLModel.

Creates all tables on startup. Seeds hardcoded users on first run.
"""

from contextlib import contextmanager

import bcrypt
from sqlmodel import SQLModel, Session, create_engine, select

from l88_backend.config import DATABASE_URL, HARDCODED_USERS

# Import all models so SQLModel.metadata knows about them
from l88_backend.models import (  # noqa: F401
    User, Session as SessionModel, Document, Message, Citation,
    SessionMember, ScratchPad,
)

engine = create_engine(DATABASE_URL, echo=False)


def create_db_and_tables():
    """Create all tables if they don't exist."""
    SQLModel.metadata.create_all(engine)


@contextmanager
def get_session():
    """Yield a database session, auto-closing on exit."""
    with Session(engine) as session:
        yield session


def seed_users():
    """
    Insert hardcoded users from config.py on first run.

    Skips any user whose username already exists — safe to call
    on every startup.
    """
    with get_session() as db:
        for u in HARDCODED_USERS:
            existing = db.exec(
                select(User).where(User.username == u["username"])
            ).first()
            if existing:
                continue
            user = User(
                username=u["username"],
                password_hash=bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode(),
                role=u["role"],
                display_name=u["display_name"],
            )
            db.add(user)
        db.commit()
