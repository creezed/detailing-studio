/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver, type EntityManager } from '@mikro-orm/postgresql';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

import {
  BodyType,
  PricingType,
  Service,
  ServiceCategory,
  ServiceCategoryId,
  ServiceId,
} from '@det/backend-catalog-domain';
import type { MaterialNorm } from '@det/backend-catalog-domain';
import { DateTime, Money, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { OutboxEventSchema, OutboxService } from '@det/backend-shared-outbox';
import { SkuId } from '@det/shared-types';

import { CatalogMaterialNormSchema } from '../../persistence/catalog-material-norm.schema';
import { CatalogServiceCategorySchema } from '../../persistence/catalog-service-category.schema';
import { CatalogServicePriceHistorySchema } from '../../persistence/catalog-service-price-history.schema';
import { CatalogServicePricingSchema } from '../../persistence/catalog-service-pricing.schema';
import { CatalogServiceSchema } from '../../persistence/catalog-service.schema';
import { CatalogServiceCategoryRepository } from '../../repositories/catalog-service-category.repository';
import { CatalogServiceRepository } from '../../repositories/catalog-service.repository';

const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const SERVICE_ID = '22222222-2222-4222-8222-222222222222';
const SKU_ID_1 = '33333333-3333-4333-8333-333333333333';
const SKU_ID_2 = '44444444-4444-4444-8444-444444444444';

class QueueIdGenerator implements IIdGenerator {
  private index = 0;

  constructor(private readonly values: readonly string[]) {}

  generate(): string {
    const value = this.values[this.index];
    this.index += 1;

    if (!value) {
      throw new Error('No queued id value');
    }

    return value;
  }
}

function category(): ServiceCategory {
  return ServiceCategory.create({
    displayOrder: 1,
    icon: 'polish',
    idGen: new QueueIdGenerator([CATEGORY_ID]),
    name: 'Полировка',
    now: NOW,
  });
}

function fixedService(): Service {
  return Service.create({
    categoryId: ServiceCategoryId.from(CATEGORY_ID),
    description: 'Базовая полировка кузова',
    displayOrder: 1,
    durationMinutes: 60,
    idGen: new QueueIdGenerator([SERVICE_ID]),
    materialNorms: [],
    name: 'Полировка кузова',
    now: NOW,
    pricing: {
      price: Money.rub(5000),
      type: PricingType.FIXED,
    },
  });
}

function complexService(): Service {
  const norms: MaterialNorm[] = [
    {
      amount: 100,
      bodyTypeCoefficients: new Map<BodyType, number>([
        [BodyType.SEDAN, 1.0],
        [BodyType.SUV, 1.5],
      ]),
      skuId: SkuId.from(SKU_ID_1),
      unit: UnitOfMeasure.ML,
    },
    {
      amount: 50,
      skuId: SkuId.from(SKU_ID_2),
      unit: UnitOfMeasure.G,
    },
  ];

  return Service.create({
    categoryId: ServiceCategoryId.from(CATEGORY_ID),
    description: 'Керамика по кузову',
    displayOrder: 2,
    durationMinutes: 120,
    idGen: new QueueIdGenerator([SERVICE_ID]),
    materialNorms: norms,
    name: 'Керамическое покрытие',
    now: NOW,
    pricing: {
      prices: new Map([
        [BodyType.SEDAN, Money.rub(15000)],
        [BodyType.SUV, Money.rub(22000)],
        [BodyType.CROSSOVER, Money.rub(18000)],
      ]),
      type: PricingType.BY_BODY_TYPE,
    },
  });
}

function categoryRepo(em: EntityManager): CatalogServiceCategoryRepository {
  return new CatalogServiceCategoryRepository(em, new OutboxService());
}

const FIXED_CLOCK: IClock = { now: () => NOW };
const FIXED_ID_GEN: IIdGenerator = { generate: () => crypto.randomUUID() };

function serviceRepo(em: EntityManager): CatalogServiceRepository {
  return new CatalogServiceRepository(em, new OutboxService(), FIXED_ID_GEN, FIXED_CLOCK);
}

async function outboxCount(em: EntityManager): Promise<number> {
  return em.count(OutboxEventSchema, {});
}

describe('Catalog infrastructure repositories', () => {
  let container: StartedTestContainer;
  let orm: MikroORM<PostgreSqlDriver>;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'catalog_infrastructure',
        POSTGRES_PASSWORD: 'catalog',
        POSTGRES_USER: 'catalog',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    orm = await MikroORM.init<PostgreSqlDriver>({
      clientUrl: `postgres://catalog:catalog@${container.getHost()}:${String(container.getMappedPort(5432))}/catalog_infrastructure`,
      driver: PostgreSqlDriver,
      entities: [
        CatalogServiceCategorySchema,
        CatalogServiceSchema,
        CatalogServicePricingSchema,
        CatalogMaterialNormSchema,
        CatalogServicePriceHistorySchema,
        OutboxEventSchema,
      ],
    });

    await orm.schema.createSchema();
  }, 60_000);

  afterAll(async () => {
    await orm.close(true);
    await container.stop();
  });

  beforeEach(async () => {
    await orm.em.execute(
      'truncate table outbox_events, catalog_material_norm, catalog_service_pricing, catalog_service_price_history, catalog_service, catalog_service_category cascade',
    );
  });

  it('saves and restores ServiceCategory', async () => {
    const em = orm.em.fork();
    const aggregate = category();

    await categoryRepo(em).save(aggregate);

    em.clear();
    const found = await categoryRepo(em).findById(ServiceCategoryId.from(CATEGORY_ID));

    expect(found?.toSnapshot()).toEqual(aggregate.toSnapshot());
  });

  it('lists all service categories ordered by displayOrder', async () => {
    const em = orm.em.fork();
    const cat = category();

    await categoryRepo(em).save(cat);

    em.clear();
    const list = await categoryRepo(em).findAll(true);

    expect(list).toHaveLength(1);
    expect(list[0]?.toSnapshot()).toEqual(cat.toSnapshot());
  });

  it('saves and restores simple fixed-price Service', async () => {
    const em = orm.em.fork();
    const cat = category();
    const svc = fixedService();

    await categoryRepo(em).save(cat);
    await serviceRepo(em).save(svc);

    em.clear();
    const found = await serviceRepo(em).findById(ServiceId.from(SERVICE_ID));

    expect(found).not.toBeNull();
    expect(found?.toSnapshot()).toEqual(svc.toSnapshot());
  });

  it('saves and restores complex Service with BY_BODY_TYPE pricing and material norms', async () => {
    const em = orm.em.fork();
    const cat = category();
    const svc = complexService();

    await categoryRepo(em).save(cat);
    await serviceRepo(em).save(svc);

    em.clear();
    const found = await serviceRepo(em).findById(ServiceId.from(SERVICE_ID));

    expect(found).not.toBeNull();
    const foundSnap = found!.toSnapshot();
    const originalSnap = svc.toSnapshot();

    expect(foundSnap.id).toBe(originalSnap.id);
    expect(foundSnap.name).toBe(originalSnap.name);
    expect(foundSnap.description).toBe(originalSnap.description);
    expect(foundSnap.categoryId).toBe(originalSnap.categoryId);
    expect(foundSnap.durationMinutes).toBe(originalSnap.durationMinutes);
    expect(foundSnap.isActive).toBe(originalSnap.isActive);
    expect(foundSnap.displayOrder).toBe(originalSnap.displayOrder);

    expect(foundSnap.pricing.type).toBe(PricingType.BY_BODY_TYPE);
    expect(foundSnap.pricing.bodyTypePrices).toHaveLength(3);
    expect(foundSnap.pricing.bodyTypePrices).toEqual(
      expect.arrayContaining(originalSnap.pricing.bodyTypePrices!),
    );

    expect(foundSnap.materialNorms).toHaveLength(2);
    const normWithCoeffs = foundSnap.materialNorms.find((n) => n.skuId === SKU_ID_1);
    expect(normWithCoeffs).toBeDefined();
    expect(normWithCoeffs!.amount).toBe(100);
    expect(normWithCoeffs!.bodyTypeCoefficients).toEqual(
      expect.arrayContaining([
        { bodyType: BodyType.SEDAN, coefficient: 1.0 },
        { bodyType: BodyType.SUV, coefficient: 1.5 },
      ]),
    );

    const normWithoutCoeffs = foundSnap.materialNorms.find((n) => n.skuId === SKU_ID_2);
    expect(normWithoutCoeffs).toBeDefined();
    expect(normWithoutCoeffs!.amount).toBe(50);
  });

  it('findAll filters by categoryId and isActive', async () => {
    const em = orm.em.fork();
    const cat = category();
    const svc = fixedService();

    await categoryRepo(em).save(cat);
    await serviceRepo(em).save(svc);

    em.clear();
    const byCategory = await serviceRepo(em).findAll({
      categoryId: ServiceCategoryId.from(CATEGORY_ID),
    });
    expect(byCategory).toHaveLength(1);

    const activeOnly = await serviceRepo(em).findAll({ isActive: true });
    expect(activeOnly).toHaveLength(1);

    const inactive = await serviceRepo(em).findAll({ isActive: false });
    expect(inactive).toHaveLength(0);
  });

  it('appends domain events to outbox on save', async () => {
    const em = orm.em.fork();

    await categoryRepo(em).save(category());

    expect(await outboxCount(em)).toBe(1);
  });

  it('appends ServiceCreated event to outbox when service is saved', async () => {
    const em = orm.em.fork();

    await categoryRepo(em).save(category());
    await serviceRepo(em).save(fixedService());

    expect(await outboxCount(em)).toBe(2);
  });

  it('appends ServicePriceChanged event to outbox on price change', async () => {
    const em = orm.em.fork();
    const cat = category();
    const svc = fixedService();

    await categoryRepo(em).save(cat);
    await serviceRepo(em).save(svc);

    em.clear();
    const loaded = await serviceRepo(em).findById(ServiceId.from(SERVICE_ID));
    loaded!.changePrice({ price: Money.rub(7000), type: PricingType.FIXED }, NOW);
    await serviceRepo(em).save(loaded!);

    expect(await outboxCount(em)).toBe(3);
  });
});
