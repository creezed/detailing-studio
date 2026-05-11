import type { TimeSlot } from '../value-objects/time-slot.value-object';

export type CancellationDecision =
  | { readonly kind: 'SELF' }
  | { readonly kind: 'REQUIRES_APPROVAL' };

export class CancellationPolicy {
  canSelfCancel(slot: TimeSlot, requestedAt: Date, windowHours = 24): boolean {
    const slotStartMs = slot.start.toDate().getTime();
    const requestedAtMs = requestedAt.getTime();
    const windowMs = windowHours * 60 * 60 * 1000;

    return slotStartMs - requestedAtMs >= windowMs;
  }

  decide(slot: TimeSlot, requestedAt: Date, windowHours = 24): CancellationDecision {
    if (this.canSelfCancel(slot, requestedAt, windowHours)) {
      return { kind: 'SELF' };
    }
    return { kind: 'REQUIRES_APPROVAL' };
  }
}
