import type { PasswordHash } from '@det/backend/iam/domain';

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface IPasswordHasher {
  hash(plain: string): Promise<PasswordHash>;
  verify(plain: string, hash: PasswordHash): Promise<boolean>;
}
