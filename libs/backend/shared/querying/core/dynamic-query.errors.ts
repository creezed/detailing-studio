export class DynamicQueryParseError extends Error {
  readonly code = 'DYNAMIC_QUERY_PARSE_ERROR';

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
