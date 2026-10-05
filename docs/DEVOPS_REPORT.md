# CAMATIS DevOps CA2 — Architecture, Pipeline & Reflection

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Developer / Browser / React Frontend (port 3000)                    │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  HTTP
                           ▼
┌─────────────────────────────────────────────────────┐
│  Kubernetes Service: camatis-backend (ClusterIP 8000)│
│  Namespace: camatis                                  │
└──────────────┬──────────────────────────────────────┘
               │  round-robin
       ┌───────┴────────┐
       ▼                ▼
┌────────────┐   ┌────────────┐
│  Pod 1     │   │  Pod 2     │    RollingUpdate strategy
│  FastAPI   │   │  FastAPI   │    maxUnavailable=0 / maxSurge=1
│  Uvicorn   │   │  Uvicorn   │
│  :8000     │   │  :8000     │
└──────┬─────┘   └──────┬─────┘
       │                │
       └────────┬───────┘
                │  lazy-loaded on first /api/optimize
                ▼
       ┌─────────────────┐
       │  CAMATIS ML      │
       │  Decision        │
       │  Pipeline        │
       │  (PyTorch +      │
       │  LightGBM +      │
       │  CatBoost +      │
       │  Multi-Agent)    │
       └─────────────────┘

Observability:
  Prometheus (:9090) ──scrapes /metrics every 15 s──► both pods
  Grafana    (:3000) ──queries Prometheus────────────► CAMATIS Observability dashboard

CI/CD:
  Git Push → GitHub Actions → pytest → Docker build →
  smoke test → GHCR push → local kubectl apply

Configuration:
  Ansible playbook provisions the Ubuntu/WSL runtime host
  (packages, user, /opt/camatis directory + runtime-info.txt)
```

### Component Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API | FastAPI + Uvicorn | REST API, lazy-loaded ML pipeline |
| Metrics | prometheus-fastapi-instrumentator v7 | Exposes `/metrics` |
| Container | Docker (python:3.11-slim) | Portable, reproducible runtime |
| Orchestration | Kubernetes (Docker Desktop) | 2-replica deployment, rolling updates |
| CI/CD | GitHub Actions | Test → build → smoke test → GHCR push |
| Image Registry | GitHub Container Registry | `ghcr.io/sansshr/camatis-backend` |
| Config Mgmt | Ansible | Idempotent host provisioning |
| Monitoring | Prometheus + Grafana | 4-panel observability dashboard |
| Logging | Kubernetes stdout/kubectl logs | Structured JSON log lines |

---

## 2. Pipeline Flow

```
Developer
  │
  ├─ git push → main
  │
  └─► GitHub Actions CI
        │
        ├─ [test job]
        │    ├─ Checkout
        │    ├─ Python 3.11 + pip install backend/requirements.txt
        │    └─ pytest tests/ (10 tests, no ML pipeline invoked)
        │
        └─ [docker job]  (runs only if tests pass)
             ├─ docker build -t camatis-backend:ci .
             ├─ docker run -p 8000:8000 camatis-backend:ci
             ├─ poll /api/health until 200 (max 60 s)
             ├─ smoke: GET /api/health → 200
             ├─ smoke: GET /metrics → 200 + http_requests_total present
             ├─ docker login ghcr.io (GITHUB_TOKEN, push events only)
             └─ docker push ghcr.io/sansshr/camatis-backend:{sha,latest}

Local Kubernetes (after CI succeeds):
  kubectl apply -f k8s/
    → Namespace camatis
    → Deployment camatis-backend (2 replicas, RollingUpdate)
    → Service camatis-backend (ClusterIP :8000)

  kubectl apply -f monitoring/
    → Prometheus (ConfigMap + Deployment + Service :9090)
    → Grafana (ConfigMap + Secret + Deployment + Service :3000)

Rolling Update Demo:
  kubectl set image deployment/camatis-backend \
    camatis-backend=ghcr.io/sansshr/camatis-backend:{new-sha} -n camatis
  kubectl rollout status deployment/camatis-backend -n camatis

Rollback:
  kubectl rollout undo deployment/camatis-backend -n camatis
```

---

## 3. Challenges

### Challenge 1 — True Lazy Loading vs Module-Level Import

The original `pipeline_service.py` imported `CAMATISDecisionPipeline` at module level, which caused PyTorch, LightGBM, CatBoost, and DoWhy to be imported every time the FastAPI application started — including during CI test runs.

**Resolution:** Moved the import inside `_init_pipeline()` using a double-checked locking pattern. The class is now only imported and instantiated on the first call to `/api/optimize`. FastAPI boots in under 2 seconds; the Kubernetes readiness probe succeeds immediately without waiting for the ML stack.

**Evidence:** The pytest test `test_pipeline_not_initialised_after_health` asserts that `pipeline_service.is_initialised` is `False` after calling `/api/health`. This test passes.

### Challenge 2 — Docker Build Context and `.dockerignore`

The initial `.dockerignore` incorrectly excluded `camatis_requirements.txt` from the build context, causing the Docker build to fail because the Dockerfile's `COPY camatis_requirements.txt` instruction could not find the file.

**Resolution:** Updated `.dockerignore` to exclude the file at runtime but keep it available during the build phase. The Dockerfile copies it only for the `pip install` step; it is not present in the final filesystem path outside of that layer.

### Challenge 3 — Prometheus Metric Names vs Guess Work

Using the wrong PromQL metric names would make the Grafana dashboard silently show empty panels. `prometheus-fastapi-instrumentator` exposes `http_requests_total` (not `fastapi_requests_total` or `requests_total`).

**Resolution:** Started a live Uvicorn server during implementation, scraped `/metrics`, and extracted every `# HELP` line to get the exact metric names and label sets. All PromQL queries in the Grafana dashboard were written against these confirmed names.

### Challenge 4 — GHCR Image Name Case Sensitivity

GitHub Container Registry requires all image names to be lowercase. The GitHub Actions workflow used `github.repository_owner` which can be mixed-case (e.g. `SansShr`).

**Resolution:** Added a `tr '[:upper:]' '[:lower:]'` step in the workflow to normalise the owner before constructing the image tag, producing `ghcr.io/sansshr/camatis-backend`.

---

## 4. Lessons Learned

### Container Portability
Packaging the application as a Docker image eliminated "works on my machine" issues. The same image that passes CI smoke tests runs identically in the Kubernetes cluster. The Python version, OS, and all dependencies are pinned and reproducible.

### CI Reproducibility
Running pytest without the heavy ML dependencies (achieved through true lazy loading) reduced the CI test stage from minutes to under 5 seconds. CI feedback loops should be fast; decouple what is tested from what is optionally available.

### Kubernetes Rolling Updates and Rollbacks
`maxUnavailable: 0` with `maxSurge: 1` means the new pod must pass its readiness probe before the old one terminates. This guarantees zero-downtime deployments. The readiness probe on `/api/health` provides a genuine signal — because lazy loading prevents the ML pipeline from blocking startup, the probe returns 200 quickly.

The `kubectl rollout undo` command proved straightforward and reliable. Kubernetes retains the previous ReplicaSet, making rollbacks instantaneous compared to re-building an image.

### Configuration Management with Ansible
Ansible's idempotent modules (`apt`, `user`, `file`, `copy`) mean the playbook can be re-run safely at any time. The second run shows all tasks as `ok` with zero `changed`, which is the desired proof of idempotency for the CA demonstration.

### Observability with Prometheus and Grafana
Provisioning the Grafana datasource and dashboard via Kubernetes ConfigMaps eliminated all manual setup. After `kubectl apply`, the dashboard is immediately available with correct data — no clicking through the UI. The `or vector(0)` idiom in the 5xx error PromQL is necessary to prevent the panel from showing "No data" when the application is healthy.

Structured logging to stdout means `kubectl logs` works out of the box without any log aggregation infrastructure.
