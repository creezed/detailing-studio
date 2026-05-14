import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { InvoiceStatus } from '@det/backend-billing-domain';
import type { IInvoiceRepository, Invoice } from '@det/backend-billing-domain';
import { OutboxService } from '@det/backend-shared-outbox';
import type { InvoiceId, SubscriptionId } from '@det/shared-types';

import { mapInvoiceToDomain, mapInvoiceToPersistence } from '../mappers/invoice.mapper';
import { BilInvoiceSchema } from '../persistence/bil-invoice.schema';

@Injectable()
export class BilInvoiceRepository implements IInvoiceRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: InvoiceId): Promise<Invoice | null> {
    const schema = await this.em.findOne(BilInvoiceSchema, { id });

    return schema ? mapInvoiceToDomain(schema) : null;
  }

  async findBySubscriptionId(subscriptionId: SubscriptionId): Promise<readonly Invoice[]> {
    const schemas = await this.em.find(BilInvoiceSchema, {
      subscriptionId,
    });

    return schemas.map(mapInvoiceToDomain);
  }

  async findUnpaidBySubscription(subscriptionId: SubscriptionId): Promise<readonly Invoice[]> {
    const schemas = await this.em.find(BilInvoiceSchema, {
      status: InvoiceStatus.ISSUED,
      subscriptionId,
    });

    return schemas.map(mapInvoiceToDomain);
  }

  async save(invoice: Invoice): Promise<void> {
    const existing = await this.em.findOne(BilInvoiceSchema, { id: invoice.id });
    const persisted = mapInvoiceToPersistence(invoice, existing);

    const events = invoice.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
