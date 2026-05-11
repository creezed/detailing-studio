import { DateTime } from '@det/backend-shared-ddd';

import { Branch } from './branch.aggregate';
import {
  BranchAlreadyActiveError,
  BranchAlreadyDeactivatedError,
  BranchInUseError,
} from './branch.errors';
import {
  BranchAddressUpdated,
  BranchCreated,
  BranchDeactivated,
  BranchReactivated,
  BranchRenamed,
  BranchTimezoneChanged,
} from './branch.events';
import { BranchBuilder } from '../testing/branch.builder';
import { FakeIdGenerator } from '../testing/fake-id-generator';
import { InvalidBranchNameError } from '../value-objects/branch-name.value-object';
import { InvalidTimezoneError } from '../value-objects/timezone.value-object';

const NOW = DateTime.from('2024-01-15T10:00:00Z');
const LATER = DateTime.from('2024-01-15T12:00:00Z');

describe('Branch aggregate', () => {
  const idGen = new FakeIdGenerator();

  describe('create', () => {
    it('should create a branch and emit BranchCreated', () => {
      const branch = new BranchBuilder().withIdGen(idGen).withNow(NOW).build();
      const snapshot = branch.toSnapshot();

      expect(snapshot.name).toBe('Main Branch');
      expect(snapshot.address).toBe('ул. Тестовая, 1');
      expect(snapshot.timezone).toBe('Europe/Moscow');
      expect(snapshot.isActive).toBe(true);

      const events = branch.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchCreated);

      const event = events[0] as BranchCreated;
      expect(event.name).toBe('Main Branch');
      expect(event.timezone).toBe('Europe/Moscow');
    });

    it('should reject empty name', () => {
      expect(() => new BranchBuilder().withName('').build()).toThrow(InvalidBranchNameError);
    });

    it('should reject name longer than 120 chars', () => {
      expect(() => new BranchBuilder().withName('x'.repeat(121)).build()).toThrow(
        InvalidBranchNameError,
      );
    });

    it('should reject invalid timezone', () => {
      expect(() => new BranchBuilder().withTimezone('Invalid/Zone').build()).toThrow(
        InvalidTimezoneError,
      );
    });
  });

  describe('rename', () => {
    it('should rename branch and emit BranchRenamed', () => {
      const branch = new BranchBuilder().build();
      branch.pullDomainEvents();

      branch.rename('New Name', LATER);

      expect(branch.toSnapshot().name).toBe('New Name');
      const events = branch.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchRenamed);
      expect((events[0] as BranchRenamed).newName).toBe('New Name');
    });

    it('should reject invalid name on rename', () => {
      const branch = new BranchBuilder().build();
      expect(() => {
        branch.rename('', LATER);
      }).toThrow(InvalidBranchNameError);
    });
  });

  describe('updateAddress', () => {
    it('should update address and emit BranchAddressUpdated', () => {
      const branch = new BranchBuilder().build();
      branch.pullDomainEvents();

      branch.updateAddress('Новый адрес, 42', LATER);

      expect(branch.toSnapshot().address).toBe('Новый адрес, 42');
      const events = branch.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchAddressUpdated);
    });
  });

  describe('changeTimezone', () => {
    it('should change timezone when branch is deactivated', () => {
      const branch = new BranchBuilder().build();
      branch.pullDomainEvents();
      branch.deactivate(LATER);
      branch.pullDomainEvents();

      branch.changeTimezone('Asia/Yekaterinburg', LATER);

      expect(branch.toSnapshot().timezone).toBe('Asia/Yekaterinburg');
      const events = branch.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchTimezoneChanged);
    });

    it('should throw BranchInUseError when active', () => {
      const branch = new BranchBuilder().build();
      expect(() => {
        branch.changeTimezone('Asia/Yekaterinburg', LATER);
      }).toThrow(BranchInUseError);
    });
  });

  describe('deactivate', () => {
    it('should deactivate and emit BranchDeactivated', () => {
      const branch = new BranchBuilder().build();
      branch.pullDomainEvents();

      branch.deactivate(LATER);

      expect(branch.isActive).toBe(false);
      const events = branch.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchDeactivated);
    });

    it('should throw when already deactivated', () => {
      const branch = new BranchBuilder().build();
      branch.deactivate(LATER);
      expect(() => {
        branch.deactivate(LATER);
      }).toThrow(BranchAlreadyDeactivatedError);
    });
  });

  describe('reactivate', () => {
    it('should reactivate and emit BranchReactivated', () => {
      const branch = new BranchBuilder().build();
      branch.deactivate(LATER);
      branch.pullDomainEvents();

      branch.reactivate(LATER);

      expect(branch.isActive).toBe(true);
      const events = branch.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchReactivated);
    });

    it('should throw when already active', () => {
      const branch = new BranchBuilder().build();
      expect(() => {
        branch.reactivate(LATER);
      }).toThrow(BranchAlreadyActiveError);
    });
  });

  describe('restore', () => {
    it('should restore from snapshot without events', () => {
      const original = new BranchBuilder().build();
      const snapshot = original.toSnapshot();

      const restored = Branch.restore(snapshot);

      expect(restored.toSnapshot()).toEqual(snapshot);
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });
});
