import type { UnitOfMeasure } from '@det/backend-shared-ddd';

export class CreateSkuCommand {
  constructor(
    public readonly articleNumber: string,
    public readonly name: string,
    public readonly group: string,
    public readonly baseUnit: UnitOfMeasure,
    public readonly hasExpiry: boolean,
    public readonly packagings: readonly {
      readonly name: string;
      readonly coefficient: number;
    }[],
    public readonly barcode: string | null,
    public readonly photoUrl: string | null,
    public readonly description: string,
  ) {}
}
