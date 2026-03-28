#!/usr/bin/env bash
# EazyBank — Teardown Script
set -euo pipefail
NAMESPACE="${NAMESPACE:-eazybank}"
echo "⚠️  Removing EazyBank from namespace: $NAMESPACE"
read -p "Are you sure? (yes/no): " confirm
[[ "$confirm" == "yes" ]] || { echo "Aborted."; exit 0; }

kubectl delete namespace "$NAMESPACE" --ignore-not-found
echo "✅ EazyBank removed."
