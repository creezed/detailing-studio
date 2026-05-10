import { DateTime, UnitOfMeasure } from '@det/backend-shared-ddd';

import { Sku } from './sku.aggregate';
import { SkuAlreadyActiveError, SkuAlreadyDeactivatedError } from './sku.errors';
import {
  SkuBarcodeAssigned,
  SkuBarcodeRemoved,
  SkuCreated,
  SkuDeactivated,
  SkuGroupChanged,
  SkuPackagingsUpdated,
  SkuReactivated,
  SkuRenamed,
} from './sku.events';
import { SkuBuilder } from '../testing/sku.builder';
import { Barcode } from '../value-objects/barcode.value-object';
import { InvalidPackagingError, Packaging } from '../value-objects/packaging.value-object';

const NOW = DateTime.from('2025-06-01T12:00:00Z');
const LATER = DateTime.from('2025-06-02T12:00:00Z');

describe('Sku aggregate', () => {
  const builder = () => new SkuBuilder().withNow(NOW);

  describe('create', () => {
    it('should create a valid Sku and emit SkuCreated', () => {
      const sku = builder().build();
      const snap = sku.toSnapshot();

      expect(snap.articleNumber).toBe('ART-001');
      expect(snap.name).toBe('Полироль 3М');
      expect(snap.group).toBe('Полироли');
      expect(snap.baseUnit).toBe(UnitOfMeasure.ML);
      expect(snap.isActive).toBe(true);
      expect(snap.hasExpiry).toBe(false);
      expect(snap.barcode).toBeNull();
      expect(snap.packagings).toEqual([]);

      const events = sku.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SkuCreated);
      expect((events[0] as SkuCreated).articleNumber).toBe('ART-001');
    });

    it('should create with packagings', () => {
      const pack = Packaging.create('p1', 'Канистра 5л', 5000);
      const sku = builder().withPackagings([pack]).build();
      const snap = sku.toSnapshot();

      expect(snap.packagings).toEqual([{ id: 'p1', name: 'Канистра 5л', coefficient: 5000 }]);
    });

    it('should create with barcode', () => {
      const sku = builder().withBarcode('4006381333931').build();
      const snap = sku.toSnapshot();

      expect(snap.barcode).toBe('4006381333931');
    });

    it('should reject duplicate packaging ids', () => {
      const p1 = Packaging.create('dup', 'Pack A', 100);
      const p2 = Packaging.create('dup', 'Pack B', 200);

      expect(() => builder().withPackagings([p1, p2]).build()).toThrow(InvalidPackagingError);
    });
  });

  describe('rename', () => {
    it('should rename and emit SkuRenamed', () => {
      const sku = builder().build();
      sku.pullDomainEvents();

      sku.rename('Новое название', LATER);

      expect(sku.toSnapshot().name).toBe('Новое название');
      const events = sku.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SkuRenamed);
      expect((events[0] as SkuRenamed).newName).toBe('Новое название');
    });
  });

  describe('changeGroup', () => {
    it('should change group and emit SkuGroupChanged', () => {
      const sku = builder().build();
      sku.pullDomainEvents();

      sku.changeGroup('Абразивы', LATER);

      expect(sku.toSnapshot().group).toBe('Абразивы');
      const events = sku.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SkuGroupChanged);
      expect((events[0] as SkuGroupChanged).newGroup).toBe('Абразивы');
    });
  });

  describe('updatePackagings', () => {
    it('should update packagings and emit SkuPackagingsUpdated', () => {
      const sku = builder().build();
      sku.pullDomainEvents();

      const pack = Packaging.create('p1', 'Бутылка 1л', 1000);
      sku.updatePackagings([pack], LATER);

      expect(sku.toSnapshot().packagings).toHaveLength(1);
      const events = sku.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SkuPackagingsUpdated);
    });

    it('should reject duplicate packaging ids in update', () => {
      const sku = builder().build();
      const p1 = Packaging.create('x', 'A', 1);
      const p2 = Packaging.create('x', 'B', 2);

      expect(() => {
        sku.updatePackagings([p1, p2], LATER);
      }).toThrow(InvalidPackagingError);
    });
  });

  describe('barcode', () => {
    it('should assign barcode and emit SkuBarcodeAssigned', () => {
      const sku = builder().build();
      sku.pullDomainEvents();

      const barcode = Barcode.from('4006381333931');
      sku.assignBarcode(barcode, LATER);

      expect(sku.toSnapshot().barcode).toBe('4006381333931');
      const events = sku.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SkuBarcodeAssigned);
    });

    it('should remove barcode and emit SkuBarcodeRemoved', () => {
      const sku = builder().withBarcode('4006381333931').build();
      sku.pullDomainEvents();

      sku.removeBarcode(LATER);

      expect(sku.toSnapshot().barcode).toBeNull();
      const events = sku.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SkuBarcodeRemoved);
    });
  });

  describe('deactivate / reactivate', () => {
    it('should deactivate an active Sku and emit SkuDeactivated', () => {
      const sku = builder().build();
      sku.pullDomainEvents();

      sku.deactivate(LATER);

      expect(sku.toSnapshot().isActive).toBe(false);
      const events = sku.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SkuDeactivated);
    });

    it('should throw SkuAlreadyDeactivatedError on double deactivation', () => {
      const sku = builder().build();
      sku.deactivate(LATER);

      expect(() => {
        sku.deactivate(LATER);
      }).toThrow(SkuAlreadyDeactivatedError);
    });

    it('should reactivate a deactivated Sku and emit SkuReactivated', () => {
      const sku = builder().build();
      sku.deactivate(LATER);
      sku.pullDomainEvents();

      sku.reactivate(LATER);

      expect(sku.toSnapshot().isActive).toBe(true);
      const events = sku.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SkuReactivated);
    });

    it('should throw SkuAlreadyActiveError on double reactivation', () => {
      const sku = builder().build();

      expect(() => {
        sku.reactivate(LATER);
      }).toThrow(SkuAlreadyActiveError);
    });
  });

  describe('restore', () => {
    it('should restore from snapshot without emitting events', () => {
      const original = builder()
        .withBarcode('4006381333931')
        .withPackagings([Packaging.create('p1', 'Канистра', 5000)])
        .withHasExpiry(true)
        .build();

      const snap = original.toSnapshot();
      const restored = Sku.restore(snap);
      const restoredSnap = restored.toSnapshot();

      expect(restoredSnap.id).toBe(snap.id);
      expect(restoredSnap.articleNumber).toBe(snap.articleNumber);
      expect(restoredSnap.name).toBe(snap.name);
      expect(restoredSnap.group).toBe(snap.group);
      expect(restoredSnap.baseUnit).toBe(snap.baseUnit);
      expect(restoredSnap.barcode).toBe(snap.barcode);
      expect(restoredSnap.hasExpiry).toBe(snap.hasExpiry);
      expect(restoredSnap.isActive).toBe(snap.isActive);
      expect(restoredSnap.packagings).toEqual(snap.packagings);
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });
});
