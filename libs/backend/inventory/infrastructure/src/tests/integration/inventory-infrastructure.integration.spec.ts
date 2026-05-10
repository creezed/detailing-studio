import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

import {
  ArticleNumber,
  Packaging,
  Sku,
  SkuId,
  Supplier,
  SupplierId,
} from '@det/backend-inventory-domain';
import type { IIdGenerator, UnitOfMeasure } from '@det/backend-shared-ddd';
import { DateTime } from '@det/backend-shared-ddd';
import { OutboxEventSchema, OutboxService } from '@det/backend-shared-outbox';

import { InvPackagingSchema } from '../../persistence/inv-packaging.schema';
import { InvSkuSchema } from '../../persistence/inv-sku.schema';
import { InvSupplierSchema } from '../../persistence/inv-supplier.schema';
import { InvSkuRepository } from '../../repositories/inv-sku.repository';
import { InvSupplierRepository } from '../../repositories/inv-supplier.repository';

import type { EntityManager } from '@mikro-orm/postgresql';

const SKU_ID = '11111111-1111-4111-8111-111111111111';
const SUPPLIER_ID = '22222222-2222-4222-8222-222222222222';
const PACKAGING_ID = '33333333-3333-4333-8333-333333333333';
const NOW = DateTime.from('2025-06-01T12:00:00Z');

class QueueIdGenerator implements IIdGenerator {
  private index = 0;

  constructor(private readonly values: readonly string[]) {}

  generate(): string {
    const v = this.values[this.index];

    if (v === undefined) {
      throw new Error('QueueIdGenerator exhausted');
    }

    this.index++;

    return v;
  }
}

function sku(): Sku {
  return Sku.create({
    articleNumber: 'ART-001',
    baseUnit: 'ML' as UnitOfMeasure,
    description: 'Test SKU description',
    group: 'Polishes',
    hasExpiry: true,
    idGen: new QueueIdGenerator([SKU_ID, PACKAGING_ID]),
    name: 'Test Polish',
    now: NOW,
    packagings: [Packaging.create(PACKAGING_ID, 'Bottle 500ml', 500)],
    photoUrl: null,
  });
}

function supplier(): Supplier {
  return Supplier.create({
    contact: {
      address: '123 Test St',
      email: 'test@example.com',
      phone: '+79991234567',
    },
    idGen: new QueueIdGenerator([SUPPLIER_ID]),
    name: 'Test Supplier',
    now: NOW,
  });
}

const ALL_ENTITIES = [InvSkuSchema, InvPackagingSchema, InvSupplierSchema, OutboxEventSchema];

function skuRepo(em: EntityManager): InvSkuRepository {
  return new InvSkuRepository(em, new OutboxService());
}

function supplierRepo(em: EntityManager): InvSupplierRepository {
  return new InvSupplierRepository(em, new OutboxService());
}

async function outboxCount(em: EntityManager): Promise<number> {
  return em.count(OutboxEventSchema, {});
}

describe('Inventory infrastructure repositories', () => {
  let container: StartedTestContainer;
  let orm: MikroORM<PostgreSqlDriver>;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'inv_test',
        POSTGRES_PASSWORD: 'inv',
        POSTGRES_USER: 'inv',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    orm = await MikroORM.init<PostgreSqlDriver>({
      clientUrl: `postgres://inv:inv@${container.getHost()}:${String(container.getMappedPort(5432))}/inv_test`,
      driver: PostgreSqlDriver,
      entities: ALL_ENTITIES,
    });

    await orm.schema.createSchema();
  }, 60_000);

  afterAll(async () => {
    await orm.close(true);
    await container.stop();
  });

  beforeEach(async () => {
    await orm.em.execute(
      'truncate table outbox_events, inv_packaging, inv_sku, inv_supplier cascade',
    );
  });

  it('saves and restores Sku with packagings', async () => {
    const em = orm.em.fork();
    const aggregate = sku();

    await skuRepo(em).save(aggregate);

    em.clear();
    const found = await skuRepo(em).findById(SkuId.from(SKU_ID));

    expect(found?.toSnapshot()).toEqual(aggregate.toSnapshot());
  });

  it('saves and restores Supplier', async () => {
    const em = orm.em.fork();
    const aggregate = supplier();

    await supplierRepo(em).save(aggregate);

    em.clear();
    const found = await supplierRepo(em).findById(SupplierId.from(SUPPLIER_ID));

    expect(found?.toSnapshot()).toEqual(aggregate.toSnapshot());
  });

  it('finds Sku by article number', async () => {
    const em = orm.em.fork();

    await skuRepo(em).save(sku());

    em.clear();
    const found = await skuRepo(em).findByArticleNumber(ArticleNumber.from('ART-001'));

    expect(found?.id).toBe(SKU_ID);
  });

  it('appends domain events to outbox when Sku is saved', async () => {
    const em = orm.em.fork();

    await skuRepo(em).save(sku());

    expect(await outboxCount(em)).toBe(1);
  });

  it('appends domain events to outbox when Supplier is saved', async () => {
    const em = orm.em.fork();

    await supplierRepo(em).save(supplier());

    expect(await outboxCount(em)).toBe(1);
  });

  it('rolls back outbox events with aggregate transaction', async () => {
    const em = orm.em.fork();

    await expect(
      em.transactional(async (txEm) => {
        await skuRepo(txEm).save(sku());
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');

    expect(await outboxCount(em)).toBe(0);
  });

  it('updates Sku packagings on re-save', async () => {
    const em = orm.em.fork();
    const aggregate = sku();

    await skuRepo(em).save(aggregate);

    em.clear();
    const found = await skuRepo(em).findById(SkuId.from(SKU_ID));
    const newPkgId = '44444444-4444-4444-8444-444444444444';

    expect(found).toBeDefined();

    if (found) {
      found.updatePackagings([Packaging.create(newPkgId, 'Can 1L', 1000)], NOW);
      await skuRepo(em).save(found);
    }

    em.clear();
    const updated = await skuRepo(em).findById(SkuId.from(SKU_ID));
    const snap = updated?.toSnapshot();

    expect(snap?.packagings).toHaveLength(1);
    expect(snap?.packagings[0]?.name).toBe('Can 1L');
  });
});
