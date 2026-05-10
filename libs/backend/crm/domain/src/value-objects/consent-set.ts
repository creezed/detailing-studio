import { ConsentAlreadyRevokedError } from '../client/client.errors';

import type { ConsentType } from './consent-type';
import type { PolicyVersion } from './policy-version';

export interface ConsentRecord {
  readonly type: ConsentType;
  readonly givenAt: Date;
  readonly revokedAt: Date | null;
  readonly policyVersion: PolicyVersion;
}

export class ConsentSet {
  private constructor(private readonly _records: readonly ConsentRecord[]) {}

  static empty(): ConsentSet {
    return new ConsentSet([]);
  }

  static from(records: readonly ConsentRecord[]): ConsentSet {
    return new ConsentSet([...records]);
  }

  has(type: ConsentType): boolean {
    return this._records.some((r) => r.type === type && r.revokedAt === null);
  }

  give(type: ConsentType, at: Date, policyVersion: PolicyVersion): ConsentSet {
    if (this.has(type)) {
      return this;
    }

    const record: ConsentRecord = {
      type,
      givenAt: at,
      revokedAt: null,
      policyVersion,
    };

    return new ConsentSet([...this._records, record]);
  }

  revoke(type: ConsentType, at: Date): ConsentSet {
    const activeRecord = this._records.find((r) => r.type === type && r.revokedAt === null);

    if (!activeRecord) {
      throw new ConsentAlreadyRevokedError(type);
    }

    const updated = this._records.map((r) => (r === activeRecord ? { ...r, revokedAt: at } : r));

    return new ConsentSet(updated);
  }

  listActive(): readonly ConsentRecord[] {
    return this._records.filter((r) => r.revokedAt === null);
  }

  toArray(): readonly ConsentRecord[] {
    return [...this._records];
  }
}
