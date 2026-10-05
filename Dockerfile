# ─────────────────────────────────────────────────────────────────────────────
# CAMATIS Backend — production Docker image
#
# Build context: repository root  (so both backend/ and camatis/ are available)
# Entrypoint   : uvicorn backend.main:app --host 0.0.0.0 --port 8000
# Non-root user: camatis (uid 1001)
#
# What is included:
#   backend/          — FastAPI application + services
#   camatis/          — ML pipeline code + saved models + data CSVs
#   final_output.json — pre-existing optimization output read by data_service
#   system_config.json— runtime configuration
#
# What is NOT included (see .dockerignore):
#   camatis-frontend/ , .git/ , __pycache__/ , tests/ , docs/ ,
#   large agent JSON files (agent_route_details.json ~43 MB,
#   conflict_resolutions.json ~14 MB) — these are generated outputs;
#   the API reads them if present but starts fine without them.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim AS base

# ── Build-time environment ────────────────────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ── OS-level packages needed by some ML dependencies ─────────────────────────
# libgomp1   — OpenMP (required by LightGBM, XGBoost)
# libglib2.0 — needed by some binary wheels on slim
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgomp1 \
        libglib2.0-0 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user ─────────────────────────────────────────────────────────────
RUN groupadd --gid 1001 camatis && \
    useradd  --uid 1001 --gid 1001 --no-create-home --shell /sbin/nologin camatis

WORKDIR /app

# ── Install Python dependencies ───────────────────────────────────────────────
# Copy both requirements files so the API layer AND the CAMATIS ML layer are
# installed in a single RUN layer (better layer caching).
COPY backend/requirements.txt          ./backend/requirements.txt
COPY camatis_requirements.txt          ./camatis_requirements.txt

# Install API deps first (smaller, faster), then ML deps.
# torch CPU-only wheel is used to keep the image lean (~2 GB vs ~5 GB with CUDA).
RUN pip install --upgrade pip && \
    pip install -r backend/requirements.txt && \
    pip install torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r camatis_requirements.txt

# ── Copy application source ───────────────────────────────────────────────────
# backend package
COPY backend/                          ./backend/

# CAMATIS ML package (code + saved models + data)
COPY camatis/                          ./camatis/

# Root-level runtime files
COPY final_output.json                 ./final_output.json
COPY system_config.json                ./system_config.json

# ── Permissions ───────────────────────────────────────────────────────────────
RUN chown -R camatis:camatis /app

# ── Runtime ───────────────────────────────────────────────────────────────────
USER camatis
EXPOSE 8000

# Health-check so Docker (and k8s readiness) can verify the container is alive
# without running the expensive ML pipeline
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["python", "-m", "uvicorn", "backend.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1"]
