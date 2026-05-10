# RBAC-матрица Inventory — тест-кейсы

> Источник: `docs/product.md` § 3.3.3 «Склад и материалы».

## Матрица доступа

| Endpoint | Действие | OWNER | MANAGER | MASTER | CLIENT |
|---|---|:-:|:-:|:-:|:-:|
| `GET /api/skus` | Просмотр SKU | ✓ | ✓ | R* | 403 |
| `POST /api/skus` | Создание SKU | ✓ | ✓ | 403 | 403 |
| `PATCH /api/skus/:id` | Обновление SKU | ✓ | ✓ | 403 | 403 |
| `DELETE /api/skus/:id` | Деактивация SKU | ✓ | 403 | 403 | 403 |
| `GET /api/suppliers` | Просмотр поставщиков | ✓ | ✓ | 403 | 403 |
| `POST /api/suppliers` | Создание поставщика | ✓ | ✓ | 403 | 403 |
| `PATCH /api/suppliers/:id` | Обновление поставщика | ✓ | ✓ | 403 | 403 |
| `DELETE /api/suppliers/:id` | Деактивация поставщика | ✓ | 403 | 403 | 403 |
| `GET /api/receipts` | Просмотр приходов | ✓ | ✓ | 403 | 403 |
| `POST /api/receipts` | Создание прихода | ✓ | ✓ | 403 | 403 |
| `POST /api/receipts/:id/post` | Проведение прихода | ✓ | ✓ | 403 | 403 |
| `POST /api/receipts/:id/cancel` | Отмена прихода | ✓ | ✓ | 403 | 403 |
| `GET /api/adjustments` | Просмотр корректировок | ✓ | ✓ | 403 | 403 |
| `POST /api/adjustments` | Создание корректировки | ✓ | ✓ | 403 | 403 |
| `POST /api/adjustments/:id/approve` | Утверждение | ✓ | 403 | 403 | 403 |
| `POST /api/adjustments/:id/reject` | Отклонение | ✓ | 403 | 403 | 403 |
| `GET /api/transfers` | Просмотр перемещений | ✓ | ✓ | 403 | 403 |
| `POST /api/transfers` | Создание перемещения | ✓ | ✓ | 403 | 403 |
| `POST /api/transfers/:id/post` | Проведение перемещения | ✓ | ✓ | 403 | 403 |
| `GET /api/stock-takings` | Просмотр инвентаризаций | ✓ | ✓ | 403 | 403 |
| `POST /api/stock-takings` | Начать инвентаризацию | ✓ | ✓ | 403 | 403 |
| `POST /api/stock-takings/:id/post` | Провести | ✓ | ✓ | 403 | 403 |
| `POST /api/stock-takings/:id/cancel` | Отменить | ✓ | ✓ | 403 | 403 |
| `GET /api/stock/by-branch/:id` | Остатки | ✓ | ✓ | R* | 403 |
| `GET /api/stock/low` | Низкие остатки | ✓ | ✓ | 403 | 403 |
| `GET /api/stock/movements` | Журнал движений | ✓ | ✓ | 403 | 403 |
| `GET /api/stock/on-date` | Остатки на дату | ✓ | ✓ | 403 | 403 |

\* MASTER видит SKU и остатки **только в своём филиале** и **без закупочных цен** (`averageCost`, `unitCost`).

## TC-INV-RBAC-01: Полный прогон матрицы (OWNER)

Для каждого endpoint из таблицы:

**Запрос:** соответствующий HTTP-метод + URL, `Authorization: Bearer {{ownerToken}}`.

**Ожидаемый результат:** `2xx` (конкретный код зависит от endpoint).

---

## TC-INV-RBAC-02: Полный прогон матрицы (MANAGER)

Для каждого endpoint из таблицы:

**Ожидаемый результат:** `2xx` для разрешённых, `403` для запрещённых.

**Особые проверки:**
- [ ] `POST /api/adjustments/:id/approve` → `403`.
- [ ] `POST /api/adjustments/:id/reject` → `403`.
- [ ] `DELETE /api/skus/:id` → `403` (только OWNER может деактивировать).
- [ ] `DELETE /api/suppliers/:id` → `403`.

---

## TC-INV-RBAC-03: Полный прогон матрицы (MASTER)

**Ожидаемый результат:** `200` для `GET /api/skus` и `GET /api/stock/by-branch/{{OWN_BRANCH}}`, `403` для всего остального.

**Особые проверки:**
- [ ] `GET /api/stock/by-branch/{{OTHER_BRANCH}}` → `403`.
- [ ] Ответ `GET /api/stock/by-branch/{{OWN_BRANCH}}` **не содержит** полей `averageCost`, `unitCost`.

---

## TC-INV-RBAC-04: Полный прогон матрицы (CLIENT)

**Ожидаемый результат:** `403` для **всех** Inventory endpoints.

---

## TC-INV-RBAC-05: Без токена

**Ожидаемый результат:** `401 Unauthorized` для всех Inventory endpoints.

---

## TC-INV-RBAC-06: Кросс-филиальный доступ MANAGER

**Предусловие:** MANAGER привязан к `BRANCH_ID`, не к `OTHER_BRANCH_ID`.

**Проверки:**
- [ ] `GET /api/receipts?branchId={{OTHER_BRANCH_ID}}` → пустой результат или `403`.
- [ ] `POST /api/receipts` с `branchId: OTHER_BRANCH_ID` → `403`.
- [ ] `GET /api/stock/by-branch/{{OTHER_BRANCH_ID}}` → `403` или пустой.
