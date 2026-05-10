import { DateTime } from '@det/backend-shared-ddd';

import { Supplier } from './supplier.aggregate';
import { SupplierAlreadyActiveError, SupplierAlreadyDeactivatedError } from './supplier.errors';
import {
  SupplierContactUpdated,
  SupplierCreated,
  SupplierDeactivated,
  SupplierReactivated,
} from './supplier.events';
import { SupplierBuilder } from '../testing/supplier.builder';
import { InvalidInnError } from '../value-objects/inn.value-object';

const NOW = DateTime.from('2025-06-01T12:00:00Z');
const LATER = DateTime.from('2025-06-02T12:00:00Z');

describe('Supplier aggregate', () => {
  const builder = () => new SupplierBuilder().withNow(NOW);

  describe('create', () => {
    it('should create a valid Supplier and emit SupplierCreated', () => {
      const supplier = builder().withName('ООО Полироль').build();
      const snap = supplier.toSnapshot();

      expect(snap.name).toBe('ООО Полироль');
      expect(snap.isActive).toBe(true);
      expect(snap.inn).toBeNull();
      expect(snap.contact).toEqual({ phone: null, email: null, address: null });

      const events = supplier.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SupplierCreated);
      expect((events[0] as SupplierCreated).name).toBe('ООО Полироль');
    });

    it('should create with INN (10 digits)', () => {
      const supplier = builder().withInn('7707083893').build();
      const snap = supplier.toSnapshot();

      expect(snap.inn).toBe('7707083893');
    });

    it('should create with INN (12 digits)', () => {
      const supplier = builder().withInn('500100732259').build();
      const snap = supplier.toSnapshot();

      expect(snap.inn).toBe('500100732259');
    });

    it('should create with contact info', () => {
      const supplier = builder()
        .withContact({ phone: '+7-999-123-45-67', email: 'test@mail.ru', address: 'Москва' })
        .build();
      const snap = supplier.toSnapshot();

      expect(snap.contact.phone).toBe('+7-999-123-45-67');
      expect(snap.contact.email).toBe('test@mail.ru');
      expect(snap.contact.address).toBe('Москва');
    });

    it('should reject invalid INN checksum', () => {
      expect(() => builder().withInn('1234567890').build()).toThrow(InvalidInnError);
    });

    it('should reject INN with wrong length', () => {
      expect(() => builder().withInn('12345').build()).toThrow(InvalidInnError);
    });
  });

  describe('updateContact', () => {
    it('should update contact and emit SupplierContactUpdated', () => {
      const supplier = builder().build();
      supplier.pullDomainEvents();

      supplier.updateContact({ phone: '+7-111', email: null, address: 'СПб' }, LATER);

      const snap = supplier.toSnapshot();
      expect(snap.contact.phone).toBe('+7-111');
      expect(snap.contact.address).toBe('СПб');

      const events = supplier.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SupplierContactUpdated);
    });
  });

  describe('deactivate / reactivate', () => {
    it('should deactivate an active Supplier and emit SupplierDeactivated', () => {
      const supplier = builder().build();
      supplier.pullDomainEvents();

      supplier.deactivate(LATER);

      expect(supplier.toSnapshot().isActive).toBe(false);
      const events = supplier.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SupplierDeactivated);
    });

    it('should throw SupplierAlreadyDeactivatedError on double deactivation', () => {
      const supplier = builder().build();
      supplier.deactivate(LATER);

      expect(() => {
        supplier.deactivate(LATER);
      }).toThrow(SupplierAlreadyDeactivatedError);
    });

    it('should reactivate a deactivated Supplier and emit SupplierReactivated', () => {
      const supplier = builder().build();
      supplier.deactivate(LATER);
      supplier.pullDomainEvents();

      supplier.reactivate(LATER);

      expect(supplier.toSnapshot().isActive).toBe(true);
      const events = supplier.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SupplierReactivated);
    });

    it('should throw SupplierAlreadyActiveError on double reactivation', () => {
      const supplier = builder().build();

      expect(() => {
        supplier.reactivate(LATER);
      }).toThrow(SupplierAlreadyActiveError);
    });
  });

  describe('restore', () => {
    it('should restore from snapshot without emitting events', () => {
      const original = builder()
        .withInn('7707083893')
        .withContact({ phone: '+7-999', email: 'a@b.ru', address: 'addr' })
        .build();

      const snap = original.toSnapshot();
      const restored = Supplier.restore(snap);
      const restoredSnap = restored.toSnapshot();

      expect(restoredSnap.id).toBe(snap.id);
      expect(restoredSnap.name).toBe(snap.name);
      expect(restoredSnap.inn).toBe(snap.inn);
      expect(restoredSnap.contact).toEqual(snap.contact);
      expect(restoredSnap.isActive).toBe(snap.isActive);
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });
});
