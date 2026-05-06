import type { DomainEvent } from './domain-event';

export abstract class AggregateRoot<TId = string> {
  private _domainEvents: DomainEvent[] = [];

  abstract get id(): TId;

  pullDomainEvents(): readonly DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];

    return events;
  }

  protected addEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  protected hasId(id: TId): boolean {
    return this.id === id;
  }
}
