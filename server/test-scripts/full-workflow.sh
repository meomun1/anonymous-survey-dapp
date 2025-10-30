#!/usr/bin/env bash
set -euo pipefail

# Minimal smoke flow: login → create campaign → open → launch → ingest/decrypt (no-op without chain) → analytics merkle

BASE_URL=${BASE_URL:-http://localhost:3000}

echo "[1] Login admin"
JWT_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@school.edu","password":"admin123"}' | jq -r '.token')
if [[ -z "$JWT_TOKEN" || "$JWT_TOKEN" == "null" ]]; then echo "Login failed"; exit 1; fi

echo "[2] Create campaign"
CAMPAIGN_ID=$(curl -s -X POST "$BASE_URL/api/campaigns" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"name":"Smoke Test Campaign","type":"course","semesterId":"SEMESTER_ID"}' | jq -r '.id')
echo "CAMPAIGN_ID=$CAMPAIGN_ID"

echo "[3] Open campaign"
curl -s -X POST "$BASE_URL/api/campaigns/$CAMPAIGN_ID/open" -H "Authorization: Bearer $JWT_TOKEN" >/dev/null

echo "[4] Launch campaign (surveys + tokens + emails)"
curl -s -X POST "$BASE_URL/api/campaigns/$CAMPAIGN_ID/launch" -H "Authorization: Bearer $JWT_TOKEN" >/dev/null

echo "[5] Try ingest (may be no-op without on-chain data)"
curl -s -X POST "$BASE_URL/api/responses/ingest/$CAMPAIGN_ID" | jq '.'

echo "[6] Try decrypt (may be no-op without data)"
curl -s -X POST "$BASE_URL/api/responses/decrypt-campaign/$CAMPAIGN_ID" | jq '.'

echo "[7] Merkle calculation (dummy commitments)"
curl -s -X POST "$BASE_URL/api/analytics/merkle/calculate-root" \
  -H 'Content-Type: application/json' \
  -d '{"commitments":["aa","bb"]}' | jq '.'

echo "Done."


