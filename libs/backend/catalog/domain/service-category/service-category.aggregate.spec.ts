import { DateTime } from '@det/backend/shared/ddd';
import type { IIdGenerator } from '@det/backend/shared/ddd';

import { ServiceCategory } from './service-category.aggregate';
import { ServiceCategoryAlreadyDeactivatedError } from './service-category.errors';
import { ServiceCategoryCreated, ServiceCategoryDeactivated } from './service-category.events';

class FixedIdGenerator implements IIdGenerator {
  private _currentIndex = 0;

  constructor(private readonly _values: readonly string[]) {}

  generate(): string {
    const value = this._values[this._currentIndex];

    if (value === undefined) {
      throw new Error('No generated id configured for test');
    }

    this._currentIndex += 1;

    return value;
  }
}

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const LATER = DateTime.from('2026-01-02T10:00:00.000Z');

function idGen(): IIdGenerator {
  return new FixedIdGenerator([CATEGORY_ID]);
}

function activeCategory(): ServiceCategory {
  return ServiceCategory.create({
    displayOrder: 1,
    icon: 'polish-icon',
    idGen: idGen(),
    name: 'Полировка',
    now: NOW,
  });
}

describe('ServiceCategory', () => {
  describe('create', () => {
    it('creates an active category with correct snapshot', () => {
      const category = activeCategory();
      const snapshot = category.toSnapshot();

      expect(snapshot).toEqual({
        displayOrder: 1,
        icon: 'polish-icon',
        id: CATEGORY_ID,
        isActive: true,
        name: 'Полировка',
      });
    });

    it('publishes ServiceCategoryCreated event', () => {
      const category = activeCategory();
      const events = category.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ServiceCategoryCreated);
      expect(events[0]).toMatchObject({
        aggregateId: CATEGORY_ID,
        aggregateType: 'ServiceCategory',
        eventType: 'ServiceCategoryCreated',
      });
    });
  });

  describe('rename', () => {
    it('updates name', () => {
      const category = activeCategory();
      category.rename('Химчистка');

      expect(category.toSnapshot().name).toBe('Химчистка');
    });

    it('throws on deactivated category', () => {
      const category = activeCategory();
      category.deactivate(NOW);

      expect(() => {
        category.rename('New');
      }).toThrow(ServiceCategoryAlreadyDeactivatedError);
    });
  });

  describe('changeIcon', () => {
    it('updates icon', () => {
      const category = activeCategory();
      category.changeIcon('new-icon');

      expect(category.toSnapshot().icon).toBe('new-icon');
    });

    it('throws on deactivated category', () => {
      const category = activeCategory();
      category.deactivate(NOW);

      expect(() => {
        category.changeIcon('x');
      }).toThrow(ServiceCategoryAlreadyDeactivatedError);
    });
  });

  describe('changeDisplayOrder', () => {
    it('updates display order', () => {
      const category = activeCategory();
      category.changeDisplayOrder(5);

      expect(category.toSnapshot().displayOrder).toBe(5);
    });

    it('throws on deactivated category', () => {
      const category = activeCategory();
      category.deactivate(NOW);

      expect(() => {
        category.changeDisplayOrder(3);
      }).toThrow(ServiceCategoryAlreadyDeactivatedError);
    });
  });

  describe('deactivate', () => {
    it('deactivates and publishes ServiceCategoryDeactivated', () => {
      const category = activeCategory();
      category.pullDomainEvents();

      category.deactivate(LATER);

      expect(category.toSnapshot().isActive).toBe(false);

      const events = category.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ServiceCategoryDeactivated);
    });

    it('throws when already deactivated', () => {
      const category = activeCategory();
      category.deactivate(NOW);

      expect(() => {
        category.deactivate(LATER);
      }).toThrow(ServiceCategoryAlreadyDeactivatedError);
    });
  });

  describe('restore', () => {
    it('restores from snapshot without events', () => {
      const original = activeCategory();
      const snapshot = original.toSnapshot();
      const restored = ServiceCategory.restore(snapshot);

      expect(restored.toSnapshot()).toEqual(snapshot);
      expect(restored.pullDomainEvents()).toEqual([]);
    });
  });
});
