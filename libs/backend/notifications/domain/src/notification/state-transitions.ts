import { NotificationStatus } from './notification-status';

export const ALLOWED_TRANSITIONS: Readonly<
  Record<NotificationStatus, readonly NotificationStatus[]>
> = {
  [NotificationStatus.PENDING]: [
    NotificationStatus.QUEUED,
    NotificationStatus.DEDUPED,
    NotificationStatus.EXPIRED,
  ],
  [NotificationStatus.QUEUED]: [NotificationStatus.SENDING, NotificationStatus.EXPIRED],
  [NotificationStatus.SENDING]: [
    NotificationStatus.SENT,
    NotificationStatus.PENDING,
    NotificationStatus.FAILED,
  ],
  [NotificationStatus.SENT]: [],
  [NotificationStatus.FAILED]: [],
  [NotificationStatus.DEDUPED]: [],
  [NotificationStatus.EXPIRED]: [],
};

export function canTransition(from: NotificationStatus, to: NotificationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
