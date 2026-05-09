export interface DynamicQueryOrmAdapter<TQueryAst, TResult> {
  compile(ast: TQueryAst): TResult;
}
