import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AbilityFactory } from '@det/backend-iam-application';
import type { Role } from '@det/backend-iam-application';
import { CHECK_ABILITY_KEY } from '@det/backend-shared-auth';
import type { AbilityChecker, AuthenticatedUser } from '@det/backend-shared-auth';

export { CheckAbility } from '@det/backend-shared-auth';
export type { AbilityChecker, AbilityGuardContext } from '@det/backend-shared-auth';

interface RequestWithAbilityContext {
  readonly body?: unknown;
  readonly params?: Record<string, string>;
  readonly query?: Record<string, unknown>;
  readonly user?: AuthenticatedUser;
}

@Injectable()
export class AbilityGuard implements CanActivate {
  constructor(
    private readonly abilityFactory: AbilityFactory,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const callback = this.reflector.getAllAndOverride<AbilityChecker | undefined>(
      CHECK_ABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!callback) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAbilityContext>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    const ability = this.abilityFactory.createForUser({
      branchIds: request.user.branchIds,
      id: request.user.id,
      role: request.user.role as Role,
    });
    const allowed = callback(ability, {
      body: request.body,
      params: request.params ?? {},
      query: request.query ?? {},
      user: request.user,
    });

    if (!allowed) {
      throw new ForbiddenException();
    }

    return true;
  }
}
