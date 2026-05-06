import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { ITokenGenerator } from '@det/backend/iam/application';

const TOKEN_BYTES = 32;
const OTP_BYTES = 4;
const OTP_MODULO = 1_000_000;

@Injectable()
export class CryptoTokenGeneratorAdapter implements ITokenGenerator {
  generateInvitationToken(): { raw: string; hash: string } {
    return this.generateToken();
  }

  generateRefreshToken(): { raw: string; hash: string } {
    return this.generateToken();
  }

  generateOtpCode(): { raw: string; hash: string } {
    const value = randomBytes(OTP_BYTES).readUInt32BE(0) % OTP_MODULO;
    const raw = value.toString().padStart(6, '0');

    return {
      hash: this.sha256(raw),
      raw,
    };
  }

  private generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(TOKEN_BYTES).toString('base64url');

    return {
      hash: this.sha256(raw),
      raw,
    };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

export function sha256Hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
