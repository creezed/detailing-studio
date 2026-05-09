import { QueryOrder } from '@mikro-orm/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DynamicQueryDto } from './dynamic-query.dto';
import {
  DynamicQueryParseError,
  DynamicQueryParser,
  type DynamicQueryParserConfig,
} from './dynamic-query.parser';
import { createPaginatedResponse } from './paginated-response.dto';

interface TestEntity {
  readonly age: number;
  readonly branch: {
    readonly isActive: boolean;
  };
  readonly client: {
    readonly name: string;
  };
  readonly createdAt: Date;
  readonly deletedAt: Date | null;
  readonly id: string;
  readonly isActive: boolean;
  readonly score: number;
  readonly status: string;
}

const config: DynamicQueryParserConfig = {
  allowedFields: {
    age: { type: 'number' },
    'branch.isActive': { type: 'boolean' },
    'client.name': { type: 'string' },
    createdAt: { type: 'date' },
    deletedAt: { type: 'date' },
    id: { operators: ['==', '!='], type: 'string' },
    isActive: { type: 'boolean' },
    score: { type: 'number' },
    status: { type: 'string' },
  },
};

describe('DynamicQueryParser', () => {
  const parser = new DynamicQueryParser();

  it('builds pagination defaults without filters and sorts', () => {
    const result = parser.parse<TestEntity>({}, config);

    expect(result).toEqual({
      options: {
        limit: 25,
        offset: 0,
      },
      page: 1,
      pageSize: 25,
      where: {},
    });
  });

  it('builds complex OR/AND conditions with nested relation fields and unwrapped IN values', () => {
    const result = parser.parse<TestEntity>(
      {
        filters: 'status*=ACTIVE,PENDING,isActive==true|client.name@=Иван,branch.isActive==true',
        page: 2,
        pageSize: 10,
        sorts: '-createdAt,client.name',
      },
      config,
    );

    expect(result.where).toEqual({
      $or: [
        {
          $and: [{ status: { $in: ['ACTIVE', 'PENDING'] } }, { isActive: true }],
        },
        {
          $and: [{ client: { name: { $ilike: '%Иван%' } } }, { branch: { isActive: true } }],
        },
      ],
    });
    expect(result.options).toEqual({
      limit: 10,
      offset: 10,
      orderBy: [{ createdAt: QueryOrder.DESC }, { client: { name: QueryOrder.ASC } }],
    });
  });

  it('supports parenthesized IN and not IN operators', () => {
    const result = parser.parse<TestEntity>(
      {
        filters: 'status*=(ACTIVE,PENDING),id!*=client-1,client-2',
      },
      {
        allowedFields: {
          id: { type: 'string' },
          status: { type: 'string' },
        },
      },
    );

    expect(result.where).toEqual({
      $and: [
        { status: { $in: ['ACTIVE', 'PENDING'] } },
        { id: { $nin: ['client-1', 'client-2'] } },
      ],
    });
  });

  it.each([
    ['age>18', { age: { $gt: 18 } }],
    ['age<65', { age: { $lt: 65 } }],
    ['age>=18', { age: { $gte: 18 } }],
    ['age<=65', { age: { $lte: 65 } }],
    ['score!=42', { score: { $ne: 42 } }],
    ['client.name_=Ив', { client: { name: { $ilike: 'Ив%' } } }],
    ['client.name^=ов', { client: { name: { $ilike: '%ов' } } }],
    ['client.name!@=bot', { client: { name: { $not: { $ilike: '%bot%' } } } }],
    ['deletedAt==null', { deletedAt: null }],
  ])('translates %s', (filters, expectedWhere) => {
    const result = parser.parse<TestEntity>({ filters }, config);

    expect(result.where).toEqual(expectedWhere);
  });

  it('parses date values for configured date fields', () => {
    const result = parser.parse<TestEntity>(
      { filters: 'createdAt>=2026-05-01T00:00:00.000Z' },
      config,
    );

    expect(result.where).toEqual({
      createdAt: {
        $gte: new Date('2026-05-01T00:00:00.000Z'),
      },
    });
  });

  it('rejects fields that are not whitelisted', () => {
    expect(() => parser.parse<TestEntity>({ filters: 'passwordHash==secret' }, config)).toThrow(
      DynamicQueryParseError,
    );
  });

  it('rejects unsafe field names before creating MikroORM objects', () => {
    expect(() => parser.parse<TestEntity>({ filters: '$where==1' }, config)).toThrow(
      DynamicQueryParseError,
    );
  });

  it('rejects operators that are disabled for a field', () => {
    expect(() => parser.parse<TestEntity>({ filters: 'id@=abc' }, config)).toThrow(
      DynamicQueryParseError,
    );
  });

  it('rejects string operators for non-string parsed values', () => {
    expect(() => parser.parse<TestEntity>({ filters: 'age@=18' }, config)).toThrow(
      DynamicQueryParseError,
    );
  });

  it('rejects malformed parenthesis and page size over limit', () => {
    expect(() => parser.parse<TestEntity>({ filters: 'status*=(ACTIVE,PENDING' }, config)).toThrow(
      DynamicQueryParseError,
    );
    expect(() => parser.parse<TestEntity>({ pageSize: 101 }, config)).toThrow(
      DynamicQueryParseError,
    );
  });
});

describe('DynamicQueryDto', () => {
  it('validates max page size', async () => {
    const dto = plainToInstance(DynamicQueryDto, { page: '1', pageSize: '101' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('pageSize');
  });
});

describe('createPaginatedResponse', () => {
  it('maps items and count to paginated response dto', () => {
    expect(createPaginatedResponse([{ id: 'client-1' }], 21, 2, 10)).toEqual({
      items: [{ id: 'client-1' }],
      page: 2,
      pageSize: 10,
      totalCount: 21,
      totalPages: 3,
    });
  });
});
