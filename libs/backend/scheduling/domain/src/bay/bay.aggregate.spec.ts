import { DateTime } from '@det/backend-shared-ddd';

import { Bay } from './bay.aggregate';
import { BayAlreadyActiveError, BayAlreadyDeactivatedError } from './bay.errors';
import { BayCreated, BayDeactivated, BayReactivated, BayRenamed } from './bay.events';
import { BayBuilder } from '../testing/bay.builder';
import { FakeIdGenerator } from '../testing/fake-id-generator';
import { InvalidBranchNameError } from '../value-objects/branch-name.value-object';

const NOW = DateTime.from('2024-01-15T10:00:00Z');
const LATER = DateTime.from('2024-01-15T12:00:00Z');

describe('Bay aggregate', () => {
  const idGen = new FakeIdGenerator();

  describe('create', () => {
    it('should create a bay and emit BayCreated', () => {
      const bay = new BayBuilder().withIdGen(idGen).withNow(NOW).build();
      const snapshot = bay.toSnapshot();

      expect(snapshot.name).toBe('Bay 1');
      expect(snapshot.branchId).toBe('00000000-0000-4000-a000-000000000099');
      expect(snapshot.isActive).toBe(true);

      const events = bay.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BayCreated);

      const event = events[0] as BayCreated;
      expect(event.name).toBe('Bay 1');
    });

    it('should reject empty name', () => {
      expect(() => new BayBuilder().withName('').build()).toThrow(InvalidBranchNameError);
    });
  });

  describe('rename', () => {
    it('should rename bay and emit BayRenamed', () => {
      const bay = new BayBuilder().build();
      bay.pullDomainEvents();

      bay.rename('Bay 2', LATER);

      expect(bay.toSnapshot().name).toBe('Bay 2');
      const events = bay.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BayRenamed);
      expect((events[0] as BayRenamed).newName).toBe('Bay 2');
    });
  });

  describe('deactivate', () => {
    it('should deactivate and emit BayDeactivated', () => {
      const bay = new BayBuilder().build();
      bay.pullDomainEvents();

      bay.deactivate(LATER);

      expect(bay.isActive).toBe(false);
      const events = bay.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BayDeactivated);
    });

    it('should throw when already deactivated', () => {
      const bay = new BayBuilder().build();
      bay.deactivate(LATER);
      expect(() => {
        bay.deactivate(LATER);
      }).toThrow(BayAlreadyDeactivatedError);
    });
  });

  describe('reactivate', () => {
    it('should reactivate and emit BayReactivated', () => {
      const bay = new BayBuilder().build();
      bay.deactivate(LATER);
      bay.pullDomainEvents();

      bay.reactivate(LATER);

      expect(bay.isActive).toBe(true);
      const events = bay.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BayReactivated);
    });

    it('should throw when already active', () => {
      const bay = new BayBuilder().build();
      expect(() => {
        bay.reactivate(LATER);
      }).toThrow(BayAlreadyActiveError);
    });
  });

  describe('restore', () => {
    it('should restore from snapshot without events', () => {
      const original = new BayBuilder().build();
      const snapshot = original.toSnapshot();

      const restored = Bay.restore(snapshot);

      expect(restored.toSnapshot()).toEqual(snapshot);
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });

  describe('branchId', () => {
    it('should expose immutable branchId', () => {
      const bay = new BayBuilder().withBranchId('00000000-0000-4000-a000-000000000050').build();
      expect(bay.branchId).toBe('00000000-0000-4000-a000-000000000050');
    });
  });
});
