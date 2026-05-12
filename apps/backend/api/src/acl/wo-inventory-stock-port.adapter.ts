import { Injectable, Logger } from '@nestjs/common';

import { Quantity } from '@det/backend-shared-ddd';
import type {
  CompensateStockInput,
  ConsumeStockInput,
  ConsumeStockResult,
  IInventoryStockPort,
} from '@det/backend-work-order-application';

/**
 * Stub adapter for inventory stock port.
 * TODO: implement real adapter when inventory ConsumeStockCommand is available.
 */
@Injectable()
export class WoInventoryStockPortAdapter implements IInventoryStockPort {
  private readonly logger = new Logger(WoInventoryStockPortAdapter.name);

  getCurrentQuantity(): Promise<Quantity | null> {
    this.logger.warn('getCurrentQuantity called on stub adapter');

    return Promise.resolve(null);
  }

  canConsume(): Promise<boolean> {
    this.logger.warn('canConsume called on stub adapter — returning true');

    return Promise.resolve(true);
  }

  consume(input: ConsumeStockInput): Promise<ConsumeStockResult> {
    this.logger.warn(`consume called on stub adapter for SKU ${input.skuId}`);

    return Promise.resolve({ ok: true });
  }

  compensate(input: CompensateStockInput): Promise<void> {
    this.logger.warn(`compensate called on stub adapter for doc ${input.sourceDocId}`);

    return Promise.resolve();
  }
}
