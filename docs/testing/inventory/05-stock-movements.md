# Остатки и движения (Stock) — тест-кейсы

## TC-INV-STK-01: Остатки по филиалу

**Предусловие:** Проведён приход, остатки обновлены.

**Запрос:**
```http
GET /api/stock/by-branch/{{BRANCH_ID}}?offset=0&limit=20
Authorization: Bearer {{ownerToken}}
```

**Ожидаемый результат:** `200 OK`, массив остатков.

**Проверки:**
- [ ] Каждый элемент содержит `skuId`, `skuName`, `quantity`, `unit`, `averageCost`.
- [ ] `averageCost` корректно пересчитан по средневзвешенной.

---

## TC-INV-STK-02: MASTER видит остатки в своём филиале

**Запрос:** GET `/api/stock/by-branch/{{BRANCH_ID}}` от MASTER.

**Ожидаемый результат:** `200 OK`.

**Проверки:**
- [ ] Поля `averageCost`, `unitCost` отсутствуют или замаскированы (MANAGER/MASTER не видит себестоимость).

---

## TC-INV-STK-03: MASTER не видит остатки в чужом филиале

**Запрос:** GET `/api/stock/by-branch/{{OTHER_BRANCH_ID}}` от MASTER.

**Ожидаемый результат:** `403 Forbidden`.

---

## TC-INV-STK-04: Отчёт «Низкие остатки»

**Запрос:**
```http
GET /api/stock/low?offset=0&limit=20
Authorization: Bearer {{ownerToken}}
```

**Ожидаемый результат:** `200 OK`, SKU с количеством ≤ `reorderLevel`.

---

## TC-INV-STK-05: Журнал движений

**Предусловие:** Проведены приход, корректировка, перемещение.

**Запрос:**
```http
GET /api/stock/movements?branchId={{BRANCH_ID}}&offset=0&limit=50
Authorization: Bearer {{ownerToken}}
```

**Ожидаемый результат:** `200 OK`, хронологический список движений.

**Проверки:**
- [ ] Каждое движение имеет `movementType` (RECEIPT, CONSUMPTION, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, STOCK_TAKING).
- [ ] Фильтрация по `skuId`, `sourceType`, `fromDate`, `toDate` работает.

---

## TC-INV-STK-06: Остатки на дату

**Запрос:**
```http
GET /api/stock/on-date?branchId={{BRANCH_ID}}&date=2026-05-01
Authorization: Bearer {{ownerToken}}
```

**Ожидаемый результат:** `200 OK`, снимок остатков на указанную дату.

---

## TC-INV-STK-07: CLIENT не видит остатки

**Запрос:** GET `/api/stock/by-branch/{{BRANCH_ID}}` от CLIENT.

**Ожидаемый результат:** `403 Forbidden`.
