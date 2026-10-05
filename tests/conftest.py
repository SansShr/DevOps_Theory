"""
Pytest configuration for CAMATIS API tests.

The tests use FastAPI's TestClient which runs the app in-process without
starting Uvicorn.  The CAMATIS ML pipeline is NEVER imported during these
tests because PipelineService now uses true lazy loading — the heavy import
only happens on the first real call to run_inference(), which these tests
never make.
"""

import os
import sys
import pytest

# Ensure the repository root is on sys.path so `backend` and `camatis` are importable
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)


@pytest.fixture(scope="session")
def client():
    """
    Create a TestClient for the CAMATIS FastAPI application.
    Session-scoped so the app is only constructed once per test run.
    """
    from fastapi.testclient import TestClient
    from backend.main import app

    with TestClient(app) as c:
        yield c
