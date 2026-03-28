# 🏦 EazyBank — Production K8s Frontend Package

> **Full-stack deployment package for EazyBank microservices frontend**
> Nginx · Docker · Kubernetes · Helm · Kustomize · Secrets · Ingress · NetworkPolicy · HPA

---

## 📦 What's Inside

```
eazybank-k8s/
├── frontend/
│   └── eazybank.html              # ⭐ Outstanding UI (Syne font, neon theme, Space Mono)
├── docker/
│   ├── nginx/
│   │   ├── Dockerfile             # Multi-stage build (node minify → nginx:alpine)
│   │   ├── nginx-standalone.conf  # For Docker Compose / standalone
│   │   └── dev-config.js          # Local dev config (no secret in browser)
│   └── proxy/
│       ├── Dockerfile             # Python CORS proxy
│       ├── proxy.py               # Production Flask proxy w/ health endpoint
│       └── requirements.txt
├── k8s/
│   ├── base/
│   │   ├── 00-namespace-rbac.yaml     # Namespace + ServiceAccount + RBAC
│   │   ├── 01-secrets.yaml            # All secrets (DB, Keycloak, frontend)
│   │   ├── 02-configmaps.yaml         # Nginx config + frontend config.js
│   │   ├── 03-databases.yaml          # accountsdb, loansdb, cardsdb (Postgres)
│   │   ├── 04-nginx-frontend.yaml     # Deployment + Service + HPA (init container!)
│   │   ├── 05-ingress.yaml            # NGINX Ingress + ALB Ingress (commented)
│   │   ├── 06-storage.yaml            # PersistentVolumeClaims (5Gi each)
│   │   ├── 07-network-policies.yaml   # Zero-trust NetworkPolicies
│   │   └── kustomization.yaml
│   ├── overlays/
│   │   ├── dev/kustomization.yaml     # Dev: 1 replica
│   │   └── prod/kustomization.yaml    # Prod: 3 replicas
│   └── helm/eazybank/
│       ├── Chart.yaml
│       ├── values.yaml                # All config in one place
│       └── templates/
│           ├── frontend.yaml          # Deployment + Service + HPA
│           ├── ingress.yaml
│           └── pdb.yaml               # PodDisruptionBudget
├── docker-compose.yml             # Local dev (nginx + proxy)
├── deploy.sh                      # 🚀 Master deploy script (5 modes)
├── teardown.sh
└── README.md
```

---

## 🚀 Quick Start

### Option 1 — K8s with Nginx (Recommended Production)

```bash
chmod +x deploy.sh

# Step 1: Update secrets (NEVER commit real values!)
vim k8s/base/01-secrets.yaml

# Step 2: Deploy
./deploy.sh --mode nginx --ec2-ip <YOUR_EC2_IP>

# Access
open http://<EC2_IP>:30080
```

### Option 2 — Local Dev (Docker Compose)

```bash
# Copy and edit env
cp .env.example .env
vim .env    # set EC2_IP, KC_CLIENT_SECRET

./deploy.sh --mode docker --ec2-ip <EC2_IP>

open http://localhost:3000
```

### Option 3 — Helm

```bash
./deploy.sh --mode helm --env prod --ec2-ip <EC2_IP>
# or directly:
helm upgrade --install eazybank k8s/helm/eazybank/ \
  --namespace eazybank --create-namespace \
  --set global.namespace=eazybank
```

### Option 4 — Kustomize

```bash
# Dev (1 replica)
./deploy.sh --mode kustomize --env dev

# Prod (3 replicas)
./deploy.sh --mode kustomize --env prod
```

### Option 5 — Direct NodePort (no Nginx)

```bash
./deploy.sh --mode direct --ec2-ip <EC2_IP>
# In the UI: switch Mode → DIRECT, enter ports 30564 / 31479
```

---

## 🏗️ Architecture

```
Internet
    │
    ▼
EC2 (AWS)
    │
    ├── :30080 NodePort
    │       │
    ▼       ▼
┌────────────────────────────────────────────────────┐
│  K8s Cluster (kubeadm / EKS)                       │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │  Nginx Frontend  (2-6 pods, HPA)            │  │
│  │  ┌──────────┐  ┌───────────────────────┐   │  │
│  │  │init cont │→ │  nginx:1.25-alpine     │   │  │
│  │  │ (secret  │  │  /eazybank/ → GW:8072  │   │  │
│  │  │  inject) │  │  /realms/  → KC:80     │   │  │
│  │  └──────────┘  └───────────────────────┘   │  │
│  └─────────────────────────────────────────────┘  │
│           │                   │                    │
│           ▼                   ▼                    │
│  ┌─────────────┐    ┌──────────────────┐          │
│  │ gatewayserver│   │    keycloak       │          │
│  │  :8072      │    │    :80            │          │
│  └─────────────┘    └──────────────────┘          │
│       │                                            │
│  ┌────┼────────────┐                              │
│  ▼    ▼            ▼                              │
│ accounts  loans   cards                           │
│  :8080   :8090   :9000                            │
│  ├─db    ├─db    ├─db                             │
│  (PG)   (PG)    (PG)                             │
└────────────────────────────────────────────────────┘
```

---

## 🔐 Secrets Management

### Current setup (dev/learning)
Secrets are in `k8s/base/01-secrets.yaml` as base64-encoded K8s Secrets.

> ⚠️ Base64 is NOT encryption — don't commit real secrets to git!

### Production options

#### Option A: Sealed Secrets (recommended for GitOps)
```bash
# Install
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml
kubeseal --fetch-cert > pub-cert.pem

# Seal your secrets
kubeseal --cert pub-cert.pem -f k8s/base/01-secrets.yaml -o yaml > k8s/base/01-secrets.sealed.yaml
# Commit ONLY the sealed file — never the plain Secret
```

#### Option B: AWS Secrets Manager + External Secrets Operator
```bash
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Then create ExternalSecret resources pointing to AWS Secrets Manager ARNs
```

#### Option C: HashiCorp Vault
```bash
helm install vault hashicorp/vault --set "server.dev.enabled=true"
# Use vault-agent sidecar to inject secrets at runtime
```

---

## 🌐 Frontend Deployment Methods — Comparison

| Method | Complexity | Secret Safety | Best For |
|--------|-----------|---------------|----------|
| **Nginx K8s + Init Container** | Medium | ✅ Secret never in browser | Production |
| **Nginx K8s + ConfigMap only** | Low | ⚠️ Secret visible in ConfigMap | Dev/staging |
| **CORS Proxy + Direct HTML** | Low | ✅ Proxy holds secret | Dev/local |
| **Docker Compose** | Very Low | ✅ .env file | Local dev |
| **Helm** | Medium | ✅ values override | GitOps/CI-CD |
| **Kustomize overlays** | Low | ✅ Overlay patches | Multi-env |
| **Ingress Controller** | High | ✅ TLS termination | Production + HTTPS |

---

## 🔧 Key K8s Features Used

| Feature | File | Purpose |
|---------|------|---------|
| **Namespace** | 00-namespace-rbac.yaml | Isolation |
| **RBAC** | 00-namespace-rbac.yaml | Least-privilege access |
| **Secrets** | 01-secrets.yaml | Encrypted credential storage |
| **ConfigMaps** | 02-configmaps.yaml | Nginx config, app config |
| **Init Container** | 04-nginx-frontend.yaml | Secret injection at startup |
| **HPA** | 04-nginx-frontend.yaml | Auto-scale 2→6 pods |
| **Rolling Update** | 04-nginx-frontend.yaml | Zero-downtime deploys |
| **Ingress** | 05-ingress.yaml | L7 routing, TLS termination |
| **PVC** | 06-storage.yaml | Persistent DB storage |
| **NetworkPolicy** | 07-network-policies.yaml | Zero-trust pod networking |
| **PodDisruptionBudget** | helm/templates/pdb.yaml | HA during node maintenance |
| **Pod Anti-Affinity** | 04-nginx-frontend.yaml | Spread across nodes |
| **Resource Limits** | all deployments | Prevent noisy neighbour |
| **Liveness/Readiness** | all deployments | Automatic pod recovery |

---

## 📋 Common Commands

```bash
# Check everything
kubectl get all -n eazybank

# Watch pods come up
kubectl get pods -n eazybank -w

# Frontend logs
kubectl logs -n eazybank -l app=nginx-frontend -f

# Nginx config inside pod
kubectl exec -n eazybank deploy/nginx-frontend -- cat /etc/nginx/nginx.conf

# Injected config.js (has real secret)
kubectl exec -n eazybank deploy/nginx-frontend -- cat /etc/nginx/conf.d/config.js

# Scale manually
kubectl scale deploy/nginx-frontend --replicas=4 -n eazybank

# Rollback
kubectl rollout undo deploy/nginx-frontend -n eazybank

# Port-forward for local testing (bypasses NodePort)
kubectl port-forward svc/nginx-frontend 8080:80 -n eazybank

# Update frontend HTML
kubectl create configmap frontend-html \
  --from-file=eazybank.html=frontend/eazybank.html \
  -n eazybank --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deploy/nginx-frontend -n eazybank
```

---

## 🔄 Updating the Frontend

```bash
# 1. Edit frontend/eazybank.html
vim frontend/eazybank.html

# 2. Update ConfigMap
kubectl create configmap frontend-html \
  --from-file=eazybank.html=frontend/eazybank.html \
  -n eazybank --dry-run=client -o yaml | kubectl apply -f -

# 3. Rolling restart (zero downtime)
kubectl rollout restart deployment/nginx-frontend -n eazybank

# 4. Watch
kubectl rollout status deployment/nginx-frontend -n eazybank
```

---

## 🔒 Security Checklist

- [ ] Change default DB passwords in `01-secrets.yaml`
- [ ] Change Keycloak admin password
- [ ] Replace Keycloak client secret
- [ ] Use Sealed Secrets or Vault in production
- [ ] Enable NetworkPolicies (`07-network-policies.yaml`)
- [ ] Set `ssl-redirect: "true"` in Ingress annotations
- [ ] Add TLS cert (cert-manager or ACM)
- [ ] Review RBAC roles (principle of least privilege)
- [ ] Enable Pod Security Standards
- [ ] Set `runAsNonRoot: true` in pod security context

---

## 📝 .env.example

```bash
EC2_IP=13.233.158.149
GW_PORT=30564
KC_PORT=31479
KC_CLIENT_ID=eazybank-callcenter-cc
KC_CLIENT_SECRET=your-secret-here
```

---

## 🆘 Troubleshooting

**Frontend not loading:**
```bash
kubectl describe pod -n eazybank -l app=nginx-frontend
kubectl logs -n eazybank -l app=nginx-frontend
```

**Auth error (token fetch fails):**
```bash
# Check Keycloak is reachable from nginx pod
kubectl exec -n eazybank deploy/nginx-frontend -- \
  wget -qO- http://keycloak/realms/master/.well-known/openid-configuration
```

**Gateway 502/504:**
```bash
# Check gateway is running
kubectl get pods -n eazybank | grep gateway
kubectl logs -n eazybank -l app=gatewayserver
```

**Init container not injecting secret:**
```bash
kubectl logs -n eazybank -l app=nginx-frontend -c config-injector
```
