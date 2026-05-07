# IAM — тест-кейсы для ручного тестирования

## 1. Область покрытия

Документ описывает ручные API-тесты для текущего IAM-модуля.

Покрываемые endpoints:

- **Auth:** `POST /api/auth/register-owner`, `POST /api/auth/login`, `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, `POST /api/auth/refresh`, `POST /api/auth/logout`.
- **Users:** `GET /api/users/me`, `POST /api/users/me/password`, `POST /api/users/:id/block`.
- **Invitations:** `POST /api/users/invitations`, `POST /api/users/invitations/:token/accept`.
- **Сквозные проверки:** JWT, RBAC, валидация DTO, i18n ошибок, throttling, refresh-сессии, OTP, приглашения, отсутствие `deviceFingerprint`.

Не покрывается, потому что endpoints пока отсутствуют: OAuth, 2FA, сброс пароля, список сотрудников, изменение ролей, отзыв приглашения, frontend UI.

## 2. Предусловия

- **Окружение:** API запущен с global prefix `/api`.
- **База данных:** используется изолированная тестовая БД или локальная БД, которую можно очищать.
- **Инструменты:** Postman/Insomnia/curl, DB client и доступ к API logs.
- **Headers:** для JSON-запросов используется `Content-Type: application/json`; для защищённых endpoints — `Authorization: Bearer <accessToken>`.
- **Локализация:** часть ошибок прогоняется с `Accept-Language: ru` и `Accept-Language: en`.

## 3. Тестовые данные

| Переменная | Пример |
|---|---|
| `OWNER_EMAIL` | `owner.manual+<run>@studio.test` |
| `OWNER_PHONE` | `+79990001001` |
| `MANAGER_EMAIL` | `manager.manual+<run>@studio.test` |
| `MANAGER_PHONE` | `+79990001002` |
| `MASTER_EMAIL` | `master.manual+<run>@studio.test` |
| `MASTER_PHONE` | `+79990001003` |
| `CLIENT_EMAIL` | `client.manual+<run>@studio.test` |
| `CLIENT_PHONE` | `+79990001004` |
| `PASSWORD` | `Str0ngP@ss` |
| `NEW_PASSWORD` | `N3wStr0ngP@ss` |
| `BRANCH_ID` | `11111111-1111-4111-8111-111111111101` |

## 4. Общие ожидаемые ответы

### 4.1 Успешный ответ авторизации

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<refresh-token>",
  "expiresIn": 900,
  "user": {
    "id": "<uuid>",
    "fullName": "<string>",
    "role": "OWNER|MANAGER|MASTER|CLIENT"
  }
}
```

### 4.2 Профиль текущего пользователя

```json
{
  "id": "<uuid>",
  "email": "owner.manual@example.test",
  "phone": "+79990001001",
  "fullName": "Owner Manual",
  "role": "OWNER",
  "status": "ACTIVE"
}
```

### 4.3 Ошибка application/domain

```json
{
  "statusCode": 401,
  "error": "INVALID_CREDENTIALS",
  "message": "<локализованное сообщение>"
}
```

## 5. Быстрая проверка и общий контракт API

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-SMOKE-001 | API доступен | Выполнить `GET /api/health`. | `200`; health response возвращён. |
| IAM-SMOKE-002 | Swagger содержит IAM endpoints | Открыть `/api/docs`. | Endpoints auth/users/invitations отображаются. |
| IAM-SMOKE-003 | Public endpoints не требуют JWT | Выполнить `POST /api/auth/login` без bearer token с неизвестными credentials. | `401 INVALID_CREDENTIALS`, а не отказ auth guard. |
| IAM-SMOKE-004 | Protected endpoints требуют JWT | Выполнить `GET /api/users/me` без bearer token. | `401`. |
| IAM-SMOKE-005 | Неверный bearer format отклоняется | Передать `Authorization: Token abc` или `Authorization: Bearer`. | `401`. |
| IAM-SMOKE-006 | Невалидный JWT отклоняется | Передать `Authorization: Bearer invalid.jwt.value`. | `401`. |
| IAM-SMOKE-007 | Лишние поля DTO отклоняются | Добавить `unexpectedField` в body любого DTO endpoint. | `400`; поле не принимается. |
| IAM-SMOKE-008 | Некорректный JSON не ломает API | Отправить malformed JSON. | `400`; нет `500`. |

## 6. Регистрация Owner

Эндпоинт: `POST /api/auth/register-owner`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-REG-001 | Успешная регистрация OWNER | Отправить уникальные `email`, `phone`, валидный `password`, `fullName`. | `201`; возвращён auth response; `user.role=OWNER`; `deviceFingerprint` не требуется. |
| IAM-REG-002 | Новый OWNER читает свой профиль | После регистрации вызвать `GET /api/users/me` с access token. | `200`; email, phone, fullName, role и status корректны. |
| IAM-REG-003 | Email нормализуется | Зарегистрироваться с email в смешанном регистре, затем login lowercase email. | Login успешен; профиль содержит normalized lowercase email. |
| IAM-REG-004 | Дубликат email отклоняется | Повторить регистрацию с тем же email и другим phone. | `409`; `error=USER_ALREADY_EXISTS`. |
| IAM-REG-005 | Дубликат phone отклоняется | Повторить регистрацию с другим email и тем же phone. | `409`; `error=PHONE_ALREADY_EXISTS`. |
| IAM-REG-006 | Невалидный email отклоняется | Отправить `email=not-email`. | `400` или `422`; пользователь не создан. |
| IAM-REG-007 | Отсутствующий email отклоняется | Убрать `email`. | `400`. |
| IAM-REG-008 | Пустой email отклоняется | Отправить `email=""`. | `400` или `422`. |
| IAM-REG-009 | Невалидный phone отклоняется | Отправить `phone="79990001001"` без `+`. | `422`; `error=INVALID_PHONE_NUMBER` или эквивалент. |
| IAM-REG-010 | Отсутствующий phone отклоняется | Убрать `phone`. | `400`. |
| IAM-REG-011 | Пустой phone отклоняется | Отправить `phone=""`. | `400`. |
| IAM-REG-012 | Короткий password отклоняется | Отправить password короче 8 символов. | `400`. |
| IAM-REG-013 | Отсутствующий password отклоняется | Убрать `password`. | `400`. |
| IAM-REG-014 | Отсутствующий fullName отклоняется | Убрать `fullName`. | `400`. |
| IAM-REG-015 | Пустой fullName отклоняется | Отправить `fullName=""`. | `400`. |
| IAM-REG-016 | `deviceFingerprint` отклоняется как лишнее поле | Отправить валидный body плюс `deviceFingerprint`. | `400`. |
| IAM-REG-017 | Повторная публичная регистрация OWNER контролируется | При уже существующем OWNER зарегистрировать нового уникального OWNER. | Ожидаемо должно быть запрещено после первичной инициализации; если `201`, зафиксировать продуктовый вопрос/дефект. |

## 7. Вход по email/password

Эндпоинт: `POST /api/auth/login`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-LOGIN-001 | Успешный вход | Отправить валидные email/password active user. | `200`; возвращён auth response; создана refresh session. |
| IAM-LOGIN-002 | Вход не требует `deviceFingerprint` | Отправить только email/password. | `200`. |
| IAM-LOGIN-003 | `deviceFingerprint` отклоняется | Отправить email/password плюс `deviceFingerprint`. | `400`. |
| IAM-LOGIN-004 | Неверный password отклоняется | Отправить валидный email и неверный password. | `401`; `error=INVALID_CREDENTIALS`. |
| IAM-LOGIN-005 | Неизвестный email отклоняется без раскрытия пользователя | Отправить unknown email. | `401`; `error=INVALID_CREDENTIALS`. |
| IAM-LOGIN-006 | Blocked user не входит в систему | Заблокировать user и выполнить login. | `401`; `error=INVALID_CREDENTIALS`. |
| IAM-LOGIN-007 | Archived user не входит в систему | Перевести user в `ARCHIVED` и выполнить login. | `401`; `error=INVALID_CREDENTIALS`. |
| IAM-LOGIN-008 | Невалидный email format отклоняется | Отправить `email=not-email`. | `400`. |
| IAM-LOGIN-009 | Отсутствующий email отклоняется | Убрать `email`. | `400`. |
| IAM-LOGIN-010 | Отсутствующий password отклоняется | Убрать `password`. | `400`. |
| IAM-LOGIN-011 | Пустой password отклоняется | Отправить `password=""`. | `400`. |
| IAM-LOGIN-012 | Throttling работает | Отправить 6 login requests за 60 секунд с одного client/IP. | 6-й request возвращает `429`. |
| IAM-LOGIN-013 | Повторные logins создают независимые sessions | Выполнить login дважды. | Оба ответа `200`; refresh tokens отличаются. |

## 8. Запрос OTP

Эндпоинт: `POST /api/auth/otp/request`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-OTP-REQ-001 | OTP запрошен для active user | Отправить phone active user. | `204`; OTP сохранён и отправлен/залогирован. |
| IAM-OTP-REQ-002 | OTP запрошен для неизвестного phone | Отправить phone без user. | Допустимо `204`, чтобы не раскрывать пользователя; verify позже должен завершиться `INVALID_CREDENTIALS`. |
| IAM-OTP-REQ-003 | OTP запрошен для blocked user | Отправить phone blocked user. | Request может вернуть `204`; verify должен завершиться `INVALID_CREDENTIALS`. |
| IAM-OTP-REQ-004 | Невалидный phone отклоняется | Отправить `phone="79990001001"`. | `422`; `error=INVALID_PHONE_NUMBER`. |
| IAM-OTP-REQ-005 | Отсутствующий phone отклоняется | Убрать `phone`. | `400`. |
| IAM-OTP-REQ-006 | Пустой phone отклоняется | Отправить `phone=""`. | `400`. |
| IAM-OTP-REQ-007 | Phone не строкой отклоняется | Отправить `phone=123`. | `400`. |
| IAM-OTP-REQ-008 | Throttling работает | Отправить 6 OTP requests за 60 секунд. | 6-й request возвращает `429`. |

## 9. Проверка OTP

Эндпоинт: `POST /api/auth/otp/verify`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-OTP-VERIFY-001 | Валидный OTP логинит active user | Запросить OTP, взять code из SMS/dev logs, выполнить verify. | `200`; возвращён auth response; создана refresh session. |
| IAM-OTP-VERIFY-002 | `deviceFingerprint` отклоняется | Отправить валидные phone/code плюс `deviceFingerprint`. | `400`. |
| IAM-OTP-VERIFY-003 | Неверный code отклоняется | Отправить wrong code. | `422`; `error=OTP_INVALID_CODE`; attempts уменьшаются. |
| IAM-OTP-VERIFY-004 | Лимит попыток соблюдается | Отправлять wrong code до исчерпания attempts. | Последняя попытка возвращает `429`; `error=OTP_ATTEMPTS_EXCEEDED`; OTP становится `FAILED`. |
| IAM-OTP-VERIFY-005 | Failed OTP нельзя использовать | После исчерпания attempts отправить correct code. | Login не происходит; ожидается `404` или `429`. |
| IAM-OTP-VERIFY-006 | Expired OTP отклоняется | Установить `expires_at` OTP в прошлое или дождаться TTL. | `410`; `error=OTP_EXPIRED`. |
| IAM-OTP-VERIFY-007 | Verify без pending OTP отклоняется | Отправить any code без pending OTP. | `404`; `error=OTP_NOT_FOUND`. |
| IAM-OTP-VERIFY-008 | OTP нельзя переиспользовать | Успешно verify OTP, затем повторить verify тем же code. | `404`; `error=OTP_NOT_FOUND`; новая session не создаётся. |
| IAM-OTP-VERIFY-009 | OTP для неизвестного phone не логинит | Запросить OTP на unknown phone и выполнить verify. | `401`; `error=INVALID_CREDENTIALS`. |
| IAM-OTP-VERIFY-010 | OTP для blocked user не логинит | Запросить OTP blocked user и выполнить verify. | `401`; `error=INVALID_CREDENTIALS`. |
| IAM-OTP-VERIFY-011 | Отсутствующий code отклоняется | Убрать `code`. | `400`. |
| IAM-OTP-VERIFY-012 | Пустой code отклоняется | Отправить `code=""`. | `400`. |
| IAM-OTP-VERIFY-013 | Отсутствующий phone отклоняется | Убрать `phone`. | `400`. |
| IAM-OTP-VERIFY-014 | Невалидный phone отклоняется | Отправить invalid phone и any code. | `422`; `error=INVALID_PHONE_NUMBER`. |
| IAM-OTP-VERIFY-015 | Throttling работает | Отправить 6 verify requests за 60 секунд. | 6-й request возвращает `429` или раньше срабатывает OTP attempts limit. |

## 10. Ротация refresh token

Эндпоинт: `POST /api/auth/refresh`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-REFRESH-001 | Валидный refresh token ротируется | Отправить текущий refresh token active session. | `200`; возвращён новый access token и новый refresh token. |
| IAM-REFRESH-002 | Старый refresh token нельзя использовать после rotation | После IAM-REFRESH-001 отправить старый refresh token. | `401`; `error=REFRESH_TOKEN_REUSE`; срабатывает compromise protection. |
| IAM-REFRESH-003 | Новый refresh token работает | Отправить refresh token из IAM-REFRESH-001. | `200`; возвращён очередной refresh token. |
| IAM-REFRESH-004 | Unknown refresh token отклоняется | Отправить random token. | `401`; `error=SESSION_NOT_FOUND`. |
| IAM-REFRESH-005 | Отсутствующий refreshToken отклоняется | Убрать `refreshToken`. | `400`. |
| IAM-REFRESH-006 | Пустой refreshToken отклоняется | Отправить `refreshToken=""`. | `400`. |
| IAM-REFRESH-007 | refreshToken не строкой отклоняется | Отправить `refreshToken=123`. | `400`. |
| IAM-REFRESH-008 | `deviceFingerprint` отклоняется | Отправить valid refreshToken плюс `deviceFingerprint`. | `400`. |
| IAM-REFRESH-009 | Expired refresh session отклоняется | Установить session `expires_at` в прошлое и выполнить refresh. | `401`; `error=SESSION_EXPIRED`. |
| IAM-REFRESH-010 | Revoked session не должна refresh-иться | Выполнить logout, затем refresh тем же token. | Ожидается `401`; если `200`, зафиксировать security defect. |
| IAM-REFRESH-011 | Compromised session не должна refresh-иться | После reuse detection попробовать refresh compromised token. | Ожидается `401`; если `200`, зафиксировать security defect. |
| IAM-REFRESH-012 | Reuse компрометирует все active sessions user | Создать 2 sessions, rotate первую, reuse старый token первой. | Все active sessions user становятся `COMPROMISED`; вторая session больше не refresh-ится. |
| IAM-REFRESH-013 | Refresh для blocked user отклоняется | Залогиниться, заблокировать user, выполнить refresh. | `401`; `error=INVALID_CREDENTIALS`. |
| IAM-REFRESH-014 | Throttling работает | Отправить 6 refresh requests за 60 секунд. | 6-й request возвращает `429`. |

## 11. Выход из системы

Эндпоинт: `POST /api/auth/logout`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-LOGOUT-001 | Logout отзывает refresh session | Вызвать logout с valid access token и refresh token. | `204`; session получает `status=REVOKED`. |
| IAM-LOGOUT-002 | Revoked token нельзя refresh-ить | После logout выполнить refresh тем же token. | Ожидается `401`; tokens не возвращаются. |
| IAM-LOGOUT-003 | Поведение access token после logout зафиксировано | После logout вызвать `/users/me` старым access token до JWT expiry. | Зафиксировать фактическое поведение; если stateless JWT допускает `200`, это должно быть осознанным decision. |
| IAM-LOGOUT-004 | Logout требует auth | Вызвать logout без bearer token. | `401`. |
| IAM-LOGOUT-005 | Invalid access token отклоняется | Вызвать logout с invalid bearer token. | `401`. |
| IAM-LOGOUT-006 | Отсутствующий refreshToken отклоняется | Убрать `refreshToken`. | `400`. |
| IAM-LOGOUT-007 | Пустой refreshToken отклоняется | Отправить `refreshToken=""`. | `400`. |
| IAM-LOGOUT-008 | Unknown refreshToken отклоняется | Отправить random refresh token. | `401`; `error=SESSION_NOT_FOUND`. |
| IAM-LOGOUT-009 | User не должен отзывать чужую session | Вызвать logout с access token user A и refresh token user B. | Ожидается отказ или session B остаётся active; если B revoked — defect. |

## 12. Профиль текущего пользователя

Эндпоинт: `GET /api/users/me`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-ME-001 | OWNER читает профиль | Вызвать endpoint с OWNER token. | `200`; данные OWNER корректны. |
| IAM-ME-002 | MANAGER читает профиль | Вызвать endpoint с MANAGER token. | `200`; `role=MANAGER`. |
| IAM-ME-003 | MASTER читает профиль | Вызвать endpoint с MASTER token. | `200`; `role=MASTER`. |
| IAM-ME-004 | CLIENT читает профиль | Вызвать endpoint с CLIENT token. | `200`; `role=CLIENT`. |
| IAM-ME-005 | Missing auth отклоняется | Вызвать без bearer token. | `401`. |
| IAM-ME-006 | Invalid auth отклоняется | Вызвать с invalid bearer token. | `401`. |
| IAM-ME-007 | Blocked user со старым access token контролируется | Залогиниться, заблокировать user, вызвать `/me` старым token. | Ожидается `401` или `403`; если `200`, подтвердить JWT-only decision. |
| IAM-ME-008 | Archived user со старым access token контролируется | Залогиниться, archived user, вызвать `/me`. | Ожидается `401` или `403`. |
| IAM-ME-009 | Token несуществующего user не даёт 500 | Использовать token с absent user id, если возможно. | `404 USER_NOT_FOUND` или `401`; нет `500`. |

## 13. Смена своего пароля

Эндпоинт: `POST /api/users/me/password`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-PWD-001 | Password меняется успешно | Отправить valid `oldPassword` и `newPassword`. | `204`; old password больше не работает; new password работает. |
| IAM-PWD-002 | Wrong oldPassword отклоняется | Отправить неверный `oldPassword`. | `422`; `error=INVALID_PASSWORD`. |
| IAM-PWD-003 | Missing auth отклоняется | Вызвать без bearer token. | `401`. |
| IAM-PWD-004 | Invalid auth отклоняется | Вызвать с invalid bearer token. | `401`. |
| IAM-PWD-005 | Отсутствующий oldPassword отклоняется | Убрать `oldPassword`. | `400`. |
| IAM-PWD-006 | Отсутствующий newPassword отклоняется | Убрать `newPassword`. | `400`. |
| IAM-PWD-007 | Короткий oldPassword отклоняется | Отправить oldPassword короче 8 символов. | `400`. |
| IAM-PWD-008 | Короткий newPassword отклоняется | Отправить newPassword короче 8 символов. | `400`. |
| IAM-PWD-009 | Empty passwords отклоняются | Отправить empty strings. | `400`. |
| IAM-PWD-010 | Blocked user не меняет password | Залогиниться, заблокировать user, вызвать endpoint старым token. | `422 USER_NOT_ACTIVE` или auth-layer отказ. |
| IAM-PWD-011 | Same password policy зафиксирована | Отправить `newPassword`, равный `oldPassword`. | Зафиксировать фактическое поведение; желательно reject. |

## 14. Выдача приглашения

Эндпоинт: `POST /api/users/invitations`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-INV-ISSUE-001 | OWNER выдаёт MASTER invitation | OWNER отправляет valid body с `role=MASTER`. | `201`; invitation создан. |
| IAM-INV-ISSUE-002 | OWNER выдаёт MANAGER invitation | OWNER отправляет valid body с `role=MANAGER`. | `201`; invitation role = MANAGER. |
| IAM-INV-ISSUE-003 | MANAGER выдаёт MASTER invitation | MANAGER отправляет valid body с `role=MASTER`. | Ожидается `201`. |
| IAM-INV-ISSUE-004 | MANAGER не выдаёт OWNER invitation | MANAGER отправляет `role=OWNER`. | Ожидается `403`; если `201`, defect. |
| IAM-INV-ISSUE-005 | MANAGER не выдаёт MANAGER invitation без разрешения | MANAGER отправляет `role=MANAGER`. | Ожидается `403`, если продукт явно не разрешает. |
| IAM-INV-ISSUE-006 | MASTER не выдаёт invitations | MASTER вызывает endpoint. | `403`. |
| IAM-INV-ISSUE-007 | CLIENT не выдаёт invitations | CLIENT вызывает endpoint. | `403`. |
| IAM-INV-ISSUE-008 | Missing auth отклоняется | Вызвать без bearer token. | `401`. |
| IAM-INV-ISSUE-009 | Email существующего user отклоняется | Выдать invitation на email existing user. | `409`; `error=USER_ALREADY_EXISTS`. |
| IAM-INV-ISSUE-010 | Duplicate pending invitation отклоняется | Дважды выдать invitation на один email. | Второй request: `409`; `error=INVITATION_ALREADY_EXISTS`. |
| IAM-INV-ISSUE-011 | Invalid email отклоняется | Отправить `email=not-email`. | `400`. |
| IAM-INV-ISSUE-012 | Missing email отклоняется | Убрать `email`. | `400`. |
| IAM-INV-ISSUE-013 | Invalid role отклоняется | Отправить `role=ADMIN`. | `400`. |
| IAM-INV-ISSUE-014 | Missing role отклоняется | Убрать `role`. | `400`. |
| IAM-INV-ISSUE-015 | branchIds должен быть array | Отправить `branchIds` строкой. | `400`. |
| IAM-INV-ISSUE-016 | branchIds должен содержать valid UUID | Отправить `branchIds=["not-uuid"]`. | Ожидается `400` или `422`; если принято, validation defect. |
| IAM-INV-ISSUE-017 | Empty branchIds для staff контролируется | Отправить `branchIds=[]` для MANAGER/MASTER. | Ожидается reject, если empty не является осознанным decision. |

## 15. Принятие приглашения

Эндпоинт: `POST /api/users/invitations/:token/accept`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-INV-ACCEPT-001 | Valid invitation принимается | Взять raw token из stub/log/outbox и отправить valid body. | `204`; invitation `ACCEPTED`; user создан `ACTIVE`. |
| IAM-INV-ACCEPT-002 | Accepted user логинится | Login invitation email/password. | `200`; role соответствует invitation. |
| IAM-INV-ACCEPT-003 | Branch access переносится | Декодировать JWT accepted user. | `branches` содержит invited branch IDs. |
| IAM-INV-ACCEPT-004 | Unknown token отклоняется | Вызвать accept со случайным token. | `404`; `error=INVITATION_NOT_FOUND`. |
| IAM-INV-ACCEPT-005 | Already accepted invitation не принимается повторно | Повторить accept того же token. | `409`; `error=INVITATION_ALREADY_ACCEPTED`; duplicate user отсутствует. |
| IAM-INV-ACCEPT-006 | Expired invitation отклоняется | Установить invitation `expires_at` в прошлое и принять. | `410`; `error=INVITATION_EXPIRED`. |
| IAM-INV-ACCEPT-007 | Email, занятый после issue, отклоняется | Создать user с email invitation до accept. | `409`; `error=USER_ALREADY_EXISTS`. |
| IAM-INV-ACCEPT-008 | Duplicate phone отклоняется | Принять invitation с phone existing user. | `409`; `error=PHONE_ALREADY_EXISTS`. |
| IAM-INV-ACCEPT-009 | Invalid phone отклоняется | Отправить `phone="79990001003"`. | `422`; `error=INVALID_PHONE_NUMBER`. |
| IAM-INV-ACCEPT-010 | Missing phone отклоняется | Убрать `phone`. | `400`. |
| IAM-INV-ACCEPT-011 | Missing fullName отклоняется | Убрать `fullName`. | `400`. |
| IAM-INV-ACCEPT-012 | Empty fullName отклоняется | Отправить `fullName=""`. | `400`. |
| IAM-INV-ACCEPT-013 | Short password отклоняется | Отправить password короче 8 символов. | `400`. |
| IAM-INV-ACCEPT-014 | Missing password отклоняется | Убрать `password`. | `400`. |
| IAM-INV-ACCEPT-015 | Accept endpoint public | Вызвать без bearer token. | Auth guard не отклоняет; результат зависит от token/body. |
| IAM-INV-ACCEPT-016 | Accept throttling работает | Отправить 4 requests за 60 секунд. | 4-й request возвращает `429`. |
| IAM-INV-ACCEPT-017 | Accept/activation атомарны | Спровоцировать activation failure, например duplicate phone. | Не должно быть half-accepted invitation без user; если есть — transaction defect. |

## 16. Блокировка пользователя

Эндпоинт: `POST /api/users/:id/block`.

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-BLOCK-001 | OWNER блокирует MANAGER | OWNER вызывает block для active MANAGER. | `204`; MANAGER становится `BLOCKED`; login невозможен. |
| IAM-BLOCK-002 | OWNER блокирует MASTER | OWNER вызывает block для active MASTER. | `204`; MASTER становится `BLOCKED`. |
| IAM-BLOCK-003 | OWNER блокирует CLIENT | OWNER вызывает block для active CLIENT. | `204`; CLIENT становится `BLOCKED`. |
| IAM-BLOCK-004 | MANAGER не блокирует user | MANAGER вызывает block другого user. | `403`. |
| IAM-BLOCK-005 | MASTER не блокирует user | MASTER вызывает block. | `403`. |
| IAM-BLOCK-006 | CLIENT не блокирует user | CLIENT вызывает block. | `403`. |
| IAM-BLOCK-007 | Missing auth отклоняется | Вызвать без bearer token. | `401`. |
| IAM-BLOCK-008 | Invalid UUID path отклоняется | Вызвать `/api/users/not-uuid/block`. | `400`. |
| IAM-BLOCK-009 | Non-existing user отклоняется | Вызвать block для absent valid UUID. | `404`; `error=USER_NOT_FOUND`. |
| IAM-BLOCK-010 | Already blocked user отклоняется | Повторить block blocked user. | `409`; `error=USER_ALREADY_BLOCKED`. |
| IAM-BLOCK-011 | Last active OWNER не блокируется | Попытаться заблокировать единственного active OWNER. | `409`; `error=CANNOT_BLOCK_LAST_OWNER`. |
| IAM-BLOCK-012 | OWNER блокируется при наличии другого active OWNER | При двух active OWNER заблокировать одного. | `204`; минимум один active OWNER остаётся. |
| IAM-BLOCK-013 | Self-blocking контролируется | OWNER вызывает block собственного ID. | Ожидается reject, если self-block явно не разрешён. |
| IAM-BLOCK-014 | Missing reason отклоняется | Убрать `reason`. | `400`. |
| IAM-BLOCK-015 | Empty reason отклоняется | Отправить `reason=""`. | `400`. |
| IAM-BLOCK-016 | Reason не строкой отклоняется | Отправить `reason=123`. | `400`. |
| IAM-BLOCK-017 | Extra fields отклоняются | Отправить valid reason плюс unknown field. | `400`. |

## 17. RBAC-матрица

| ID | Actor | Endpoint | Ожидаемый результат |
|---|---|---|---|
| IAM-RBAC-001 | Anonymous | `GET /api/users/me` | `401`. |
| IAM-RBAC-002 | Anonymous | `POST /api/users/invitations` | `401`. |
| IAM-RBAC-003 | Anonymous | `POST /api/users/:id/block` | `401`. |
| IAM-RBAC-004 | OWNER | `GET /api/users/me` | `200`. |
| IAM-RBAC-005 | OWNER | `POST /api/users/invitations` | `201` для разрешённой role. |
| IAM-RBAC-006 | OWNER | `POST /api/users/:id/block` | `204`, если target не защищён инвариантом. |
| IAM-RBAC-007 | MANAGER | `GET /api/users/me` | `200`. |
| IAM-RBAC-008 | MANAGER | `POST /api/users/invitations` с `role=MASTER` | `201`. |
| IAM-RBAC-009 | MANAGER | `POST /api/users/invitations` с `role=OWNER` | Ожидается `403`; если accepted — defect. |
| IAM-RBAC-010 | MANAGER | `POST /api/users/:id/block` | `403`. |
| IAM-RBAC-011 | MASTER | `GET /api/users/me` | `200`. |
| IAM-RBAC-012 | MASTER | `POST /api/users/invitations` | `403`. |
| IAM-RBAC-013 | MASTER | `POST /api/users/:id/block` | `403`. |
| IAM-RBAC-014 | CLIENT | `GET /api/users/me` | `200`. |
| IAM-RBAC-015 | CLIENT | `POST /api/users/invitations` | `403`. |
| IAM-RBAC-016 | CLIENT | `POST /api/users/:id/block` | `403`. |

## 18. i18n и валидация

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-I18N-001 | Validation error на русском | Вызвать validation error с `Accept-Language: ru`. | `400`; message на русском, если перевод есть. |
| IAM-I18N-002 | Validation error на английском | Вызвать тот же error с `Accept-Language: en`. | `400`; message на английском, если перевод есть. |
| IAM-I18N-003 | Application error code стабилен | Вызвать `INVALID_CREDENTIALS` на `ru` и `en`. | `error=INVALID_CREDENTIALS` в обоих ответах. |
| IAM-I18N-004 | Domain error code стабилен | Вызвать `INVALID_PHONE_NUMBER` или `OTP_INVALID_CODE`. | `error` стабилен; `message` локализован при наличии перевода. |
| IAM-I18N-005 | Unknown language fallback безопасен | Отправить `Accept-Language: de` и вызвать error. | Нет `500`; response валиден. |

## 19. Ограничение частоты запросов

| ID | Endpoint | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-THROTTLE-001 | `POST /api/auth/register-owner` | Отправить 6 requests за 60 секунд. | 6-й request возвращает `429`. |
| IAM-THROTTLE-002 | `POST /api/auth/login` | Отправить 6 requests за 60 секунд. | 6-й request возвращает `429`. |
| IAM-THROTTLE-003 | `POST /api/auth/otp/request` | Отправить 6 requests за 60 секунд. | 6-й request возвращает `429`. |
| IAM-THROTTLE-004 | `POST /api/auth/otp/verify` | Отправить 6 requests за 60 секунд. | 6-й request возвращает `429` или раньше срабатывает OTP attempts limit. |
| IAM-THROTTLE-005 | `POST /api/auth/refresh` | Отправить 6 requests за 60 секунд. | 6-й request возвращает `429`. |
| IAM-THROTTLE-006 | `POST /api/users/invitations/:token/accept` | Отправить 4 requests за 60 секунд. | 4-й request возвращает `429`. |
| IAM-THROTTLE-007 | Protected endpoints | Отправить больше 60 requests за 60 секунд. | Request сверх лимита возвращает `429`. |

## 20. Хранение, события и миграции

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-PERSIST-001 | Fresh DB schema не содержит fingerprint column | Применить migrations на clean DB и проверить `iam_refresh_session`. | `device_fingerprint` отсутствует. |
| IAM-PERSIST-002 | Migration удаляет старую fingerprint column | На БД со старой column запустить migration `20260508000000`. | Column удалена; rows сохранены. |
| IAM-PERSIST-003 | Session создаётся при login | Выполнить login. | В `iam_refresh_session` есть `ACTIVE` row без fingerprint data. |
| IAM-PERSIST-004 | Session ротируется | Выполнить refresh. | `token_hash` обновлён, old hash в `rotated_token_hashes`, `rotation_counter=1`. |
| IAM-PERSIST-005 | Logout отзывает session | Выполнить logout. | `status=REVOKED`, `revoked_at` и `revoked_by` заполнены. |
| IAM-PERSIST-006 | Token reuse компрометирует sessions | Переиспользовать old rotated token. | Sessions user становятся `COMPROMISED`; событие/outbox есть, если outbox включён. |
| IAM-PERSIST-007 | OTP lifecycle сохраняется | Request OTP и successful verify. | OTP row `VERIFIED`, `verified_at` заполнен. |
| IAM-PERSIST-008 | Failed OTP attempts сохраняются | Wrong code до лимита. | `attempts_left` уменьшается; status становится `FAILED`. |
| IAM-PERSIST-009 | Invitation issue создаёт pending invitation | Выдать invitation. | Invitation row `PENDING`; raw token доступен только delivery/log/outbox, hash persisted. |
| IAM-PERSIST-010 | Invitation accept создаёт active user | Принять invitation. | Invitation `ACCEPTED`; user `ACTIVE` с role/branches из invitation. |

## 21. Регрессия после удаления `deviceFingerprint`

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-FP-001 | Register owner без fingerprint | Вызвать register-owner без `deviceFingerprint`. | `201`. |
| IAM-FP-002 | Login без fingerprint | Вызвать login без `deviceFingerprint`. | `200`. |
| IAM-FP-003 | OTP verify без fingerprint | Request OTP и verify без `deviceFingerprint`. | `200`. |
| IAM-FP-004 | Refresh без fingerprint | Вызвать refresh только с `refreshToken`. | `200`. |
| IAM-FP-005 | DTO отклоняет fingerprint | Отправить `deviceFingerprint` в register/login/otp verify/refresh. | `400`. |
| IAM-FP-006 | Response не содержит fingerprint | Проверить auth responses. | Нет `deviceFingerprint` или аналога. |
| IAM-FP-007 | DB не хранит fingerprint | Проверить refresh session table. | Нет `device_fingerprint`; fingerprint value нигде не persisted. |
| IAM-FP-008 | Reuse detection работает без fingerprint | Rotate token, затем reuse старый token. | `REFRESH_TOKEN_REUSE` возвращается по token history. |

## 22. Негативные проверки устойчивости

| ID | Сценарий | Шаги | Ожидаемый результат |
|---|---|---|---|
| IAM-ROBUST-001 | Empty body | Отправить `{}` в endpoints с required fields. | `400`. |
| IAM-ROBUST-002 | Wrong content type | Отправить JSON как `text/plain`. | Нет `500`; корректная ошибка. |
| IAM-ROBUST-003 | Очень длинные строки | Отправить длинные email/fullName/password/reason. | Нет `500`; данные rejected или safely handled. |
| IAM-ROBUST-004 | Unicode fullName | Использовать кириллический fullName. | Значение сохраняется и возвращается в profile. |
| IAM-ROBUST-005 | SQL/script-like input | Отправить `<script>` или SQL fragments в fullName/reason. | Нет исполнения; нет `500`. |
| IAM-ROBUST-006 | Parallel refresh одним token | Отправить два refresh requests параллельно. | Только один успешен; второй rejected или triggers reuse protection. |
| IAM-ROBUST-007 | Parallel accept одним invitation token | Отправить два accept requests параллельно. | Только один создаёт user; duplicate user отсутствует. |
| IAM-ROBUST-008 | Parallel registration одинаковых email/phone | Отправить два register requests параллельно. | Один успешен; второй `409`; duplicate records отсутствуют. |

## 23. Критерии завершения

Ручное тестирование IAM считается завершённым, когда:

- **Функциональность:** happy paths проверены для всех доступных auth/users/invitations endpoints.
- **Безопасность:** missing/invalid JWT отклоняется; blocked users не получают новые sessions; refresh-token reuse определяется.
- **RBAC:** OWNER/MANAGER/MASTER/CLIENT permissions соответствуют продуктовой матрице или отклонения зафиксированы.
- **Валидация:** required fields, форматы, unknown fields и DTO constraints проверены.
- **Sessions:** refresh rotation, logout, expiration, revocation и compromise проверены.
- **OTP:** request, verify, wrong code, expiration и attempts limit проверены.
- **Invitations:** issue, accept, duplicates, expiration и role restrictions проверены.
- **Регрессия:** `deviceFingerprint` не требуется, не возвращается и не сохраняется.
- **Надёжность:** negative scenarios не возвращают unhandled `500`.
