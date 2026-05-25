#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"

curl -fsS "$GATEWAY_URL/healthz" | tee evidence/api/gateway-health.json >/dev/null
curl -fsS "$GATEWAY_URL/readyz" | tee evidence/api/gateway-ready.json >/dev/null

TOKEN="$(
  curl -fsS -X POST "$GATEWAY_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"Admin123!"}' \
  | tee evidence/api/login-sample.json \
  | python -c "import json,sys; print(json.load(sys.stdin)['accessToken'])"
)"

curl -fsS "$GATEWAY_URL/gateway/services" -H "Authorization: Bearer $TOKEN" \
  | tee evidence/api/gateway-services.json >/dev/null

echo "Local smoke test passed."
