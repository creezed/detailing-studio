import { createParamDecorator } from '@nestjs/common';

import type { AuthenticatedUser } from './auth.types';
import type { ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();

    return request.user;
  },
);
