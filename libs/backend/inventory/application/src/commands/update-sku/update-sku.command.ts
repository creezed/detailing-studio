import type { SkuId } from '@det/backend-inventory-domain';

export class UpdateSkuCommand {
  constructor(
    public readonly skuId: SkuId,
    public readonly name?: string,
    public readonly group?: string,
    public readonly packagings?: readonly {
      readonly id: string;
      readonly name: string;
      readonly coefficient: number;
    }[],
  ) {}
}
