import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  INotificationTemplateRepository,
  NotificationTemplate,
  TemplateCode,
} from '@det/backend-notifications-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import {
  mapNotificationTemplateToDomain,
  mapNotificationTemplateToPersistence,
} from '../mappers/notification-template.mapper';
import { NotificationTemplateSchema } from '../schemas/notification-template.schema';

@Injectable()
export class NotificationTemplateRepositoryImpl implements INotificationTemplateRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findByCode(code: TemplateCode): Promise<NotificationTemplate | null> {
    const schema = await this.em.findOne(NotificationTemplateSchema, { code });

    return schema ? mapNotificationTemplateToDomain(schema) : null;
  }

  async findAll(): Promise<NotificationTemplate[]> {
    const schemas = await this.em.find(NotificationTemplateSchema, {});

    return schemas.map(mapNotificationTemplateToDomain);
  }

  async save(template: NotificationTemplate): Promise<void> {
    const existing = await this.em.findOne(NotificationTemplateSchema, { code: template.code });
    const persisted = mapNotificationTemplateToPersistence(template, existing);
    const events = template.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
