export interface IIdempotencyPort {
  hasProcessed(key: string): Promise<boolean>;
  markProcessed(key: string): Promise<void>;
}
