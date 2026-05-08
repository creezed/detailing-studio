/* eslint-disable @typescript-eslint/unbound-method */
import { PricingType, Service, ServiceId } from '@det/backend/catalog/domain';
import type {
  IServiceRepository,
  MaterialNorm,
  ServiceCategoryId,
  ServicePricing,
} from '@det/backend/catalog/domain';
import { DateTime, Money } from '@det/backend/shared/ddd';
import type { IClock, IIdGenerator } from '@det/backend/shared/ddd';

import { ChangeServicePriceCommand } from '../commands/change-service-price/change-service-price.command';
import { ChangeServicePriceHandler } from '../commands/change-service-price/change-service-price.handler';
import { CreateServiceCommand } from '../commands/create-service/create-service.command';
import { CreateServiceHandler } from '../commands/create-service/create-service.handler';
import { DeactivateServiceCommand } from '../commands/deactivate-service/deactivate-service.command';
import { DeactivateServiceHandler } from '../commands/deactivate-service/deactivate-service.handler';
import { SetServiceMaterialNormsCommand } from '../commands/set-service-material-norms/set-service-material-norms.command';
import { SetServiceMaterialNormsHandler } from '../commands/set-service-material-norms/set-service-material-norms.handler';
import { UpdateServiceCommand } from '../commands/update-service/update-service.command';
import { UpdateServiceHandler } from '../commands/update-service/update-service.handler';
import { ServiceNotFoundError } from '../errors/application.errors';

const SERVICE_ID = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ID = '11111111-1111-4111-8111-111111111111' as ServiceCategoryId;
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');

const FIXED_PRICING: ServicePricing = {
  price: Money.rub(3000),
  type: PricingType.FIXED,
};

const NEW_FIXED_PRICING: ServicePricing = {
  price: Money.rub(5000),
  type: PricingType.FIXED,
};

function mockIdGen(): IIdGenerator {
  return { generate: jest.fn().mockReturnValue(SERVICE_ID) };
}

function mockClock(): IClock {
  return { now: jest.fn().mockReturnValue(NOW) };
}

function mockRepo(): jest.Mocked<IServiceRepository> {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    // eslint-disable-next-line unicorn/no-useless-undefined
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function existingService(overrides: Partial<{ isActive: boolean; name: string }> = {}): Service {
  return Service.restore({
    categoryId: CATEGORY_ID,
    description: 'Test desc',
    displayOrder: 1,
    durationMinutes: 60,
    id: SERVICE_ID,
    isActive: overrides.isActive ?? true,
    materialNorms: [],
    name: overrides.name ?? 'Полировка кузова',
    pricing: { fixedPriceCents: '300000', type: PricingType.FIXED },
    version: 1,
  });
}

describe('CreateServiceHandler', () => {
  it('creates service and returns id', async () => {
    const repo = mockRepo();
    const handler = new CreateServiceHandler(repo, mockIdGen(), mockClock());

    const result = await handler.execute(
      new CreateServiceCommand(
        'Полировка кузова',
        'Описание',
        CATEGORY_ID,
        60,
        FIXED_PRICING,
        [],
        1,
      ),
    );

    expect(result).toBe(SERVICE_ID);
    expect(repo.save).toHaveBeenCalledTimes(1);

    const saved = repo.save.mock.calls[0]?.[0];
    const snapshot = saved?.toSnapshot();
    expect(snapshot).toMatchObject({
      categoryId: CATEGORY_ID,
      durationMinutes: 60,
      isActive: true,
      name: 'Полировка кузова',
    });
  });
});

describe('UpdateServiceHandler', () => {
  it('renames service', async () => {
    const repo = mockRepo();
    const service = existingService();
    repo.findById.mockResolvedValue(service);

    const handler = new UpdateServiceHandler(repo);
    const serviceId = ServiceId.from(SERVICE_ID);

    await handler.execute(new UpdateServiceCommand(serviceId, 'Химчистка салона'));

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(service.toSnapshot().name).toBe('Химчистка салона');
  });

  it('updates description', async () => {
    const repo = mockRepo();
    const service = existingService();
    repo.findById.mockResolvedValue(service);

    const handler = new UpdateServiceHandler(repo);
    const serviceId = ServiceId.from(SERVICE_ID);

    await handler.execute(new UpdateServiceCommand(serviceId, undefined, 'New desc'));

    expect(service.toSnapshot().description).toBe('New desc');
  });

  it('updates duration', async () => {
    const repo = mockRepo();
    const service = existingService();
    repo.findById.mockResolvedValue(service);

    const handler = new UpdateServiceHandler(repo);
    const serviceId = ServiceId.from(SERVICE_ID);

    await handler.execute(new UpdateServiceCommand(serviceId, undefined, undefined, 90));

    expect(service.toSnapshot().durationMinutes).toBe(90);
  });

  it('throws ServiceNotFoundError when not found', async () => {
    const repo = mockRepo();
    const handler = new UpdateServiceHandler(repo);
    const serviceId = ServiceId.from(SERVICE_ID);

    await expect(handler.execute(new UpdateServiceCommand(serviceId, 'New'))).rejects.toThrow(
      ServiceNotFoundError,
    );
  });
});

describe('ChangeServicePriceHandler', () => {
  it('changes price and generates ServicePriceChanged event', async () => {
    const repo = mockRepo();
    const service = existingService();
    repo.findById.mockResolvedValue(service);

    const handler = new ChangeServicePriceHandler(repo, mockClock());
    const serviceId = ServiceId.from(SERVICE_ID);

    await handler.execute(new ChangeServicePriceCommand(serviceId, NEW_FIXED_PRICING));

    expect(repo.save).toHaveBeenCalledTimes(1);

    const snapshot = service.toSnapshot();
    expect(snapshot.pricing.fixedPriceCents).toBe('500000');

    const events = service.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'ServicePriceChanged' });
  });

  it('throws ServiceNotFoundError when not found', async () => {
    const repo = mockRepo();
    const handler = new ChangeServicePriceHandler(repo, mockClock());
    const serviceId = ServiceId.from(SERVICE_ID);

    await expect(
      handler.execute(new ChangeServicePriceCommand(serviceId, NEW_FIXED_PRICING)),
    ).rejects.toThrow(ServiceNotFoundError);
  });
});

describe('SetServiceMaterialNormsHandler', () => {
  it('sets norms and generates event', async () => {
    const repo = mockRepo();
    const service = existingService();
    repo.findById.mockResolvedValue(service);

    const handler = new SetServiceMaterialNormsHandler(repo, mockClock());
    const serviceId = ServiceId.from(SERVICE_ID);
    const norms: MaterialNorm[] = [{ amount: 50, skuId: 'sku-1' as MaterialNorm['skuId'] }];

    await handler.execute(new SetServiceMaterialNormsCommand(serviceId, norms));

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(service.toSnapshot().materialNorms).toHaveLength(1);

    const events = service.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'ServiceMaterialNormsChanged' });
  });

  it('throws ServiceNotFoundError when not found', async () => {
    const repo = mockRepo();
    const handler = new SetServiceMaterialNormsHandler(repo, mockClock());
    const serviceId = ServiceId.from(SERVICE_ID);

    await expect(
      handler.execute(new SetServiceMaterialNormsCommand(serviceId, [])),
    ).rejects.toThrow(ServiceNotFoundError);
  });
});

describe('DeactivateServiceHandler', () => {
  it('deactivates service', async () => {
    const repo = mockRepo();
    const service = existingService();
    repo.findById.mockResolvedValue(service);

    const handler = new DeactivateServiceHandler(repo, mockClock());
    const serviceId = ServiceId.from(SERVICE_ID);

    await handler.execute(new DeactivateServiceCommand(serviceId));

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(service.toSnapshot().isActive).toBe(false);
  });

  it('throws ServiceNotFoundError when not found', async () => {
    const repo = mockRepo();
    const handler = new DeactivateServiceHandler(repo, mockClock());
    const serviceId = ServiceId.from(SERVICE_ID);

    await expect(handler.execute(new DeactivateServiceCommand(serviceId))).rejects.toThrow(
      ServiceNotFoundError,
    );
  });
});
