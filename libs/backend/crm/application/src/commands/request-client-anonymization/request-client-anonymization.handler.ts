import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';

import type { IClientRepository } from '@det/backend-crm-domain';
import { ClientId } from '@det/backend-crm-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { RequestClientAnonymizationCommand } from './request-client-anonymization.command';
import {
  ANONYMIZATION_REQUEST_PORT,
  CLIENT_REPOSITORY,
  CLOCK,
  ID_GENERATOR,
} from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';
import { ClientAnonymizationRequestedEvent } from '../../events/client-anonymization-requested.event';

import type { IAnonymizationRequestPort } from '../../ports/anonymization-request.port';

const ANONYMIZATION_DUE_DAYS = 30;

@CommandHandler(RequestClientAnonymizationCommand)
export class RequestClientAnonymizationHandler implements ICommandHandler<
  RequestClientAnonymizationCommand,
  { requestId: string }
> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(ANONYMIZATION_REQUEST_PORT) private readonly _anonPort: IAnonymizationRequestPort,
    @Inject(CLOCK) private readonly _clock: IClock,
    @Inject(ID_GENERATOR) private readonly _idGen: IIdGenerator,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(cmd: RequestClientAnonymizationCommand): Promise<{ requestId: string }> {
    const client = await this._clientRepo.findById(ClientId.from(cmd.clientId));

    if (!client) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    const now = this._clock.now();
    const requestId = this._idGen.generate();
    const dueBy = new Date(now.toDate().getTime() + ANONYMIZATION_DUE_DAYS * 24 * 60 * 60 * 1000);

    await this._anonPort.create({
      id: requestId,
      clientId: cmd.clientId,
      requestedBy: cmd.requestedBy,
      reason: cmd.reason,
      requestedAt: now.iso(),
      dueBy: dueBy.toISOString(),
      status: 'PENDING',
      completedBy: null,
      completedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      cancelReason: null,
    });

    this._eventBus.publish(
      new ClientAnonymizationRequestedEvent(requestId, cmd.clientId, cmd.requestedBy, now.iso()),
    );

    return { requestId };
  }
}
