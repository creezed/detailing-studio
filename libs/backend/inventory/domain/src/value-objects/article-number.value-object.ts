import { DomainError, ValueObject } from '@det/backend-shared-ddd';

export class InvalidArticleNumberError extends DomainError {
  readonly code = 'INVALID_ARTICLE_NUMBER';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid article number: "${value}". Must be 1–32 characters.`);
  }
}

export class ArticleNumber extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): ArticleNumber {
    const trimmed = value.trim();

    if (trimmed.length < 1 || trimmed.length > 32) {
      throw new InvalidArticleNumberError(value);
    }

    return new ArticleNumber(trimmed);
  }

  getValue(): string {
    return this._value;
  }

  override equals(other: this): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }
}
