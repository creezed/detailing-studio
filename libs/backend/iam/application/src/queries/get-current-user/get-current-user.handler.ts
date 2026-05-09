import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { IUserRepository } from '@det/backend-iam-domain';

import { toCurrentUserDto } from './current-user.dto';
import { GetCurrentUserQuery } from './get-current-user.query';
import { USER_REPOSITORY } from '../../di/tokens';
import { UserNotFoundError } from '../../errors/application.errors';

import type { CurrentUserDto } from './current-user.dto';

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery, CurrentUserDto> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(query: GetCurrentUserQuery): Promise<CurrentUserDto> {
    const user = await this.userRepo.findById(query.userId);

    if (!user) {
      throw new UserNotFoundError(query.userId);
    }

    return toCurrentUserDto(user.toSnapshot());
  }
}
