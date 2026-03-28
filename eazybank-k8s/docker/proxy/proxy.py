"""
EazyBank CORS Proxy — Production-grade Flask proxy
Usage: Local dev / Docker Compose (NOT for K8s production — use Nginx there)
"""
from flask import Flask, request, Response
from flask_cors import CORS
import requests
import threading
import time
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ── Config from environment ──────────────────────────────────────────
GW            = os.getenv("GATEWAY_URL",     "http://localhost:30564")
KC            = os.getenv("KEYCLOAK_URL",    "http://localhost:31479/realms/master/protocol/openid-connect/token")
CLIENT_ID     = os.getenv("KC_CLIENT_ID",    "eazybank-callcenter-cc")
CLIENT_SECRET = os.getenv("KC_CLIENT_SECRET","")
REFRESH_SEC   = int(os.getenv("TOKEN_REFRESH_SEC", "50"))

# ── Token cache ──────────────────────────────────────────────────────
token_cache = {"token": None, "expires_at": 0, "error": None}

def fetch_token():
    """Background thread: refresh token every REFRESH_SEC seconds."""
    while True:
        try:
            r = requests.post(KC, data={
                "grant_type":    "client_credentials",
                "client_id":     CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "scope":         "openid profile email"
            }, timeout=10)
            if r.ok:
                data = r.json()
                token_cache["token"]      = data.get("access_token")
                token_cache["expires_at"] = time.time() + data.get("expires_in", 300)
                token_cache["error"]      = None
                log.info("✅ Token refreshed (expires in %ds)", data.get("expires_in"))
            else:
                token_cache["error"] = f"HTTP {r.status_code}: {r.text[:200]}"
                log.error("❌ Token fetch failed: %s", token_cache["error"])
        except Exception as e:
            token_cache["error"] = str(e)
            log.error("❌ Token error: %s", e)
        time.sleep(REFRESH_SEC)

threading.Thread(target=fetch_token, daemon=True, name="token-refresher").start()
time.sleep(2)  # Wait for first token

# ── CORS headers ─────────────────────────────────────────────────────
CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, eazybank-correlation-id",
    "Access-Control-Max-Age":       "86400",
}

# ── Routes ────────────────────────────────────────────────────────────
@app.route("/healthz")
def health():
    status = "ok" if token_cache["token"] else "degraded"
    return {"status": status, "token": bool(token_cache["token"]),
            "error": token_cache["error"]}, 200

@app.route("/<path:path>", methods=["GET","POST","PUT","DELETE","OPTIONS"])
@app.route("/", defaults={"path": ""}, methods=["GET","POST","PUT","DELETE","OPTIONS"])
def proxy(path):
    # OPTIONS preflight — never forward
    if request.method == "OPTIONS":
        return Response("", 200, CORS_HEADERS)

    target_url = f"{GW}/{path}"
    if request.query_string:
        target_url += "?" + request.query_string.decode()

    # Copy headers, inject auth token
    headers = {k: v for k, v in request.headers if k not in ("Host", "Content-Length")}
    if token_cache["token"]:
        headers["Authorization"] = f"Bearer {token_cache['token']}"
    else:
        log.warning("⚠️ No token available — request will be unauthenticated")

    try:
        resp = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.get_data(),
            timeout=30,
            allow_redirects=False
        )
        # Strip hop-by-hop headers
        excluded = {"content-encoding", "transfer-encoding", "connection", "keep-alive"}
        out_headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded}
        out_headers.update(CORS_HEADERS)
        log.info("%s %s → %d (%dms)", request.method, path, resp.status_code,
                 int(resp.elapsed.total_seconds() * 1000))
        return Response(resp.content, resp.status_code, out_headers)
    except requests.exceptions.Timeout:
        log.error("⏱ Timeout: %s %s", request.method, target_url)
        return Response("Gateway timeout", 504, CORS_HEADERS)
    except Exception as e:
        log.error("🔥 Proxy error: %s", e)
        return Response(str(e), 502, CORS_HEADERS)

if __name__ == "__main__":
    log.info("🚀 EazyBank CORS Proxy → %s", GW)
    app.run(host="0.0.0.0", port=8888, threaded=True)
