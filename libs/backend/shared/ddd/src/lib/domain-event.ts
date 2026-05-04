export interface DomainEventProps {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventId: string;
  readonly occurredAt: Date;
}

export abstract class DomainEvent {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventId: string;
  readonly occurredAt: Date;

  abstract readonly eventType: string;

  protected constructor(props: DomainEventProps) {
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.eventId = props.eventId;
    this.occurredAt = new Date(props.occurredAt.getTime());
  }
}
