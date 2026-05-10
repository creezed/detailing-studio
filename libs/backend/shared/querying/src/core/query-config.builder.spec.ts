import {
  BOOLEAN_OPERATORS,
  DATE_OPERATORS,
  NUMBER_OPERATORS,
  STRING_EQUALITY_OPERATORS,
  STRING_SEARCH_OPERATORS,
} from './operators';
import { QueryConfigBuilder, queryConfig } from './query-config.builder';

describe('QueryConfigBuilder', () => {
  it('builds minimal config with defaults', () => {
    const result = queryConfig().build();

    expect(result.parserConfig.allowedFields).toEqual({});
    expect(result.parserConfig.defaultPageSize).toBe(25);
    expect(result.parserConfig.maxPageSize).toBe(100);
    expect(result.parserConfig.maxConditions).toBe(20);
    expect(result.parserConfig.maxSorts).toBe(10);
    expect(result.parserConfig.maxFilterLength).toBe(2000);
    expect(result.capabilities.filters).toEqual([]);
    expect(result.capabilities.sorts).toEqual([]);
  });

  it('builds config with pagination overrides', () => {
    const result = queryConfig()
      .defaultPageSize(10)
      .maxPageSize(50)
      .defaultSorts('-createdAt')
      .maxConditions(5)
      .maxSorts(3)
      .maxFilterLength(500)
      .build();

    expect(result.parserConfig.defaultPageSize).toBe(10);
    expect(result.parserConfig.maxPageSize).toBe(50);
    expect(result.parserConfig.defaultSorts).toBe('-createdAt');
    expect(result.parserConfig.maxConditions).toBe(5);
    expect(result.parserConfig.maxSorts).toBe(3);
    expect(result.parserConfig.maxFilterLength).toBe(500);
    expect(result.capabilities.defaultPageSize).toBe(10);
    expect(result.capabilities.maxPageSize).toBe(50);
    expect(result.capabilities.defaultSorts).toBe('-createdAt');
  });

  it('adds string field with default equality operators', () => {
    const result = queryConfig().field('id').string().filterable().labelKey('fields.id').build();

    expect(result.parserConfig.allowedFields['id']).toEqual({
      filterable: true,
      operators: STRING_EQUALITY_OPERATORS,
      path: undefined,
      sortable: false,
      type: 'string',
    });
    expect(result.capabilities.filters).toEqual([
      { field: 'id', labelKey: 'fields.id', operators: STRING_EQUALITY_OPERATORS, type: 'string' },
    ]);
    expect(result.capabilities.sorts).toEqual([]);
  });

  it('adds string field with search operators', () => {
    const result = queryConfig()
      .field('name')
      .string()
      .searchOperators()
      .filterable()
      .sortable()
      .labelKey('fields.name')
      .build();

    expect(result.parserConfig.allowedFields['name']).toEqual({
      filterable: true,
      operators: STRING_SEARCH_OPERATORS,
      path: undefined,
      sortable: true,
      type: 'string',
    });
    expect(result.capabilities.filters).toHaveLength(1);
    expect(result.capabilities.filters[0]?.operators).toEqual(STRING_SEARCH_OPERATORS);
    expect(result.capabilities.sorts).toEqual([{ field: 'name', labelKey: 'fields.name' }]);
  });

  it('adds number field with default operators', () => {
    const result = queryConfig()
      .field('age')
      .number()
      .filterable()
      .sortable()
      .labelKey('fields.age')
      .build();

    expect(result.parserConfig.allowedFields['age']?.operators).toEqual(NUMBER_OPERATORS);
    expect(result.parserConfig.allowedFields['age']?.type).toBe('number');
  });

  it('adds boolean field with default operators', () => {
    const result = queryConfig()
      .field('isActive')
      .boolean()
      .filterable()
      .labelKey('fields.isActive')
      .build();

    expect(result.parserConfig.allowedFields['isActive']?.operators).toEqual(BOOLEAN_OPERATORS);
    expect(result.parserConfig.allowedFields['isActive']?.type).toBe('boolean');
  });

  it('adds date field with default operators', () => {
    const result = queryConfig()
      .field('createdAt')
      .date()
      .filterable()
      .sortable()
      .labelKey('fields.createdAt')
      .build();

    expect(result.parserConfig.allowedFields['createdAt']?.operators).toEqual(DATE_OPERATORS);
    expect(result.parserConfig.allowedFields['createdAt']?.type).toBe('date');
  });

  it('allows custom operators override', () => {
    const custom = ['==', '!='] as const;
    const result = queryConfig()
      .field('status')
      .string()
      .operators(custom)
      .filterable()
      .labelKey('fields.status')
      .build();

    expect(result.parserConfig.allowedFields['status']?.operators).toEqual(custom);
  });

  it('supports path alias', () => {
    const result = queryConfig()
      .field('clientName')
      .string()
      .searchOperators()
      .filterable()
      .path('client.name')
      .labelKey('fields.clientName')
      .build();

    expect(result.parserConfig.allowedFields['clientName']?.path).toBe('client.name');
  });

  it('chains multiple fields via field()', () => {
    const result = queryConfig()
      .field('id')
      .string()
      .filterable()
      .labelKey('fields.id')
      .field('name')
      .string()
      .searchOperators()
      .filterable()
      .sortable()
      .labelKey('fields.name')
      .field('isActive')
      .boolean()
      .filterable()
      .labelKey('fields.isActive')
      .build();

    expect(Object.keys(result.parserConfig.allowedFields)).toEqual(['id', 'name', 'isActive']);
    expect(result.capabilities.filters).toHaveLength(3);
    expect(result.capabilities.sorts).toHaveLength(1);
  });

  it('chains pagination via field builder methods', () => {
    const result = queryConfig()
      .field('name')
      .string()
      .filterable()
      .sortable()
      .labelKey('fields.name')
      .defaultPageSize(10)
      .maxPageSize(50)
      .defaultSorts('-name')
      .build();

    expect(result.parserConfig.defaultPageSize).toBe(10);
    expect(result.parserConfig.maxPageSize).toBe(50);
    expect(result.parserConfig.defaultSorts).toBe('-name');
    expect(Object.keys(result.parserConfig.allowedFields)).toEqual(['name']);
  });

  it('excludes non-filterable fields from capabilities filters', () => {
    const result = queryConfig().field('id').string().sortable().labelKey('fields.id').build();

    expect(result.capabilities.filters).toEqual([]);
    expect(result.capabilities.sorts).toHaveLength(1);
  });

  it('excludes non-sortable fields from capabilities sorts', () => {
    const result = queryConfig().field('id').string().filterable().labelKey('fields.id').build();

    expect(result.capabilities.sorts).toEqual([]);
    expect(result.capabilities.filters).toHaveLength(1);
  });

  it('queryConfig() factory returns a fresh builder', () => {
    const b1 = queryConfig();
    const b2 = queryConfig();

    expect(b1).toBeInstanceOf(QueryConfigBuilder);
    expect(b1).not.toBe(b2);
  });

  it('type method does not override explicitly set operators', () => {
    const custom = ['=='] as const;
    const result = queryConfig()
      .field('x')
      .operators(custom)
      .string()
      .filterable()
      .labelKey('fields.x')
      .build();

    expect(result.parserConfig.allowedFields['x']?.operators).toEqual(custom);
  });
});
