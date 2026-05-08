/* eslint-disable @typescript-eslint/unbound-method */
import { BodyType, PricingType, ServicePriceChanged } from '@det/backend/catalog/domain';
import type { ServiceId } from '@det/backend/catalog/domain';
import { DateTime, Money } from '@det/backend/shared/ddd';
import type { IIdGenerator } from '@det/backend/shared/ddd';

import { ServicePriceChangedHandler } from '../event-handlers/service-price-changed.handler';

import type { IPriceHistoryPort } from '../ports/price-history.port';

const SERVICE_ID = '22222222-2222-4222-8222-222222222222' as ServiceId;
const ENTRY_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

function mockPriceHistoryPort(): jest.Mocked<IPriceHistoryPort> {
  return {
    // eslint-disable-next-line unicorn/no-useless-undefined
    append: jest.fn().mockResolvedValue(undefined),
    findByServiceId: jest.fn().mockResolvedValue([]),
  };
}

function mockIdGen(): IIdGenerator {
  return { generate: jest.fn().mockReturnValue(ENTRY_ID) };
}

describe('ServicePriceChangedHandler', () => {
  it('appends price history entry for FIXED pricing', async () => {
    const port = mockPriceHistoryPort();
    const idGen = mockIdGen();
    const handler = new ServicePriceChangedHandler(port, idGen);

    const changedAt = DateTime.from('2026-01-15T14:00:00.000Z');
    const event = new ServicePriceChanged(
      SERVICE_ID,
      { price: Money.rub(5000), type: PricingType.FIXED },
      changedAt,
    );

    await handler.handle(event);

    expect(port.append).toHaveBeenCalledTimes(1);
    const entry = port.append.mock.calls[0]?.[0];
    expect(entry).toBeDefined();
    expect(entry?.id).toBe(ENTRY_ID);
    expect(entry?.serviceId).toBe(SERVICE_ID);
    expect(entry?.pricingType).toBe(PricingType.FIXED);
    expect(entry?.basePriceCents).toBe('500000');
    expect(entry?.pricingSnapshot).toEqual({
      fixedPriceCents: '500000',
      type: PricingType.FIXED,
    });
  });

  it('appends price history entry for BY_BODY_TYPE pricing', async () => {
    const port = mockPriceHistoryPort();
    const idGen = mockIdGen();
    const handler = new ServicePriceChangedHandler(port, idGen);

    const changedAt = DateTime.from('2026-02-01T10:00:00.000Z');
    const prices = new Map([
      [BodyType.SEDAN, Money.rub(4000)],
      [BodyType.SUV, Money.rub(6000)],
    ]);
    const event = new ServicePriceChanged(
      SERVICE_ID,
      { prices, type: PricingType.BY_BODY_TYPE },
      changedAt,
    );

    await handler.handle(event);

    expect(port.append).toHaveBeenCalledTimes(1);
    const entry = port.append.mock.calls[0]?.[0];
    expect(entry?.pricingType).toBe(PricingType.BY_BODY_TYPE);
    expect(entry?.basePriceCents).toBeNull();
    expect(entry?.pricingSnapshot).toEqual({
      bodyTypePrices: [
        { bodyType: BodyType.SEDAN, priceCents: '400000' },
        { bodyType: BodyType.SUV, priceCents: '600000' },
      ],
      type: PricingType.BY_BODY_TYPE,
    });
  });
});
