import {
  BOOLEAN_OPERATORS,
  DATE_OPERATORS,
  NUMBER_OPERATORS,
  STRING_EQUALITY_OPERATORS,
  STRING_SEARCH_OPERATORS,
} from './operators';

import type {
  DynamicQueryFieldConfig,
  DynamicQueryOperator,
  DynamicQueryParserConfig,
  DynamicQueryValueType,
} from './dynamic-query.types';
import type {
  QueryCapabilitiesDto,
  QueryFilterCapabilityDto,
  QuerySortCapabilityDto,
} from '../dto/query-capabilities.dto';

export interface QueryConfig {
  readonly capabilities: QueryCapabilitiesDto;
  readonly parserConfig: DynamicQueryParserConfig;
}

interface FieldDefinition {
  readonly field: string;
  readonly filterable: boolean;
  readonly labelKey: string;
  readonly operators: readonly DynamicQueryOperator[];
  readonly path?: string;
  readonly sortable: boolean;
  readonly type: DynamicQueryValueType;
}

export class FieldBuilder {
  private _type: DynamicQueryValueType = 'auto';
  private _filterable = false;
  private _sortable = false;
  private _operators: readonly DynamicQueryOperator[] | undefined;
  private _labelKey = '';
  private _path: string | undefined;

  constructor(
    private readonly _parent: QueryConfigBuilder,
    private readonly _name: string,
  ) {}

  string(): this {
    this._type = 'string';
    this._operators ??= STRING_EQUALITY_OPERATORS;
    return this;
  }

  number(): this {
    this._type = 'number';
    this._operators ??= NUMBER_OPERATORS;
    return this;
  }

  boolean(): this {
    this._type = 'boolean';
    this._operators ??= BOOLEAN_OPERATORS;
    return this;
  }

  date(): this {
    this._type = 'date';
    this._operators ??= DATE_OPERATORS;
    return this;
  }

  filterable(): this {
    this._filterable = true;
    return this;
  }

  sortable(): this {
    this._sortable = true;
    return this;
  }

  labelKey(key: string): this {
    this._labelKey = key;
    return this;
  }

  path(path: string): this {
    this._path = path;
    return this;
  }

  operators(ops: readonly DynamicQueryOperator[]): this {
    this._operators = ops;
    return this;
  }

  searchOperators(): this {
    this._operators = STRING_SEARCH_OPERATORS;
    return this;
  }

  equalityOperators(): this {
    this._operators = STRING_EQUALITY_OPERATORS;
    return this;
  }

  field(name: string): FieldBuilder {
    this._finalize();
    return this._parent.field(name);
  }

  defaultPageSize(size: number): QueryConfigBuilder {
    this._finalize();
    return this._parent.defaultPageSize(size);
  }

  defaultSorts(sorts: string): QueryConfigBuilder {
    this._finalize();
    return this._parent.defaultSorts(sorts);
  }

  maxPageSize(size: number): QueryConfigBuilder {
    this._finalize();
    return this._parent.maxPageSize(size);
  }

  maxConditions(max: number): QueryConfigBuilder {
    this._finalize();
    return this._parent.maxConditions(max);
  }

  maxSorts(max: number): QueryConfigBuilder {
    this._finalize();
    return this._parent.maxSorts(max);
  }

  maxFilterLength(max: number): QueryConfigBuilder {
    this._finalize();
    return this._parent.maxFilterLength(max);
  }

  build(): QueryConfig {
    this._finalize();
    return this._parent.build();
  }

  private _finalize(): void {
    this._parent.addField({
      field: this._name,
      filterable: this._filterable,
      labelKey: this._labelKey,
      operators: this._operators ?? [],
      path: this._path,
      sortable: this._sortable,
      type: this._type,
    });
  }
}

export class QueryConfigBuilder {
  private readonly _fields: FieldDefinition[] = [];
  private _defaultPageSize = 25;
  private _maxPageSize = 100;
  private _defaultSorts = '';
  private _maxConditions = 20;
  private _maxSorts = 10;
  private _maxFilterLength = 2000;

  field(name: string): FieldBuilder {
    return new FieldBuilder(this, name);
  }

  defaultPageSize(size: number): this {
    this._defaultPageSize = size;
    return this;
  }

  maxPageSize(size: number): this {
    this._maxPageSize = size;
    return this;
  }

  defaultSorts(sorts: string): this {
    this._defaultSorts = sorts;
    return this;
  }

  maxConditions(max: number): this {
    this._maxConditions = max;
    return this;
  }

  maxSorts(max: number): this {
    this._maxSorts = max;
    return this;
  }

  maxFilterLength(max: number): this {
    this._maxFilterLength = max;
    return this;
  }

  addField(definition: FieldDefinition): void {
    this._fields.push(definition);
  }

  build(): QueryConfig {
    const allowedFields: Record<string, DynamicQueryFieldConfig> = {};

    for (const field of this._fields) {
      allowedFields[field.field] = {
        filterable: field.filterable,
        operators: field.operators,
        path: field.path,
        sortable: field.sortable,
        type: field.type,
      };
    }

    const parserConfig: DynamicQueryParserConfig = {
      allowedFields,
      defaultPageSize: this._defaultPageSize,
      defaultSorts: this._defaultSorts || undefined,
      maxConditions: this._maxConditions,
      maxFilterLength: this._maxFilterLength,
      maxPageSize: this._maxPageSize,
      maxSorts: this._maxSorts,
    };

    const filters: QueryFilterCapabilityDto[] = this._fields
      .filter((f) => f.filterable)
      .map((f) => ({
        field: f.field,
        labelKey: f.labelKey,
        operators: f.operators,
        type: f.type,
      }));

    const sorts: QuerySortCapabilityDto[] = this._fields
      .filter((f) => f.sortable)
      .map((f) => ({
        field: f.field,
        labelKey: f.labelKey,
      }));

    const capabilities: QueryCapabilitiesDto = {
      defaultPageSize: this._defaultPageSize,
      defaultSorts: this._defaultSorts,
      filters,
      maxPageSize: this._maxPageSize,
      sorts,
    };

    return { capabilities, parserConfig };
  }
}

export function queryConfig(): QueryConfigBuilder {
  return new QueryConfigBuilder();
}
