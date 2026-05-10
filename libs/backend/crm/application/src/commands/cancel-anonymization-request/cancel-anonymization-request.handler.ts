import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClock } from '@det/backend-shared-ddd';

import { CancelAnonymizationRequestCommand } from './cancel-anonymization-request.command';
import { ANONYMIZATION_REQUEST_PORT, CLOCK } from '../../di/tokens';
import {
  AnonymizationRequestNotFoundError,
  AnonymizationRequestNotPendingError,
} from '../../errors/application.errors';

import type { IAnonymizationRequestPort } from '../../ports/anonymization-request.port';

@CommandHandler(CancelAnonymizationRequestCommand)
export class CancelAnonymizationRequestHandler implements ICommandHandler<
  CancelAnonymizationRequestCommand,
  void
> {
  constructor(
    @Inject(ANONYMIZATION_REQUEST_PORT) private readonly _anonPort: IAnonymizationRequestPort,
    @Inject(CLOCK) private readonly _clock: IClock,
  ) {}

  async execute(cmd: CancelAnonymizationRequestCommand): Promise<void> {
    const request = await this._anonPort.findById(cmd.requestId);

    if (!request) {
      throw new AnonymizationRequestNotFoundError(cmd.requestId);
    }

    if (request.status !== 'PENDING') {
      throw new AnonymizationRequestNotPendingError(cmd.requestId);
    }

    await this._anonPort.markCancelled(cmd.requestId, cmd.by, this._clock.now().iso(), cmd.reason);
  }
}
