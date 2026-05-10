# Inventory — ручное тестирование

## Область покрытия

Документы в этой папке описывают ручные API-тесты для модуля **Inventory** (ограниченный контекст «Склад и материалы»).

### Покрываемые подсистемы

| Файл | Подсистема | Endpoints |
|---|---|---|
| [01-sku-supplier.md](01-sku-supplier.md) | Справочник SKU и Поставщики | `GET/POST/PATCH/DELETE /api/skus`, `GET/POST/PATCH/DELETE /api/suppliers` |
| [02-receipts.md](02-receipts.md) | Приход товаров | `GET/POST/PATCH /api/receipts`, `POST /:id/post`, `POST /:id/cancel` |
| [03-adjustments.md](03-adjustments.md) | Корректировки | `GET/POST /api/adjustments`, `POST /:id/approve`, `POST /:id/reject` |
| [04-transfers-stock-takings.md](04-transfers-stock-takings.md) | Перемещения и Инвентаризация | `GET/POST /api/transfers`, `GET/POST /api/stock-takings` |
| [05-stock-movements.md](05-stock-movements.md) | Остатки и движения | `GET /api/stock/*` |
| [06-rbac.md](06-rbac.md) | RBAC-матрица | Проверка всех ролей на все endpoints |

### Не покрывается (endpoints отсутствуют)

- Загрузка файлов накладных (multipart) — `POST /api/receipts/:id/attachments` возвращает 501.
- Генерация PDF инвентаризационной ведомости — `GET /api/stock-takings/:id/sheet.pdf` возвращает 501.
- Idempotency-Key interceptor — ещё не реализован.

## Предусловия

- **Окружение:** API запущен с global prefix `/api`, БД мигрирована.
- **Инструменты:** Postman / Insomnia / curl, DB client, доступ к API logs.
- **Headers:** `Content-Type: application/json`; для защищённых endpoints — `Authorization: Bearer <accessToken>`.
- **Локализация:** часть ошибок тестируется с `Accept-Language: ru` и `Accept-Language: en`.

## Тестовые данные

| Переменная | Пример |
|---|---|
| `OWNER_EMAIL` | `owner@studio.test` |
| `MANAGER_EMAIL` | `manager@studio.test` |
| `MASTER_EMAIL` | `master@studio.test` |
| `PASSWORD` | `Str0ngP@ss` |
| `BRANCH_ID` | `11111111-1111-4111-8111-111111111301` |
| `OTHER_BRANCH_ID` | `22222222-2222-4222-8222-222222222302` |

## Общие ожидаемые ответы

### Ошибка авторизации (401)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Ошибка доступа (403)

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

### Ошибка валидации (400)

```json
{
  "statusCode": 400,
  "message": ["<field> should not be empty", ...],
  "error": "Bad Request"
}
```
