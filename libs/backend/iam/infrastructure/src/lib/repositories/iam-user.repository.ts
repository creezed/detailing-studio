import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { Role } from '@det/backend/iam/domain';
import type { IUserRepository, User, UserId, Email } from '@det/backend/iam/domain';
import type { PhoneNumber } from '@det/backend/shared/ddd';
import { OutboxService } from '@det/backend/shared/outbox';

import { mapIamUserToDomain, mapIamUserToPersistence } from '../mappers/iam-user.mapper';
import { IamUserSchema } from '../persistence/iam-user.schema';

@Injectable()
export class IamUserRepository implements IUserRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: UserId): Promise<User | null> {
    const schema = await this.em.findOne(IamUserSchema, { id });

    return schema ? mapIamUserToDomain(schema) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const schema = await this.em.findOne(IamUserSchema, { email: email.getValue() });

    return schema ? mapIamUserToDomain(schema) : null;
  }

  async findByPhone(phone: PhoneNumber): Promise<User | null> {
    const schema = await this.em.findOne(IamUserSchema, { phone: phone.toString() });

    return schema ? mapIamUserToDomain(schema) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    return (await this.em.count(IamUserSchema, { email: email.getValue() })) > 0;
  }

  async countOwners(): Promise<number> {
    return this.em.count(IamUserSchema, { roleSet: { $contains: [Role.OWNER] } });
  }

  async save(user: User): Promise<void> {
    const existing = await this.em.findOne(IamUserSchema, { id: user.id });
    const persisted = mapIamUserToPersistence(user, existing);
    const events = user.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persistAndFlush(persisted);
  }
}
