import { ConfigService } from '@nestjs/config';
import { SignJWT } from 'jose';

import { Role } from '@det/backend-iam-domain';

import { JoseJwtIssuerAdapter } from './jose-jwt-issuer.adapter';

const JWT_SECRET = 'test-secret-with-enough-entropy-for-hs512';
const JWT_ALGORITHM = 'HS512';
const JWT_ACCESS_TTL = '15m';
const FUTURE_EXP = 4_102_444_800;

function adapter(): JoseJwtIssuerAdapter {
  return new JoseJwtIssuerAdapter(
    new ConfigService({
      auth: {
        jwtAccessTtl: JWT_ACCESS_TTL,
        jwtAlgorithm: JWT_ALGORITHM,
        jwtSecret: JWT_SECRET,
      },
    }),
  );
}

function signingKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

describe('JoseJwtIssuerAdapter', () => {
  it('issues and verifies an access token', async () => {
    const issuer = adapter();

    const result = await issuer.issueAccessToken({
      branches: ['11111111-1111-4111-8111-111111111111'],
      role: Role.MANAGER,
      sub: '22222222-2222-4222-8222-222222222222',
    });

    await expect(issuer.verifyAccessToken(result.token)).resolves.toEqual({
      branches: ['11111111-1111-4111-8111-111111111111'],
      role: Role.MANAGER,
      sub: '22222222-2222-4222-8222-222222222222',
    });
    expect(result.expiresIn).toBe(900);
  });

  it('rejects a token with an invalid role claim', async () => {
    const issuer = adapter();
    const token = await new SignJWT({ branches: [], roles: ['ADMIN'] })
      .setProtectedHeader({ alg: JWT_ALGORITHM, typ: 'JWT' })
      .setSubject('22222222-2222-4222-8222-222222222222')
      .setIssuedAt(1)
      .setExpirationTime(FUTURE_EXP)
      .sign(signingKey());

    await expect(issuer.verifyAccessToken(token)).rejects.toThrow('Invalid access token payload');
  });

  it('rejects a token with invalid branch claims', async () => {
    const issuer = adapter();
    const token = await new SignJWT({ branches: [123], roles: [Role.MANAGER] })
      .setProtectedHeader({ alg: JWT_ALGORITHM, typ: 'JWT' })
      .setSubject('22222222-2222-4222-8222-222222222222')
      .setIssuedAt(1)
      .setExpirationTime(FUTURE_EXP)
      .sign(signingKey());

    await expect(issuer.verifyAccessToken(token)).rejects.toThrow('Invalid access token payload');
  });

  it('rejects a token without subject claim', async () => {
    const issuer = adapter();
    const token = await new SignJWT({ branches: [], roles: [Role.MANAGER] })
      .setProtectedHeader({ alg: JWT_ALGORITHM, typ: 'JWT' })
      .setIssuedAt(1)
      .setExpirationTime(FUTURE_EXP)
      .sign(signingKey());

    await expect(issuer.verifyAccessToken(token)).rejects.toThrow('Invalid access token payload');
  });
});
