# CAMATIS DevOps CA2 — Complete Runbook
## From Fresh Machine to Full Demonstration

**Prerequisites on the Windows machine:**
- Docker Desktop (with Kubernetes enabled in Settings → Kubernetes)
- Git for Windows
- PowerShell 5+
- WSL 2 with Ubuntu (for Ansible steps)
- `kubectl` available in PowerShell (bundled with Docker Desktop)

---

## SECTION 1 — ANSIBLE (WSL Ubuntu)

All commands in this section run inside WSL Ubuntu.

```bash
# Open WSL Ubuntu terminal (Start → search "Ubuntu" or run: wsl)

# Step 1 — Install Ansible (first time only)
sudo apt update && sudo apt install -y ansible

# Step 2 — Navigate to the project
cd "/mnt/c/Users/Sanskriti/OneDrive/Desktop/CAMATIS Devops/ansible"

# Step 3 — Syntax check
ansible-playbook -i inventory.ini playbook.yml --syntax-check
```

Expected output from syntax check:
```
playbook: playbook.yml
```

```bash
# Step 4 — Run the playbook (first time)
sudo ansible-playbook -i inventory.ini playbook.yml
```

Expected output (first run — tasks will show "changed"):
```
PLAY [CAMATIS Runtime Environment Configuration] ******************************

TASK [PACKAGES | Update apt cache] ********************************************
changed: [localhost]

TASK [PACKAGES | Install required packages] ***********************************
changed: [localhost]

TASK [USER | Create 'camatis' group] ******************************************
changed: [localhost]

TASK [USER | Create 'camatis' system user] ************************************
changed: [localhost]

TASK [FILES | Create /opt/camatis directory] ***********************************
changed: [localhost]

TASK [FILES | Write runtime-info.txt] *****************************************
changed: [localhost]

TASK [VERIFY | Confirm runtime-info.txt content] ******************************
ok: [localhost]

TASK [VERIFY | Display runtime-info.txt] **************************************
ok: [localhost] => {
    "msg": ["APP_NAME=CAMATIS", "APP_PORT=8000", "ENVIRONMENT=development"]
}

TASK [VERIFY | Show camatis user info] ****************************************
ok: [localhost]

TASK [VERIFY | Display user info] *********************************************
ok: [localhost] => {
    "msg": "uid=1001(camatis) gid=1001(camatis) groups=1001(camatis)"
}

PLAY RECAP ********************************************************************
localhost                  : ok=10   changed=6    unreachable=0    failed=0
```

```bash
# Step 5 — Prove idempotency: run again, expect changed=0
sudo ansible-playbook -i inventory.ini playbook.yml
```

Expected second run (idempotency proof — all "ok", zero "changed"):
```
PLAY RECAP ********************************************************************
localhost                  : ok=10   changed=0    unreachable=0    failed=0
```

---

## ★ SCREENSHOT 1 — ANSIBLE

**Take this screenshot:** the terminal showing the second PLAY RECAP line:
```
localhost   : ok=10   changed=0    unreachable=0    failed=0
```
This proves all three areas (packages, user, files) and idempotency.

---

## SECTION 2 — KUBERNETES DEPLOYMENT

All commands in this section run in **PowerShell**.

```powershell
# Verify kubectl is pointing to Docker Desktop
kubectl config get-contexts
kubectl config use-context docker-desktop   # if not already active

# Step 1 — Apply all Kubernetes manifests
$root = "C:\Users\Sanskriti\OneDrive\Desktop\CAMATIS Devops"

kubectl apply -f "$root\k8s\namespace.yaml"
kubectl apply -f "$root\k8s\deployment.yaml"
kubectl apply -f "$root\k8s\service.yaml"
```

Expected:
```
namespace/camatis created
deployment.apps/camatis-backend created
service/camatis-backend created
```

```powershell
# Step 2 — Wait for pods to become Ready
kubectl rollout status deployment/camatis-backend -n camatis
```

Expected:
```
deployment "camatis-backend" successfully rolled out
```

```powershell
# Step 3 — Verify the full deployment
kubectl get pods,deploy,svc -n camatis -o wide
```

**Expected output (screenshot this):**
```
NAME                                   READY   STATUS    RESTARTS   AGE   IP           NODE
pod/camatis-backend-6d9f4b7c8-abcd1    1/1     Running   0          60s   10.1.0.12    docker-desktop
pod/camatis-backend-6d9f4b7c8-efgh2    1/1     Running   0          60s   10.1.0.13    docker-desktop

NAME                              READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/camatis-backend   2/2     2            2           60s

NAME                      TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
service/camatis-backend   ClusterIP   10.96.45.123   <none>        8000/TCP   60s
```

```powershell
# Step 4 — Quick health check via port-forward
kubectl port-forward -n camatis svc/camatis-backend 18000:8000 &
Start-Sleep 3
Invoke-RestMethod http://localhost:18000/api/health
# Stop the port-forward: Stop-Job -Name *portforward* (or Ctrl+C in a separate terminal)
```

---

## ★ SCREENSHOT 2 — KUBERNETES ARCHITECTURE

**Command to run:**
```powershell
kubectl get pods,deploy,svc -n camatis -o wide
```

**Screenshot must show:**
- Two pods both `Running` and `1/1 READY`
- Deployment `READY 2/2`
- Service `camatis-backend` on port `8000`

---

## SECTION 3 — GITHUB ACTIONS / GHCR

### 3a — Push to GitHub to trigger the workflow

```powershell
$root = "C:\Users\Sanskriti\OneDrive\Desktop\CAMATIS Devops"
Set-Location $root

git checkout -b devops-ca2
git add .github/ Dockerfile .dockerignore backend/ tests/ k8s/ monitoring/ ansible/ docs/ DEVOPS_RUNBOOK.md camatis_requirements.txt
git commit -m "feat: DevOps CA2 — CI/CD, Docker, K8s, Prometheus, Grafana, Ansible"
git push -u origin devops-ca2
```

Then open a Pull Request on GitHub (or push directly to main if working solo):
```powershell
# If merging directly to main:
git checkout main
git merge devops-ca2
git push origin main
```

### 3b — Monitor the workflow

1. Go to: `https://github.com/SansShr/DevOps_Theory/actions`
2. Click the most recent workflow run named **CI**
3. Expand each job to see:
   - **Python Tests** — pytest output, 10 tests pass
   - **Docker Build & Smoke Test** — build, container start, health + metrics smoke tests
   - **Push Image** — GHCR login + push steps (push events only)

### 3c — Find the published image

1. Go to: `https://github.com/SansShr?tab=packages`
2. Click **camatis-backend**
3. You will see tags: `latest` and the commit SHA

---

## ★ SCREENSHOT 3 — GITHUB ACTIONS / GHCR

**Two sub-screenshots:**

**3A — Actions run page** (`github.com/SansShr/DevOps_Theory/actions`):
- All jobs show green checkmarks
- Expand the "Docker Build & Smoke Test" job to see smoke test output:
  ```
  GET /api/health → HTTP 200
  GET /metrics → HTTP 200
  ✓ /metrics contains http_requests_total
  ```

**3B — GHCR package page** (`github.com/SansShr?tab=packages`):
- Package named `camatis-backend`
- Tags: `latest` and the commit SHA (e.g. `abc1234...`)

---

## SECTION 4 — ROLLING UPDATE AND ROLLBACK

All commands in **PowerShell**.

```powershell
# Watch pods in a separate terminal (open a second PowerShell window)
kubectl get pods -n camatis -w
```

```powershell
# --- ROLLING UPDATE ---
# Use the SHA-tagged image from the last CI run
# Replace <SHA> with the actual commit SHA shown in GHCR

$SHA = "<commit-sha-from-ghcr>"   # e.g. abc1234def5678...
# Annotate first so rollout history has a meaningful record
kubectl annotate deployment/camatis-backend -n camatis `
  kubernetes.io/change-cause="rolling update to sha=$SHA" --overwrite

# Trigger the rolling update
kubectl set image deployment/camatis-backend `
  camatis-backend=ghcr.io/sansshr/camatis-backend:$SHA `
  -n camatis

# Watch it roll out (zero downtime — maxUnavailable=0)
kubectl rollout status deployment/camatis-backend -n camatis
```

Expected:
```
Waiting for deployment "camatis-backend" rollout to finish: 1 out of 2 new replicas have been updated...
Waiting for deployment "camatis-backend" rollout to finish: 1 old replicas are pending termination...
deployment "camatis-backend" successfully rolled out
```

```powershell
# View rollout history
kubectl rollout history deployment/camatis-backend -n camatis
```

Expected:
```
REVISION  CHANGE-CAUSE
1         initial deployment
2         rolling update to sha=<SHA>
```

```powershell
# --- ROLLBACK ---
kubectl rollout undo deployment/camatis-backend -n camatis

# Verify rollback
kubectl rollout status deployment/camatis-backend -n camatis
kubectl rollout history deployment/camatis-backend -n camatis
```

Expected after rollback:
```
REVISION  CHANGE-CAUSE
2         rolling update to sha=<SHA>
3         rolling update to sha=<SHA>   ← revision 3 = undo of revision 2
```

```powershell
# Confirm pods are running on original image
kubectl describe deployment/camatis-backend -n camatis | Select-String "Image:"
```

---

## ★ SCREENSHOT 4 — ROLLING UPDATE + ROLLBACK

Run this sequence and screenshot the output:

```powershell
# 1. Before update — show current image
kubectl describe deployment/camatis-backend -n camatis | Select-String "Image:"

# 2. Trigger update (paste the kubectl set image command above)

# 3. Watch rollout — screenshot this as it progresses
kubectl rollout status deployment/camatis-backend -n camatis

# 4. View history showing revision 1 and 2
kubectl rollout history deployment/camatis-backend -n camatis

# 5. Rollback
kubectl rollout undo deployment/camatis-backend -n camatis
kubectl rollout status deployment/camatis-backend -n camatis

# 6. History showing revision 3
kubectl rollout history deployment/camatis-backend -n camatis
```

Screenshot must show:
- `deployment "camatis-backend" successfully rolled out` (update)
- Revision history with at least 2 entries
- `deployment "camatis-backend" successfully rolled out` (rollback)

---

## SECTION 5 — PROMETHEUS

```powershell
# Deploy Prometheus into the camatis namespace
$root = "C:\Users\Sanskriti\OneDrive\Desktop\CAMATIS Devops"

kubectl apply -f "$root\monitoring\prometheus-configmap.yaml"
kubectl apply -f "$root\monitoring\prometheus-deployment.yaml"

# Wait for Prometheus to be ready
kubectl rollout status deployment/prometheus -n camatis
```

```powershell
# Port-forward Prometheus to localhost
kubectl port-forward -n camatis svc/prometheus 9090:9090
```

**Then open in browser:** `http://localhost:9090`

Navigate to: **Status → Targets**

You should see:
```
camatis-backend  http://camatis-backend:8000/metrics  UP
prometheus       http://localhost:9090/metrics         UP
```

**To verify the metric exists, go to Graph tab and enter:**
```
http_requests_total{job="camatis-backend"}
```
Click **Execute** — you should see counter values.

---

## ★ SCREENSHOT 5 — PROMETHEUS

**URL:** `http://localhost:9090/targets`

Screenshot must show:
- Target: `camatis-backend`
- Endpoint: `http://camatis-backend:8000/metrics`
- State: **UP** (green)

Optional bonus: screenshot the Graph tab showing `http_requests_total{job="camatis-backend"}` results.

---

## SECTION 6 — GRAFANA

```powershell
# Deploy Grafana
$root = "C:\Users\Sanskriti\OneDrive\Desktop\CAMATIS Devops"
kubectl apply -f "$root\monitoring\grafana-deployment.yaml"

# Wait for it to be ready
kubectl rollout status deployment/grafana -n camatis
```

```powershell
# Port-forward Grafana to localhost
kubectl port-forward -n camatis svc/grafana 3000:3000
```

**Open in browser:** `http://localhost:3000`

**Login credentials (academic demo only — not for production):**
```
Username: admin
Password: camatis-demo
```

The **CAMATIS Observability** dashboard is pre-provisioned and will be the home page.

Generate some traffic to populate the panels:

```powershell
# Generate metric data — run this in a separate PowerShell window
# (keep port-forward running in the other window)
for ($i = 0; $i -lt 20; $i++) {
    Invoke-RestMethod http://localhost:18000/api/health | Out-Null
    Invoke-RestMethod http://localhost:18000/ | Out-Null
    Start-Sleep 1
}
```

_(Use port 18000 if you set up the port-forward to 18000 earlier, otherwise 8000)_

Or forward the backend service directly:
```powershell
kubectl port-forward -n camatis svc/camatis-backend 18000:8000
```

---

## ★ SCREENSHOT 6 — GRAFANA DASHBOARD

**URL:** `http://localhost:3000/d/camatis-observability`

Screenshot must show all four panels visible on one screen:
1. **API Uptime** — green "UP" stat panel
2. **Request Rate** — line graph showing req/s
3. **P95 Latency** — line graph showing latency in seconds
4. **HTTP 5xx Error Rate** — flat line at 0 (correct — no errors)

If panels show "No data", wait 30 seconds for Prometheus to complete a scrape cycle and refresh.

---

## SECTION 7 — LOGGING

```powershell
# View logs from all backend pods simultaneously
kubectl logs -n camatis -l app=camatis-backend --tail=100 --prefix

# View logs from a specific pod
kubectl get pods -n camatis  # note the pod names
kubectl logs -n camatis pod/<pod-name> --tail=50 --follow
```

Expected log lines demonstrating lazy loading:
```
[camatis-backend-xxx] 2026-10-04T21:00:01 [INFO] camatis.api: CAMATIS API startup complete — /api/health and /metrics are available
[camatis-backend-xxx] 2026-10-04T21:00:01 [INFO] camatis.api: CAMATIS ML pipeline is NOT yet initialised (lazy loading active)
[camatis-backend-xxx] 2026-10-04T21:00:01 [INFO] camatis.api: First POST /api/optimize will trigger ML pipeline initialisation
```

After calling `/api/optimize`:
```
[camatis-backend-xxx] 2026-10-04T21:05:33 [INFO] camatis.pipeline_service: run_inference called — ensuring pipeline is ready …
[camatis-backend-xxx] 2026-10-04T21:05:33 [INFO] camatis.pipeline_service: Lazy pipeline initialisation STARTED — importing CAMATIS ML stack …
[camatis-backend-xxx] 2026-10-04T21:05:45 [INFO] camatis.pipeline_service: CAMATIS module imported — constructing CAMATISDecisionPipeline …
[camatis-backend-xxx] 2026-10-04T21:05:52 [INFO] camatis.pipeline_service: Lazy pipeline initialisation COMPLETED in 19.43 seconds
```

---

## ★ SCREENSHOT 7 — LOGGING / LAZY LOADING EVIDENCE

**Command:**
```powershell
kubectl logs -n camatis -l app=camatis-backend --tail=50 --prefix
```

Screenshot must show:
1. Startup messages: "startup complete", "NOT yet initialised"
2. After calling `/api/optimize` via Swagger (`http://localhost:18000/docs`): the lazy init messages with a real elapsed time

---

## SECTION 8 — VALIDATION CHECKLIST

Run these commands after the full deployment to verify everything:

```powershell
# 1. All pods running
kubectl get pods -n camatis

# 2. Health endpoint
kubectl port-forward -n camatis svc/camatis-backend 18000:8000 &
Start-Sleep 2
Invoke-RestMethod http://localhost:18000/api/health

# 3. Metrics endpoint
$m = (Invoke-WebRequest http://localhost:18000/metrics -UseBasicParsing).Content
$m -split "`n" | Select-String "http_requests_total"

# 4. Prometheus targets
# Open http://localhost:9090/targets — verify camatis-backend is UP

# 5. Grafana dashboard
# Open http://localhost:3000 — verify all 4 panels show data

# 6. Kubernetes dry-run validation
$root = "C:\Users\Sanskriti\OneDrive\Desktop\CAMATIS Devops"
kubectl apply -f "$root\k8s\" --dry-run=client
kubectl apply -f "$root\monitoring\" --dry-run=client
```

---

## SECTION 9 — TEARDOWN (after demonstration)

```powershell
# Stop port-forwards (close the PowerShell windows running them)

# Delete Kubernetes resources (optional — preserves your cluster state otherwise)
# kubectl delete namespace camatis

# Remove local Docker image (optional)
# docker rmi camatis-backend:local
```
