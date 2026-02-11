# API proxy-connector: WireGuard

Описание эндпоинтов для работы с WireGuard-конфигурациями через proxy-connector.

---

## Базовые параметры

- **URL:** `{CONNECTOR_URL}/v1` (например `http://localhost:3100/v1`)
- **Аутентификация:** заголовок `X-API-Key: {API_KEY}` или `Authorization: Bearer {API_KEY}`

---

## Конфигурация серверов (servers.json)

Логин и пароль wg-easy хранятся в коннекторе. Создай `servers.json` (скопируй из `servers.example.json`):

```json
{
  "wg-de-1": {
    "baseUrl": "https://wg-ger.nymk.ru",
    "username": "admin",
    "password": "пароль_от_wg_easy",
    "protocol": "wireguard"
  }
}
```

proxy-buyer передаёт только `serverId` — коннектор подставляет credentials из файла.

---

## 1. Создание конфигурации

**POST** `/v1/configs/create`

Создаёт нового WireGuard-клиента в wg-easy и возвращает конфигурацию.

### Request (рекомендуемый — через serverId)

```json
{
  "serverId": "wg-de-1",
  "protocol": "wireguard",
  "userId": "clxxx",
  "configId": "cfg_xxx",
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "meta": {}
}
```

| Поле | Обязательно | Описание |
|------|-------------|----------|
| `serverId` | да* | ID сервера из servers.json |
| `protocol` | да | `"wireguard"` |
| `userId` | да | ID пользователя (для названия клиента) |
| `configId` | да | ID конфигурации (для названия клиента) |
| `expiresAt` | да | Дата истечения, формат ISO 8601 |

*Вместо `serverId` можно передать полный объект `server` (см. ниже).

### Request (альтернатива — полный server)

```json
{
  "server": {
    "id": "srv-de-wg",
    "baseUrl": "https://wg-ger.nymk.ru",
    "username": "admin",
    "password": "пароль_от_wg_easy",
    "protocol": "wireguard"
  },
  "protocol": "wireguard",
  "userId": "clxxx",
  "configId": "cfg_xxx",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

### Response (успех)

```json
{
  "success": true,
  "configId": "cfg_xxx",
  "protocol": "wireguard",
  "credentials": {
    "wireguard": {
      "conf": "[Interface]\nPrivateKey = ...\nAddress = 10.8.0.24/32\n..."
    }
  },
  "externalId": "35"
}
```

| Поле | Описание |
|------|----------|
| `credentials.wireguard.conf` | Полный WireGuard-конфиг для клиента |
| `externalId` | ID клиента в wg-easy, нужен для revoke и extend |

**Важно:** сохрани `externalId` в БД — без него нельзя отозвать или продлить конфиг.

---

## 2. Отзыв конфигурации

**POST** `/v1/configs/revoke`

Удаляет клиента из wg-easy.

### Request

```json
{
  "serverId": "wg-de-1",
  "protocol": "wireguard",
  "externalId": "35",
  "configId": "cfg_xxx"
}
```

| Поле | Описание |
|------|----------|
| `externalId` | ID, полученный при create |

### Response (успех)

```json
{ "success": true }
```

---

## 3. Продление конфигурации

**POST** `/v1/configs/extend`

Меняет дату истечения существующего клиента.

### Request

```json
{
  "serverId": "wg-de-1",
  "protocol": "wireguard",
  "externalId": "35",
  "configId": "cfg_xxx",
  "expiresAt": "2027-06-30T23:59:59.000Z"
}
```

### Response (успех)

```json
{ "success": true }
```

---

## Сценарии для proxy-buyer

### Новый заказ WireGuard

1. В БД сервера хранится только `serverId` (например `wg-de-1`), credentials — в коннекторе.
2. `POST /v1/configs/create` с `serverId`, `userId`, `configId`, `expiresAt`.
3. Сохранить `credentials.wireguard.conf` и `externalId` в ConfigSecret.

### Отмена / непродление

1. `POST /v1/configs/revoke` с `serverId`, `externalId`, `configId`.

### Продление

1. `POST /v1/configs/extend` с `serverId`, `externalId`, `configId`, новой `expiresAt`.

---

## Health check

**GET** `/health`

```json
{ "ok": true, "version": "1.0.2" }
```
