import { Injectable } from '@nestjs/common';

import { DomainEvent } from '@det/backend-shared-ddd';

export interface DomainEventConstructor<TEvent extends DomainEvent = DomainEvent> {
  readonly prototype: TEvent;
}

export interface EventTypeRegistration<TEvent extends DomainEvent = DomainEvent> {
  readonly ctor: DomainEventConstructor<TEvent>;
  readonly eventType: string;
}

@Injectable()
export class EventTypeRegistry {
  private readonly constructors = new Map<string, DomainEventConstructor>();

  register(registration: EventTypeRegistration | readonly EventTypeRegistration[]): void {
    const registrations = isEventTypeRegistrationArray(registration)
      ? registration
      : [registration];

    for (const item of registrations) {
      this.constructors.set(item.eventType, item.ctor);
    }
  }

  deserialize(eventType: string, payload: unknown): DomainEvent {
    const ctor = this.constructors.get(eventType);

    if (!ctor) {
      throw new UnknownOutboxEventTypeError(eventType);
    }

    if (!isOutboxPayload(payload)) {
      throw new InvalidOutboxEventPayloadError(eventType);
    }

    const target: object = {};
    Object.setPrototypeOf(target, ctor.prototype);
    const hydrated: unknown = Object.assign(target, {
      ...payload,
      occurredAt: new Date(payload.occurredAt),
    });

    if (!(hydrated instanceof DomainEvent)) {
      throw new InvalidOutboxEventPayloadError(eventType);
    }

    return hydrated;
  }
}

export class UnknownOutboxEventTypeError extends Error {
  constructor(eventType: string) {
    super(`Unknown outbox event type: ${eventType}`);
  }
}

export class InvalidOutboxEventPayloadError extends Error {
  constructor(eventType: string) {
    super(`Invalid outbox event payload for type: ${eventType}`);
  }
}

interface OutboxPayloadShape {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: string | Date;
}

function isOutboxPayload(payload: unknown): payload is OutboxPayloadShape {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  return (
    hasStringProperty(payload, 'aggregateId') &&
    hasStringProperty(payload, 'aggregateType') &&
    hasStringProperty(payload, 'eventId') &&
    hasStringProperty(payload, 'eventType') &&
    hasDateLikeProperty(payload, 'occurredAt')
  );
}

function isEventTypeRegistrationArray(
  registration: EventTypeRegistration | readonly EventTypeRegistration[],
): registration is readonly EventTypeRegistration[] {
  return Array.isArray(registration);
}

function hasStringProperty(value: object, property: keyof OutboxPayloadShape): boolean {
  return property in value && typeof Reflect.get(value, property) === 'string';
}

function hasDateLikeProperty(value: object, property: keyof OutboxPayloadShape): boolean {
  const propertyValue: unknown = Reflect.get(value, property);

  return typeof propertyValue === 'string' || propertyValue instanceof Date;
}
