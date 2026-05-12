import { AggregateRoot, DateTime } from '@det/backend-shared-ddd';
import { NotificationId } from '@det/shared-types';

import { NotificationStatus, TERMINAL_STATUSES } from './notification-status';
import { InvalidStateTransitionError, MaxAttemptsReachedError } from './notification.errors';
import {
  NotificationDeduped,
  NotificationDelivered,
  NotificationExpired,
  NotificationFailed,
  NotificationIssued,
  NotificationQueued,
  NotificationRetryScheduled,
} from './notification.events';
import { canTransition } from './state-transitions';

import type { DedupKey, DedupKeySnapshot } from './dedup-key';
import type { DeliveryAttempt, DeliveryAttemptSnapshot } from './delivery-attempt';
import type { RecipientRef } from './recipient-ref';
import type { NotificationChannel } from '../value-objects/notification-channel';
import type { TemplateCode } from '../value-objects/template-code';
import type { TemplatePayload } from '../value-objects/template-payload';

const MAX_ATTEMPTS = 3;

export interface IssueNotificationProps {
  readonly id: NotificationId;
  readonly recipient: RecipientRef;
  readonly templateCode: TemplateCode;
  readonly channel: NotificationChannel;
  readonly payload: TemplatePayload;
  readonly scheduledFor: DateTime | null;
  readonly dedupKey: DedupKey | null;
  readonly now: DateTime;
  readonly ttlHours?: number;
}

export interface NotificationSnapshot {
  readonly id: string;
  readonly recipient: RecipientRef;
  readonly templateCode: string;
  readonly channel: string;
  readonly payload: Record<string, string | number | boolean | null>;
  readonly status: string;
  readonly attempts: readonly DeliveryAttemptSnapshot[];
  readonly scheduledFor: string | null;
  readonly dedupKey: DedupKeySnapshot | null;
  readonly createdAt: string;
  readonly sentAt: string | null;
  readonly failedAt: string | null;
  readonly expiresAt: string;
}

export class Notification extends AggregateRoot<NotificationId> {
  private constructor(
    private readonly _id: NotificationId,
    private readonly _recipient: RecipientRef,
    private readonly _templateCode: TemplateCode,
    private readonly _channel: NotificationChannel,
    private readonly _payload: TemplatePayload,
    private _status: NotificationStatus,
    private readonly _attempts: DeliveryAttempt[],
    private readonly _scheduledFor: DateTime | null,
    private readonly _dedupKey: DedupKey | null,
    private readonly _createdAt: DateTime,
    private _sentAt: DateTime | null,
    private _failedAt: DateTime | null,
    private readonly _expiresAt: DateTime,
  ) {
    super();
  }

  override get id(): NotificationId {
    return this._id;
  }

  get status(): NotificationStatus {
    return this._status;
  }

  get dedupKey(): DedupKey | null {
    return this._dedupKey;
  }

  get createdAt(): DateTime {
    return this._createdAt;
  }

  get attempts(): readonly DeliveryAttempt[] {
    return this._attempts;
  }

  static issue(props: IssueNotificationProps): Notification {
    const ttlHours = props.ttlHours ?? 24;
    const expiresAtMs = props.now.toDate().getTime() + ttlHours * 60 * 60 * 1000;

    const n = new Notification(
      props.id,
      props.recipient,
      props.templateCode,
      props.channel,
      props.payload,
      NotificationStatus.PENDING,
      [],
      props.scheduledFor,
      props.dedupKey,
      props.now,
      null,
      null,
      DateTime.from(expiresAtMs),
    );

    n.addEvent(new NotificationIssued(n._id, n._templateCode, n._channel, props.now));

    return n;
  }

  static restore(snapshot: NotificationSnapshot): Notification {
    return new Notification(
      NotificationId.from(snapshot.id),
      snapshot.recipient,
      snapshot.templateCode as TemplateCode,
      snapshot.channel as NotificationChannel,
      snapshot.payload as TemplatePayload,
      snapshot.status as NotificationStatus,
      snapshot.attempts.map((a) => ({
        attemptNo: a.attemptNo,
        attemptedAt: DateTime.from(a.attemptedAt),
        error: a.error,
        providerId: a.providerId,
      })),
      snapshot.scheduledFor ? DateTime.from(snapshot.scheduledFor) : null,
      snapshot.dedupKey
        ? {
            templateCode: snapshot.dedupKey.templateCode as TemplateCode,
            scopeKey: snapshot.dedupKey.scopeKey,
            windowEndsAt: DateTime.from(snapshot.dedupKey.windowEndsAt),
          }
        : null,
      DateTime.from(snapshot.createdAt),
      snapshot.sentAt ? DateTime.from(snapshot.sentAt) : null,
      snapshot.failedAt ? DateTime.from(snapshot.failedAt) : null,
      DateTime.from(snapshot.expiresAt),
    );
  }

  enqueue(now: DateTime): void {
    this.transitionTo(NotificationStatus.QUEUED);
    this.addEvent(new NotificationQueued(this._id, now));
  }

  markDeduped(now: DateTime): void {
    this.transitionTo(NotificationStatus.DEDUPED);
    this.addEvent(new NotificationDeduped(this._id, now));
  }

  markSending(): void {
    this.transitionTo(NotificationStatus.SENDING);
  }

  markSent(providerId: string, now: DateTime): void {
    this.transitionTo(NotificationStatus.SENT);
    this._sentAt = now;
    this._attempts.push({
      attemptNo: this._attempts.length + 1,
      attemptedAt: now,
      error: null,
      providerId,
    });
    this.addEvent(new NotificationDelivered(this._id, providerId, now));
  }

  markRetryable(error: string, now: DateTime): void {
    if (this._attempts.length >= MAX_ATTEMPTS) {
      throw new MaxAttemptsReachedError(MAX_ATTEMPTS);
    }

    this._attempts.push({
      attemptNo: this._attempts.length + 1,
      attemptedAt: now,
      error,
      providerId: null,
    });

    this.transitionTo(NotificationStatus.PENDING);
    this.addEvent(new NotificationRetryScheduled(this._id, this._attempts.length, error, now));
  }

  markFailed(error: string, now: DateTime): void {
    this._attempts.push({
      attemptNo: this._attempts.length + 1,
      attemptedAt: now,
      error,
      providerId: null,
    });

    this.transitionTo(NotificationStatus.FAILED);
    this._failedAt = now;
    this.addEvent(new NotificationFailed(this._id, error, now));
  }

  markExpired(now: DateTime): void {
    if (now.toDate().getTime() <= this._expiresAt.toDate().getTime()) {
      throw new InvalidStateTransitionError(this._status, NotificationStatus.EXPIRED);
    }

    this.transitionTo(NotificationStatus.EXPIRED);
    this.addEvent(new NotificationExpired(this._id, now));
  }

  toSnapshot(): NotificationSnapshot {
    return {
      attempts: this._attempts.map((a) => ({
        attemptNo: a.attemptNo,
        attemptedAt: a.attemptedAt.iso(),
        error: a.error,
        providerId: a.providerId,
      })),
      channel: this._channel,
      createdAt: this._createdAt.iso(),
      dedupKey: this._dedupKey
        ? {
            scopeKey: this._dedupKey.scopeKey,
            templateCode: this._dedupKey.templateCode,
            windowEndsAt: this._dedupKey.windowEndsAt.iso(),
          }
        : null,
      expiresAt: this._expiresAt.iso(),
      failedAt: this._failedAt?.iso() ?? null,
      id: this._id,
      payload: { ...this._payload },
      recipient: this._recipient,
      scheduledFor: this._scheduledFor?.iso() ?? null,
      sentAt: this._sentAt?.iso() ?? null,
      status: this._status,
      templateCode: this._templateCode,
    };
  }

  private transitionTo(to: NotificationStatus): void {
    if (TERMINAL_STATUSES.has(this._status)) {
      throw new InvalidStateTransitionError(this._status, to);
    }

    if (!canTransition(this._status, to)) {
      throw new InvalidStateTransitionError(this._status, to);
    }

    this._status = to;
  }
}
