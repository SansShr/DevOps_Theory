"""
Tests for GET /api/health

Verifies that:
- The endpoint returns HTTP 200
- The response body contains {"status": "healthy"}
- The response is JSON
- The endpoint does NOT trigger CAMATIS ML pipeline initialisation
"""

import pytest


def test_health_returns_200(client):
    """GET /api/health must return HTTP 200."""
    response = client.get("/api/health")
    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}. Body: {response.text}"
    )


def test_health_returns_json(client):
    """GET /api/health must return a JSON body."""
    response = client.get("/api/health")
    data = response.json()
    assert isinstance(data, dict), "Response body must be a JSON object"


def test_health_status_field(client):
    """GET /api/health body must include status == 'healthy'."""
    response = client.get("/api/health")
    data = response.json()
    assert "status" in data, "Response must contain a 'status' field"
    assert data["status"] == "healthy", (
        f"Expected status='healthy', got '{data['status']}'"
    )


def test_health_contains_timestamp(client):
    """GET /api/health body must include a timestamp."""
    response = client.get("/api/health")
    data = response.json()
    assert "timestamp" in data, "Response must contain a 'timestamp' field"


def test_pipeline_not_initialised_after_health(client):
    """
    The CAMATIS ML pipeline must NOT be initialised simply because
    /api/health was called — this proves lazy loading is working.
    """
    from backend.services.pipeline_service import pipeline_service
    # Call health to make sure the app has handled at least one request
    client.get("/api/health")
    assert not pipeline_service.is_initialised, (
        "ML pipeline should NOT be initialised after /api/health — "
        "lazy loading is broken if this assertion fails"
    )
