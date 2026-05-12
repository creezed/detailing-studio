import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { GetServiceByIdQuery, ServiceNotFoundError } from '@det/backend-catalog-application';
import type { ServiceDto } from '@det/backend-catalog-application';
import { Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { ICatalogNormPort } from '@det/backend-work-order-application';
import type { MaterialNormSnapshot } from '@det/backend-work-order-domain';
import { ServiceId } from '@det/shared-types';

type CatalogNormSnapshot = ServiceDto['materialNorms'][number];

@Injectable()
export class WoCatalogNormPortAdapter implements ICatalogNormPort {
  constructor(private readonly queryBus: QueryBus) {}

  async getNormsForServices(
    serviceIds: readonly string[],
    vehicleBodyType?: string,
  ): Promise<MaterialNormSnapshot[]> {
    const result: MaterialNormSnapshot[] = [];

    for (const serviceId of serviceIds) {
      try {
        const service = await this.queryBus.execute<GetServiceByIdQuery, ServiceDto>(
          new GetServiceByIdQuery(ServiceId.from(serviceId)),
        );

        for (const norm of service.materialNorms) {
          const resolved = this.resolveNormAmount(norm, vehicleBodyType);

          if (resolved !== null) {
            result.push({
              normAmount: Quantity.of(resolved.amount, resolved.unit as UnitOfMeasure),
              skuId: norm.skuId,
              skuNameSnapshot: norm.skuId,
            });
          }
        }
      } catch (error) {
        if (error instanceof ServiceNotFoundError) {
          continue;
        }

        throw error;
      }
    }

    return result;
  }

  private resolveNormAmount(
    norm: CatalogNormSnapshot,
    vehicleBodyType?: string,
  ): { amount: number; unit: string } | null {
    if (norm.amount > 0) {
      return { amount: norm.amount, unit: norm.unit };
    }

    if (vehicleBodyType && 'bodyTypeAmounts' in norm) {
      const bodyTypeAmounts = norm.bodyTypeAmounts as
        | readonly { bodyType: string; amount: number }[]
        | undefined;
      const match = bodyTypeAmounts?.find((bta) => bta.bodyType === vehicleBodyType);

      if (match) {
        return { amount: match.amount, unit: norm.unit };
      }
    }

    return norm.amount >= 0 ? { amount: norm.amount, unit: norm.unit } : null;
  }
}
