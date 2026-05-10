import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetReceiptByIdQuery } from './get-receipt-by-id.query';
import { RECEIPT_READ_PORT } from '../../di/tokens';
import { ReceiptNotFoundError } from '../../errors/application.errors';

import type { IReceiptReadPort } from '../../ports/receipt-read.port';
import type { ReceiptDetailReadModel } from '../../read-models/receipt.read-models';

@QueryHandler(GetReceiptByIdQuery)
export class GetReceiptByIdHandler implements IQueryHandler<GetReceiptByIdQuery> {
  constructor(@Inject(RECEIPT_READ_PORT) private readonly port: IReceiptReadPort) {}

  async execute(query: GetReceiptByIdQuery): Promise<ReceiptDetailReadModel> {
    const result = await this.port.findById(query.receiptId);

    if (!result) {
      throw new ReceiptNotFoundError(query.receiptId);
    }

    return result;
  }
}
