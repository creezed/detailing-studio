import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  Email,
  type IInvitationRepository,
  Invitation,
  type InvitationId,
  InvitationStatus,
  InvitationToken,
  type IUserRepository,
  Role,
} from '@det/backend-iam-domain';
import { CLOCK, ID_GENERATOR } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { IssueInvitationCommand } from './issue-invitation.command';
import { HASH_FN, INVITATION_REPOSITORY, TOKEN_GENERATOR, USER_REPOSITORY } from '../../di/tokens';
import {
  ForbiddenInvitationIssuerError,
  InvitationAlreadyExistsError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '../../errors/application.errors';

import type { ITokenGenerator } from '../../ports/token-generator/token-generator.port';

@CommandHandler(IssueInvitationCommand)
export class IssueInvitationHandler implements ICommandHandler<
  IssueInvitationCommand,
  { id: InvitationId }
> {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepo: IInvitationRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokenGen: ITokenGenerator,
    @Inject(HASH_FN) private readonly hashFn: (s: string) => string,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: IssueInvitationCommand): Promise<{ id: InvitationId }> {
    const issuer = await this.userRepo.findById(cmd.issuerId);

    if (!issuer) {
      throw new UserNotFoundError(cmd.issuerId);
    }

    if (!issuer.hasRole(Role.OWNER) && !issuer.hasRole(Role.MANAGER)) {
      throw new ForbiddenInvitationIssuerError();
    }

    const email = Email.from(cmd.email);
    const existingUser = await this.userRepo.existsByEmail(email);

    if (existingUser) {
      throw new UserAlreadyExistsError(email.getValue());
    }

    const existingInvitation = await this.invitationRepo.findByEmailAndStatus(
      email,
      InvitationStatus.PENDING,
    );

    if (existingInvitation) {
      throw new InvitationAlreadyExistsError(email.getValue());
    }

    const { hash, raw } = this.tokenGen.generateInvitationToken();

    const token = InvitationToken.fromHash(hash, this.hashFn);

    const invitation = Invitation.issue({
      branchIds: cmd.branchIds,
      email,
      idGen: this.idGen,
      issuerId: cmd.issuerId,
      now: this.clock.now(),
      rawToken: raw,
      role: cmd.role,
      token,
    });

    await this.invitationRepo.save(invitation);

    return { id: invitation.id };
  }
}
