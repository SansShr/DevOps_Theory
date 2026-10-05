"""
Tests for GET /metrics

Verifies that:
- The endpoint returns HTTP 200
- Content-Type is text/plain (Prometheus exposition format)
- Standard instrumentator metric families are present
- The /metrics path is NOT under /api
"""

import pytest


def test_metrics_returns_200(client):
    """GET /metrics must return HTTP 200."""
    response = client.get("/metrics")
    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}. Body: {response.text[:500]}"
    )


def test_metrics_content_type(client):
    """GET /metrics must return Prometheus text exposition format."""
    response = client.get("/metrics")
    # prometheus_fastapi_instrumentator returns text/plain; charset=utf-8
    assert "text/plain" in response.headers.get("content-type", ""), (
        f"Expected text/plain content-type, got: {response.headers.get('content-type')}"
    )


def test_metrics_contains_http_requests_total(client):
    """
    The metric http_requests_total must appear after at least one request
    to /api/health has been made.
    """
    # Ensure at least one tracked request has been processed
    client.get("/api/health")

    response = client.get("/metrics")
    body = response.text
    assert "http_requests_total" in body, (
        "Expected 'http_requests_total' metric in /metrics output.\n"
        f"Actual /metrics body (first 1000 chars):\n{body[:1000]}"
    )


def test_metrics_contains_request_duration(client):
    """http_request_duration_seconds histogram must be present."""
    client.get("/api/health")
    response = client.get("/metrics")
    body = response.text
    assert "http_request_duration_seconds" in body, (
        "Expected 'http_request_duration_seconds' histogram in /metrics output."
    )


def test_metrics_not_under_api_prefix(client):
    """GET /api/metrics must NOT exist — metrics live at /metrics only."""
    response = client.get("/api/metrics")
    assert response.status_code == 404, (
        f"GET /api/metrics should return 404 (it lives at /metrics), got {response.status_code}"
    )
