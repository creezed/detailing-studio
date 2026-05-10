import { randomUUID } from 'node:crypto';

import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { IPiiAccessLogPort, PiiAccessLogEntry } from '@det/backend-crm-application';

import { CrmPiiAccessLogSchema } from '../persistence/crm-pii-access-log.schema';

@Injectable()
export class CrmPiiAccessLogAdapter implements IPiiAccessLogPort {
  constructor(private readonly em: EntityManager) {}

  async log(entry: PiiAccessLogEntry): Promise<void> {
    const schema = new CrmPiiAccessLogSchema();
    schema.id = randomUUID();
    schema.actorUserId = entry.actorUserId;
    schema.clientId = entry.clientId;
    schema.operation = entry.operation;
    schema.fields = [...entry.fields];
    schema.occurredAt = entry.occurredAt;
    schema.ip = entry.ip;
    schema.userAgent = entry.userAgent;

    await this.em.persist(schema).flush();
  }
}
