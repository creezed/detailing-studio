import { Inject, Injectable } from '@nestjs/common';

import { PII_ACCESS_LOG_PORT } from '../di/tokens';

import type { IPiiAccessLogPort, PiiOperation } from '../ports/pii-access-log.port';

export interface PiiAccessContext {
  readonly actorUserId: string;
  readonly clientId: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

@Injectable()
export class PiiAccessLogger {
  constructor(@Inject(PII_ACCESS_LOG_PORT) private readonly _logPort: IPiiAccessLogPort) {}

  async logView(ctx: PiiAccessContext): Promise<void> {
    await this.write(ctx, 'VIEW', []);
  }

  async logUpdate(ctx: PiiAccessContext, fields: readonly string[]): Promise<void> {
    await this.write(ctx, 'UPDATE', fields);
  }

  async logExport(ctx: PiiAccessContext): Promise<void> {
    await this.write(ctx, 'EXPORT', []);
  }

  async logAnonymize(ctx: PiiAccessContext): Promise<void> {
    await this.write(ctx, 'DELETE', []);
  }

  private async write(
    ctx: PiiAccessContext,
    operation: PiiOperation,
    fields: readonly string[],
  ): Promise<void> {
    await this._logPort.log({
      actorUserId: ctx.actorUserId,
      clientId: ctx.clientId,
      operation,
      fields,
      occurredAt: new Date(),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}
