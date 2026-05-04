import { DomainEvent } from './domain-event';

class WorkOrderClosed extends DomainEvent {
  readonly eventType = 'WorkOrderClosed';

  constructor(occurredAt: Date) {
    super({
      aggregateId: 'work-order-id',
      aggregateType: 'WorkOrder',
      eventId: 'event-id',
      occurredAt,
    });
  }
}

describe('DomainEvent', () => {
  it('stores immutable event metadata', () => {
    const occurredAt = new Date('2026-05-04T12:00:00.000Z');
    const event = new WorkOrderClosed(occurredAt);

    occurredAt.setUTCFullYear(2030);

    expect(event.eventType).toBe('WorkOrderClosed');
    expect(event.eventId).toBe('event-id');
    expect(event.aggregateId).toBe('work-order-id');
    expect(event.aggregateType).toBe('WorkOrder');
    expect(event.occurredAt.toISOString()).toBe('2026-05-04T12:00:00.000Z');
  });
});
