import sys
import os
import pytest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.database import Base, get_db
from app.models import Reviewer
from app.services.rules_engine import seed_default_rules
from app.services.sample_generator import generate_all_sample_pdfs
from app.main import app as fastapi_app

TEST_DB_FILE = backend_path / "data" / "test_veridoc.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

@pytest.fixture(scope="session")
def test_engine():
    if TEST_DB_FILE.exists():
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    generate_all_sample_pdfs()
    yield engine
    if TEST_DB_FILE.exists():
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

@pytest.fixture(scope="function")
def db_session(test_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    seed_default_rules(session)
    yield session
    session.rollback()
    session.close()

@pytest.fixture(scope="function")
def client(db_session):
    from fastapi.testclient import TestClient

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()
