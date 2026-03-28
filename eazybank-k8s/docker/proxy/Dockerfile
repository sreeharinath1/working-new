# ════════════════════════════════════════════════════════════════════
# EazyBank — CORS Proxy (Python/Flask)
# Use this when: developing locally without Nginx
# In K8s: prefer Nginx sidecar or gateway-level CORS config
# ════════════════════════════════════════════════════════════════════

FROM python:3.12-slim AS base

# Security: create non-root user
RUN useradd -m -u 1001 proxyuser

WORKDIR /app

# Dependencies
COPY docker/proxy/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proxy app
COPY docker/proxy/proxy.py .

# Non-root
USER proxyuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8888/healthz')" || exit 1

LABEL description="EazyBank CORS Proxy"
LABEL use="local-dev only — not for K8s production"

EXPOSE 8888

CMD ["python", "proxy.py"]
