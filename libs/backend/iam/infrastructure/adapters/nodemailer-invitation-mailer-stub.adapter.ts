import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class NodemailerInvitationMailerStubAdapter {
  private readonly logger = pino({ name: 'NodemailerInvitationMailerStubAdapter' });

  sendInvitation(email: string, rawToken: string): Promise<void> {
    this.logger.info({ email, rawToken }, 'Invitation email stub');

    return Promise.resolve();
  }
}
