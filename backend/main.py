"""
CAMATIS Backend API
Thin wrapper that reads your existing final_output.json
"""

import sys
import os
import logging
from contextlib import asynccontextmanager

# Configure structured logging so Kubernetes can capture it via kubectl logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("camatis.api")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import from backend (these are lightweight — no ML imports happen here)
from backend.api.routes import router
from backend.config import API_HOST, API_PORT

logger.info("CAMATIS API module loaded — constructing FastAPI application")


@asynccontextmanager
async def lifespan(application):
    """FastAPI lifespan handler — replaces deprecated @app.on_event."""
    logger.info("CAMATIS API startup complete — /api/health and /metrics are available")
    logger.info("CAMATIS ML pipeline is NOT yet initialised (lazy loading active)")
    logger.info("First POST /api/optimize will trigger ML pipeline initialisation")
    yield
    logger.info("CAMATIS API shutting down cleanly")


# ── FastAPI application ──────────────────────────────────────────────────────
app = FastAPI(
    title="CAMATIS API",
    description="Causal-Adaptive Multi-Agent Transport Intelligence System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware for React frontend on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus instrumentation ───────────────────────────────────────────────
# Exposes GET /metrics (NOT under /api) with Prometheus exposition format.
#
# Metric families produced by prometheus-fastapi-instrumentator v7:
#   http_requests_total{method, handler, status}          — counter
#   http_request_duration_seconds{method, handler, status} — histogram
#   http_request_size_bytes{method, handler}              — histogram
#   http_response_size_bytes{method, handler}             — histogram
#
# These are the exact names used in the Grafana dashboard PromQL queries.
Instrumentator(
    should_group_status_codes=False,  # keep individual 2xx / 4xx / 5xx labels
    excluded_handlers=["/metrics"],   # avoid self-scraping the metrics endpoint
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
# ─────────────────────────────────────────────────────────────────────────────

# Mount all /api/* routes
app.include_router(router, prefix="/api", tags=["CAMATIS"])


@app.get("/")
async def root():
    """Root endpoint — quick discovery page."""
    return {
        "name": "CAMATIS API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "metrics": "/metrics",
        "endpoints": {
            "health": "/api/health",
            "dashboard": "/api/dashboard",
            "routes": "/api/routes",
            "results": "/api/results",
            "alerts": "/api/alerts",
            "optimize": "/api/optimize (POST)",
            "login": "/api/login (POST)",
        },
    }

# Run with: uvicorn backend.main:app --host 0.0.0.0 --port 8000
