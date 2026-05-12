export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DEDUPED = 'DEDUPED',
  EXPIRED = 'EXPIRED',
}

export const TERMINAL_STATUSES: ReadonlySet<NotificationStatus> = new Set([
  NotificationStatus.SENT,
  NotificationStatus.FAILED,
  NotificationStatus.DEDUPED,
  NotificationStatus.EXPIRED,
]);
