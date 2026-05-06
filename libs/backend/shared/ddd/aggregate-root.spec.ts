import { AggregateRoot } from './aggregate-root';
import { DomainEvent } from './domain-event';

class TestEvent extends DomainEvent {
  readonly eventType = 'TestEvent';

  constructor() {
    super({
      aggregateId: 'aggregate-id',
      aggregateType: 'TestAggregate',
      eventId: 'event-id',
      occurredAt: new Date('2026-05-04T12:00:00.000Z'),
    });
  }
}

class TestAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }

  override get id(): string {
    return this.aggregateId;
  }

  record(event: DomainEvent): void {
    this.addEvent(event);
  }

  matchesId(id: string): boolean {
    return this.hasId(id);
  }
}

describe('AggregateRoot', () => {
  it('records and pulls domain events', () => {
    const aggregate = new TestAggregate('aggregate-id');
    const event = new TestEvent();

    aggregate.record(event);

    expect(aggregate.pullDomainEvents()).toEqual([event]);
    expect(aggregate.pullDomainEvents()).toEqual([]);
  });

  it('compares aggregate id', () => {
    const aggregate = new TestAggregate('aggregate-id');

    expect(aggregate.matchesId('aggregate-id')).toBe(true);
    expect(aggregate.matchesId('other-id')).toBe(false);
  });
});
