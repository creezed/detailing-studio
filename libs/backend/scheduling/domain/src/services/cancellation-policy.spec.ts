import { DateTime } from '@det/backend-shared-ddd';

import { CancellationPolicy } from './cancellation-policy';
import { TimeSlot } from '../value-objects/time-slot.value-object';
import { Timezone } from '../value-objects/timezone.value-object';

const TZ = Timezone.from('Europe/Moscow');

function makeSlot(startIso: string, endIso: string): TimeSlot {
  return TimeSlot.from(DateTime.from(startIso), DateTime.from(endIso), TZ);
}

describe('CancellationPolicy', () => {
  const policy = new CancellationPolicy();

  describe('canSelfCancel', () => {
    it('should allow self-cancel when > 24h before', () => {
      const slot = makeSlot('2024-02-16T10:00:00Z', '2024-02-16T11:00:00Z');
      const requestedAt = new Date('2024-02-15T09:00:00Z');

      expect(policy.canSelfCancel(slot, requestedAt)).toBe(true);
    });

    it('should allow self-cancel when exactly 24h before (boundary inclusive)', () => {
      const slot = makeSlot('2024-02-16T10:00:00Z', '2024-02-16T11:00:00Z');
      const requestedAt = new Date('2024-02-15T10:00:00Z');

      expect(policy.canSelfCancel(slot, requestedAt)).toBe(true);
    });

    it('should deny self-cancel when < 24h before', () => {
      const slot = makeSlot('2024-02-16T10:00:00Z', '2024-02-16T11:00:00Z');
      const requestedAt = new Date('2024-02-15T10:00:01Z');

      expect(policy.canSelfCancel(slot, requestedAt)).toBe(false);
    });

    it('should deny self-cancel when requested after slot start', () => {
      const slot = makeSlot('2024-02-16T10:00:00Z', '2024-02-16T11:00:00Z');
      const requestedAt = new Date('2024-02-16T10:30:00Z');

      expect(policy.canSelfCancel(slot, requestedAt)).toBe(false);
    });

    it('should respect custom windowHours=48', () => {
      const slot = makeSlot('2024-02-18T10:00:00Z', '2024-02-18T11:00:00Z');
      const requestedAt30hBefore = new Date('2024-02-17T04:00:00Z');
      const requestedAt49hBefore = new Date('2024-02-16T09:00:00Z');

      expect(policy.canSelfCancel(slot, requestedAt30hBefore, 48)).toBe(false);
      expect(policy.canSelfCancel(slot, requestedAt49hBefore, 48)).toBe(true);
    });
  });

  describe('decide', () => {
    it('should return SELF when > 24h before', () => {
      const slot = makeSlot('2024-02-16T10:00:00Z', '2024-02-16T11:00:00Z');
      const requestedAt = new Date('2024-02-14T10:00:00Z');

      expect(policy.decide(slot, requestedAt)).toEqual({ kind: 'SELF' });
    });

    it('should return REQUIRES_APPROVAL when < 24h before', () => {
      const slot = makeSlot('2024-02-16T10:00:00Z', '2024-02-16T11:00:00Z');
      const requestedAt = new Date('2024-02-16T00:00:00Z');

      expect(policy.decide(slot, requestedAt)).toEqual({ kind: 'REQUIRES_APPROVAL' });
    });

    it('should use custom windowHours', () => {
      const slot = makeSlot('2024-02-16T10:00:00Z', '2024-02-16T11:00:00Z');
      const requestedAt = new Date('2024-02-15T09:00:00Z');

      expect(policy.decide(slot, requestedAt, 48)).toEqual({ kind: 'REQUIRES_APPROVAL' });
    });
  });
});
