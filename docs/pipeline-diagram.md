# CAMATIS DevOps CA2 — Pipeline Diagram

## CI/CD and Deployment Flow

```mermaid
flowchart TD
    DEV["👩‍💻 Developer\nLocal Workstation"]

    subgraph GH["GitHub"]
        PR["Pull Request / Push → main"]
    end

    subgraph GHA["GitHub Actions (ubuntu-latest runner)"]
        direction TB
        A1["① Checkout Code"]
        A2["② Python 3.11 Setup\nInstall backend/requirements.txt"]
        A3["③ Pytest\ntest_health.py · test_metrics.py\n(10 tests — no ML pipeline invoked)"]
        A4["④ Docker Build\ndocker build -t camatis-backend:ci ."]
        A5["⑤ Start Container\ndocker run -p 8000:8000"]
        A6["⑥ Wait for Readiness\npoll /api/health (30 × 2 s)"]
        A7["⑦ Smoke Test\nGET /api/health → 200\nGET /metrics   → 200"]
        A8["⑧ GHCR Login\ngithub.actor + GITHUB_TOKEN"]
        A9["⑨ Push Image\nghcr.io/sansshr/camatis-backend:latest\nghcr.io/sansshr/camatis-backend:SHA"]
    end

    subgraph GHCR["GitHub Container Registry"]
        IMG["camatis-backend image\n:latest  :sha"]
    end

    subgraph K8S["Local Kubernetes (Docker Desktop)"]
        NS["Namespace: camatis"]
        SVC["Service: camatis-backend\nClusterIP :8000"]
        D1["Pod 1 — camatis-backend"]
        D2["Pod 2 — camatis-backend"]
        RU["kubectl set image …\n→ Rolling Update\n→ kubectl rollout undo …\n→ Rollback"]
    end

    subgraph MON["Monitoring Stack (namespace: camatis)"]
        PROM["Prometheus :9090\nscrapes /metrics every 15 s"]
        GRAF["Grafana :3000\nCAMATIS Observability Dashboard"]
    end

    DEV -->|"git push / PR"| PR
    PR --> A1
    A1 --> A2 --> A3
    A3 -->|"tests pass"| A4
    A4 --> A5 --> A6 --> A7
    A7 -->|"push events only"| A8 --> A9
    A9 --> IMG

    IMG -->|"kubectl apply\nimagePullSecret (if private)"| NS
    NS --> SVC
    SVC --> D1
    SVC --> D2
    D1 & D2 -->|"expose /metrics"| PROM
    PROM --> GRAF
    D1 & D2 -->|"kubectl rollout"| RU
```

---

## Key Checkpoints

| Step | Tool | Artefact |
|------|------|----------|
| Code quality gate | pytest | 10 tests, 0 failures |
| Container validation | docker run + curl | /api/health 200, /metrics 200 |
| Image registry | GHCR | ghcr.io/sansshr/camatis-backend |
| Environment provisioning | Ansible | Ubuntu WSL runtime configured |
| Workload orchestration | Kubernetes | 2-replica Deployment, RollingUpdate |
| Observability | Prometheus + Grafana | 4-panel dashboard |

---

## Lazy Loading Behaviour

```
FastAPI starts (< 2 s)
    └─ /api/health  → 200 OK   ← immediately available
    └─ /metrics     → 200 OK   ← immediately available
    └─ CAMATIS ML pipeline     ← NOT initialised yet

First POST /api/optimize
    └─ camatis.run_agents_pipeline imported  (torch, lightgbm, catboost …)
    └─ CAMATISDecisionPipeline() constructed  (10–60 s)
    └─ pipeline.run() executed
    └─ subsequent calls reuse singleton
```
