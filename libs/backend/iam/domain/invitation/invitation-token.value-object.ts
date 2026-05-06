import { ValueObject } from '@det/backend/shared/ddd';

export class InvitationToken extends ValueObject {
  private constructor(
    private readonly hash: string,
    private readonly hashFn: (s: string) => string,
  ) {
    super();
  }

  static fromRaw(raw: string, hashFn: (s: string) => string): InvitationToken {
    return new InvitationToken(hashFn(raw), hashFn);
  }

  static fromHash(hash: string, hashFn: (s: string) => string): InvitationToken {
    return new InvitationToken(hash, hashFn);
  }

  verify(raw: string): boolean {
    return this.hashFn(raw) === this.hash;
  }

  getHash(): string {
    return this.hash;
  }

  override equals(other: this): boolean {
    return this.hash === other.hash;
  }
}
