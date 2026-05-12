import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { ClientNotFoundError, GetClientByIdQuery } from '@det/backend-crm-application';
import type { ClientDetailReadModel } from '@det/backend-crm-application';
import type { CrmClientReadModel, ICrmClientPort } from '@det/backend-work-order-application';

@Injectable()
export class WoCrmClientPortAdapter implements ICrmClientPort {
  constructor(private readonly queryBus: QueryBus) {}

  async getById(clientId: string): Promise<CrmClientReadModel | null> {
    try {
      const client = await this.queryBus.execute<GetClientByIdQuery, ClientDetailReadModel>(
        new GetClientByIdQuery(clientId),
      );

      const fullName = [client.fullName.last, client.fullName.first, client.fullName.middle]
        .filter(Boolean)
        .join(' ');

      return { fullName, id: client.id, phone: client.phone };
    } catch (error) {
      if (error instanceof ClientNotFoundError) {
        return null;
      }

      throw error;
    }
  }
}
