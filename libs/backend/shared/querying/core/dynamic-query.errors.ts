import type { DynamicQueryOperator, DynamicQueryValueType } from './dynamic-query.types';

export class DynamicQueryError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class DynamicQueryParseError extends DynamicQueryError {
  constructor(message: string) {
    super(message, 'DYNAMIC_QUERY_PARSE_ERROR');
  }
}

export type DynamicQueryFieldErrorReason =
  | 'not_filterable'
  | 'not_sortable'
  | 'not_whitelisted'
  | 'unsafe_path';

export class DynamicQueryFieldError extends DynamicQueryError {
  readonly field: string;
  readonly reason: DynamicQueryFieldErrorReason;

  constructor(field: string, reason: DynamicQueryFieldErrorReason, message: string) {
    super(message, 'DYNAMIC_QUERY_FIELD_ERROR');
    this.field = field;
    this.reason = reason;
  }
}

export class DynamicQueryOperatorError extends DynamicQueryError {
  readonly field: string;
  readonly operator: DynamicQueryOperator;

  constructor(field: string, operator: DynamicQueryOperator, message: string) {
    super(message, 'DYNAMIC_QUERY_OPERATOR_ERROR');
    this.field = field;
    this.operator = operator;
  }
}

export class DynamicQueryValueError extends DynamicQueryError {
  readonly expectedType: DynamicQueryValueType;
  readonly field: string | null;
  readonly rawValue: string;

  constructor(
    rawValue: string,
    expectedType: DynamicQueryValueType,
    message: string,
    field?: string,
  ) {
    super(message, 'DYNAMIC_QUERY_VALUE_ERROR');
    this.rawValue = rawValue;
    this.expectedType = expectedType;
    this.field = field ?? null;
  }
}

export class DynamicQueryPaginationError extends DynamicQueryError {
  readonly parameter: string;
  readonly value: number | undefined;

  constructor(parameter: string, value: number | undefined, message: string) {
    super(message, 'DYNAMIC_QUERY_PAGINATION_ERROR');
    this.parameter = parameter;
    this.value = value;
  }
}

export class DynamicQueryCustomFilterError extends DynamicQueryError {
  readonly filterName: string;

  constructor(filterName: string, message: string) {
    super(message, 'DYNAMIC_QUERY_CUSTOM_FILTER_ERROR');
    this.filterName = filterName;
  }
}

export class DynamicQueryLimitError extends DynamicQueryError {
  readonly limit: number;
  readonly limitName: string;

  constructor(limitName: string, limit: number, message: string) {
    super(message, 'DYNAMIC_QUERY_LIMIT_ERROR');
    this.limitName = limitName;
    this.limit = limit;
  }
}
