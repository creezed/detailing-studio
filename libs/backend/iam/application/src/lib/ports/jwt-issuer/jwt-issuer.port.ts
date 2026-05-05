import type { Role } from '@det/backend/iam/domain';

export const JWT_ISSUER = Symbol('JWT_ISSUER');

export interface JwtPayload {
  readonly sub: string;
  readonly role: Role;
  readonly branches: readonly string[];
}

export interface IJwtIssuer {
  issueAccessToken(payload: JwtPayload): { token: string; expiresIn: number };
}
