import type { DynamicQueryParserConfig, DynamicQueryRequest } from './dynamic-query.types';

export interface DynamicQueryCompiler<TResult> {
  compile(query: DynamicQueryRequest, config: DynamicQueryParserConfig): TResult;
}
