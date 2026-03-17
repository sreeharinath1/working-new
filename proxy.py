from flask import Flask, request, Response
from flask_cors import CORS
import requests, threading, time

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

GW = "http://localhost:30564"
KC = "http://localhost:31479/realms/master/protocol/openid-connect/token"
CLIENT_ID = "eazybank-callcenter-cc"
CLIENT_SECRET = "WbB2Vs8LSpmWvxXlbhMyfWt3fiwF7vF4"

token_cache = {"token": None}

def fetch_token():
    while True:
        try:
            r = requests.post(KC, data={
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "scope": "openid profile email"
            }, timeout=10)
            if r.ok:
                token_cache["token"] = r.json().get("access_token")
                print("✅ Token refreshed")
        except Exception as e:
            print("❌ Token error:", e)
        time.sleep(50)

threading.Thread(target=fetch_token, daemon=True).start()
time.sleep(2)

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, eazybank-correlation-id',
    'Access-Control-Max-Age': '86400'
}

@app.route('/', defaults={'path': ''}, methods=['GET','POST','PUT','DELETE','OPTIONS'])
@app.route('/<path:path>', methods=['GET','POST','PUT','DELETE','OPTIONS'])
def proxy(path):
    # Handle preflight directly — never forward to gateway
    if request.method == 'OPTIONS':
        return Response('', 200, CORS_HEADERS)

    url = f"{GW}/{path}"
    if request.query_string:
        url += '?' + request.query_string.decode()

    headers = {k:v for k,v in request.headers if k not in ['Host','Content-Length']}
    if token_cache["token"]:
        headers["Authorization"] = f"Bearer {token_cache['token']}"

    try:
        resp = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            data=request.get_data(),
            timeout=15,
            allow_redirects=False
        )
        excluded = ['content-encoding','transfer-encoding','connection']
        out_headers = {k:v for k,v in resp.headers.items() if k.lower() not in excluded}
        out_headers.update(CORS_HEADERS)
        return Response(resp.content, resp.status_code, out_headers)
    except Exception as e:
        return Response(str(e), 502, CORS_HEADERS)

app.run(host='0.0.0.0', port=8888)
