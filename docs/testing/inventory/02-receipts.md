# Приход товаров (Receipts) — тест-кейсы

## TC-INV-REC-01: Создание черновика прихода

**Предусловие:** Существует поставщик `{{supplierId}}`.

**Запрос:**
```http
POST /api/receipts
Authorization: Bearer {{ownerToken}}

{
  "supplierId": "{{supplierId}}",
  "branchId": "{{BRANCH_ID}}",
  "supplierInvoiceNumber": "ИН-2026/001",
  "supplierInvoiceDate": "2026-05-10"
}
```

**Ожидаемый результат:** `201 Created`, `{ "id": "<uuid>" }`.

**Проверки:**
- [ ] GET `/api/receipts/<id>` → status = `DRAFT`.

---

## TC-INV-REC-02: Добавление строк в приход

**Предусловие:** Существует SKU `{{skuId}}`, Receipt в статусе DRAFT.

**Запрос:**
```http
PATCH /api/receipts/{{receiptId}}
Authorization: Bearer {{ownerToken}}

{
  "lines": [
    {
      "skuId": "{{skuId}}",
      "packageQuantity": 2,
      "baseQuantityAmount": 1000,
      "baseQuantityUnit": "ML",
      "unitCostCents": "150000",
      "expiresAt": "2027-12-31"
    }
  ]
}
```

**Ожидаемый результат:** `204 No Content`.

---

## TC-INV-REC-03: Проведение прихода

**Запрос:**
```http
POST /api/receipts/{{receiptId}}/post
Authorization: Bearer {{ownerToken}}
```

**Ожидаемый результат:** `204 No Content`.

**Проверки:**
- [ ] GET `/api/receipts/{{receiptId}}` → status = `POSTED`.
- [ ] GET `/api/stock/by-branch/{{BRANCH_ID}}` — остаток по SKU увеличен.
- [ ] GET `/api/stock/movements?skuId={{skuId}}` — движение типа `RECEIPT` видно.

---

## TC-INV-REC-04: Проведение прихода повторно — ошибка

**Запрос:** POST `/api/receipts/{{receiptId}}/post` (уже POSTED).

**Ожидаемый результат:** `409 Conflict` или `400 Bad Request` (ReceiptNotDraftError).

---

## TC-INV-REC-05: Отмена прихода

**Предусловие:** Приход в статусе DRAFT.

**Запрос:**
```http
POST /api/receipts/{{receiptId}}/cancel
Authorization: Bearer {{ownerToken}}

{ "reason": "Ошибка в документе" }
```

**Ожидаемый результат:** `204 No Content`.

---

## TC-INV-REC-06: Список приходов с фильтрами

**Запрос:**
```http
GET /api/receipts?branchId={{BRANCH_ID}}&status=POSTED&offset=0&limit=10
Authorization: Bearer {{ownerToken}}
```

**Ожидаемый результат:** `200 OK`, пагинированный ответ.

---

## TC-INV-REC-07: MASTER не может создать приход

**Запрос:** POST `/api/receipts` от имени MASTER.

**Ожидаемый результат:** `403 Forbidden`.

---

## TC-INV-REC-08: MANAGER из другого филиала не может провести приход

**Предусловие:** MANAGER привязан к `OTHER_BRANCH_ID`, приход в `BRANCH_ID`.

**Запрос:** POST `/api/receipts/{{receiptId}}/post`.

**Ожидаемый результат:** `403 Forbidden`.
