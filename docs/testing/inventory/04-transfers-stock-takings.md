# Перемещения и Инвентаризация — тест-кейсы

## Перемещения (Transfers)

### TC-INV-TRF-01: Создание перемещения

**Предусловие:** Два филиала, остатки в `{{fromBranchId}}`.

**Запрос:**
```http
POST /api/transfers
Authorization: Bearer {{managerToken}}

{
  "fromBranchId": "{{BRANCH_ID}}",
  "toBranchId": "{{OTHER_BRANCH_ID}}",
  "lines": [
    {
      "skuId": "{{skuId}}",
      "quantityAmount": 10,
      "quantityUnit": "ML"
    }
  ]
}
```

**Ожидаемый результат:** `201 Created`, `{ "id": "<uuid>" }`.

---

### TC-INV-TRF-02: Проведение перемещения

**Запрос:** POST `/api/transfers/{{transferId}}/post`

**Ожидаемый результат:** `204 No Content`.

**Проверки:**
- [ ] Остаток в `fromBranchId` уменьшился.
- [ ] Остаток в `toBranchId` увеличился.
- [ ] Движения: `TRANSFER_OUT` + `TRANSFER_IN` видны.

---

### TC-INV-TRF-03: Повторное проведение — ошибка

**Ожидаемый результат:** `400` или `409`.

---

### TC-INV-TRF-04: MASTER не может создать перемещение

**Ожидаемый результат:** `403 Forbidden`.

---

## Инвентаризация (StockTakings)

### TC-INV-ST-01: Начать инвентаризацию

**Запрос:**
```http
POST /api/stock-takings
Authorization: Bearer {{managerToken}}

{ "branchId": "{{BRANCH_ID}}" }
```

**Ожидаемый результат:** `201 Created`, `{ "id": "<uuid>" }`.

**Проверки:**
- [ ] GET `/api/stock-takings/<id>` → status = `STARTED`, строки с ожидаемыми количествами.

---

### TC-INV-ST-02: Ввод фактических количеств

**Запрос:**
```http
PATCH /api/stock-takings/{{stockTakingId}}/measurements
Authorization: Bearer {{managerToken}}

{
  "measurements": [
    {
      "skuId": "{{skuId}}",
      "actualAmount": 45,
      "actualUnit": "ML"
    }
  ]
}
```

**Ожидаемый результат:** `204 No Content`.

---

### TC-INV-ST-03: Проведение инвентаризации

**Запрос:** POST `/api/stock-takings/{{stockTakingId}}/post`

**Ожидаемый результат:** `204 No Content`.

**Проверки:**
- [ ] Остатки скорректированы по разнице (expected - actual).
- [ ] Движения типа `STOCK_TAKING` видны.

---

### TC-INV-ST-04: Отмена инвентаризации

**Предусловие:** Инвентаризация в статусе `STARTED`.

**Запрос:** POST `/api/stock-takings/{{stockTakingId}}/cancel`

**Ожидаемый результат:** `204 No Content`.

---

### TC-INV-ST-05: Скачать PDF — 501

**Запрос:** GET `/api/stock-takings/{{stockTakingId}}/sheet.pdf`

**Ожидаемый результат:** `501 Not Implemented`.

---

### TC-INV-ST-06: MASTER не может начать инвентаризацию

**Ожидаемый результат:** `403 Forbidden`.
