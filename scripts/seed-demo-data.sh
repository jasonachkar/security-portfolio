#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"

TOKEN="$(
  curl -fsS -X POST "$GATEWAY_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"Admin123!"}' \
  | python -c "import json,sys; print(json.load(sys.stdin)['accessToken'])"
)"

curl -fsS -X POST "$GATEWAY_URL/api/scans/demo/import" -H "Authorization: Bearer $TOKEN" >/tmp/dsp-scan.json
curl -fsS -X POST "$GATEWAY_URL/api/network/demo/import" -H "Authorization: Bearer $TOKEN" >/tmp/dsp-network.json
curl -fsS -X POST "$GATEWAY_URL/api/assessments/demo/import" -H "Authorization: Bearer $TOKEN" >/tmp/dsp-assessment.json

mkdir -p evidence/api
cp /tmp/dsp-scan.json evidence/api/sample-scan.json
cp /tmp/dsp-network.json evidence/api/sample-network-import.json
cp /tmp/dsp-assessment.json evidence/api/sample-assessment.json

echo "Seeded demo scan, network, and assessment data."
