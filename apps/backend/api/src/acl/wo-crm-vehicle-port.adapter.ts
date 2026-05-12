import { Injectable, Logger } from '@nestjs/common';

import type { CrmVehicleReadModel, ICrmVehiclePort } from '@det/backend-work-order-application';

/**
 * Stub adapter for CRM vehicle port.
 * TODO: replace with a dedicated FindVehicleByIdQuery when available.
 */
@Injectable()
export class WoCrmVehiclePortAdapter implements ICrmVehiclePort {
  private readonly logger = new Logger(WoCrmVehiclePortAdapter.name);

  getById(vehicleId: string): Promise<CrmVehicleReadModel | null> {
    this.logger.warn(`getById called on stub vehicle adapter for ${vehicleId}`);

    return Promise.resolve(null);
  }
}
