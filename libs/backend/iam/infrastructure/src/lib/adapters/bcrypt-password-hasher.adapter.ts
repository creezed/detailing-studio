import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import type { IPasswordHasher } from '@det/backend/iam/application';
import { PasswordHash } from '@det/backend/iam/domain';

const BCRYPT_COST = 12;

@Injectable()
export class BcryptPasswordHasherAdapter implements IPasswordHasher {
  async hash(plain: string): Promise<PasswordHash> {
    const hash = await bcrypt.hash(plain, BCRYPT_COST);

    return PasswordHash.fromHash(hash);
  }

  verify(plain: string, hash: PasswordHash): Promise<boolean> {
    return bcrypt.compare(plain, hash.getValue());
  }
}
