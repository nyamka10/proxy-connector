Тут описаны ручки для всех нужных взаимодействий с проектом

#### Создание пользователя:
- формат даты - `2026-02-20T23:59:59.000Z`
- не проверяет на дубликат названия
  ``` bash
  curl -su "LOGIN:PASS" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NAME CONFIG",
    "expiresAt": "DATE"
  }' \
  https://HOST/api/client
  ```
  формат ответа:
  ``` bash
  {"success":true,"clientId":CLIENTID}%
  ```

#### Создание пользователя с проверкой на дубликат name

``` bash
NAME="@nyamka10 (tgbot)"
NAME_1="$NAME 1"

curl -sSLu "LOGIN:PASS" https://HOST/api/client \
| jq -e --arg name "$NAME" '.[] | select(.name == $name)' >/dev/null \
&& curl -sSLu "LOGIN:PASS" \
     -H "Content-Type: application/json" \
     -d "{
       \"name\": \"$NAME_1\",
       \"expiresAt\": \"2026-02-25T23:59:59.000Z\"
     }" \
     https://wg-ger.nymk.ru/api/client \
|| curl -sSLu "admin:dgfdfgdfg@" \
     -H "Content-Type: application/json" \
     -d "{
       \"name\": \"$NAME\",
       \"expiresAt\": \"2026-02-25T23:59:59.000Z\"
     }" \
     https://wg-ger.nymk.ru/api/client

```
  формат ответа:
  ``` bash
  {"success":true,"clientId":CLIENTID}%
  ```

#### Получение конфигурации пользователя:
- Требуется clientId, он передается сразу при создании
``` bash
curl -su "LOGIN:PASS" https://HOST/api/client/CLIENTID/configuration
```
 формат ответа:
 ``` bash
 [Interface]
PrivateKey = uPytC2V1YOu8riSxxxxxA5+xxXVxxxxxxk5xxnI=
Address = 10.8.0.24/32, fdcc:ad94:bacf:61a4::cafe:18/128
MTU = 1420
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = TPNt8xxxxxxx1loJopxxxxtl+klFxxxx8XDxxxxOkQ=
PresharedKey = 2H8N4xxxxx+MUxxxSAHxx2kxxxxxxxoWXs/cxxxx3Y=
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 0
Endpoint = wg-ger.nymk.ru:51820%
 ```

#### Продление конфигурации пользователя:
- Нет определенной ручки для обновления expiresAt, по этому сначала получаем текущую конфигурацию, меняем expiresAt и отправляем обратно
- формат даты - `2026-02-20T23:59:59.000Z`
``` bash
curl -su "LOGIN:PASS" https://HOST/api/client/CLIENTID \
| jq '.expiresAt="DATE"' \
| curl -su "LOGIN:PASS" -H "Content-Type: application/json" -d @- \
  https://HOST/api/client/CLIENTID

```
 формат ответа:
 ``` bash
 {"success":true}%
 ```

