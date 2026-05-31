#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"

curl -fsS "$GATEWAY_URL/healthz" | tee evidence/api/gateway-health.json >/dev/null
curl -fsS "$GATEWAY_URL/readyz" | tee evidence/api/gateway-ready.json >/dev/null

LOGIN_JSON="$(
  curl -fsS -X POST "$GATEWAY_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"Admin123!"}'
)"

TOKEN="$(printf '%s' "$LOGIN_JSON" | python -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")"
printf '%s' "$LOGIN_JSON" | python -c "import json,sys; data=json.load(sys.stdin); data['accessToken']='[redacted local smoke token]'; print(json.dumps(data, indent=2))" \
  > evidence/api/login-sample.json

curl -fsS "$GATEWAY_URL/gateway/services" -H "Authorization: Bearer $TOKEN" \
  | tee evidence/api/gateway-services.json >/dev/null

echo "Local smoke test passed."
