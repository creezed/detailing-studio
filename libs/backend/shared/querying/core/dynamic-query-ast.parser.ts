import { DynamicQueryParseError } from './dynamic-query.errors';
import {
  DEFAULT_DYNAMIC_QUERY_PAGE,
  DEFAULT_DYNAMIC_QUERY_PAGE_SIZE,
  DYNAMIC_QUERY_MAX_PAGE_SIZE,
  type DynamicQueryAst,
  type DynamicQueryConditionNode,
  type DynamicQueryConditionValue,
  type DynamicQueryFieldConfig,
  type DynamicQueryFilterNode,
  type DynamicQueryOperator,
  type DynamicQueryParserConfig,
  type DynamicQueryRequest,
  type DynamicQueryResolvedField,
  type DynamicQueryScalarValue,
  type DynamicQuerySortNode,
  type DynamicQueryValueType,
} from './dynamic-query.types';

interface OperatorDefinition {
  readonly token: DynamicQueryOperator;
}

interface ParsedOperator {
  readonly index: number;
  readonly token: DynamicQueryOperator;
}

interface ResolvedFieldConfig {
  readonly config: DynamicQueryFieldConfig;
  readonly field: DynamicQueryResolvedField;
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

export class DynamicQueryAstParser {
  parse(query: DynamicQueryRequest, config: DynamicQueryParserConfig): DynamicQueryAst {
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

    return {
      filter: this.parseFilters(query.filters, config),
      page,
      pageSize,
      sorts: this.parseSorts(query.sorts ?? config.defaultSorts, config),
    };
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

  private parseAndGroup(
    group: string,
    config: DynamicQueryParserConfig,
  ): DynamicQueryFilterNode | null {
    const children = this.splitAndExpressions(group).map((expression) =>
      this.parseFilterExpression(expression, config),
    );

    if (children.length === 0) {
      return null;
    }

    if (children.length === 1) {
      return children[0] ?? null;
    }

    return {
      children,
      kind: 'group',
      operator: 'and',
    };
  }

  private parseConditionValue(
    rawValue: string,
    operator: DynamicQueryOperator,
    type: DynamicQueryValueType,
  ): DynamicQueryConditionValue {
    if (operator === '*=' || operator === '!*=') {
      return this.parseListValue(rawValue, type);
    }

    return this.parseScalarValue(rawValue, type);
  }

  private parseFilterExpression(
    expression: string,
    config: DynamicQueryParserConfig,
  ): DynamicQueryConditionNode {
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

    return {
      field: resolvedField.field,
      kind: 'condition',
      operator: parsedOperator.token,
      rawValue,
      value: this.parseConditionValue(rawValue, parsedOperator.token, resolvedField.field.type),
    };
  }

  private parseFilters(
    filters: string | undefined,
    config: DynamicQueryParserConfig,
  ): DynamicQueryFilterNode | null {
    if (!filters || filters.trim().length === 0) {
      return null;
    }

    const groups = splitTopLevel(filters, '|')
      .map((group) => group.trim())
      .filter(Boolean);
    const children = groups
      .map((group) => this.parseAndGroup(group, config))
      .filter((node): node is DynamicQueryFilterNode => node !== null);

    if (children.length === 0) {
      return null;
    }

    if (children.length === 1) {
      return children[0] ?? null;
    }

    return {
      children,
      kind: 'group',
      operator: 'or',
    };
  }

  private parseListValue(
    rawValue: string,
    type: DynamicQueryValueType,
  ): readonly DynamicQueryScalarValue[] {
    const trimmed = rawValue.trim();
    const normalized =
      trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed.slice(1, -1) : trimmed;
    const values = splitTopLevel(normalized, ',').map((value) => value.trim());

    if (values.length === 0 || values.some((value) => value.length === 0)) {
      throw new DynamicQueryParseError('Array filter value must contain at least one item.');
    }

    return values.map((value) => this.parseScalarValue(value, type));
  }

  private parseScalarValue(rawValue: string, type: DynamicQueryValueType): DynamicQueryScalarValue {
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
  ): readonly DynamicQuerySortNode[] {
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

        return {
          direction: descending ? 'desc' : 'asc',
          field: resolvedField.field,
        };
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

    return {
      config: fieldConfig,
      field: {
        customFilter: fieldConfig.customFilter,
        key: field,
        path,
        type: fieldConfig.type ?? 'auto',
      },
    };
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
