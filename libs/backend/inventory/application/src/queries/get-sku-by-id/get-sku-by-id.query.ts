import type { SkuId } from '@det/backend-inventory-domain';

export class GetSkuByIdQuery {
  constructor(public readonly skuId: SkuId) {}
}
