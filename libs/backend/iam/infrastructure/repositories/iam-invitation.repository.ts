import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HASH_FN } from '@det/backend/iam/application';
import type {
  Email,
  IInvitationRepository,
  Invitation,
  InvitationId,
  InvitationStatus,
} from '@det/backend/iam/domain';
import { OutboxService } from '@det/backend/shared/outbox';

import {
  mapIamInvitationToDomain,
  mapIamInvitationToPersistence,
} from '../mappers/iam-invitation.mapper';
import { IamInvitationSchema } from '../persistence/iam-invitation.schema';

@Injectable()
export class IamInvitationRepository implements IInvitationRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
    @Inject(HASH_FN) private readonly hashFn: (value: string) => string,
  ) {}

  async findById(id: InvitationId): Promise<Invitation | null> {
    const schema = await this.em.findOne(IamInvitationSchema, { id });

    return schema ? mapIamInvitationToDomain(schema, this.hashFn) : null;
  }

  async findByRawToken(rawToken: string): Promise<Invitation | null> {
    const schema = await this.em.findOne(IamInvitationSchema, { tokenHash: this.hashFn(rawToken) });

    return schema ? mapIamInvitationToDomain(schema, this.hashFn) : null;
  }

  async findByEmailAndStatus(email: Email, status: InvitationStatus): Promise<Invitation | null> {
    const schema = await this.em.findOne(IamInvitationSchema, {
      email: email.getValue(),
      status,
    });

    return schema ? mapIamInvitationToDomain(schema, this.hashFn) : null;
  }

  async save(invitation: Invitation): Promise<void> {
    const existing = await this.em.findOne(IamInvitationSchema, { id: invitation.id });
    const events = invitation.pullDomainEvents();
    const persisted = mapIamInvitationToPersistence(invitation, existing);
    persisted.issuedAt =
      existing?.issuedAt ??
      events.find((event) => event.eventType === 'InvitationIssued')?.occurredAt ??
      new Date(0);
    persisted.acceptedAt =
      events.find((event) => event.eventType === 'InvitationAccepted')?.occurredAt ??
      existing?.acceptedAt ??
      null;
    persisted.revokedAt =
      events.find((event) => event.eventType === 'InvitationRevoked')?.occurredAt ??
      existing?.revokedAt ??
      null;

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persistAndFlush(persisted);
  }
}
