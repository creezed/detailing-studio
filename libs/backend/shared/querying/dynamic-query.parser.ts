import { QueryOrder } from '@mikro-orm/core';

import { DYNAMIC_QUERY_MAX_PAGE_SIZE, type DynamicQueryDto } from './dynamic-query.dto';

import type { FilterQuery, FindOptions } from '@mikro-orm/core';

export const DEFAULT_DYNAMIC_QUERY_PAGE = 1;
export const DEFAULT_DYNAMIC_QUERY_PAGE_SIZE = 25;

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

export interface DynamicQueryFieldConfig {
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
  readonly maxPageSize?: number;
}

export interface DynamicQueryParserResult<T extends object> {
  readonly options: FindOptions<T>;
  readonly page: number;
  readonly pageSize: number;
  readonly where: FilterQuery<T>;
}

interface OperatorDefinition {
  readonly token: DynamicQueryOperator;
}

interface ParsedOperator {
  readonly index: number;
  readonly token: DynamicQueryOperator;
}

interface ResolvedFieldConfig {
  readonly config: DynamicQueryFieldConfig;
  readonly path: string;
}

export class DynamicQueryParseError extends Error {
  readonly code = 'DYNAMIC_QUERY_PARSE_ERROR';

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

const OPERATOR_DEFINITIONS: readonly OperatorDefinition[] = [
  { token: '!*=' },
  { token: '!@=' },
  { token: '>=' },
  { token: '<=' },
  { token: '==' },
  { token: '!=' },
  { token: '@=' },
  { token: '_=' },
  { token: '^=' },
  { token: '*=' },
  { token: '>' },
  { token: '<' },
];

const SAFE_FIELD_PATH_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*$/;
const NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export class DynamicQueryParser {
  parse<T extends object>(
    query: DynamicQueryDto,
    config: DynamicQueryParserConfig,
  ): DynamicQueryParserResult<T> {
    const maxPageSize = this.resolveMaxPageSize(config.maxPageSize);
    const page = this.normalizePositiveInteger(
      query.page,
      config.defaultPage ?? DEFAULT_DYNAMIC_QUERY_PAGE,
      'page',
    );
    const pageSize = this.normalizePageSize(
      query.pageSize,
      config.defaultPageSize ?? DEFAULT_DYNAMIC_QUERY_PAGE_SIZE,
      maxPageSize,
    );
    const rawWhere = this.parseFilters(query.filters, config);
    const rawOptions = this.buildOptions(
      query.sorts ?? config.defaultSorts,
      config,
      page,
      pageSize,
    );

    if (!isFilterQuery<T>(rawWhere)) {
      throw new DynamicQueryParseError('Unable to build MikroORM filter query.');
    }

    if (!isFindOptions<T>(rawOptions)) {
      throw new DynamicQueryParseError('Unable to build MikroORM find options.');
    }

    return {
      options: rawOptions,
      page,
      pageSize,
      where: rawWhere,
    };
  }

  private buildOptions(
    sorts: string | undefined,
    config: DynamicQueryParserConfig,
    page: number,
    pageSize: number,
  ): Record<string, unknown> {
    const options: Record<string, unknown> = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
    const orderBy = this.parseSorts(sorts, config);

    if (orderBy.length > 0) {
      options['orderBy'] = orderBy;
    }

    return options;
  }

  private buildPathObject(path: string, value: unknown): Record<string, unknown> {
    const parts = path.split('.');
    const result: Record<string, unknown> = {};
    let current = result;

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];

      if (part === undefined) {
        throw new DynamicQueryParseError(`Invalid field path "${path}".`);
      }

      if (index === parts.length - 1) {
        current[part] = value;
        continue;
      }

      const next: Record<string, unknown> = {};
      current[part] = next;
      current = next;
    }

    return result;
  }

  private ensureSafeFieldPath(field: string): void {
    if (!SAFE_FIELD_PATH_PATTERN.test(field)) {
      throw new DynamicQueryParseError(`Field "${field}" is not allowed.`);
    }
  }

  private findOperator(expression: string): ParsedOperator | null {
    for (const definition of OPERATOR_DEFINITIONS) {
      const index = expression.indexOf(definition.token);

      if (index > 0) {
        return { index, token: definition.token };
      }
    }

    return null;
  }

  private normalizePageSize(
    value: number | undefined,
    defaultValue: number,
    maxPageSize: number,
  ): number {
    const pageSize = this.normalizePositiveInteger(value, defaultValue, 'pageSize');

    if (pageSize > maxPageSize) {
      throw new DynamicQueryParseError(
        `pageSize must be less than or equal to ${String(maxPageSize)}.`,
      );
    }

    return pageSize;
  }

  private normalizePositiveInteger(
    value: number | undefined,
    defaultValue: number,
    field: string,
  ): number {
    const normalized = value ?? defaultValue;

    if (!Number.isInteger(normalized) || normalized < 1) {
      throw new DynamicQueryParseError(`${field} must be a positive integer.`);
    }

    return normalized;
  }

  private parseAndGroup(group: string, config: DynamicQueryParserConfig): Record<string, unknown> {
    const expressions = this.splitAndExpressions(group);
    const conditions = expressions.map((expression) =>
      this.parseFilterExpression(expression, config),
    );

    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      const condition = conditions[0];

      if (condition === undefined) {
        return {};
      }

      return condition;
    }

    return { $and: conditions };
  }

  private parseFilterExpression(
    expression: string,
    config: DynamicQueryParserConfig,
  ): Record<string, unknown> {
    const parsedOperator = this.findOperator(expression);

    if (!parsedOperator) {
      throw new DynamicQueryParseError(
        `Filter expression "${expression}" has no supported operator.`,
      );
    }

    const field = expression.slice(0, parsedOperator.index).trim();
    const rawValue = expression.slice(parsedOperator.index + parsedOperator.token.length).trim();
    const resolvedField = this.resolveField(field, 'filter', config);

    this.ensureOperatorAllowed(field, parsedOperator.token, resolvedField.config);

    const condition = this.toMikroCondition(
      rawValue,
      parsedOperator.token,
      resolvedField.config.type ?? 'auto',
    );

    return this.buildPathObject(resolvedField.path, condition);
  }

  private parseFilters(
    filters: string | undefined,
    config: DynamicQueryParserConfig,
  ): Record<string, unknown> {
    if (!filters || filters.trim().length === 0) {
      return {};
    }

    const groups = splitTopLevel(filters, '|')
      .map((group) => group.trim())
      .filter(Boolean);
    const parsedGroups = groups.map((group) => this.parseAndGroup(group, config));

    if (parsedGroups.length === 0) {
      return {};
    }

    if (parsedGroups.length === 1) {
      const group = parsedGroups[0];

      if (group === undefined) {
        return {};
      }

      return group;
    }

    return { $or: parsedGroups };
  }

  private parseListValue(rawValue: string, type: DynamicQueryValueType): readonly unknown[] {
    const trimmed = rawValue.trim();
    const normalized =
      trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed.slice(1, -1) : trimmed;
    const values = splitTopLevel(normalized, ',').map((value) => value.trim());

    if (values.length === 0 || values.some((value) => value.length === 0)) {
      throw new DynamicQueryParseError('Array filter value must contain at least one item.');
    }

    return values.map((value) => this.parseScalarValue(value, type));
  }

  private parseScalarValue(rawValue: string, type: DynamicQueryValueType): unknown {
    const normalized = rawValue.trim();
    const lower = normalized.toLowerCase();

    if (lower === 'null') {
      return null;
    }

    if (type === 'string') {
      return normalized;
    }

    if (type === 'number') {
      return parseNumberValue(normalized);
    }

    if (type === 'boolean') {
      return parseBooleanValue(normalized);
    }

    if (type === 'date') {
      return parseDateValue(normalized);
    }

    if (lower === 'true' || lower === 'false') {
      return lower === 'true';
    }

    if (NUMBER_PATTERN.test(normalized)) {
      return parseNumberValue(normalized);
    }

    return normalized;
  }

  private parseSorts(
    sorts: string | undefined,
    config: DynamicQueryParserConfig,
  ): readonly Record<string, unknown>[] {
    if (!sorts || sorts.trim().length === 0) {
      return [];
    }

    return splitTopLevel(sorts, ',')
      .map((sort) => sort.trim())
      .filter(Boolean)
      .map((sort) => {
        const descending = sort.startsWith('-');
        const field = descending ? sort.slice(1).trim() : sort;
        const resolvedField = this.resolveField(field, 'sort', config);

        return this.buildPathObject(
          resolvedField.path,
          descending ? QueryOrder.DESC : QueryOrder.ASC,
        );
      });
  }

  private resolveField(
    field: string,
    usage: 'filter' | 'sort',
    config: DynamicQueryParserConfig,
  ): ResolvedFieldConfig {
    this.ensureSafeFieldPath(field);

    const fieldConfig = config.allowedFields[field];

    if (!fieldConfig) {
      throw new DynamicQueryParseError(`Field "${field}" is not whitelisted.`);
    }

    if (usage === 'filter' && fieldConfig.filterable === false) {
      throw new DynamicQueryParseError(`Field "${field}" is not filterable.`);
    }

    if (usage === 'sort' && fieldConfig.sortable === false) {
      throw new DynamicQueryParseError(`Field "${field}" is not sortable.`);
    }

    const path = fieldConfig.path ?? field;
    this.ensureSafeFieldPath(path);

    return { config: fieldConfig, path };
  }

  private resolveMaxPageSize(maxPageSize: number | undefined): number {
    const resolved = maxPageSize ?? DYNAMIC_QUERY_MAX_PAGE_SIZE;

    if (!Number.isInteger(resolved) || resolved < 1) {
      throw new DynamicQueryParseError('maxPageSize must be a positive integer.');
    }

    return resolved;
  }

  private splitAndExpressions(group: string): readonly string[] {
    const parts = splitTopLevel(group, ',')
      .map((part) => part.trim())
      .filter(Boolean);
    const expressions: string[] = [];

    for (const part of parts) {
      if (this.findOperator(part) || expressions.length === 0) {
        expressions.push(part);
        continue;
      }

      const previous = expressions.pop();

      if (previous === undefined) {
        expressions.push(part);
        continue;
      }

      expressions.push(`${previous},${part}`);
    }

    return expressions;
  }

  private toMikroCondition(
    rawValue: string,
    operator: DynamicQueryOperator,
    type: DynamicQueryValueType,
  ): unknown {
    if (operator === '*=') {
      return { $in: this.parseListValue(rawValue, type) };
    }

    if (operator === '!*=') {
      return { $nin: this.parseListValue(rawValue, type) };
    }

    const value = this.parseScalarValue(rawValue, type);

    if (operator === '==') {
      return value;
    }

    if (operator === '!=') {
      return { $ne: value };
    }

    if (operator === '>') {
      return { $gt: value };
    }

    if (operator === '<') {
      return { $lt: value };
    }

    if (operator === '>=') {
      return { $gte: value };
    }

    if (operator === '<=') {
      return { $lte: value };
    }

    if (operator === '@=') {
      return { $ilike: `%${stringOperatorValue(value, operator)}%` };
    }

    if (operator === '_=') {
      return { $ilike: `${stringOperatorValue(value, operator)}%` };
    }

    if (operator === '^=') {
      return { $ilike: `%${stringOperatorValue(value, operator)}` };
    }

    return { $not: { $ilike: `%${stringOperatorValue(value, operator)}%` } };
  }

  private ensureOperatorAllowed(
    field: string,
    operator: DynamicQueryOperator,
    config: DynamicQueryFieldConfig,
  ): void {
    if (config.operators && !config.operators.includes(operator)) {
      throw new DynamicQueryParseError(
        `Operator "${operator}" is not allowed for field "${field}".`,
      );
    }
  }
}

function isFilterQuery<T extends object>(value: unknown): value is FilterQuery<T> {
  return isRecord(value);
}

function isFindOptions<T extends object>(value: unknown): value is FindOptions<T> {
  return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBooleanValue(value: string): boolean {
  const lower = value.toLowerCase();

  if (lower === 'true') {
    return true;
  }

  if (lower === 'false') {
    return false;
  }

  throw new DynamicQueryParseError(`Value "${value}" is not a boolean.`);
}

function parseDateValue(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new DynamicQueryParseError(`Value "${value}" is not a valid date.`);
  }

  return date;
}

function parseNumberValue(value: string): number {
  if (!NUMBER_PATTERN.test(value)) {
    throw new DynamicQueryParseError(`Value "${value}" is not a number.`);
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new DynamicQueryParseError(`Value "${value}" is not a finite number.`);
  }

  return parsed;
}

function splitTopLevel(input: string, delimiter: ',' | '|'): readonly string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of input) {
    if (char === '(') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ')') {
      if (depth === 0) {
        throw new DynamicQueryParseError('Unexpected closing parenthesis in dynamic query.');
      }

      depth -= 1;
      current += char;
      continue;
    }

    if (char === delimiter && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (depth !== 0) {
    throw new DynamicQueryParseError('Unclosed parenthesis in dynamic query.');
  }

  parts.push(current);

  return parts;
}

function stringOperatorValue(value: unknown, operator: DynamicQueryOperator): string {
  if (typeof value !== 'string') {
    throw new DynamicQueryParseError(`Operator "${operator}" requires a string value.`);
  }

  return value;
}
