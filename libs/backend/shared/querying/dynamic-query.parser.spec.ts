import { QueryOrder } from '@mikro-orm/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DynamicQueryAstParser } from './core/dynamic-query-ast.parser';
import { DynamicQueryParseError } from './core/dynamic-query.errors';
import { DynamicQueryDto } from './dto/dynamic-query.dto';
import { createPaginatedResponse } from './dto/paginated-response.dto';
import { MikroOrmDynamicQueryAdapter } from './mikro-orm/mikro-orm-dynamic-query.adapter';
import { MikroOrmDynamicQueryCompiler } from './mikro-orm/mikro-orm-dynamic-query.compiler';

import type { DynamicQueryParserConfig } from './core/dynamic-query.types';

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

describe('MikroOrmDynamicQueryCompiler', () => {
  const compiler = new MikroOrmDynamicQueryCompiler<TestEntity>();

  it('builds pagination defaults without filters and sorts', () => {
    const result = compiler.compile({}, config);

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
    const result = compiler.compile(
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
    const result = compiler.compile(
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
    const result = compiler.compile({ filters }, config);

    expect(result.where).toEqual(expectedWhere);
  });

  it('parses date values for configured date fields', () => {
    const result = compiler.compile({ filters: 'createdAt>=2026-05-01T00:00:00.000Z' }, config);

    expect(result.where).toEqual({
      createdAt: {
        $gte: new Date('2026-05-01T00:00:00.000Z'),
      },
    });
  });

  it('rejects fields that are not whitelisted', () => {
    expect(() => compiler.compile({ filters: 'passwordHash==secret' }, config)).toThrow(
      DynamicQueryParseError,
    );
  });

  it('rejects unsafe field names before creating MikroORM objects', () => {
    expect(() => compiler.compile({ filters: '$where==1' }, config)).toThrow(
      DynamicQueryParseError,
    );
  });

  it('rejects operators that are disabled for a field', () => {
    expect(() => compiler.compile({ filters: 'id@=abc' }, config)).toThrow(DynamicQueryParseError);
  });

  it('rejects string operators for non-string parsed values', () => {
    expect(() => compiler.compile({ filters: 'age@=18' }, config)).toThrow(DynamicQueryParseError);
  });

  it('rejects malformed parenthesis and page size over limit', () => {
    expect(() => compiler.compile({ filters: 'status*=(ACTIVE,PENDING' }, config)).toThrow(
      DynamicQueryParseError,
    );
    expect(() => compiler.compile({ pageSize: 101 }, config)).toThrow(DynamicQueryParseError);
  });

  it('applies custom MikroORM filters registered on parser config', () => {
    const result = new MikroOrmDynamicQueryCompiler<TestEntity>(
      new DynamicQueryAstParser(),
      new MikroOrmDynamicQueryAdapter<TestEntity>({
        customFilters: {
          clientSearch: ({ condition }) => ({
            $or: [
              { fullName: { $ilike: `%${String(condition.value)}%` } },
              { phone: { $ilike: `%${String(condition.value)}%` } },
            ],
          }),
        },
      }),
    ).compile(
      { filters: 'search@=Иван' },
      {
        allowedFields: {
          search: { customFilter: 'clientSearch', type: 'string' },
        },
      },
    );

    expect(result.where).toEqual({
      $or: [{ fullName: { $ilike: '%Иван%' } }, { phone: { $ilike: '%Иван%' } }],
    });
  });
});

describe('DynamicQueryAstParser', () => {
  it('produces ORM-neutral AST that can be compiled by adapters', () => {
    const ast = new DynamicQueryAstParser().parse(
      {
        filters: 'status*=ACTIVE,PENDING|client.name@=Иван',
        page: 2,
        pageSize: 10,
        sorts: '-createdAt',
      },
      config,
    );

    expect(ast).toEqual({
      filter: {
        children: [
          {
            field: { key: 'status', path: 'status', type: 'string' },
            kind: 'condition',
            operator: '*=',
            rawValue: 'ACTIVE,PENDING',
            value: ['ACTIVE', 'PENDING'],
          },
          {
            field: { key: 'client.name', path: 'client.name', type: 'string' },
            kind: 'condition',
            operator: '@=',
            rawValue: 'Иван',
            value: 'Иван',
          },
        ],
        kind: 'group',
        operator: 'or',
      },
      page: 2,
      pageSize: 10,
      sorts: [
        {
          direction: 'desc',
          field: { key: 'createdAt', path: 'createdAt', type: 'date' },
        },
      ],
    });
  });
});

describe('MikroOrmDynamicQueryAdapter', () => {
  it('compiles AST into MikroORM where/options', () => {
    const ast = new DynamicQueryAstParser().parse(
      {
        filters: 'status*=ACTIVE,PENDING|client.name@=Иван',
        page: 2,
        pageSize: 10,
        sorts: '-createdAt',
      },
      config,
    );
    const result = new MikroOrmDynamicQueryAdapter<TestEntity>().compile(ast);

    expect(result).toEqual({
      options: {
        limit: 10,
        offset: 10,
        orderBy: [{ createdAt: QueryOrder.DESC }],
      },
      page: 2,
      pageSize: 10,
      where: {
        $or: [
          { status: { $in: ['ACTIVE', 'PENDING'] } },
          { client: { name: { $ilike: '%Иван%' } } },
        ],
      },
    });
  });

  it('supports adapter-level custom filters', () => {
    const ast = new DynamicQueryAstParser().parse(
      { filters: 'search@=Иван' },
      {
        allowedFields: {
          search: { customFilter: 'clientSearch', type: 'string' },
        },
      },
    );
    const result = new MikroOrmDynamicQueryAdapter<TestEntity>({
      customFilters: {
        clientSearch: ({ condition }) => ({
          $or: [
            { fullName: { $ilike: `%${String(condition.value)}%` } },
            { phone: { $ilike: `%${String(condition.value)}%` } },
          ],
        }),
      },
    }).compile(ast);

    expect(result.where).toEqual({
      $or: [{ fullName: { $ilike: '%Иван%' } }, { phone: { $ilike: '%Иван%' } }],
    });
  });
});

describe('MikroOrmDynamicQueryCompiler', () => {
  it('composes AST parser and MikroORM adapter behind a single API', () => {
    const result = new MikroOrmDynamicQueryCompiler<TestEntity>().compile(
      { filters: 'branch.isActive==true' },
      config,
    );

    expect(result.where).toEqual({ branch: { isActive: true } });
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
