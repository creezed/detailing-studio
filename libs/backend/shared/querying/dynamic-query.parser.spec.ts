import { QueryOrder } from '@mikro-orm/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DynamicQueryAstParser } from './core/dynamic-query-ast.parser';
import {
  DynamicQueryCustomFilterError,
  DynamicQueryError,
  DynamicQueryFieldError,
  DynamicQueryLimitError,
  DynamicQueryOperatorError,
  DynamicQueryPaginationError,
  DynamicQueryParseError,
  DynamicQueryValueError,
} from './core/dynamic-query.errors';
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

/* ------------------------------------------------------------------ */
/*  Error hierarchy                                                   */
/* ------------------------------------------------------------------ */

describe('Error hierarchy', () => {
  it('DynamicQueryError is the base class with code property', () => {
    const error = new DynamicQueryParseError('test');

    expect(error).toBeInstanceOf(DynamicQueryError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('DYNAMIC_QUERY_PARSE_ERROR');
    expect(error.name).toBe('DynamicQueryParseError');
    expect(error.message).toBe('test');
  });

  it('DynamicQueryFieldError carries field and reason', () => {
    const error = new DynamicQueryFieldError('status', 'not_whitelisted', 'msg');

    expect(error).toBeInstanceOf(DynamicQueryError);
    expect(error.code).toBe('DYNAMIC_QUERY_FIELD_ERROR');
    expect(error.field).toBe('status');
    expect(error.reason).toBe('not_whitelisted');
  });

  it('DynamicQueryOperatorError carries field and operator', () => {
    const error = new DynamicQueryOperatorError('id', '@=', 'msg');

    expect(error).toBeInstanceOf(DynamicQueryError);
    expect(error.code).toBe('DYNAMIC_QUERY_OPERATOR_ERROR');
    expect(error.field).toBe('id');
    expect(error.operator).toBe('@=');
  });

  it('DynamicQueryValueError carries rawValue, expectedType and optional field', () => {
    const error = new DynamicQueryValueError('abc', 'number', 'msg', 'age');

    expect(error).toBeInstanceOf(DynamicQueryError);
    expect(error.code).toBe('DYNAMIC_QUERY_VALUE_ERROR');
    expect(error.rawValue).toBe('abc');
    expect(error.expectedType).toBe('number');
    expect(error.field).toBe('age');
  });

  it('DynamicQueryValueError defaults field to null', () => {
    const error = new DynamicQueryValueError('abc', 'number', 'msg');

    expect(error.field).toBeNull();
  });

  it('DynamicQueryPaginationError carries parameter and value', () => {
    const error = new DynamicQueryPaginationError('pageSize', 200, 'msg');

    expect(error).toBeInstanceOf(DynamicQueryError);
    expect(error.code).toBe('DYNAMIC_QUERY_PAGINATION_ERROR');
    expect(error.parameter).toBe('pageSize');
    expect(error.value).toBe(200);
  });

  it('DynamicQueryCustomFilterError carries filterName', () => {
    const error = new DynamicQueryCustomFilterError('myFilter', 'msg');

    expect(error).toBeInstanceOf(DynamicQueryError);
    expect(error.code).toBe('DYNAMIC_QUERY_CUSTOM_FILTER_ERROR');
    expect(error.filterName).toBe('myFilter');
  });

  it('DynamicQueryLimitError carries limitName and limit', () => {
    const error = new DynamicQueryLimitError('maxConditions', 20, 'msg');

    expect(error).toBeInstanceOf(DynamicQueryError);
    expect(error.code).toBe('DYNAMIC_QUERY_LIMIT_ERROR');
    expect(error.limitName).toBe('maxConditions');
    expect(error.limit).toBe(20);
  });
});

/* ------------------------------------------------------------------ */
/*  DynamicQueryAstParser                                             */
/* ------------------------------------------------------------------ */

describe('DynamicQueryAstParser', () => {
  const parser = new DynamicQueryAstParser();

  describe('pagination', () => {
    it('applies default page=1 and pageSize=25', () => {
      const ast = parser.parse({}, config);

      expect(ast.page).toBe(1);
      expect(ast.pageSize).toBe(25);
    });

    it('uses custom page and pageSize', () => {
      const ast = parser.parse({ page: 3, pageSize: 50 }, config);

      expect(ast.page).toBe(3);
      expect(ast.pageSize).toBe(50);
    });

    it('uses config defaults for page and pageSize', () => {
      const ast = parser.parse({}, { ...config, defaultPage: 2, defaultPageSize: 15 });

      expect(ast.page).toBe(2);
      expect(ast.pageSize).toBe(15);
    });

    it('throws DynamicQueryPaginationError for page=0', () => {
      expect(() => parser.parse({ page: 0 }, config)).toThrow(DynamicQueryPaginationError);

      try {
        parser.parse({ page: 0 }, config);
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryPaginationError);
        expect((error as DynamicQueryPaginationError).parameter).toBe('page');
        expect((error as DynamicQueryPaginationError).value).toBe(0);
      }
    });

    it('throws DynamicQueryPaginationError for negative page', () => {
      expect(() => parser.parse({ page: -1 }, config)).toThrow(DynamicQueryPaginationError);
    });

    it('throws DynamicQueryPaginationError for float page', () => {
      expect(() => parser.parse({ page: 1.5 }, config)).toThrow(DynamicQueryPaginationError);
    });

    it('throws DynamicQueryPaginationError for pageSize over max', () => {
      expect(() => parser.parse({ pageSize: 101 }, config)).toThrow(DynamicQueryPaginationError);

      try {
        parser.parse({ pageSize: 101 }, config);
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryPaginationError);
        expect((error as DynamicQueryPaginationError).parameter).toBe('pageSize');
        expect((error as DynamicQueryPaginationError).value).toBe(101);
      }
    });

    it('respects custom maxPageSize', () => {
      const ast = parser.parse({ pageSize: 50 }, { ...config, maxPageSize: 50 });

      expect(ast.pageSize).toBe(50);
      expect(() => parser.parse({ pageSize: 51 }, { ...config, maxPageSize: 50 })).toThrow(
        DynamicQueryPaginationError,
      );
    });

    it('throws DynamicQueryPaginationError for invalid maxPageSize config', () => {
      expect(() => parser.parse({}, { ...config, maxPageSize: 0 })).toThrow(
        DynamicQueryPaginationError,
      );
      expect(() => parser.parse({}, { ...config, maxPageSize: -1 })).toThrow(
        DynamicQueryPaginationError,
      );
      expect(() => parser.parse({}, { ...config, maxPageSize: 1.5 })).toThrow(
        DynamicQueryPaginationError,
      );
    });
  });

  describe('filter operators', () => {
    it.each([
      ['status==ACTIVE', '==', 'ACTIVE'],
      ['status!=PENDING', '!=', 'PENDING'],
      ['age>18', '>', 18],
      ['age<65', '<', 65],
      ['age>=18', '>=', 18],
      ['age<=65', '<=', 65],
      ['client.name@=Иван', '@=', 'Иван'],
      ['client.name_=Ив', '_=', 'Ив'],
      ['client.name^=ов', '^=', 'ов'],
      ['client.name!@=bot', '!@=', 'bot'],
    ])('parses %s into AST condition', (filters, expectedOp, expectedValue) => {
      const ast = parser.parse({ filters }, config);

      expect(ast.filter).not.toBeNull();
      expect(ast.filter?.kind).toBe('condition');

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.operator).toBe(expectedOp);
        expect(ast.filter.value).toEqual(expectedValue);
      }
    });

    it('parses *= (in) operator', () => {
      const ast = parser.parse({ filters: 'status*=ACTIVE,PENDING' }, config);

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.operator).toBe('*=');
        expect(ast.filter.value).toEqual(['ACTIVE', 'PENDING']);
      }
    });

    it('parses !*= (not in) operator', () => {
      const ast = parser.parse({ filters: 'status!*=ACTIVE,PENDING' }, config);

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.operator).toBe('!*=');
        expect(ast.filter.value).toEqual(['ACTIVE', 'PENDING']);
      }
    });

    it('parses parenthesized IN values: *=(A,B)', () => {
      const ast = parser.parse(
        { filters: 'status*=(ACTIVE,PENDING)' },
        { allowedFields: { status: { type: 'string' } } },
      );

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toEqual(['ACTIVE', 'PENDING']);
      }
    });
  });

  describe('type coercion', () => {
    it('auto-coerces "true" and "false" to booleans', () => {
      const ast = parser.parse({ filters: 'isActive==true' }, { allowedFields: { isActive: {} } });

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe(true);
      }

      const ast2 = parser.parse(
        { filters: 'isActive==false' },
        { allowedFields: { isActive: {} } },
      );

      if (ast2.filter?.kind === 'condition') {
        expect(ast2.filter.value).toBe(false);
      }
    });

    it('auto-coerces numeric strings to numbers', () => {
      const ast = parser.parse({ filters: 'age==42' }, { allowedFields: { age: {} } });

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe(42);
      }
    });

    it('auto-coerces negative numbers', () => {
      const ast = parser.parse({ filters: 'score==-5' }, { allowedFields: { score: {} } });

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe(-5);
      }
    });

    it('auto-coerces decimal numbers', () => {
      const ast = parser.parse({ filters: 'score==3.14' }, { allowedFields: { score: {} } });

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe(3.14);
      }
    });

    it('auto-coerces "null" to null', () => {
      const ast = parser.parse(
        { filters: 'deletedAt==null' },
        { allowedFields: { deletedAt: {} } },
      );

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBeNull();
      }
    });

    it('auto-coerces "NULL" (case-insensitive) to null', () => {
      const ast = parser.parse(
        { filters: 'deletedAt==NULL' },
        { allowedFields: { deletedAt: {} } },
      );

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBeNull();
      }
    });

    it('escape \\null returns string "null" instead of null', () => {
      const ast = parser.parse(
        { filters: 'status==\\null' },
        { allowedFields: { status: { type: 'string' } } },
      );

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe('null');
      }
    });

    it('preserves strings for type=string', () => {
      const ast = parser.parse(
        { filters: 'status==123' },
        { allowedFields: { status: { type: 'string' } } },
      );

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe('123');
      }
    });

    it('parses explicit number type', () => {
      const ast = parser.parse({ filters: 'age==25' }, config);

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe(25);
      }
    });

    it('parses explicit boolean type', () => {
      const ast = parser.parse({ filters: 'isActive==true' }, config);

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe(true);
      }
    });

    it('parses explicit date type', () => {
      const ast = parser.parse({ filters: 'createdAt>=2026-05-01T00:00:00.000Z' }, config);

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toEqual(new Date('2026-05-01T00:00:00.000Z'));
      }
    });

    it('throws DynamicQueryValueError for invalid number', () => {
      expect(() => parser.parse({ filters: 'age==abc' }, config)).toThrow(DynamicQueryValueError);

      try {
        parser.parse({ filters: 'age==abc' }, config);
      } catch (error) {
        expect((error as DynamicQueryValueError).rawValue).toBe('abc');
        expect((error as DynamicQueryValueError).expectedType).toBe('number');
      }
    });

    it('throws DynamicQueryValueError for invalid boolean', () => {
      expect(() => parser.parse({ filters: 'isActive==maybe' }, config)).toThrow(
        DynamicQueryValueError,
      );
    });

    it('throws DynamicQueryValueError for invalid date', () => {
      expect(() => parser.parse({ filters: 'createdAt>=not-a-date' }, config)).toThrow(
        DynamicQueryValueError,
      );
    });

    it('keeps non-number non-boolean strings as strings in auto mode', () => {
      const ast = parser.parse({ filters: 'status==hello' }, { allowedFields: { status: {} } });

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe('hello');
      }
    });

    it('parses explicit boolean type with false value', () => {
      const ast = parser.parse({ filters: 'isActive==false' }, config);

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBe(false);
      }
    });

    it('parses null in number-typed field as null', () => {
      const ast = parser.parse({ filters: 'age==null' }, config);

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.value).toBeNull();
      }
    });
  });

  describe('field validation', () => {
    it('throws DynamicQueryFieldError for not whitelisted field', () => {
      try {
        parser.parse({ filters: 'unknown==1' }, config);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryFieldError);
        expect((error as DynamicQueryFieldError).field).toBe('unknown');
        expect((error as DynamicQueryFieldError).reason).toBe('not_whitelisted');
      }
    });

    it('throws DynamicQueryFieldError for unsafe path ($where)', () => {
      try {
        parser.parse({ filters: '$where==1' }, config);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryFieldError);
        expect((error as DynamicQueryFieldError).field).toBe('$where');
        expect((error as DynamicQueryFieldError).reason).toBe('unsafe_path');
      }
    });

    it('throws DynamicQueryFieldError for field with filterable=false', () => {
      try {
        parser.parse(
          { filters: 'secret==1' },
          { allowedFields: { secret: { filterable: false, type: 'number' } } },
        );
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryFieldError);
        expect((error as DynamicQueryFieldError).reason).toBe('not_filterable');
      }
    });

    it('throws DynamicQueryFieldError for sorting on sortable=false field', () => {
      try {
        parser.parse(
          { sorts: 'secret' },
          { allowedFields: { secret: { sortable: false, type: 'string' } } },
        );
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryFieldError);
        expect((error as DynamicQueryFieldError).reason).toBe('not_sortable');
      }
    });

    it('uses path alias when configured', () => {
      const ast = parser.parse(
        { filters: 'name==test' },
        { allowedFields: { name: { path: 'profile.displayName', type: 'string' } } },
      );

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.field.key).toBe('name');
        expect(ast.filter.field.path).toBe('profile.displayName');
      }
    });
  });

  describe('operator restriction', () => {
    it('throws DynamicQueryOperatorError for disallowed operator', () => {
      try {
        parser.parse({ filters: 'id@=abc' }, config);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryOperatorError);
        expect((error as DynamicQueryOperatorError).field).toBe('id');
        expect((error as DynamicQueryOperatorError).operator).toBe('@=');
      }
    });

    it('allows whitelisted operators', () => {
      expect(() => parser.parse({ filters: 'id==abc' }, config)).not.toThrow();
      expect(() => parser.parse({ filters: 'id!=abc' }, config)).not.toThrow();
    });
  });

  describe('complex filters', () => {
    it('parses AND conditions (,)', () => {
      const ast = parser.parse({ filters: 'status==ACTIVE,age>18' }, config);

      expect(ast.filter?.kind).toBe('group');

      if (ast.filter?.kind === 'group') {
        expect(ast.filter.operator).toBe('and');
        expect(ast.filter.children).toHaveLength(2);
      }
    });

    it('parses OR conditions (|)', () => {
      const ast = parser.parse({ filters: 'status==ACTIVE|status==PENDING' }, config);

      expect(ast.filter?.kind).toBe('group');

      if (ast.filter?.kind === 'group') {
        expect(ast.filter.operator).toBe('or');
        expect(ast.filter.children).toHaveLength(2);
      }
    });

    it('parses AND + OR combined', () => {
      const ast = parser.parse({ filters: 'status==ACTIVE,age>18|isActive==true' }, config);

      expect(ast.filter?.kind).toBe('group');

      if (ast.filter?.kind === 'group') {
        expect(ast.filter.operator).toBe('or');
        expect(ast.filter.children).toHaveLength(2);

        if (ast.filter.children[0]?.kind === 'group') {
          expect(ast.filter.children[0].operator).toBe('and');
          expect(ast.filter.children[0].children).toHaveLength(2);
        }
      }
    });

    it('parses nested relation paths', () => {
      const ast = parser.parse({ filters: 'client.name@=Иван' }, config);

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.field.path).toBe('client.name');
      }
    });

    it('unwraps single-child AND group', () => {
      const ast = parser.parse({ filters: 'status==ACTIVE' }, config);

      expect(ast.filter?.kind).toBe('condition');
    });

    it('unwraps single-child OR group', () => {
      const ast = parser.parse({ filters: 'status==ACTIVE' }, config);

      expect(ast.filter?.kind).toBe('condition');
    });
  });

  describe('sorts', () => {
    it('parses ascending sort', () => {
      const ast = parser.parse({ sorts: 'status' }, config);

      expect(ast.sorts).toHaveLength(1);
      expect(ast.sorts[0]?.direction).toBe('asc');
      expect(ast.sorts[0]?.field.key).toBe('status');
    });

    it('parses descending sort with - prefix', () => {
      const ast = parser.parse({ sorts: '-createdAt' }, config);

      expect(ast.sorts).toHaveLength(1);
      expect(ast.sorts[0]?.direction).toBe('desc');
      expect(ast.sorts[0]?.field.key).toBe('createdAt');
    });

    it('parses multiple sorts', () => {
      const ast = parser.parse({ sorts: '-createdAt,status' }, config);

      expect(ast.sorts).toHaveLength(2);
      expect(ast.sorts[0]?.direction).toBe('desc');
      expect(ast.sorts[1]?.direction).toBe('asc');
    });

    it('applies default sorts from config', () => {
      const ast = parser.parse({}, { ...config, defaultSorts: '-createdAt' });

      expect(ast.sorts).toHaveLength(1);
      expect(ast.sorts[0]?.direction).toBe('desc');
      expect(ast.sorts[0]?.field.key).toBe('createdAt');
    });

    it('query sorts override default sorts', () => {
      const ast = parser.parse({ sorts: 'status' }, { ...config, defaultSorts: '-createdAt' });

      expect(ast.sorts).toHaveLength(1);
      expect(ast.sorts[0]?.field.key).toBe('status');
    });

    it('returns empty sorts for empty string', () => {
      const ast = parser.parse({ sorts: '' }, config);

      expect(ast.sorts).toHaveLength(0);
    });

    it('returns empty sorts for whitespace-only string', () => {
      const ast = parser.parse({ sorts: '   ' }, config);

      expect(ast.sorts).toHaveLength(0);
    });

    it('propagates customSort to resolved field', () => {
      const ast = parser.parse(
        { sorts: 'relevance' },
        { allowedFields: { relevance: { customSort: 'byRelevance', sortable: true } } },
      );

      expect(ast.sorts[0]?.field.customSort).toBe('byRelevance');
    });
  });

  describe('custom filter AST', () => {
    it('propagates customFilter to resolved field', () => {
      const ast = parser.parse(
        { filters: 'search@=test' },
        { allowedFields: { search: { customFilter: 'fullText', type: 'string' } } },
      );

      if (ast.filter?.kind === 'condition') {
        expect(ast.filter.field.customFilter).toBe('fullText');
      }
    });
  });

  describe('safety limits', () => {
    it('throws DynamicQueryLimitError when filter string exceeds maxFilterLength', () => {
      const longFilter = `status==${'A'.repeat(100)}`;

      try {
        parser.parse({ filters: longFilter }, { ...config, maxFilterLength: 10 });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryLimitError);
        expect((error as DynamicQueryLimitError).limitName).toBe('maxFilterLength');
        expect((error as DynamicQueryLimitError).limit).toBe(10);
      }
    });

    it('allows filter string within maxFilterLength', () => {
      expect(() =>
        parser.parse({ filters: 'status==A' }, { ...config, maxFilterLength: 100 }),
      ).not.toThrow();
    });

    it('throws DynamicQueryLimitError when conditions exceed maxConditions', () => {
      const filters = Array.from({ length: 5 }, (_, i) => `status==${String(i)}`).join(',');

      try {
        parser.parse({ filters }, { ...config, maxConditions: 3 });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryLimitError);
        expect((error as DynamicQueryLimitError).limitName).toBe('maxConditions');
      }
    });

    it('allows conditions within maxConditions', () => {
      const filters = 'status==A,age>18';

      expect(() => parser.parse({ filters }, { ...config, maxConditions: 5 })).not.toThrow();
    });

    it('throws DynamicQueryLimitError when sorts exceed maxSorts', () => {
      try {
        parser.parse({ sorts: 'status,age,createdAt' }, { ...config, maxSorts: 2 });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryLimitError);
        expect((error as DynamicQueryLimitError).limitName).toBe('maxSorts');
        expect((error as DynamicQueryLimitError).limit).toBe(2);
      }
    });

    it('allows sorts within maxSorts', () => {
      expect(() => parser.parse({ sorts: 'status,age' }, { ...config, maxSorts: 5 })).not.toThrow();
    });

    it('uses default limits when not configured', () => {
      expect(() => parser.parse({}, config)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('returns null filter for empty filter string', () => {
      const ast = parser.parse({ filters: '' }, config);

      expect(ast.filter).toBeNull();
    });

    it('returns null filter for whitespace-only filter', () => {
      const ast = parser.parse({ filters: '   ' }, config);

      expect(ast.filter).toBeNull();
    });

    it('returns null filter when no filters given', () => {
      const ast = parser.parse({}, config);

      expect(ast.filter).toBeNull();
    });

    it('throws DynamicQueryParseError for expression without operator', () => {
      expect(() => parser.parse({ filters: 'justtext' }, config)).toThrow(DynamicQueryParseError);
    });

    it('throws DynamicQueryParseError for unclosed parenthesis', () => {
      expect(() => parser.parse({ filters: 'status*=(ACTIVE,PENDING' }, config)).toThrow(
        DynamicQueryParseError,
      );
    });

    it('throws DynamicQueryParseError for unexpected closing parenthesis', () => {
      expect(() => parser.parse({ filters: 'status*=ACTIVE)' }, config)).toThrow(
        DynamicQueryParseError,
      );
    });

    it('throws DynamicQueryValueError for empty IN value', () => {
      expect(() =>
        parser.parse({ filters: 'status*=()' }, { allowedFields: { status: { type: 'string' } } }),
      ).toThrow(DynamicQueryValueError);
    });

    it('produces ORM-neutral AST structure', () => {
      const ast = parser.parse(
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
});

/* ------------------------------------------------------------------ */
/*  MikroOrmDynamicQueryAdapter                                       */
/* ------------------------------------------------------------------ */

describe('MikroOrmDynamicQueryAdapter', () => {
  const parser = new DynamicQueryAstParser();

  it('compiles AST into MikroORM where/options', () => {
    const ast = parser.parse(
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

  it('compiles empty AST to empty where', () => {
    const ast = parser.parse({}, config);
    const result = new MikroOrmDynamicQueryAdapter<TestEntity>().compile(ast);

    expect(result.where).toEqual({});
    expect(result.options).toEqual({ limit: 25, offset: 0 });
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
    ['status==ACTIVE', { status: 'ACTIVE' }],
  ])('translates filter %s', (filters, expectedWhere) => {
    const ast = parser.parse({ filters }, config);
    const result = new MikroOrmDynamicQueryAdapter<TestEntity>().compile(ast);

    expect(result.where).toEqual(expectedWhere);
  });

  it('compiles complex AND+OR with nested paths', () => {
    const ast = parser.parse(
      {
        filters: 'status*=ACTIVE,PENDING,isActive==true|client.name@=Иван,branch.isActive==true',
        sorts: '-createdAt,client.name',
      },
      config,
    );
    const result = new MikroOrmDynamicQueryAdapter<TestEntity>().compile(ast);

    expect(result.where).toEqual({
      $or: [
        { $and: [{ status: { $in: ['ACTIVE', 'PENDING'] } }, { isActive: true }] },
        { $and: [{ client: { name: { $ilike: '%Иван%' } } }, { branch: { isActive: true } }] },
      ],
    });
    expect(result.options['orderBy']).toEqual([
      { createdAt: QueryOrder.DESC },
      { client: { name: QueryOrder.ASC } },
    ]);
  });

  it('compiles parenthesized IN and not-IN operators', () => {
    const ast = parser.parse(
      { filters: 'status*=(ACTIVE,PENDING),id!*=a,b' },
      { allowedFields: { id: { type: 'string' }, status: { type: 'string' } } },
    );
    const result = new MikroOrmDynamicQueryAdapter<TestEntity>().compile(ast);

    expect(result.where).toEqual({
      $and: [{ status: { $in: ['ACTIVE', 'PENDING'] } }, { id: { $nin: ['a', 'b'] } }],
    });
  });

  it('compiles date filter values', () => {
    const ast = parser.parse({ filters: 'createdAt>=2026-05-01T00:00:00.000Z' }, config);
    const result = new MikroOrmDynamicQueryAdapter<TestEntity>().compile(ast);

    expect(result.where).toEqual({
      createdAt: { $gte: new Date('2026-05-01T00:00:00.000Z') },
    });
  });

  describe('custom filters', () => {
    it('applies adapter-level custom filter', () => {
      const ast = parser.parse(
        { filters: 'search@=Иван' },
        { allowedFields: { search: { customFilter: 'clientSearch', type: 'string' } } },
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

    it('throws DynamicQueryCustomFilterError for unregistered custom filter', () => {
      const ast = parser.parse(
        { filters: 'search@=test' },
        { allowedFields: { search: { customFilter: 'missing', type: 'string' } } },
      );

      try {
        new MikroOrmDynamicQueryAdapter<TestEntity>().compile(ast);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DynamicQueryCustomFilterError);
        expect((error as DynamicQueryCustomFilterError).filterName).toBe('missing');
      }
    });
  });

  describe('custom sorts', () => {
    it('applies adapter-level custom sort', () => {
      const ast = parser.parse(
        { sorts: '-relevance' },
        { allowedFields: { relevance: { customSort: 'byRelevance', sortable: true } } },
      );
      const result = new MikroOrmDynamicQueryAdapter<TestEntity>({
        customSorts: {
          byRelevance: ({ direction }) => ({
            rank: direction === 'desc' ? QueryOrder.DESC : QueryOrder.ASC,
          }),
        },
      }).compile(ast);

      expect(result.options['orderBy']).toEqual([{ rank: QueryOrder.DESC }]);
    });

    it('throws DynamicQueryParseError for unregistered custom sort', () => {
      const ast = parser.parse(
        { sorts: 'relevance' },
        { allowedFields: { relevance: { customSort: 'missing', sortable: true } } },
      );

      expect(() => new MikroOrmDynamicQueryAdapter<TestEntity>().compile(ast)).toThrow(
        DynamicQueryParseError,
      );
    });
  });
});

/* ------------------------------------------------------------------ */
/*  MikroOrmDynamicQueryCompiler                                      */
/* ------------------------------------------------------------------ */

describe('MikroOrmDynamicQueryCompiler', () => {
  const compiler = new MikroOrmDynamicQueryCompiler<TestEntity>();

  it('composes AST parser and MikroORM adapter behind a single API', () => {
    const result = compiler.compile({ filters: 'branch.isActive==true' }, config);

    expect(result.where).toEqual({ branch: { isActive: true } });
  });

  it('builds pagination defaults', () => {
    const result = compiler.compile({}, config);

    expect(result).toEqual({
      options: { limit: 25, offset: 0 },
      page: 1,
      pageSize: 25,
      where: {},
    });
  });

  it('applies custom filters through the compiler', () => {
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
      { allowedFields: { search: { customFilter: 'clientSearch', type: 'string' } } },
    );

    expect(result.where).toEqual({
      $or: [{ fullName: { $ilike: '%Иван%' } }, { phone: { $ilike: '%Иван%' } }],
    });
  });

  it('rejects string operators on non-string values at adapter level', () => {
    expect(() => compiler.compile({ filters: 'age@=18' }, config)).toThrow(DynamicQueryParseError);
  });

  it('rejects fields not in whitelist', () => {
    expect(() => compiler.compile({ filters: 'unknown==1' }, config)).toThrow(
      DynamicQueryFieldError,
    );
  });

  it('rejects unsafe field paths', () => {
    expect(() => compiler.compile({ filters: '$where==1' }, config)).toThrow(
      DynamicQueryFieldError,
    );
  });

  it('rejects disallowed operators on restricted fields', () => {
    expect(() => compiler.compile({ filters: 'id@=abc' }, config)).toThrow(
      DynamicQueryOperatorError,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  DynamicQueryDto                                                   */
/* ------------------------------------------------------------------ */

describe('DynamicQueryDto', () => {
  it('validates max page size', async () => {
    const dto = plainToInstance(DynamicQueryDto, { page: '1', pageSize: '101' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('pageSize');
  });

  it('accepts valid values', async () => {
    const dto = plainToInstance(DynamicQueryDto, { page: '1', pageSize: '25' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts optional fields', async () => {
    const dto = plainToInstance(DynamicQueryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects page=0', async () => {
    const dto = plainToInstance(DynamicQueryDto, { page: '0' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('page');
  });

  it('rejects pageSize=0', async () => {
    const dto = plainToInstance(DynamicQueryDto, { pageSize: '0' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('pageSize');
  });

  it('rejects non-integer page', async () => {
    const dto = plainToInstance(DynamicQueryDto, { page: 'abc' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
  });
});

/* ------------------------------------------------------------------ */
/*  createPaginatedResponse                                           */
/* ------------------------------------------------------------------ */

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

  it('handles zero items', () => {
    expect(createPaginatedResponse([], 0, 1, 25)).toEqual({
      items: [],
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 0,
    });
  });

  it('calculates totalPages with ceiling division', () => {
    const response = createPaginatedResponse([], 1, 1, 25);

    expect(response.totalPages).toBe(1);
  });

  it('handles exact page boundary', () => {
    const response = createPaginatedResponse([], 50, 1, 25);

    expect(response.totalPages).toBe(2);
  });
});
