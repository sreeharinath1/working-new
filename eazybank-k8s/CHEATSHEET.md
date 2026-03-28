# EazyBank — K8s Cheatsheet

## 🚀 Deploy
```bash
./deploy.sh --mode nginx --ec2-ip <IP>
```

## 🔵🟢 Blue-Green Switch
```bash
# Scale green up first
kubectl scale deploy/nginx-frontend-green --replicas=2 -n eazybank

# Test green at :30083
curl http://<IP>:30083/healthz

# Switch ALL traffic to green (instant, zero downtime)
kubectl patch svc nginx-frontend -n eazybank \
  -p '{"spec":{"selector":{"app":"nginx-frontend","version":"green"}}}'

# Rollback to blue instantly
kubectl patch svc nginx-frontend -n eazybank \
  -p '{"spec":{"selector":{"app":"nginx-frontend","version":"stable"}}}'
```

## 🐤 Canary (20% traffic)
```bash
# Activate canary (1 canary vs 2 stable = ~33% traffic)
kubectl scale deploy/nginx-frontend-canary --replicas=1 -n eazybank

# Test canary directly at :30082
curl http://<IP>:30082/healthz

# Watch canary logs
kubectl logs -n eazybank -l version=canary -f

# Promote: update stable image then kill canary
kubectl set image deploy/nginx-frontend nginx=nginx:1.26-alpine -n eazybank
kubectl scale deploy/nginx-frontend-canary --replicas=0 -n eazybank

# Rollback canary
kubectl scale deploy/nginx-frontend-canary --replicas=0 -n eazybank
```

## 📈 HPA — Check autoscaling
```bash
kubectl get hpa -n eazybank
kubectl describe hpa nginx-frontend-hpa -n eazybank

# Simulate load (triggers scale up)
kubectl run -it --rm load-test --image=busybox -n eazybank -- \
  sh -c "while true; do wget -q -O- http://nginx-frontend/healthz; done"
```

## 📊 VPA — Get recommendations
```bash
kubectl describe vpa nginx-frontend-vpa -n eazybank
# Look for "Recommendation" section — shows optimal CPU/memory
```

## 🔄 Rolling Update
```bash
# Update image (rolling, zero downtime)
kubectl set image deploy/nginx-frontend nginx=nginx:1.26-alpine -n eazybank

# Watch rollout
kubectl rollout status deploy/nginx-frontend -n eazybank

# Rollback
kubectl rollout undo deploy/nginx-frontend -n eazybank

# Rollback to specific revision
kubectl rollout history deploy/nginx-frontend -n eazybank
kubectl rollout undo deploy/nginx-frontend --to-revision=2 -n eazybank
```

## 🔑 Rotate Keycloak Secret
```bash
NEW_SECRET=$(echo -n 'new-secret-here' | base64)
kubectl patch secret frontend-secrets -n eazybank \
  -p "{\"data\":{\"keycloak-client-secret\":\"${NEW_SECRET}\"}}"
kubectl rollout restart deploy/nginx-frontend -n eazybank
```

## 📋 Useful Checks
```bash
kubectl get all -n eazybank
kubectl get pods -n eazybank -o wide
kubectl top pods -n eazybank
kubectl describe resourcequota -n eazybank
kubectl describe limitrange -n eazybank
kubectl get pdb -n eazybank
kubectl get cronjobs -n eazybank
kubectl get jobs -n eazybank

# Run DB migration job manually
kubectl apply -f k8s/base/08-governance-jobs.yaml
kubectl wait --for=condition=complete job/db-migrate -n eazybank --timeout=5m
kubectl logs -n eazybank job/db-migrate

# Port-forward (bypass NodePort for local testing)
kubectl port-forward svc/nginx-frontend 8080:80 -n eazybank
```

## 🌐 Access URLs
| Service | URL |
|---------|-----|
| Stable frontend | http://\<IP\>:30081 |
| Canary frontend | http://\<IP\>:30082 |
| Green frontend  | http://\<IP\>:30083 |
