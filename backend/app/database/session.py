"""
Database engine and session management with resilient connection handling.
"""

import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from ..config import DATABASE_URL, BASE_DIR

Base = declarative_base()

def build_engine(db_url: str):
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False, "timeout": 30}
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    return create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True
    ), db_url

# Attempt connection to configured DATABASE_URL with automatic fallback
active_db_url = DATABASE_URL
try:
    engine, active_db_url = build_engine(active_db_url)
    if not active_db_url.startswith("sqlite"):
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
except Exception as e:
    print(f"[WARNING] Primary database connection failed ({e}). Falling back to local SQLite.")
    sqlite_path = BASE_DIR / "civicseva.db"
    engine, active_db_url = build_engine(f"sqlite:///{sqlite_path}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_db_initialized = False

def ensure_db_initialized():
    global _db_initialized, engine, SessionLocal
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
            print(f"[WARNING] Database initialization error on current engine: {e}")
            # If PostgreSQL dropped or DNS failed during create_all, fallback to SQLite
            try:
                sqlite_path = BASE_DIR / "civicseva.db"
                engine, _ = build_engine(f"sqlite:///{sqlite_path}")
                SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
                from .base import Base as AppBase
                from .seed_data import seed_database
                AppBase.metadata.create_all(bind=engine)
                db = SessionLocal()
                try:
                    seed_database(db)
                finally:
                    db.close()
                print("[INFO] Fallback SQLite database successfully initialized.")
            except Exception as fe:
                print(f"[ERROR] Fallback DB initialization error: {fe}")
        finally:
            _db_initialized = True

def get_db():
    ensure_db_initialized()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
