import type { SkuId } from '@det/backend-inventory-domain';

export class DeactivateSkuCommand {
  constructor(public readonly skuId: SkuId) {}
}
