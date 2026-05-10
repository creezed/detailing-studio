# SKU и Поставщики — тест-кейсы

## TC-INV-SKU-01: Создание SKU (OWNER)

**Предусловие:** Авторизован как OWNER.

**Запрос:**
```http
POST /api/skus
Authorization: Bearer {{ownerToken}}

{
  "articleNumber": "ART-001",
  "name": "Koch Nano Magic",
  "group": "Полироли",
  "baseUnit": "ML",
  "hasExpiry": false,
  "packagings": [{ "name": "Бутылка 500 мл", "coefficient": 500 }],
  "barcode": "4605123456789",
  "description": "Нано-состав для финишной полировки"
}
```

**Ожидаемый результат:** `201 Created`, тело `{ "id": "<uuid>" }`.

**Проверки:**
- [ ] `id` — валидный UUID v4.
- [ ] Повторный POST с тем же `articleNumber` → `409 Conflict` (ArticleNumberAlreadyExistsError).
- [ ] GET `/api/skus/<id>` → 200, данные совпадают.

---

## TC-INV-SKU-02: Создание SKU (MANAGER) — разрешено

**Предусловие:** Авторизован как MANAGER.

**Запрос:** тот же, что и TC-INV-SKU-01, но с другим `articleNumber`.

**Ожидаемый результат:** `201 Created`.

---

## TC-INV-SKU-03: Создание SKU (MASTER) — запрещено

**Предусловие:** Авторизован как MASTER.

**Запрос:** POST `/api/skus` с валидным телом.

**Ожидаемый результат:** `403 Forbidden`.

---

## TC-INV-SKU-04: Создание SKU (CLIENT) — запрещено

**Предусловие:** Авторизован как CLIENT.

**Ожидаемый результат:** `403 Forbidden`.

---

## TC-INV-SKU-05: Создание SKU без токена — 401

**Запрос:** POST `/api/skus` без заголовка Authorization.

**Ожидаемый результат:** `401 Unauthorized`.

---

## TC-INV-SKU-06: Валидация — пустое тело

**Запрос:** POST `/api/skus` с `{}`.

**Ожидаемый результат:** `400 Bad Request`, массив ошибок валидации.

---

## TC-INV-SKU-07: Список SKU

**Предусловие:** Создано 3 SKU.

**Запрос:**
```http
GET /api/skus?offset=0&limit=10
Authorization: Bearer {{ownerToken}}
```

**Ожидаемый результат:** `200 OK`, массив с ≥ 3 элементами.

---

## TC-INV-SKU-08: Обновление SKU

**Запрос:**
```http
PATCH /api/skus/{{skuId}}
Authorization: Bearer {{ownerToken}}

{ "name": "Новое название" }
```

**Ожидаемый результат:** `204 No Content`.

**Проверки:**
- [ ] GET `/api/skus/{{skuId}}` → name = «Новое название».

---

## TC-INV-SKU-09: Деактивация SKU

**Запрос:** DELETE `/api/skus/{{skuId}}`

**Ожидаемый результат:** `204 No Content`.

---

## TC-INV-SKU-10: Поиск по штрих-коду

**Запрос:** GET `/api/skus/barcode/4605123456789`

**Ожидаемый результат:** `200 OK`, данные SKU.

---

## TC-INV-SUP-01: Создание поставщика (OWNER)

**Запрос:**
```http
POST /api/suppliers
Authorization: Bearer {{ownerToken}}

{
  "name": "Koch Chemie",
  "inn": "7710140679",
  "contact": {
    "phone": "+79991234567",
    "email": "supplier@test.com",
    "address": "г. Москва, ул. Складская, 1"
  }
}
```

**Ожидаемый результат:** `201 Created`, `{ "id": "<uuid>" }`.

---

## TC-INV-SUP-02: Создание поставщика (MASTER) — запрещено

**Ожидаемый результат:** `403 Forbidden`.

---

## TC-INV-SUP-03: Обновление контактов поставщика

**Запрос:**
```http
PATCH /api/suppliers/{{supplierId}}
Authorization: Bearer {{ownerToken}}

{ "contact": { "phone": "+79990000000" } }
```

**Ожидаемый результат:** `204 No Content`.

---

## TC-INV-SUP-04: Деактивация поставщика

**Запрос:** DELETE `/api/suppliers/{{supplierId}}`

**Ожидаемый результат:** `204 No Content`.
