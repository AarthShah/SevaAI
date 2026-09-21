"""
Database engine and session management.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from ..config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

_db_initialized = False

def ensure_db_initialized():
    global _db_initialized
    if not _db_initialized:
        try:
            from .base import Base as AppBase
            from .seed_data import seed_database
            AppBase.metadata.create_all(bind=engine)
            db = SessionLocal()
            try:
                seed_database(db)
            finally:
                db.close()
        except Exception as e:
            print("DB auto-init notice:", e)
        finally:
            _db_initialized = True

def get_db():
    ensure_db_initialized()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
