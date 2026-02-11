#!/bin/sh
# Тест proxy-connector + WireGuard (wg-easy)
# Использование: WG_PASSWORD=пароль ./scripts/test-wireguard.sh

set -e
cd "$(dirname "$0")/.."

CONNECTOR_URL="${CONNECTOR_URL:-http://localhost:3100}"
API_KEY="${API_KEY:-}"
WG_URL="${WG_URL:-https://wg-ger.nymk.ru}"
WG_USER="${WG_USER:-admin}"
WG_PASS="${WG_PASS:-}"

if [ -f .env ]; then
  . ./.env 2>/dev/null || true
fi

[ -n "$API_KEY" ] || { echo "Задай API_KEY: API_KEY=xxx $0"; exit 1; }
[ -n "$WG_PASS" ] || { echo "Задай WG_PASSWORD: WG_PASSWORD=xxx $0"; exit 1; }

echo "=== 1. Health ==="
curl -s "$CONNECTOR_URL/health"
echo ""
echo ""

echo "=== 2. Create WireGuard client ==="
RESP=$(curl -s -X POST "$CONNECTOR_URL/v1/configs/create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"server\": {
      \"id\": \"wg1\",
      \"baseUrl\": \"$WG_URL\",
      \"username\": \"$WG_USER\",
      \"password\": \"$WG_PASS\",
      \"protocol\": \"wireguard\"
    },
    \"protocol\": \"wireguard\",
    \"userId\": \"test-user\",
    \"configId\": \"test-$(date +%s)\",
    \"expiresAt\": \"2026-12-31T23:59:59.000Z\"
  }")

echo "$RESP"
EXT_ID=$(echo "$RESP" | grep -o '"externalId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$EXT_ID" ]; then
  echo ""
  echo "=== 3. Revoke (externalId: $EXT_ID) ==="
  curl -s -X POST "$CONNECTOR_URL/v1/configs/revoke" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{
      \"server\": {
        \"id\": \"wg1\",
        \"baseUrl\": \"$WG_URL\",
        \"username\": \"$WG_USER\",
        \"password\": \"$WG_PASS\",
        \"protocol\": \"wireguard\"
      },
      \"protocol\": \"wireguard\",
      \"externalId\": \"$EXT_ID\",
      \"configId\": \"test\"
    }"
fi

echo ""
echo "Done."
