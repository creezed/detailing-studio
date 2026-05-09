import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { RefreshSessionStatus } from '@det/backend-iam-domain';
import type {
  IRefreshSessionRepository,
  RefreshSession,
  SessionId,
  UserId,
} from '@det/backend-iam-domain';
import type { DateTime } from '@det/backend-shared-ddd';
import { OutboxService } from '@det/backend-shared-outbox';

import {
  mapIamRefreshSessionToDomain,
  mapIamRefreshSessionToPersistence,
} from '../mappers/iam-refresh-session.mapper';
import { IamRefreshSessionSchema } from '../persistence/iam-refresh-session.schema';

@Injectable()
export class IamRefreshSessionRepository implements IRefreshSessionRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: SessionId): Promise<RefreshSession | null> {
    const schema = await this.em.findOne(IamRefreshSessionSchema, { id });

    return schema ? mapIamRefreshSessionToDomain(schema) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const schema = await this.em.findOne(IamRefreshSessionSchema, {
      status: RefreshSessionStatus.ACTIVE,
      tokenHash,
    });

    return schema ? mapIamRefreshSessionToDomain(schema) : null;
  }

  async findByRotatedTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const schema = await this.em.findOne(IamRefreshSessionSchema, {
      rotatedTokenHashes: { $contains: [tokenHash] },
      status: RefreshSessionStatus.ACTIVE,
    });

    return schema ? mapIamRefreshSessionToDomain(schema) : null;
  }

  async listActiveByUserId(userId: UserId): Promise<readonly RefreshSession[]> {
    const schemas = await this.em.find(IamRefreshSessionSchema, {
      status: RefreshSessionStatus.ACTIVE,
      userId,
    });

    return schemas.map((schema) => mapIamRefreshSessionToDomain(schema));
  }

  async save(session: RefreshSession): Promise<void> {
    const existing = await this.em.findOne(IamRefreshSessionSchema, { id: session.id });
    const persisted = mapIamRefreshSessionToPersistence(session, existing);
    const events = session.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }

  async compromiseAllByUserId(userId: UserId, now: DateTime): Promise<void> {
    const fork = this.em.fork();

    await fork.transactional(async (txEm) => {
      const schemas = await txEm.find(IamRefreshSessionSchema, {
        status: RefreshSessionStatus.ACTIVE,
        userId,
      });

      for (const schema of schemas) {
        const session = mapIamRefreshSessionToDomain(schema);
        session.markCompromised(now);
        const persisted = mapIamRefreshSessionToPersistence(session, schema);
        const events = session.pullDomainEvents();

        for (const event of events) {
          await this.outbox.append(event, txEm);
        }

        txEm.persist(persisted);
      }
    });
  }
}
