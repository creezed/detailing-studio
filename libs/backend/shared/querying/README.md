# @det/backend/shared/querying

Универсальный backend-пакет для пагинации, сортировки и динамической фильтрации CRUD/read-запросов в NestJS + MikroORM + CQRS.

Пакет решает четыре задачи:

- Единый DTO-контракт для query params: `DynamicQueryDto`.
- Единый DTO ответа: `PaginatedResponseDto<T>`.
- Безопасный whitelist полей до построения MikroORM query object.
- Трансляция компактного URL-синтаксиса в `{ where: FilterQuery<T>, options: FindOptions<T> }` для `em.findAndCount(...)`.

## Установка в проекте

Импорт:

```ts
import {
  DynamicQueryDto,
  DynamicQueryParser,
  createPaginatedResponse,
} from '@det/backend/shared/querying';
```

Пакет лежит в `libs/backend/shared/querying` и имеет Nx tags:

```json
["scope:shared", "type:util", "platform:node"]
```

## DTO запроса

```ts
export class DynamicQueryDto {
  page?: number;
  pageSize?: number;
  sorts?: string;
  filters?: string;
}
```

Правила:

- `page` начинается с `1`.
- `pageSize` по умолчанию `25`.
- Максимальный `pageSize` в DTO: `100`.
- `sorts` содержит одно или несколько полей через запятую.
- `filters` содержит одно или несколько условий.

## DTO ответа

```ts
export class PaginatedResponseDto<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

Для сборки ответа есть helper:

```ts
const response = createPaginatedResponse(items, totalCount, page, pageSize);
```

## Синтаксис сортировки

Формат:

```text
sorts=field,-createdAt,client.name
```

- `field` — сортировка по возрастанию.
- `-field` — сортировка по убыванию.
- Несколько сортировок разделяются `,`.
- Вложенные поля разрешены только если они есть в whitelist.

Примеры:

```http
GET /api/clients?page=1&pageSize=20&sorts=-createdAt,fullName
GET /api/appointments?sorts=branch.name,-startsAt
```

## Синтаксис фильтрации

Формат одного условия:

```text
fieldOperatorValue
```

Группы:

- `,` — логическое AND.
- `|` — логическое OR.
- Вложенные свойства: `client.name@=Иван`, `branch.isActive==true`.

Примеры:

```http
GET /api/clients?filters=fullName@=Иван
GET /api/clients?filters=status*=ACTIVE,PENDING
GET /api/clients?filters=status*=(ACTIVE,PENDING),branch.isActive==true
GET /api/clients?filters=fullName@=Иван|phone@=7999
GET /api/appointments?filters=branch.isActive==true,startsAt>=2026-05-01T00:00:00.000Z
```

## Операторы

| Оператор | Значение                     | MikroORM fragment   | Пример                      |
| -------- | ---------------------------- | ------------------- | --------------------------- |
| `==`     | равно                        | прямое значение     | `status==ACTIVE`            |
| `!=`     | не равно                     | `$ne`               | `status!=ARCHIVED`          |
| `>`      | больше                       | `$gt`               | `createdAt>2026-01-01`      |
| `<`      | меньше                       | `$lt`               | `createdAt<2026-12-31`      |
| `>=`     | больше или равно             | `$gte`              | `totalCount>=10`            |
| `<=`     | меньше или равно             | `$lte`              | `totalCount<=100`           |
| `@=`     | contains, case-insensitive   | `$ilike: "%value%"` | `fullName@=Иван`            |
| `_=`     | startsWith, case-insensitive | `$ilike: "value%"`  | `phone_=+7999`              |
| `^=`     | endsWith, case-insensitive   | `$ilike: "%value"`  | `email^=@studio.test`       |
| `!@=`    | not contains                 | `$not: { $ilike }`  | `fullName!@=test`           |
| `*=`     | in                           | `$in`               | `status*=ACTIVE,PENDING`    |
| `!*=`    | not in                       | `$nin`              | `status!*=ARCHIVED,BLOCKED` |

## Парсинг типов

Parser приводит значения к типам:

- `true` / `false` -> `boolean`.
- `null` -> `null`.
- числовые строки -> `number`.
- `date` поля -> `Date`.
- остальные значения -> `string`.

Для стабильного поведения рекомендуется указывать тип поля в whitelist.

```ts
const parserConfig = {
  allowedFields: {
    fullName: { type: 'string' },
    createdAt: { type: 'date' },
    isActive: { type: 'boolean' },
    totalCount: { type: 'number' },
  },
};
```

## Whitelist и безопасность

Parser не принимает произвольные поля из URL. Каждое поле должно быть явно разрешено в `allowedFields`.

```ts
const parserConfig = {
  allowedFields: {
    fullName: { type: 'string' },
    phone: { type: 'string' },
    status: { type: 'string' },
    'branch.isActive': { type: 'boolean' },
    createdAt: { type: 'date' },
  },
};
```

Защита:

- Поля проходят regex-проверку: только `camelCase`, `snake_case`, цифры после первого символа и вложенность через `.`.
- Запрещены `$where`, SQL fragments, скобки, кавычки, пробелы и произвольные operators в имени поля.
- Значения не конкатенируются в SQL. Parser строит только MikroORM object query.
- Можно отключить сортировку или фильтрацию для поля.
- Можно ограничить набор operators для поля.

Пример:

```ts
const parserConfig = {
  allowedFields: {
    id: { operators: ['==', '!='], sortable: false, type: 'string' },
    fullName: { operators: ['==', '!=', '@=', '_=', '^=', '!@='], type: 'string' },
    createdAt: { filterable: true, sortable: true, type: 'date' },
  },
};
```

## Интеграция в NestJS Controller

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { DynamicQueryDto, PaginatedResponseDto } from '@det/backend/shared/querying';

@Controller('clients')
export class ClientsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async list(@Query() query: DynamicQueryDto): Promise<PaginatedResponseDto<ClientDto>> {
    return this.queryBus.execute(new ListClientsQuery(query));
  }
}
```

## Интеграция в CQRS QueryHandler

```ts
import { EntityManager } from '@mikro-orm/postgresql';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  DynamicQueryParser,
  PaginatedResponseDto,
  createPaginatedResponse,
} from '@det/backend/shared/querying';

@QueryHandler(ListClientsQuery)
export class ListClientsHandler implements IQueryHandler<ListClientsQuery> {
  private readonly parser = new DynamicQueryParser();

  constructor(private readonly em: EntityManager) {}

  async execute(query: ListClientsQuery): Promise<PaginatedResponseDto<ClientDto>> {
    const parsed = this.parser.parse<ClientSchema>(query.dynamicQuery, {
      allowedFields: {
        fullName: { type: 'string' },
        phone: { type: 'string' },
        status: { type: 'string' },
        'branch.isActive': { type: 'boolean' },
        createdAt: { type: 'date' },
      },
      defaultPageSize: 25,
      maxPageSize: 100,
    });

    const [entities, totalCount] = await this.em.findAndCount(
      ClientSchema,
      parsed.where,
      parsed.options,
    );

    const items = entities.map((entity) => mapClientToDto(entity));

    return createPaginatedResponse(items, totalCount, parsed.page, parsed.pageSize);
  }
}
```

## Пример результата parser

Запрос:

```http
GET /api/clients?page=2&pageSize=10&sorts=-createdAt,client.name&filters=status*=ACTIVE,PENDING|client.name@=Иван,branch.isActive==true
```

Результат:

```ts
{
  where: {
    $or: [
      {
        status: { $in: ['ACTIVE', 'PENDING'] },
      },
      {
        $and: [
          { client: { name: { $ilike: '%Иван%' } } },
          { branch: { isActive: true } },
        ],
      },
    ],
  },
  options: {
    limit: 10,
    offset: 10,
    orderBy: [{ createdAt: 'DESC' }, { client: { name: 'ASC' } }],
  },
  page: 2,
  pageSize: 10,
}
```
