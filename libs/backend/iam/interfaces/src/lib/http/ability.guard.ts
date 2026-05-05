import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AbilityFactory, type AppAbility } from '@det/backend/iam/application';

import type { AuthenticatedUser } from '../guards/auth.guard';

export const CHECK_ABILITY_KEY = Symbol('CHECK_ABILITY_KEY');

export interface AbilityGuardContext {
  readonly body: unknown;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, unknown>>;
  readonly user: AuthenticatedUser;
}

export type AbilityCallback = (ability: AppAbility, context: AbilityGuardContext) => boolean;

export const CheckAbility = (callback: AbilityCallback): MethodDecorator & ClassDecorator =>
  SetMetadata(CHECK_ABILITY_KEY, callback);

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
    const callback = this.reflector.getAllAndOverride<AbilityCallback | undefined>(
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
      role: request.user.role,
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
