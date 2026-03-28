#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  EazyBank Frontend — Master Deploy Script
#
#  7 deployment methods, selectable by flag or interactive menu.
#
#  Usage:
#    ./deploy.sh                        → interactive menu
#    ./deploy.sh --method kubectl       → direct kubectl apply
#    ./deploy.sh --method compose       → docker-compose
#    ./deploy.sh --method argocd        → ArgoCD sync
#    ./deploy.sh --method github        → trigger GitHub Actions
#    ./deploy.sh --method jenkins       → trigger Jenkins build
#    ./deploy.sh --method ansible       → Ansible + kubectl
#    ./deploy.sh --method terraform     → Terraform + Ansible + kubectl
#
#  Optional flags:
#    --env    [dev|staging|prod]   default: dev
#    --tag    IMAGE_TAG            default: latest
#    --dry-run                     show commands without running
#    --skip   FILE1,FILE2          skip specific manifest files
#    --only   FILE1,FILE2          apply only specific files
#
#  Examples:
#    ./deploy.sh --method kubectl --env prod --tag v2.1.0
#    ./deploy.sh --method kubectl --skip 12-elk-stack.yaml,15-grafana.yaml
#    ./deploy.sh --method compose --env dev
#    ./deploy.sh --method argocd --env prod --dry-run
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[x]${NC} $*" >&2; }
info() { echo -e "${CYAN}[i]${NC} $*"; }
hdr()  { echo -e "\n${BOLD}${BLUE}══ $* ══${NC}"; }

# ── Defaults ──────────────────────────────────────────────────────
METHOD=""
ENV="dev"
TAG="latest"
DRY_RUN=false
SKIP_FILES=""
ONLY_FILES=""

MANIFESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="eazybank"
ARGOCD_APP="eazybank-frontend"
ARGOCD_SERVER="${ARGOCD_SERVER:-argocd.eazybank.example.com}"
JENKINS_URL="${JENKINS_URL:-http://jenkins.eazybank.example.com}"
GITHUB_REPO="${GITHUB_REPO:-YOUR_ORG/eazybank-frontend}"

# All manifest files in apply order
ALL_MANIFESTS=(
  00-namespace.yaml
  01-rbac.yaml
  02-configmap.yaml
  03-secret.yaml
  04-deployment.yaml
  05-service.yaml
  06-hpa.yaml
  07-pdb.yaml
  08-ingress.yaml
  09-networkpolicy.yaml
  10-filebeat-configmap.yaml
  11-monitoring.yaml
  12-elk-stack.yaml
  13-security-scanning.yaml
  14-argocd-app.yaml
  15-grafana.yaml
  16-alertmanager.yaml
)

# ── Parse args ────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --method)   METHOD="$2";     shift 2 ;;
    --env)      ENV="$2";        shift 2 ;;
    --tag)      TAG="$2";        shift 2 ;;
    --dry-run)  DRY_RUN=true;    shift   ;;
    --skip)     SKIP_FILES="$2"; shift 2 ;;
    --only)     ONLY_FILES="$2"; shift 2 ;;
    -h|--help)  grep '^#' "$0" | head -30 | sed 's/^# \?//'; exit 0 ;;
    *) err "Unknown flag: $1"; exit 1 ;;
  esac
done

# ── Helper: run or echo command ───────────────────────────────────
run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YELLOW}[dry-run]${NC} $*"
  else
    eval "$@"
  fi
}

# ── Helper: check prerequisite command ───────────────────────────
need() {
  for cmd in "$@"; do
    if ! command -v "$cmd" &>/dev/null; then
      err "Required command not found: $cmd"
      exit 1
    fi
  done
}

# ── Helper: build manifest list (respecting --skip / --only) ──────
build_manifest_list() {
  local files=()
  if [[ -n "$ONLY_FILES" ]]; then
    IFS=',' read -ra files <<< "$ONLY_FILES"
  else
    files=("${ALL_MANIFESTS[@]}")
  fi

  local result=()
  for f in "${files[@]}"; do
    if [[ -n "$SKIP_FILES" ]] && echo "$SKIP_FILES" | grep -q "$f"; then
      warn "Skipping: $f"
      continue
    fi
    if [[ ! -f "$MANIFESTS_DIR/$f" ]]; then
      warn "File not found, skipping: $f"
      continue
    fi
    result+=("$f")
  done
  echo "${result[@]}"
}

# ── Helper: smoke test after deploy ──────────────────────────────
smoke_test() {
  local url="${1:-}"
  [[ -z "$url" ]] && return 0
  info "Running smoke test: $url"
  sleep 10
  if curl -sf --max-time 10 "$url/healthz" &>/dev/null; then
    log "Smoke test PASSED"
  else
    warn "Smoke test failed — check pod logs"
  fi
}

# ─────────────────────────────────────────────────────────────────
# METHOD 1: kubectl apply (direct, ordered)
# Files used: 00-16 manifests in order
# Files excluded: Dockerfile, docker-compose.yml, Jenkinsfile, ci.yml
# When to use: quick local test, kubeadm single node, no GitOps yet
# ─────────────────────────────────────────────────────────────────
method_kubectl() {
  hdr "METHOD 1: kubectl apply"
  need kubectl

  local manifests
  read -ra manifests <<< "$(build_manifest_list)"

  info "Applying ${#manifests[@]} manifest(s) to namespace: $NAMESPACE"
  info "Environment: $ENV | Tag: $TAG"
  info "Files: ${manifests[*]}"

  # Update image tag in deployment before applying
  if [[ "$TAG" != "latest" ]]; then
    warn "Patching image tag to: $TAG"
    run "sed -i 's|eazybytes/eazybank-frontend:.*|eazybytes/eazybank-frontend:${TAG}|g' \
      ${MANIFESTS_DIR}/04-deployment.yaml"
  fi

  for f in "${manifests[@]}"; do
    log "Applying: $f"
    run "kubectl apply -f ${MANIFESTS_DIR}/${f}"
  done

  log "Waiting for rollout..."
  run "kubectl rollout status deployment/eazybank-frontend -n ${NAMESPACE} --timeout=120s"

  run "kubectl get pods -n ${NAMESPACE} -o wide"

  NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' 2>/dev/null || echo "localhost")
  smoke_test "http://${NODE_IP}:30080"
}

# ─────────────────────────────────────────────────────────────────
# METHOD 2: docker-compose (local dev only)
# Files used: docker-compose.yml, Dockerfile, monitoring/filebeat/filebeat.yml
# Files excluded: ALL k8s yaml (00-16), Jenkinsfile, ci.yml, ArgoCD
# When to use: local dev, no K8s cluster needed
# ─────────────────────────────────────────────────────────────────
method_compose() {
  hdr "METHOD 2: docker-compose"
  need docker

  [[ ! -f "$MANIFESTS_DIR/docker-compose.yml" ]] && {
    err "docker-compose.yml not found in $MANIFESTS_DIR"
    exit 1
  }

  info "Starting EazyBank stack with Docker Compose"
  info "Profile: default (frontend + ELK)"
  info "Image tag: $TAG"

  export IMAGE_TAG="$TAG"
  export GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
  export BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  run "docker compose -f ${MANIFESTS_DIR}/docker-compose.yml pull"
  run "docker compose -f ${MANIFESTS_DIR}/docker-compose.yml up -d --build"

  log "Waiting for frontend health..."
  sleep 15
  smoke_test "http://localhost:30080"

  info "Useful commands:"
  echo "  Logs:    docker compose logs -f eazybank-frontend"
  echo "  Stop:    docker compose down"
  echo "  Sec scan: docker compose --profile sec up"
  echo "  Kibana:  http://localhost:5601"
}

# ─────────────────────────────────────────────────────────────────
# METHOD 3: ArgoCD GitOps sync
# Files used: 14-argocd-app.yaml (already in cluster), Git repo
# Files excluded: Dockerfile, docker-compose.yml, Jenkinsfile, ci.yml
# Files excluded from direct apply: ArgoCD manages 00-13 via Git
# When to use: GitOps workflow, production, post-PR merge
# ─────────────────────────────────────────────────────────────────
method_argocd() {
  hdr "METHOD 3: ArgoCD GitOps sync"
  need curl jq

  [[ -z "${ARGOCD_TOKEN:-}" ]] && {
    err "ARGOCD_TOKEN env var not set"
    err "Export it: export ARGOCD_TOKEN=\$(argocd account generate-token)"
    exit 1
  }

  info "Syncing ArgoCD application: $ARGOCD_APP"
  info "Server: $ARGOCD_SERVER"

  if [[ "$DRY_RUN" == "true" ]]; then
    run "curl -sf -H 'Authorization: Bearer \$ARGOCD_TOKEN' \
      https://${ARGOCD_SERVER}/api/v1/applications/${ARGOCD_APP} | jq .status.sync"
    return
  fi

  run "curl -sSf -X POST \
    -H 'Authorization: Bearer ${ARGOCD_TOKEN}' \
    -H 'Content-Type: application/json' \
    'https://${ARGOCD_SERVER}/api/v1/applications/${ARGOCD_APP}/sync' \
    -d '{\"prune\":true,\"dryRun\":false}' | jq ."

  log "Waiting for ArgoCD health..."
  for i in $(seq 1 30); do
    STATUS=$(curl -sf \
      -H "Authorization: Bearer ${ARGOCD_TOKEN}" \
      "https://${ARGOCD_SERVER}/api/v1/applications/${ARGOCD_APP}" | \
      jq -r '.status.health.status' 2>/dev/null || echo "Unknown")
    info "[$i/30] Health: $STATUS"
    [[ "$STATUS" == "Healthy" ]] && { log "ArgoCD sync complete and Healthy"; return; }
    sleep 10
  done
  err "ArgoCD did not reach Healthy state in time"
  exit 1
}

# ─────────────────────────────────────────────────────────────────
# METHOD 4: GitHub Actions (trigger workflow via API)
# Files used: .github/workflows/ci.yml (in repo)
# Files excluded: Jenkinsfile, docker-compose.yml for prod
# When to use: PR merged to main, or tag push for release
# ─────────────────────────────────────────────────────────────────
method_github() {
  hdr "METHOD 4: GitHub Actions trigger"
  need curl jq

  [[ -z "${GITHUB_TOKEN:-}" ]] && {
    err "GITHUB_TOKEN env var not set"
    exit 1
  }

  BRANCH="${BRANCH:-main}"
  info "Triggering workflow on repo: $GITHUB_REPO branch: $BRANCH"

  run "curl -sSf -X POST \
    -H 'Authorization: Bearer ${GITHUB_TOKEN}' \
    -H 'Accept: application/vnd.github.v3+json' \
    'https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/ci.yml/dispatches' \
    -d '{\"ref\":\"${BRANCH}\",\"inputs\":{\"tag\":\"${TAG}\"}}'"

  log "Workflow triggered — check: https://github.com/${GITHUB_REPO}/actions"
}

# ─────────────────────────────────────────────────────────────────
# METHOD 5: Jenkins (trigger build via API)
# Files used: Jenkinsfile (in repo)
# Files excluded: ci.yml (GitHub Actions not used)
# When to use: on-prem CI/CD, Jenkins-first shops
# ─────────────────────────────────────────────────────────────────
method_jenkins() {
  hdr "METHOD 5: Jenkins pipeline trigger"
  need curl

  [[ -z "${JENKINS_USER:-}" || -z "${JENKINS_TOKEN:-}" ]] && {
    err "JENKINS_USER and JENKINS_TOKEN env vars must be set"
    exit 1
  }

  JOB_NAME="${JENKINS_JOB:-eazybank-frontend}"
  info "Triggering Jenkins job: $JOB_NAME on $JENKINS_URL"

  run "curl -sSf -X POST \
    --user '${JENKINS_USER}:${JENKINS_TOKEN}' \
    '${JENKINS_URL}/job/${JOB_NAME}/buildWithParameters' \
    --data 'IMAGE_TAG=${TAG}&ENV=${ENV}'"

  log "Jenkins build triggered — check: $JENKINS_URL/job/$JOB_NAME"
}

# ─────────────────────────────────────────────────────────────────
# METHOD 6: Ansible (bootstrap + kubectl apply)
# Files used: ansible-playbook.yml, all 00-16 manifests
# Files excluded: Dockerfile (built separately), Jenkinsfile, ci.yml
# When to use: fresh EC2 that needs K8s installed first
# ─────────────────────────────────────────────────────────────────
method_ansible() {
  hdr "METHOD 6: Ansible bootstrap + kubectl apply"
  need ansible-playbook

  INVENTORY="${ANSIBLE_INVENTORY:-${MANIFESTS_DIR}/ansible/inventory.ini}"
  PLAYBOOK="${MANIFESTS_DIR}/ansible-playbook.yml"
  KEY="${ANSIBLE_KEY:-~/.ssh/eazybank-key.pem}"

  [[ ! -f "$PLAYBOOK" ]] && { err "Playbook not found: $PLAYBOOK"; exit 1; }
  [[ ! -f "$INVENTORY" ]] && { err "Inventory not found: $INVENTORY"; exit 1; }

  info "Running Ansible playbook: $PLAYBOOK"
  info "Inventory: $INVENTORY"

  run "ansible-playbook -i ${INVENTORY} ${PLAYBOOK} \
    --private-key ${KEY} \
    -u ec2-user --become \
    -e 'manifests_dir=${MANIFESTS_DIR}' \
    -e 'image_tag=${TAG}' \
    -v"
}

# ─────────────────────────────────────────────────────────────────
# METHOD 7: Terraform + Ansible + kubectl (full from scratch)
# Files used: terraform-main.tf, ansible-playbook.yml, all 00-16
# Files excluded: Jenkinsfile, ci.yml, docker-compose.yml
# When to use: brand new environment, nothing exists yet
# ─────────────────────────────────────────────────────────────────
method_terraform() {
  hdr "METHOD 7: Terraform + Ansible + kubectl (full stack)"
  need terraform ansible-playbook kubectl

  TF_DIR="${MANIFESTS_DIR}/terraform"
  [[ ! -f "${MANIFESTS_DIR}/terraform-main.tf" ]] && {
    err "terraform-main.tf not found"
    exit 1
  }

  # Step 1: Terraform
  log "Step 1/3: Terraform — provision EC2 infrastructure"
  mkdir -p "$TF_DIR"
  cp "${MANIFESTS_DIR}/terraform-main.tf" "${TF_DIR}/main.tf"

  run "cd ${TF_DIR} && terraform init"
  run "cd ${TF_DIR} && terraform plan"

  if [[ "$DRY_RUN" != "true" ]]; then
    read -rp "Apply Terraform? (yes/no): " confirm
    [[ "$confirm" != "yes" ]] && { warn "Terraform skipped"; exit 0; }
    run "cd ${TF_DIR} && terraform apply -auto-approve"

    EC2_IP=$(cd "$TF_DIR" && terraform output -raw public_ip 2>/dev/null)
    log "EC2 provisioned at: $EC2_IP"

    # Generate Ansible inventory dynamically
    mkdir -p "${MANIFESTS_DIR}/ansible"
    cat > "${MANIFESTS_DIR}/ansible/inventory.ini" <<EOF
[masters]
${EC2_IP} ansible_user=ec2-user
EOF
  fi

  # Step 2: Ansible
  log "Step 2/3: Ansible — bootstrap K8s on EC2"
  sleep 30  # wait for EC2 to be reachable
  method_ansible

  # Step 3: Verify
  log "Step 3/3: Verify deployment"
  run "kubectl get pods -n ${NAMESPACE} -o wide"
  run "kubectl get svc  -n ${NAMESPACE}"

  if [[ "$DRY_RUN" != "true" ]]; then
    smoke_test "http://${EC2_IP}:30080"
    info "Grafana: http://${EC2_IP}:30300"
    info "Kibana:  http://${EC2_IP}:30601"
  fi
}

# ── Interactive menu ──────────────────────────────────────────────
show_menu() {
  echo ""
  echo -e "${BOLD}EazyBank Frontend — Deploy Menu${NC}"
  echo "────────────────────────────────────"
  echo "  1) kubectl apply    (direct, fastest)"
  echo "  2) docker-compose   (local dev only)"
  echo "  3) ArgoCD GitOps    (production recommended)"
  echo "  4) GitHub Actions   (trigger CI pipeline)"
  echo "  5) Jenkins pipeline (trigger Jenkins build)"
  echo "  6) Ansible          (bootstrap + deploy)"
  echo "  7) Terraform        (full from scratch)"
  echo "  q) Quit"
  echo ""
  read -rp "Choose [1-7]: " choice
  case "$choice" in
    1) METHOD="kubectl"   ;;
    2) METHOD="compose"   ;;
    3) METHOD="argocd"    ;;
    4) METHOD="github"    ;;
    5) METHOD="jenkins"   ;;
    6) METHOD="ansible"   ;;
    7) METHOD="terraform" ;;
    q) exit 0 ;;
    *) err "Invalid choice"; exit 1 ;;
  esac
}

# ── Main ──────────────────────────────────────────────────────────
main() {
  echo -e "${BOLD}EazyBank Deploy Script${NC} | env=${ENV} tag=${TAG} dry-run=${DRY_RUN}"

  [[ -z "$METHOD" ]] && show_menu

  case "$METHOD" in
    kubectl)   method_kubectl   ;;
    compose)   method_compose   ;;
    argocd)    method_argocd    ;;
    github)    method_github    ;;
    jenkins)   method_jenkins   ;;
    ansible)   method_ansible   ;;
    terraform) method_terraform ;;
    *)
      err "Unknown method: $METHOD"
      err "Valid: kubectl | compose | argocd | github | jenkins | ansible | terraform"
      exit 1
      ;;
  esac

  log "Done."
}

main "$@"
