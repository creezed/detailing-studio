# Корректировки (Adjustments) — тест-кейсы

## TC-INV-ADJ-01: Создание корректировки (MANAGER)

**Предусловие:** Существует SKU `{{skuId}}`, остатки в `{{BRANCH_ID}}`.

**Запрос:**
```http
POST /api/adjustments
Authorization: Bearer {{managerToken}}

{
  "branchId": "{{BRANCH_ID}}",
  "reason": "Бой при транспортировке",
  "lines": [
    {
      "skuId": "{{skuId}}",
      "deltaAmount": -5,
      "deltaUnit": "ML",
      "snapshotUnitCostCents": "150000"
    }
  ]
}
```

**Ожидаемый результат:** `201 Created`, `{ "id": "<uuid>" }`.

**Проверки:**
- [ ] Если `totalAmount` > порога → status = `PENDING_APPROVAL`.
- [ ] Если `totalAmount` ≤ порога → status = `APPROVED` (auto-approve).

---

## TC-INV-ADJ-02: MANAGER не может approve корректировку

**Запрос:**
```http
POST /api/adjustments/{{adjustmentId}}/approve
Authorization: Bearer {{managerToken}}
```

**Ожидаемый результат:** `403 Forbidden`.

---

## TC-INV-ADJ-03: OWNER approve корректировки

**Запрос:**
```http
POST /api/adjustments/{{adjustmentId}}/approve
Authorization: Bearer {{ownerToken}}
```

**Ожидаемый результат:** `204 No Content`.

**Проверки:**
- [ ] Остатки скорректированы.
- [ ] GET `/api/stock/movements` → движение `ADJUSTMENT` видно.

---

## TC-INV-ADJ-04: OWNER reject корректировки

**Запрос:**
```http
POST /api/adjustments/{{adjustmentId}}/reject
Authorization: Bearer {{ownerToken}}

{ "reason": "Некорректные данные" }
```

**Ожидаемый результат:** `204 No Content`.

---

## TC-INV-ADJ-05: Список ожидающих утверждения

**Запрос:**
```http
GET /api/adjustments/pending-approvals?offset=0&limit=10
Authorization: Bearer {{ownerToken}}
```

**Ожидаемый результат:** `200 OK`, только PENDING корректировки.

---

## TC-INV-ADJ-06: MASTER не может создать корректировку

**Ожидаемый результат:** `403 Forbidden`.

---

## TC-INV-ADJ-07: CLIENT не может видеть корректировки

**Запрос:** GET `/api/adjustments` от имени CLIENT.

**Ожидаемый результат:** `403 Forbidden`.
