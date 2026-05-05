import { CLOCK, ID_GENERATOR } from '@det/backend/shared/ddd';

import { JWT_ISSUER } from '../ports/jwt-issuer/jwt-issuer.port';
import { PASSWORD_HASHER } from '../ports/password-hasher/password-hasher.port';
import { SMS_OTP } from '../ports/sms-otp/sms-otp.port';
import { TOKEN_GENERATOR } from '../ports/token-generator/token-generator.port';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');
export const OTP_REQUEST_REPOSITORY = Symbol('OTP_REQUEST_REPOSITORY');
export const REFRESH_SESSION_REPOSITORY = Symbol('REFRESH_SESSION_REPOSITORY');
export const HASH_FN = Symbol('HASH_FN');

export { CLOCK, ID_GENERATOR, JWT_ISSUER, PASSWORD_HASHER, SMS_OTP, TOKEN_GENERATOR };
