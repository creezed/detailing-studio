import {
  MikroOrmDynamicQueryAdapter,
  type MikroOrmDynamicQueryResult,
} from './mikro-orm-dynamic-query.adapter';
import { DynamicQueryAstParser } from '../core/dynamic-query-ast.parser';

import type { DynamicQueryCompiler } from '../core/dynamic-query-compiler';
import type { DynamicQueryParserConfig, DynamicQueryRequest } from '../core/dynamic-query.types';

export class MikroOrmDynamicQueryCompiler<T extends object> implements DynamicQueryCompiler<
  MikroOrmDynamicQueryResult<T>
> {
  constructor(
    private readonly parser = new DynamicQueryAstParser(),
    private readonly adapter = new MikroOrmDynamicQueryAdapter<T>(),
  ) {}

  compile(
    query: DynamicQueryRequest,
    config: DynamicQueryParserConfig,
  ): MikroOrmDynamicQueryResult<T> {
    return this.adapter.compile(this.parser.parse(query, config));
  }
}
