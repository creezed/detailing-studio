import { ValueObject } from '@det/backend/shared/ddd';

export type OtpCodeCompare = (rawCode: string, codeHash: string) => boolean;

export class OtpCodeHash extends ValueObject {
  private constructor(
    private readonly value: string,
    private readonly compare: OtpCodeCompare,
  ) {
    super();
  }

  static fromHash(value: string, compare: OtpCodeCompare): OtpCodeHash {
    return new OtpCodeHash(value, compare);
  }

  verify(rawCode: string): boolean {
    return this.compare(rawCode, this.value);
  }

  getValue(): string {
    return this.value;
  }

  override equals(other: this): boolean {
    return this.value === other.value;
  }
}
