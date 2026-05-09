export const DEFAULT_DYNAMIC_QUERY_PAGE = 1;
export const DEFAULT_DYNAMIC_QUERY_PAGE_SIZE = 25;
export const DYNAMIC_QUERY_MAX_PAGE_SIZE = 100;

export type DynamicQueryOperator =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | '@='
  | '_='
  | '^='
  | '!@='
  | '*='
  | '!*=';

export type DynamicQueryValueType = 'auto' | 'boolean' | 'date' | 'number' | 'string';
export type DynamicQuerySortDirection = 'asc' | 'desc';
export type DynamicQueryLogicalOperator = 'and' | 'or';
export type DynamicQueryScalarValue = boolean | Date | null | number | string;
export type DynamicQueryConditionValue =
  | DynamicQueryScalarValue
  | readonly DynamicQueryScalarValue[];

export interface DynamicQueryFieldConfig {
  readonly customFilter?: string;
  readonly customSort?: string;
  readonly filterable?: boolean;
  readonly operators?: readonly DynamicQueryOperator[];
  readonly path?: string;
  readonly sortable?: boolean;
  readonly type?: DynamicQueryValueType;
}

export interface DynamicQueryParserConfig {
  readonly allowedFields: Readonly<Record<string, DynamicQueryFieldConfig>>;
  readonly defaultPage?: number;
  readonly defaultPageSize?: number;
  readonly defaultSorts?: string;
  readonly maxConditions?: number;
  readonly maxFilterLength?: number;
  readonly maxPageSize?: number;
  readonly maxSorts?: number;
}

export interface DynamicQueryRequest {
  readonly filters?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly sorts?: string;
}

export interface DynamicQueryResolvedField {
  readonly customFilter?: string;
  readonly customSort?: string;
  readonly key: string;
  readonly path: string;
  readonly type: DynamicQueryValueType;
}

export interface DynamicQueryConditionNode {
  readonly field: DynamicQueryResolvedField;
  readonly kind: 'condition';
  readonly operator: DynamicQueryOperator;
  readonly rawValue: string;
  readonly value: DynamicQueryConditionValue;
}

export interface DynamicQueryGroupNode {
  readonly children: readonly DynamicQueryFilterNode[];
  readonly kind: 'group';
  readonly operator: DynamicQueryLogicalOperator;
}

export type DynamicQueryFilterNode = DynamicQueryConditionNode | DynamicQueryGroupNode;

export interface DynamicQuerySortNode {
  readonly direction: DynamicQuerySortDirection;
  readonly field: DynamicQueryResolvedField;
}

export interface DynamicQueryAst {
  readonly filter: DynamicQueryFilterNode | null;
  readonly page: number;
  readonly pageSize: number;
  readonly sorts: readonly DynamicQuerySortNode[];
}

export interface DynamicQueryRequestContext {
  readonly config: DynamicQueryParserConfig;
  readonly query: DynamicQueryRequest;
}

export type DynamicQueryAstParserResult = DynamicQueryAst;
