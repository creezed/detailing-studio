import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, importPKCS8, jwtVerify, type JWTPayload, type KeyLike } from 'jose';

import type { IJwtIssuer, JwtPayload } from '@det/backend/iam/application';
import { Role } from '@det/backend/iam/domain';

const DEFAULT_ACCESS_TTL_SECONDS = 900;
const JWT_ALGORITHM_HS512 = 'HS512';
const JWT_ALGORITHM_RS256 = 'RS256';

type JwtSigningKey = KeyLike | Uint8Array;

function parseTtlSeconds(value: string | undefined): number {
  if (!value) {
    return DEFAULT_ACCESS_TTL_SECONDS;
  }

  const match = /^(?<amount>\d+)(?<unit>[smhd])$/.exec(value);

  if (!match?.groups) {
    return DEFAULT_ACCESS_TTL_SECONDS;
  }

  const amount = Number.parseInt(match.groups['amount'] ?? '', 10);
  const unit = match.groups['unit'];

  if (!Number.isFinite(amount)) {
    return DEFAULT_ACCESS_TTL_SECONDS;
  }

  if (unit === 's') {
    return amount;
  }

  if (unit === 'm') {
    return amount * 60;
  }

  if (unit === 'h') {
    return amount * 60 * 60;
  }

  return amount * 24 * 60 * 60;
}

function isRole(value: unknown): value is Role {
  switch (value) {
    case Role.OWNER:
    case Role.MANAGER:
    case Role.MASTER:
    case Role.CLIENT:
      return true;
    default:
      return false;
  }
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseVerifiedPayload(payload: JWTPayload): JwtPayload {
  const branches = payload['branches'];
  const roles = payload['roles'];

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Invalid access token payload');
  }

  if (!Array.isArray(roles) || !isRole(roles[0])) {
    throw new Error('Invalid access token payload');
  }

  if (!isStringArray(branches)) {
    throw new Error('Invalid access token payload');
  }

  return {
    branches,
    role: roles[0],
    sub: payload.sub,
  };
}

@Injectable()
export class JoseJwtIssuerAdapter implements IJwtIssuer {
  constructor(private readonly config: ConfigService) {}

  async issueAccessToken(payload: JwtPayload): Promise<{ token: string; expiresIn: number }> {
    const expiresIn = parseTtlSeconds(this.config.get<string>('auth.jwtAccessTtl'));
    const algorithm = this.config.get<string>('auth.jwtAlgorithm') ?? JWT_ALGORITHM_HS512;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expiresIn;
    const key = await this.getSigningKey(algorithm);
    const token = await new SignJWT({
      branches: payload.branches,
      roles: [payload.role],
    })
      .setProtectedHeader({ alg: algorithm, typ: 'JWT' })
      .setSubject(payload.sub)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(key);

    return { expiresIn, token };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const algorithm = this.config.get<string>('auth.jwtAlgorithm') ?? JWT_ALGORITHM_HS512;
    const key = await this.getSigningKey(algorithm);
    const { payload } = await jwtVerify(token, key, { algorithms: [algorithm] });

    return parseVerifiedPayload(payload);
  }

  private getSigningKey(algorithm: string): Promise<JwtSigningKey> {
    if (algorithm === JWT_ALGORITHM_RS256) {
      const privateKey = this.config.getOrThrow<string>('auth.jwtPrivateKey');

      return importPKCS8(privateKey, JWT_ALGORITHM_RS256);
    }

    const secret = this.config.getOrThrow<string>('auth.jwtSecret');

    return Promise.resolve(new TextEncoder().encode(secret));
  }
}
