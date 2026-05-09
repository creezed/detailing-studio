/* eslint-disable @typescript-eslint/unbound-method */
import { PricingType, Service, ServiceId } from '@det/backend/catalog/domain';
import type {
  IServiceRepository,
  ServiceCategoryId,
  ServicePricingSnapshot,
} from '@det/backend/catalog/domain';

import { ServiceNotFoundError } from '../errors/application.errors';
import { GetClientServiceCatalogHandler } from '../queries/get-client-service-catalog/get-client-service-catalog.handler';
import { GetClientServiceCatalogQuery } from '../queries/get-client-service-catalog/get-client-service-catalog.query';
import { GetServiceByIdHandler } from '../queries/get-service-by-id/get-service-by-id.handler';
import { GetServiceByIdQuery } from '../queries/get-service-by-id/get-service-by-id.query';
import { GetServicePriceHistoryHandler } from '../queries/get-service-price-history/get-service-price-history.handler';
import { GetServicePriceHistoryQuery } from '../queries/get-service-price-history/get-service-price-history.query';
import { GetServiceQueryCapabilitiesHandler } from '../queries/get-service-query-capabilities/get-service-query-capabilities.handler';
import { ListServicesHandler } from '../queries/list-services/list-services.handler';
import { ListServicesQuery } from '../queries/list-services/list-services.query';

import type { IPriceHistoryPort, PriceHistoryEntry } from '../ports/price-history.port';
import type { IServiceReadPort } from '../ports/service-read.port';

const SERVICE_ID = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ID = '11111111-1111-4111-8111-111111111111' as ServiceCategoryId;

function mockRepo(): jest.Mocked<IServiceRepository> {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    // eslint-disable-next-line unicorn/no-useless-undefined
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function mockPriceHistoryPort(): jest.Mocked<IPriceHistoryPort> {
  return {
    // eslint-disable-next-line unicorn/no-useless-undefined
    append: jest.fn().mockResolvedValue(undefined),
    findByServiceId: jest.fn().mockResolvedValue([]),
  };
}

function mockServiceReadPort(): jest.Mocked<IServiceReadPort> {
  return {
    list: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 0,
    }),
  };
}

function existingService(): Service {
  return Service.restore({
    categoryId: CATEGORY_ID,
    description: 'Test desc',
    displayOrder: 1,
    durationMinutes: 60,
    id: SERVICE_ID,
    isActive: true,
    materialNorms: [],
    name: 'Полировка кузова',
    pricing: { fixedPriceCents: '300000', type: PricingType.FIXED },
    version: 1,
  });
}

describe('GetServiceByIdHandler', () => {
  it('returns service dto when found', async () => {
    const repo = mockRepo();
    const service = existingService();
    repo.findById.mockResolvedValue(service);

    const handler = new GetServiceByIdHandler(repo);
    const result = await handler.execute(new GetServiceByIdQuery(ServiceId.from(SERVICE_ID)));

    expect(result.id).toBe(SERVICE_ID);
    expect(result.name).toBe('Полировка кузова');
    expect(result.durationMinutes).toBe(60);
    expect(result.isActive).toBe(true);
    expect(repo.findById).toHaveBeenCalledWith(ServiceId.from(SERVICE_ID));
  });

  it('throws ServiceNotFoundError when not found', async () => {
    const repo = mockRepo();
    const handler = new GetServiceByIdHandler(repo);

    await expect(
      handler.execute(new GetServiceByIdQuery(ServiceId.from(SERVICE_ID))),
    ).rejects.toThrow(ServiceNotFoundError);
  });
});

describe('ListServicesHandler', () => {
  it('returns paginated service dtos', async () => {
    const readPort = mockServiceReadPort();
    const query = { filters: 'categoryId==11111111-1111-4111-8111-111111111111,isActive==true' };
    readPort.list.mockResolvedValue({
      items: [
        {
          categoryId: CATEGORY_ID,
          description: 'Test desc',
          displayOrder: 1,
          durationMinutes: 60,
          id: SERVICE_ID,
          isActive: true,
          materialNorms: [],
          name: 'Полировка кузова',
          pricing: { fixedPriceCents: '300000', type: PricingType.FIXED },
          version: 1,
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      totalPages: 1,
    });

    const handler = new ListServicesHandler(readPort);
    const result = await handler.execute(new ListServicesQuery(query));

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(SERVICE_ID);
    expect(readPort.list).toHaveBeenCalledWith(query);
  });

  it('returns empty paginated response when no services', async () => {
    const readPort = mockServiceReadPort();
    const query = {};
    const handler = new ListServicesHandler(readPort);

    const result = await handler.execute(new ListServicesQuery(query));

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(readPort.list).toHaveBeenCalledWith(query);
  });
});

describe('GetServiceQueryCapabilitiesHandler', () => {
  it('returns service query capabilities', async () => {
    const handler = new GetServiceQueryCapabilitiesHandler();
    const result = await handler.execute();

    expect(result.defaultPageSize).toBe(25);
    expect(result.filters.some((filter) => filter.field === 'name')).toBe(true);
    expect(result.sorts.some((sort) => sort.field === 'displayOrder')).toBe(true);
  });
});

describe('GetClientServiceCatalogHandler', () => {
  it('returns only active services as catalog items', async () => {
    const repo = mockRepo();
    const service = existingService();
    repo.findAll.mockResolvedValue([service]);

    const handler = new GetClientServiceCatalogHandler(repo);
    const result = await handler.execute(new GetClientServiceCatalogQuery());

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(SERVICE_ID);
    expect(result[0]?.name).toBe('Полировка кузова');
    expect(repo.findAll).toHaveBeenCalledWith({ isActive: true });
  });

  it('returns empty array for empty catalog', async () => {
    const repo = mockRepo();
    const handler = new GetClientServiceCatalogHandler(repo);

    const result = await handler.execute(new GetClientServiceCatalogQuery());

    expect(result).toEqual([]);
  });
});

describe('GetServicePriceHistoryHandler', () => {
  it('returns price history for existing service', async () => {
    const repo = mockRepo();
    const port = mockPriceHistoryPort();
    const service = existingService();
    repo.findById.mockResolvedValue(service);

    const changedAt = new Date('2026-01-01T12:00:00.000Z');
    const pricingSnapshot: ServicePricingSnapshot = {
      fixedPriceCents: '300000',
      type: PricingType.FIXED,
    };
    const entries: PriceHistoryEntry[] = [
      {
        basePriceCents: '300000',
        changedAt,
        id: 'entry-1',
        pricingSnapshot,
        pricingType: PricingType.FIXED,
        serviceId: SERVICE_ID,
      },
    ];
    port.findByServiceId.mockResolvedValue(entries);

    const handler = new GetServicePriceHistoryHandler(repo, port);
    const result = await handler.execute(
      new GetServicePriceHistoryQuery(ServiceId.from(SERVICE_ID)),
    );

    expect(result.serviceId).toBe(SERVICE_ID);
    expect(result.history).toHaveLength(1);
    expect(result.history[0]?.changedAt).toBe(changedAt.toISOString());
    expect(result.history[0]?.pricingType).toBe(PricingType.FIXED);
    expect(result.currentPricing).toEqual(service.toSnapshot().pricing);
  });

  it('throws ServiceNotFoundError when service not found', async () => {
    const repo = mockRepo();
    const port = mockPriceHistoryPort();
    const handler = new GetServicePriceHistoryHandler(repo, port);

    await expect(
      handler.execute(new GetServicePriceHistoryQuery(ServiceId.from(SERVICE_ID))),
    ).rejects.toThrow(ServiceNotFoundError);
  });
});
