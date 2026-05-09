import { seederLog } from './seeder-logger';

import type { EntityManager } from '@mikro-orm/core';

const DEFAULT_BATCH_SIZE = 500;

export interface BatchInsertOptions {
  readonly batchSize?: number;
  readonly label: string;
}

export async function batchInsert(
  em: EntityManager,
  entities: readonly object[],
  options: BatchInsertOptions,
): Promise<void> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const total = entities.length;

  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = entities.slice(offset, offset + batchSize);

    for (const entity of batch) {
      em.persist(entity);
    }

    await em.flush();
    em.clear();

    const inserted = Math.min(offset + batchSize, total);

    seederLog(options.label, `Inserted ${String(inserted)} / ${String(total)}`);
  }
}
