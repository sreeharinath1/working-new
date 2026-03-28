# ════════════════════════════════════════════════════════════════════
# EazyBank Frontend — Multi-Stage Docker Build
# Stage 1: Validate/minify (node)
# Stage 2: Production nginx image (alpine)
# ════════════════════════════════════════════════════════════════════

# ── Stage 1: Build/Validate ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# Install minification tools
RUN npm install -g html-minifier-terser clean-css-cli terser

# Copy source
COPY frontend/ ./

# Minify HTML (inline CSS+JS)
RUN html-minifier-terser \
      --collapse-whitespace \
      --remove-comments \
      --minify-css true \
      --minify-js true \
      --remove-attribute-quotes \
      eazybank.html -o eazybank.min.html || cp eazybank.html eazybank.min.html

# ── Stage 2: Production Nginx ────────────────────────────────────────
FROM nginx:1.25-alpine AS production

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /var/cache/nginx /var/run /var/log/nginx \
    && chmod -R 755 /var/cache/nginx

# Copy built HTML
COPY --from=builder /build/eazybank.min.html /usr/share/nginx/html/eazybank.html
COPY --from=builder /build/eazybank.min.html /usr/share/nginx/html/index.html

# Custom nginx config (will be overridden by ConfigMap in K8s)
COPY docker/nginx/nginx-standalone.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

# Metadata
LABEL maintainer="eazybank-team"
LABEL version="1.0"
LABEL description="EazyBank Frontend — Production Nginx"

EXPOSE 80

# Switch to non-root (note: nginx master must bind :80, use 8080 if non-root required)
# USER appuser

CMD ["nginx", "-g", "daemon off;"]
