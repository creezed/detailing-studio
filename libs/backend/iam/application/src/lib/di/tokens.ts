import { CLOCK, ID_GENERATOR } from '@det/backend/shared/ddd';

import { PASSWORD_HASHER } from '../ports/password-hasher/password-hasher.port';
import { TOKEN_GENERATOR } from '../ports/token-generator/token-generator.port';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');
export const HASH_FN = Symbol('HASH_FN');

export { CLOCK, ID_GENERATOR, PASSWORD_HASHER, TOKEN_GENERATOR };
