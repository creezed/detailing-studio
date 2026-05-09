import { CryptoTokenGeneratorAdapter, sha256Hash } from './crypto-token-generator.adapter';

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const BASE64URL_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;
const OTP_PATTERN = /^\d{6}$/;

describe('CryptoTokenGeneratorAdapter', () => {
  it('generates refresh tokens with sha256 hashes', () => {
    const generator = new CryptoTokenGeneratorAdapter();

    const token = generator.generateRefreshToken();

    expect(token.raw).toMatch(BASE64URL_TOKEN_PATTERN);
    expect(token.raw).toHaveLength(43);
    expect(token.hash).toMatch(SHA256_HEX_PATTERN);
    expect(token.hash).toBe(sha256Hash(token.raw));
  });

  it('generates invitation tokens with sha256 hashes', () => {
    const generator = new CryptoTokenGeneratorAdapter();

    const token = generator.generateInvitationToken();

    expect(token.raw).toMatch(BASE64URL_TOKEN_PATTERN);
    expect(token.raw).toHaveLength(43);
    expect(token.hash).toMatch(SHA256_HEX_PATTERN);
    expect(token.hash).toBe(sha256Hash(token.raw));
  });

  it('generates six-digit OTP codes with sha256 hashes', () => {
    const generator = new CryptoTokenGeneratorAdapter();

    const otp = generator.generateOtpCode();

    expect(otp.raw).toMatch(OTP_PATTERN);
    expect(otp.hash).toMatch(SHA256_HEX_PATTERN);
    expect(otp.hash).toBe(sha256Hash(otp.raw));
  });
});
