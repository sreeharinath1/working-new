#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# EazyBank — Master Deploy Script
# Usage: ./deploy.sh [OPTIONS]
#
# Options:
#   --mode nginx|direct|docker|helm|kustomize
#   --env dev|prod
#   --ec2-ip <IP>        EC2 instance IP
#   --namespace <ns>     K8s namespace (default: eazybank)
#   --dry-run            Print commands without executing
#   --help
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────
MODE="${MODE:-nginx}"
ENV="${DEPLOY_ENV:-dev}"
EC2_IP="${EC2_IP:-13.233.158.149}"
NAMESPACE="${NAMESPACE:-eazybank}"
DRY_RUN=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[INFO]${RESET} $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET}   $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
die()  { echo -e "${RED}[ERR]${RESET}  $*" >&2; exit 1; }
run()  { if $DRY_RUN; then echo -e "${YELLOW}[DRY]${RESET} $*"; else eval "$*"; fi; }

# ── Argument parsing ─────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)       MODE="$2"; shift 2;;
    --env)        ENV="$2"; shift 2;;
    --ec2-ip)     EC2_IP="$2"; shift 2;;
    --namespace)  NAMESPACE="$2"; shift 2;;
    --dry-run)    DRY_RUN=true; shift;;
    --help)       grep '^#' "$0" | head -20 | sed 's/^# \?//'; exit 0;;
    *)            die "Unknown option: $1. Use --help for usage.";;
  esac
done

echo -e "${BOLD}"
echo "  ███████╗ █████╗ ███████╗██╗   ██╗██████╗  █████╗ ███╗   ██╗██╗  ██╗"
echo "  ██╔════╝██╔══██╗╚══███╔╝╚██╗ ██╔╝██╔══██╗██╔══██╗████╗  ██║██║ ██╔╝"
echo "  █████╗  ███████║  ███╔╝  ╚████╔╝ ██████╔╝███████║██╔██╗ ██║█████╔╝"
echo "  ██╔══╝  ██╔══██║ ███╔╝    ╚██╔╝  ██╔══██╗██╔══██║██║╚██╗██║██╔═██╗"
echo "  ███████╗██║  ██║███████╗   ██║   ██████╔╝██║  ██║██║ ╚████║██║  ██╗"
echo "  ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝"
echo -e "${RESET}"
echo -e "${CYAN}  MODE: ${BOLD}$MODE${RESET} | ENV: ${BOLD}$ENV${RESET} | EC2: ${BOLD}$EC2_IP${RESET} | NS: ${BOLD}$NAMESPACE${RESET}"
echo ""

# ── Prerequisites check ──────────────────────────────────────────────
check_prereqs() {
  log "Checking prerequisites..."
  for cmd in kubectl; do
    command -v "$cmd" &>/dev/null || die "$cmd not found. Please install it."
  done
  if [[ "$MODE" == "helm" ]]; then
    command -v helm &>/dev/null || die "helm not found. Install from https://helm.sh"
  fi
  if [[ "$MODE" == "docker" ]]; then
    command -v docker &>/dev/null || die "docker not found."
    command -v docker-compose &>/dev/null || command -v "docker compose" &>/dev/null \
      || warn "docker-compose not found — using 'docker compose' subcommand"
  fi
  ok "Prerequisites OK"
}

# ── Create frontend ConfigMap from HTML ──────────────────────────────
create_html_configmap() {
  log "Creating frontend-html ConfigMap from eazybank.html..."
  run "kubectl create configmap frontend-html \
    --from-file=eazybank.html='${SCRIPT_DIR}/frontend/eazybank.html' \
    -n '${NAMESPACE}' \
    --dry-run=client -o yaml | kubectl apply -f -"
  ok "frontend-html ConfigMap applied"
}

# ── Deploy: Nginx mode (K8s with Nginx reverse proxy) ────────────────
deploy_nginx() {
  log "Deploying EazyBank — NGINX mode (K8s)"
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/00-namespace-rbac.yaml'"
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/01-secrets.yaml'"
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/02-configmaps.yaml'"
  create_html_configmap
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/03-databases.yaml'"
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/04-nginx-frontend.yaml'"
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/05-ingress.yaml'"
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/06-storage.yaml'"
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/07-network-policies.yaml'"
  wait_for_rollout "nginx-frontend"
  print_access_info
}

# ── Deploy: Direct mode (NodePort, no Nginx) ─────────────────────────
deploy_direct() {
  log "Deploying EazyBank — DIRECT NodePort mode"
  warn "In direct mode, open ports 30564 (GW) and 31479 (KC) in AWS Security Group!"
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/00-namespace-rbac.yaml'"
  run "kubectl apply -f '${SCRIPT_DIR}/k8s/base/01-secrets.yaml'"
  create_html_configmap
  echo ""
  echo -e "${YELLOW}  Direct access URLs:${RESET}"
  echo -e "  Gateway:  ${CYAN}http://${EC2_IP}:30564${RESET}"
  echo -e "  Keycloak: ${CYAN}http://${EC2_IP}:31479${RESET}"
}

# ── Deploy: Docker Compose (local dev) ───────────────────────────────
deploy_docker() {
  log "Starting EazyBank — Docker Compose (local dev)"
  cd "${SCRIPT_DIR}"
  run "EC2_IP='${EC2_IP}' docker compose up --build -d"
  echo ""
  ok "Frontend: http://localhost:3000"
  ok "Proxy:    http://localhost:8888/healthz"
}

# ── Deploy: Helm ──────────────────────────────────────────────────────
deploy_helm() {
  log "Deploying EazyBank — Helm (env: ${ENV})"
  create_html_configmap
  run "helm upgrade --install eazybank '${SCRIPT_DIR}/k8s/helm/eazybank' \
    --namespace '${NAMESPACE}' \
    --create-namespace \
    --values '${SCRIPT_DIR}/k8s/helm/eazybank/values.yaml' \
    --set global.namespace='${NAMESPACE}' \
    --atomic \
    --timeout 5m \
    --wait"
  wait_for_rollout "nginx-frontend"
  print_access_info
}

# ── Deploy: Kustomize ─────────────────────────────────────────────────
deploy_kustomize() {
  log "Deploying EazyBank — Kustomize (env: ${ENV})"
  create_html_configmap
  run "kubectl apply -k '${SCRIPT_DIR}/k8s/overlays/${ENV}'"
  wait_for_rollout "nginx-frontend"
  print_access_info
}

# ── Wait for rollout ──────────────────────────────────────────────────
wait_for_rollout() {
  local deploy="$1"
  log "Waiting for ${deploy} rollout..."
  if ! $DRY_RUN; then
    kubectl rollout status deployment/"${deploy}" -n "${NAMESPACE}" --timeout=3m || \
      warn "Rollout timeout — check: kubectl get pods -n ${NAMESPACE}"
  fi
}

# ── Print access info ─────────────────────────────────────────────────
print_access_info() {
  echo ""
  echo -e "${GREEN}════════════════════════════════════════${RESET}"
  echo -e "${BOLD}  EazyBank deployed successfully! 🎉${RESET}"
  echo -e "${GREEN}════════════════════════════════════════${RESET}"
  echo -e "  Frontend:  ${CYAN}http://${EC2_IP}:30080${RESET}"
  echo -e "  Gateway:   ${CYAN}ClusterIP gatewayserver:8072${RESET}"
  echo -e "  Keycloak:  ${CYAN}via Nginx :30080/realms/master${RESET}"
  echo ""
  echo -e "  kubectl get pods -n ${NAMESPACE}"
  echo -e "  kubectl get svc  -n ${NAMESPACE}"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────
check_prereqs

case "$MODE" in
  nginx)      deploy_nginx ;;
  direct)     deploy_direct ;;
  docker)     deploy_docker ;;
  helm)       deploy_helm ;;
  kustomize)  deploy_kustomize ;;
  *)          die "Unknown mode: $MODE. Choose: nginx|direct|docker|helm|kustomize" ;;
esac
