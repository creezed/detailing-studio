import type { UnitOfMeasure } from '@det/backend-shared-ddd';

export interface SkuListItemReadModel {
  readonly id: string;
  readonly articleNumber: string;
  readonly name: string;
  readonly group: string;
  readonly baseUnit: UnitOfMeasure;
  readonly isActive: boolean;
  readonly barcode: string | null;
}

export interface SkuDetailReadModel {
  readonly id: string;
  readonly articleNumber: string;
  readonly name: string;
  readonly group: string;
  readonly baseUnit: UnitOfMeasure;
  readonly packagings: readonly {
    readonly id: string;
    readonly name: string;
    readonly coefficient: number;
  }[];
  readonly barcode: string | null;
  readonly hasExpiry: boolean;
  readonly photoUrl: string | null;
  readonly isActive: boolean;
  readonly description: string;
}
