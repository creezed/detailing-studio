# Catalog Interfaces — Manual Test Cases

> Предусловия: API запущен (`pnpm nx serve api`), Swagger доступен на `/api/docs`.
> Для авторизованных запросов используйте `Authorization: Bearer <token>`.

---

## 1. Service Categories

### TC-CAT-01: Создание категории (OWNER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | `POST /api/service-categories` с телом `{ "name": "Полировка", "icon": "polish", "displayOrder": 1 }`, токен OWNER | 201, тело `{ "id": "<uuid>" }` |
| 2 | `GET /api/service-categories`, токен OWNER | 200, массив содержит созданную категорию |

### TC-CAT-02: Обновление категории (OWNER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать категорию (TC-CAT-01) | 201 |
| 2 | `PATCH /api/service-categories/:id` с телом `{ "name": "Керамика" }`, токен OWNER | 204 |
| 3 | `GET /api/service-categories`, токен OWNER | 200, имя категории = "Керамика" |

### TC-CAT-03: Деактивация категории (OWNER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать категорию (TC-CAT-01) | 201 |
| 2 | `DELETE /api/service-categories/:id`, токен OWNER | 204 |
| 3 | `GET /api/service-categories`, токен OWNER | 200, категория отсутствует или `isActive=false` |

### TC-CAT-04: MANAGER может читать категории

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать категорию от OWNER | 201 |
| 2 | `GET /api/service-categories`, токен MANAGER | 200, массив содержит категорию |

### TC-CAT-05: MANAGER не может создавать/изменять/удалять категории

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | `POST /api/service-categories`, токен MANAGER | 403 Forbidden |
| 2 | `PATCH /api/service-categories/:id`, токен MANAGER | 403 Forbidden |
| 3 | `DELETE /api/service-categories/:id`, токен MANAGER | 403 Forbidden |

### TC-CAT-06: Валидация тела запроса

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | `POST /api/service-categories` с пустым телом `{}`, токен OWNER | 400 Bad Request |
| 2 | `POST /api/service-categories` с `{ "name": "" }`, токен OWNER | 400 Bad Request |

---

## 2. Services

### TC-SVC-01: Создание услуги с FIXED ценой (OWNER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать категорию | 201 |
| 2 | `POST /api/services` с телом `{ "name": "Полировка кузова", "description": "Базовая полировка", "categoryId": "<id>", "durationMinutes": 60, "pricing": { "type": "FIXED", "fixedPriceCents": "500000" }, "materialNorms": [], "displayOrder": 1 }`, токен OWNER | 201, `{ "id": "<uuid>" }` |

### TC-SVC-02: Создание услуги с BY_BODY_TYPE ценой (OWNER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать категорию | 201 |
| 2 | `POST /api/services` с `pricing: { "type": "BY_BODY_TYPE", "bodyTypePrices": [{ "bodyType": "SEDAN", "priceCents": "500000" }, { "bodyType": "SUV", "priceCents": "700000" }] }`, токен OWNER | 201 |

### TC-SVC-03: Список услуг (OWNER/MANAGER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать услугу | 201 |
| 2 | `GET /api/services`, токен OWNER | 200, массив с услугой |
| 3 | `GET /api/services?categoryId=<id>`, токен MANAGER | 200, фильтрация по категории |

### TC-SVC-04: Публичный каталог (без авторизации)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать услугу | 201 |
| 2 | `GET /api/services/public` без заголовка Authorization | 200, массив с активными услугами |

### TC-SVC-05: Обновление услуги (OWNER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать услугу | 201 |
| 2 | `PATCH /api/services/:id` с `{ "name": "Новое имя" }`, токен OWNER | 204 |

### TC-SVC-06: Изменение цены (OWNER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать услугу | 201 |
| 2 | `PATCH /api/services/:id/price` с `{ "pricing": { "type": "FIXED", "fixedPriceCents": "600000" } }`, токен OWNER | 204 |
| 3 | `GET /api/services/:id/price-history`, токен OWNER | 200, история содержит запись |

### TC-SVC-07: Установка норм расхода (OWNER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать услугу | 201 |
| 2 | `PATCH /api/services/:id/material-norms` с `{ "norms": [{ "skuId": "<uuid>", "amount": 50 }] }`, токен OWNER | 204 |

### TC-SVC-08: Деактивация услуги (OWNER)

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | Создать услугу | 201 |
| 2 | `DELETE /api/services/:id`, токен OWNER | 204 |

### TC-SVC-09: MANAGER не может управлять услугами

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | `POST /api/services`, токен MANAGER | 403 |
| 2 | `PATCH /api/services/:id`, токен MANAGER | 403 |
| 3 | `DELETE /api/services/:id`, токен MANAGER | 403 |

### TC-SVC-10: Валидация

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | `POST /api/services` с пустым телом, токен OWNER | 400 |
| 2 | `POST /api/services` с `durationMinutes: 0`, токен OWNER | 400 |
| 3 | `POST /api/services` с невалидным `categoryId`, токен OWNER | 400 (не UUID) |

---

## 3. Аутентификация

### TC-AUTH-01: Неавторизованный доступ

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | `GET /api/service-categories` без Authorization | 401 Unauthorized |
| 2 | `POST /api/services` без Authorization | 401 Unauthorized |
| 3 | `GET /api/services/public` без Authorization | 200 (публичный) |
