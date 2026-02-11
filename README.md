# proxy-connector

Единый коннектор для управления прокси-серверами (Squid HTTP и WireGuard через wg-easy).

## Протоколы

| Протокол | Адаптер | Целевая система |
|----------|---------|-----------------|
| `http` | SquidAdapter | Squid + squid-manager API |
| `wireguard` | WgEasyAdapter | wg-easy |

## Запуск

### Локально

```bash
npm install
cp .env.example .env
# Отредактируйте .env (API_KEY обязателен)
npm run dev
```

### Docker

```bash
# Создайте .env с API_KEY
echo "API_KEY=your-secret-key" > .env

docker compose up -d --build
```

Сервис будет доступен на `http://localhost:3100`. Health check: `GET /health` — вернёт `version` (проверь, что она 1.0.1+).

### Деплой на удалённый сервер

1. Создайте репозиторий на GitHub/GitLab и добавьте remote:
   ```bash
   git remote add origin git@github.com:USER/proxy-connector.git
   git push -u origin main
   ```

2. На сервере:
   ```bash
   git clone https://github.com/USER/proxy-connector.git
   cd proxy-connector
   echo "API_KEY=ваш-секретный-ключ" > .env
   docker compose up -d --build
   ```

   Если `git pull` не работает (Permission denied): используй HTTPS + Personal Access Token вместо SSH.

## API

Базовый URL: `{CONNECTOR_URL}/v1`  
Аутентификация: `Authorization: Bearer {API_KEY}` или `X-API-Key: {API_KEY}`

### POST /v1/configs/create

Создание конфига. proxy-buyer передаёт `server` в теле запроса (Вариант B из ТЗ).

**WireGuard (wg-easy):**
```json
{
  "server": {
    "id": "srv-1",
    "baseUrl": "https://wg.example.com",
    "password": "admin_password",
    "port": 51821,
    "protocol": "wireguard"
  },
  "protocol": "wireguard",
  "userId": "clxxx",
  "configId": "cfg_xxx",
  "expiresAt": "2025-03-10T00:00:00.000Z"
}
```

**HTTP (Squid):**
```json
{
  "server": {
    "id": "srv-1",
    "baseUrl": "https://squid-api.example.com",
    "apiKey": "squid-api-key",
    "protocol": "http"
  },
  "protocol": "http",
  "userId": "clxxx",
  "configId": "cfg_xxx",
  "expiresAt": "2025-03-10T00:00:00.000Z"
}
```

### POST /v1/configs/revoke

Отзыв конфига (тело с `server`, `protocol`, `externalId`, `configId`).

### POST /v1/configs/extend

Продление (если протокол поддерживает). WireGuard через wg-easy не поддерживает extend.

## Squid

Для Squid нужен отдельный **squid-manager** — микро-сервис с API:
- `POST /users` — создать пользователя (user, pass, expiresAt)
- `DELETE /users/:id` — удалить

См. ТЗ `proxy-buyer/docs/CONNECTOR_TZ.md`.

## Отладка WireGuard (wg-easy)

wg-easy v15 требует session: сначала POST /api/session, затем cookie для /api/client.

Проверка session:
```bash
curl -X POST https://wg-ger.nymk.ru/api/session \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ПАРОЛЬ","remember":false}' \
  -v
```
Должен вернуть 200 и Set-Cookie.

API wg-easy: см. `docs/wgeasy-api.md`.

Через proxy-connector:

```bash
curl -X POST http://localhost:3100/v1/configs/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ваш-API-KEY" \
  -d '{
    "server": {
      "id": "wg1",
      "baseUrl": "https://wg-ger.nymk.ru",
      "username": "admin",
      "password": "пароль_от_wg_easy",
      "protocol": "wireguard"
    },
    "protocol": "wireguard",
    "userId": "test-user",
    "configId": "test-cfg-001",
    "expiresAt": "2026-12-31T00:00:00.000Z"
  }'
```

Если wg-easy на HTTPS без порта в URL — порт 51821 добавляется автоматически. Иначе укажи `"port": 51821` в server.
