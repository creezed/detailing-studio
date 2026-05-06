import { DateTime, PhoneNumber } from '@det/backend/shared/ddd';
import type { IIdGenerator } from '@det/backend/shared/ddd';

import { OtpCodeHash } from './otp-code-hash.value-object';
import { OtpPurpose } from './otp-purpose';
import { OtpRequestStatus } from './otp-request-status';
import { OtpRequest } from './otp-request.aggregate';
import {
  OtpAttemptsExceededError,
  OtpExpiredError,
  OtpInvalidCodeError,
} from './otp-request.errors';
import { OtpRequestFailed, OtpRequestIssued, OtpRequestVerified } from './otp-request.events';

const OTP_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const WITHIN_TTL = DateTime.from('2026-01-01T10:04:59.000Z');
const AFTER_TTL = DateTime.from('2026-01-01T10:05:01.000Z');

function fixedIdGen(): IIdGenerator {
  return {
    generate: () => OTP_REQUEST_ID,
  };
}

function verifyCode(rawCode: string, codeHash: string): boolean {
  return codeHash === `hash:${rawCode}`;
}

function codeHash(): OtpCodeHash {
  return OtpCodeHash.fromHash('hash:123456', verifyCode);
}

function pendingOtp(overrides?: { attemptsLeft?: number; expiresAt?: DateTime }): OtpRequest {
  return OtpRequest.request({
    attemptsLeft: overrides?.attemptsLeft,
    codeHash: codeHash(),
    expiresAt: overrides?.expiresAt,
    idGen: fixedIdGen(),
    now: NOW,
    phone: PhoneNumber.from('+79990000001'),
    purpose: OtpPurpose.LOGIN,
    rawCode: '123456',
  });
}

describe('OtpRequest', () => {
  it('request creates PENDING OTP with default ttl and attempts', () => {
    const otp = pendingOtp();

    expect(otp.toSnapshot()).toMatchObject({
      attemptsLeft: 5,
      codeHash: 'hash:123456',
      expiresAt: DateTime.from('2026-01-01T10:05:00.000Z').iso(),
      id: OTP_REQUEST_ID,
      phone: '+79990000001',
      purpose: OtpPurpose.LOGIN,
      status: OtpRequestStatus.PENDING,
    });
  });

  it('request publishes OtpRequestIssued', () => {
    const otp = pendingOtp();
    const events = otp.pullDomainEvents();

    expect(events[0]).toBeInstanceOf(OtpRequestIssued);
    expect(events[0]).toMatchObject({ rawCode: '123456' });
  });

  it('request accepts explicit expiresAt and attemptsLeft', () => {
    const otp = pendingOtp({ attemptsLeft: 3, expiresAt: AFTER_TTL });

    expect(otp.toSnapshot()).toMatchObject({
      attemptsLeft: 3,
      expiresAt: AFTER_TTL.iso(),
    });
  });

  it('verify accepts correct code and publishes OtpRequestVerified', () => {
    const otp = pendingOtp();
    otp.pullDomainEvents();

    otp.verify('123456', WITHIN_TTL);

    expect(otp.toSnapshot()).toMatchObject({
      attemptsLeft: 5,
      status: OtpRequestStatus.VERIFIED,
      verifiedAt: WITHIN_TTL.iso(),
    });
    expect(otp.pullDomainEvents()[0]).toBeInstanceOf(OtpRequestVerified);
  });

  it('verify rejects expired code', () => {
    const otp = pendingOtp();

    expect(() => {
      otp.verify('123456', AFTER_TTL);
    }).toThrow(OtpExpiredError);
  });

  it('verify rejects invalid code and decrements attempts', () => {
    const otp = pendingOtp();
    otp.pullDomainEvents();

    expect(() => {
      otp.verify('000000', WITHIN_TTL);
    }).toThrow(OtpInvalidCodeError);

    expect(otp.toSnapshot().attemptsLeft).toBe(4);
    expect(otp.pullDomainEvents()[0]).toBeInstanceOf(OtpRequestFailed);
  });

  it('verify throws attempts exceeded when last attempt fails', () => {
    const otp = pendingOtp({ attemptsLeft: 1 });
    otp.pullDomainEvents();

    expect(() => {
      otp.verify('000000', WITHIN_TTL);
    }).toThrow(OtpAttemptsExceededError);

    expect(otp.toSnapshot()).toMatchObject({
      attemptsLeft: 0,
      status: OtpRequestStatus.FAILED,
    });
    expect(otp.pullDomainEvents()[0]).toBeInstanceOf(OtpRequestFailed);
  });

  it('verify throws attempts exceeded when attempts are already exhausted', () => {
    const otp = OtpRequest.restore(
      {
        attemptsLeft: 0,
        codeHash: 'hash:123456',
        expiresAt: AFTER_TTL.iso(),
        id: OTP_REQUEST_ID,
        issuedAt: NOW.iso(),
        phone: '+79990000001',
        purpose: OtpPurpose.LOGIN,
        status: OtpRequestStatus.FAILED,
        verifiedAt: null,
      },
      verifyCode,
    );

    expect(() => {
      otp.verify('123456', WITHIN_TTL);
    }).toThrow(OtpAttemptsExceededError);
  });

  it('verify already verified OTP is idempotent', () => {
    const otp = pendingOtp();
    otp.verify('123456', WITHIN_TTL);
    otp.pullDomainEvents();

    otp.verify('123456', WITHIN_TTL);

    expect(otp.toSnapshot().status).toBe(OtpRequestStatus.VERIFIED);
    expect(otp.pullDomainEvents()).toEqual([]);
  });

  it('restore recreates OTP without domain events', () => {
    const otp = OtpRequest.restore(
      {
        attemptsLeft: 2,
        codeHash: 'hash:123456',
        expiresAt: AFTER_TTL.iso(),
        id: OTP_REQUEST_ID,
        issuedAt: NOW.iso(),
        phone: '+79990000001',
        purpose: OtpPurpose.PHONE_VERIFICATION,
        status: OtpRequestStatus.PENDING,
        verifiedAt: null,
      },
      verifyCode,
    );

    expect(otp.toSnapshot()).toMatchObject({
      attemptsLeft: 2,
      purpose: OtpPurpose.PHONE_VERIFICATION,
      status: OtpRequestStatus.PENDING,
    });
    expect(otp.pullDomainEvents()).toEqual([]);
  });

  it('OtpCodeHash supports value equality', () => {
    expect(codeHash().equals(OtpCodeHash.fromHash('hash:123456', verifyCode))).toBe(true);
  });
});
