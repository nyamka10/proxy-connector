#!/bin/sh
# Тест proxy-connector + WireGuard (wg-easy)
# Вариант 1 (servers.json): SERVER_ID=wg-de-1 API_KEY=xxx ./scripts/test-wireguard.sh
# Вариант 2 (без servers.json): WG_PASSWORD=пароль API_KEY=xxx ./scripts/test-wireguard.sh

set -e
cd "$(dirname "$0")/.."

CONNECTOR_URL="${CONNECTOR_URL:-http://localhost:3100}"
API_KEY="${API_KEY:-}"
SERVER_ID="${SERVER_ID:-}"
WG_URL="${WG_URL:-https://wg-ger.nymk.ru}"
WG_USER="${WG_USER:-admin}"
WG_PASS="${WG_PASS:-}"

if [ -f .env ]; then
  . ./.env 2>/dev/null || true
fi

[ -n "$API_KEY" ] || { echo "Задай API_KEY: API_KEY=xxx $0"; exit 1; }
[ -n "$SERVER_ID" ] || [ -n "$WG_PASS" ] || { echo "Задай SERVER_ID или WG_PASSWORD"; exit 1; }

echo "=== 1. Health ==="
curl -s "$CONNECTOR_URL/health"
echo ""
echo ""

echo "=== 2. Create WireGuard client ==="
# Используй serverId если есть servers.json, иначе server
if [ -n "$SERVER_ID" ]; then
  BODY="{\"serverId\":\"$SERVER_ID\",\"protocol\":\"wireguard\",\"userId\":\"test-user\",\"configId\":\"test-$(date +%s)\",\"expiresAt\":\"2026-12-31T23:59:59.000Z\"}"
else
  BODY="{\"server\":{\"id\":\"wg1\",\"baseUrl\":\"$WG_URL\",\"username\":\"$WG_USER\",\"password\":\"$WG_PASS\",\"protocol\":\"wireguard\"},\"protocol\":\"wireguard\",\"userId\":\"test-user\",\"configId\":\"test-$(date +%s)\",\"expiresAt\":\"2026-12-31T23:59:59.000Z\"}"
fi
RESP=$(curl -s -X POST "$CONNECTOR_URL/v1/configs/create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$BODY")

echo "$RESP"
EXT_ID=$(echo "$RESP" | grep -o '"externalId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$EXT_ID" ]; then
  echo ""
  echo "=== 3. Revoke (externalId: $EXT_ID) ==="
  if [ -n "$SERVER_ID" ]; then
    REVOKE_BODY="{\"serverId\":\"$SERVER_ID\",\"protocol\":\"wireguard\",\"externalId\":\"$EXT_ID\",\"configId\":\"test\"}"
  else
    REVOKE_BODY="{\"server\":{\"id\":\"wg1\",\"baseUrl\":\"$WG_URL\",\"username\":\"$WG_USER\",\"password\":\"$WG_PASS\",\"protocol\":\"wireguard\"},\"protocol\":\"wireguard\",\"externalId\":\"$EXT_ID\",\"configId\":\"test\"}"
  fi
  curl -s -X POST "$CONNECTOR_URL/v1/configs/revoke" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$REVOKE_BODY"
fi

echo ""
echo "Done."
