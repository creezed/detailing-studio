import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { IIdGenerator } from '@det/backend/shared/ddd';

@Injectable()
export class CryptoIdGeneratorAdapter implements IIdGenerator {
  generate(): string {
    return randomUUID();
  }
}
