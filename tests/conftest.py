import os
import tempfile
import uuid
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


# All pytest runs use temporary local storage and deterministic assistant replies.
_TEST_DB_PATH = Path(tempfile.gettempdir()) / f"sevaai-pytest-{uuid.uuid4().hex}.sqlite3"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH.as_posix()}"
os.environ["ASSISTANT_LLM_PROVIDER"] = "deterministic"


@pytest.fixture
def db_session():
    from backend.app.database.base import Base
    from backend.app.database.seed_data import seed_database

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    try:
        seed_database(session)
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def _remove_temporary_test_database():
    yield
    try:
        from backend.app.database.session import engine as app_engine
        app_engine.dispose()
    except Exception:
        pass
    for suffix in ("", "-wal", "-shm"):
        Path(f"{_TEST_DB_PATH}{suffix}").unlink(missing_ok=True)
