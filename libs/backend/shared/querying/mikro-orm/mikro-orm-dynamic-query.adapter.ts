import { QueryOrder } from '@mikro-orm/core';

import { DynamicQueryParseError } from '../core/dynamic-query.errors';

import type {
  DynamicQueryAst,
  DynamicQueryConditionNode,
  DynamicQueryConditionValue,
  DynamicQueryFilterNode,
  DynamicQueryOperator,
  DynamicQueryScalarValue,
  DynamicQuerySortNode,
} from '../core/dynamic-query.types';
import type { DynamicQueryOrmAdapter } from '../core/orm-adapter';
import type { FilterQuery, FindOptions } from '@mikro-orm/core';

export interface MikroOrmDynamicQueryResult<T extends object> {
  readonly options: FindOptions<T>;
  readonly page: number;
  readonly pageSize: number;
  readonly where: FilterQuery<T>;
}

export interface MikroOrmCustomFilterContext {
  readonly condition: DynamicQueryConditionNode;
}

export type MikroOrmCustomFilter = (
  context: MikroOrmCustomFilterContext,
) => Record<string, unknown>;

export interface MikroOrmDynamicQueryAdapterConfig {
  readonly customFilters?: Readonly<Record<string, MikroOrmCustomFilter>>;
}

export class MikroOrmDynamicQueryAdapter<T extends object> implements DynamicQueryOrmAdapter<
  DynamicQueryAst,
  MikroOrmDynamicQueryResult<T>
> {
  constructor(private readonly config: MikroOrmDynamicQueryAdapterConfig = {}) {}

  compile(ast: DynamicQueryAst): MikroOrmDynamicQueryResult<T> {
    const rawWhere = ast.filter ? this.compileFilter(ast.filter) : {};
    const rawOptions: Record<string, unknown> = {
      limit: ast.pageSize,
      offset: (ast.page - 1) * ast.pageSize,
    };
    const orderBy = this.compileSorts(ast.sorts);

    if (orderBy.length > 0) {
      rawOptions['orderBy'] = orderBy;
    }

    if (!isFilterQuery<T>(rawWhere)) {
      throw new DynamicQueryParseError('Unable to build MikroORM filter query.');
    }

    if (!isFindOptions<T>(rawOptions)) {
      throw new DynamicQueryParseError('Unable to build MikroORM find options.');
    }

    return {
      options: rawOptions,
      page: ast.page,
      pageSize: ast.pageSize,
      where: rawWhere,
    };
  }

  private compileCondition(condition: DynamicQueryConditionNode): Record<string, unknown> {
    if (condition.field.customFilter) {
      const customFilter = this.config.customFilters?.[condition.field.customFilter];

      if (!customFilter) {
        throw new DynamicQueryParseError(
          `Custom filter "${condition.field.customFilter}" is not registered.`,
        );
      }

      return customFilter({ condition });
    }

    return buildPathObject(condition.field.path, this.toMikroCondition(condition));
  }

  private compileFilter(filter: DynamicQueryFilterNode): Record<string, unknown> {
    if (filter.kind === 'condition') {
      return this.compileCondition(filter);
    }

    const compiledChildren = filter.children.map((child) => this.compileFilter(child));

    if (compiledChildren.length === 0) {
      return {};
    }

    if (compiledChildren.length === 1) {
      return compiledChildren[0] ?? {};
    }

    return filter.operator === 'and' ? { $and: compiledChildren } : { $or: compiledChildren };
  }

  private compileSorts(sorts: readonly DynamicQuerySortNode[]): readonly Record<string, unknown>[] {
    return sorts.map((sort) =>
      buildPathObject(
        sort.field.path,
        sort.direction === 'desc' ? QueryOrder.DESC : QueryOrder.ASC,
      ),
    );
  }

  private toMikroCondition(condition: DynamicQueryConditionNode): unknown {
    const value = condition.value;

    if (condition.operator === '*=') {
      return { $in: requireArrayValue(value, condition.operator) };
    }

    if (condition.operator === '!*=') {
      return { $nin: requireArrayValue(value, condition.operator) };
    }

    const scalarValue = requireScalarValue(value, condition.operator);

    if (condition.operator === '==') {
      return scalarValue;
    }

    if (condition.operator === '!=') {
      return { $ne: scalarValue };
    }

    if (condition.operator === '>') {
      return { $gt: scalarValue };
    }

    if (condition.operator === '<') {
      return { $lt: scalarValue };
    }

    if (condition.operator === '>=') {
      return { $gte: scalarValue };
    }

    if (condition.operator === '<=') {
      return { $lte: scalarValue };
    }

    if (condition.operator === '@=') {
      return { $ilike: `%${stringOperatorValue(scalarValue, condition.operator)}%` };
    }

    if (condition.operator === '_=') {
      return { $ilike: `${stringOperatorValue(scalarValue, condition.operator)}%` };
    }

    if (condition.operator === '^=') {
      return { $ilike: `%${stringOperatorValue(scalarValue, condition.operator)}` };
    }

    return { $not: { $ilike: `%${stringOperatorValue(scalarValue, condition.operator)}%` } };
  }
}

function buildPathObject(path: string, value: unknown): Record<string, unknown> {
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

function isFilterQuery<T extends object>(value: unknown): value is FilterQuery<T> {
  return isRecord(value);
}

function isFindOptions<T extends object>(value: unknown): value is FindOptions<T> {
  return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArrayValue(
  value: DynamicQueryConditionValue,
): value is readonly DynamicQueryScalarValue[] {
  return Array.isArray(value);
}

function requireArrayValue(
  value: DynamicQueryConditionValue,
  operator: DynamicQueryOperator,
): readonly DynamicQueryScalarValue[] {
  if (!isArrayValue(value)) {
    throw new DynamicQueryParseError(`Operator "${operator}" requires an array value.`);
  }

  return value;
}

function requireScalarValue(
  value: DynamicQueryConditionValue,
  operator: DynamicQueryOperator,
): DynamicQueryScalarValue {
  if (isArrayValue(value)) {
    throw new DynamicQueryParseError(`Operator "${operator}" requires a scalar value.`);
  }

  return value;
}

function stringOperatorValue(value: unknown, operator: DynamicQueryOperator): string {
  if (typeof value !== 'string') {
    throw new DynamicQueryParseError(`Operator "${operator}" requires a string value.`);
  }

  return value;
}
