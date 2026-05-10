import type { TransferId } from './transfer-id';
import type { Transfer } from './transfer.aggregate';

export interface ITransferRepository {
  findById(id: TransferId): Promise<Transfer | null>;
  save(transfer: Transfer): Promise<void>;
}
