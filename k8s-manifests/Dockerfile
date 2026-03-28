# ─────────────────────────────────────────────────────────────────
#  EazyBank Frontend — Multi-Stage Production Dockerfile
#  Stage 1: Node builder (minify/bundle assets if needed)
#  Stage 2: Production Nginx image (hardened, non-root)
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ─────────────────────────────────────────────
FROM node:20-alpine AS builder

LABEL stage=builder

WORKDIR /build

# Copy only what's needed for dependency install first (layer cache)
COPY package*.json ./
RUN npm ci --only=production 2>/dev/null || true

# Copy source assets
COPY html/ ./html/

# Optional: minify HTML (install html-minifier-terser if needed)
# RUN npx html-minifier-terser --collapse-whitespace --remove-comments \
#     --minify-css true --minify-js true \
#     -o html/eazybank.min.html html/eazybank.html && \
#     mv html/eazybank.min.html html/eazybank.html

# ── Stage 2: Production Nginx ─────────────────────────────────────
FROM nginx:1.25.3-alpine AS production

LABEL maintainer="platform-team@eazybytes.com" \
      app="eazybank-frontend" \
      version="2.0.0" \
      environment="production"

# Remove default nginx config and default html
RUN rm -rf /etc/nginx/conf.d/default.conf \
           /usr/share/nginx/html/*

# ── Security hardening ────────────────────────────────────────────
# Remove server tokens (already in nginx.conf but belt+braces)
RUN sed -i 's/^user  nginx;/user  nginx;\nserver_tokens off;/' /etc/nginx/nginx.conf 2>/dev/null || true

# Create required directories with correct permissions
RUN mkdir -p /var/cache/nginx/client_temp \
             /var/cache/nginx/proxy_temp \
             /var/cache/nginx/fastcgi_temp \
             /var/cache/nginx/uwsgi_temp \
             /var/cache/nginx/scgi_temp \
             /etc/nginx/conf.d \
    && chown -R nginx:nginx \
             /var/cache/nginx \
             /var/log/nginx \
             /etc/nginx/conf.d \
    && chmod -R 755 /var/cache/nginx

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built frontend assets
COPY --from=builder /build/html/ /usr/share/nginx/html/

# config.js placeholder — real one injected via ConfigMap at runtime
# This prevents nginx from failing on startup if ConfigMap not mounted
RUN echo "window.APP_CONFIG = {};" > /etc/nginx/conf.d/config.js \
    && chown nginx:nginx /etc/nginx/conf.d/config.js

# Validate nginx config at build time
RUN nginx -t

# ── Runtime ────────────────────────────────────────────────────────
# Run as non-root (nginx user, uid 101 in alpine image)
USER nginx

# Expose only HTTP — TLS termination done at ingress/LB level
EXPOSE 80

# Health check (mirrors K8s readiness probe)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
