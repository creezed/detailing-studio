export const PII_ACCESS_LOG_PORT = Symbol('PII_ACCESS_LOG_PORT');

export type PiiOperation = 'VIEW' | 'EXPORT' | 'UPDATE' | 'DELETE';

export interface PiiAccessLogEntry {
  readonly actorUserId: string;
  readonly clientId: string;
  readonly operation: PiiOperation;
  readonly fields: readonly string[];
  readonly occurredAt: Date;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

export interface IPiiAccessLogPort {
  log(entry: PiiAccessLogEntry): Promise<void>;
}
