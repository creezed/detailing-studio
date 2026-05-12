import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { GetCurrentUserQuery, UserId, UserNotFoundError } from '@det/backend-iam-application';
import type { CurrentUserDto } from '@det/backend-iam-application';
import type { IIamUserPort, IamUserReadModel } from '@det/backend-work-order-application';

@Injectable()
export class WoIamUserPortAdapter implements IIamUserPort {
  constructor(private readonly queryBus: QueryBus) {}

  async getById(userId: string): Promise<IamUserReadModel | null> {
    try {
      const user = await this.queryBus.execute<GetCurrentUserQuery, CurrentUserDto>(
        new GetCurrentUserQuery(UserId.from(userId)),
      );

      return { fullName: user.fullName, id: user.id };
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return null;
      }

      throw error;
    }
  }
}
