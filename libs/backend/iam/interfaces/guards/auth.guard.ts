import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JWT_ISSUER } from '@det/backend/iam/application';
import type { IJwtIssuer } from '@det/backend/iam/application';
import { IS_PUBLIC_KEY } from '@det/backend/shared/auth';
import type { AuthenticatedUser } from '@det/backend/shared/auth';

export type { AuthenticatedUser };

interface RequestWithAuth {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_ISSUER) private readonly jwtIssuer: IJwtIssuer,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtIssuer.verifyAccessToken(token);

      request.user = {
        branchIds: payload.branches,
        id: payload.sub,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractToken(request: RequestWithAuth): string | null {
    const header = request.headers.authorization;

    if (!header) {
      return null;
    }

    const parts = header.split(' ');
    const [type, token] = parts;

    return parts.length === 2 && type === 'Bearer' && token ? token : null;
  }
}
