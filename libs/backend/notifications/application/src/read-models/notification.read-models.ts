export interface CursorPaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface MyNotificationDto {
  readonly id: string;
  readonly templateCode: string;
  readonly channel: string;
  readonly status: string;
  readonly createdAt: string;
  readonly sentAt: string | null;
  readonly renderedPreview: string;
}

export interface AdminNotificationDto {
  readonly id: string;
  readonly templateCode: string;
  readonly channel: string;
  readonly status: string;
  readonly recipientUserId: string | null;
  readonly recipientPhone: string | null;
  readonly recipientEmail: string | null;
  readonly createdAt: string;
  readonly sentAt: string | null;
  readonly failedAt: string | null;
  readonly lastError: string | null;
  readonly attempts: number;
  readonly providerId: string | null;
  readonly payload: Record<string, unknown>;
}

export interface UserNotificationPreferencesDto {
  readonly channelsByTemplate: Record<string, readonly string[]>;
  readonly quietHours: {
    readonly startMinuteOfDay: number;
    readonly endMinuteOfDay: number;
    readonly timezone: string;
  } | null;
  readonly unsubscribedChannels: readonly string[];
}

export interface NotificationDetailDto {
  readonly id: string;
  readonly templateCode: string;
  readonly channel: string;
  readonly status: string;
  readonly recipientUserId: string | null;
  readonly recipientPhone: string | null;
  readonly recipientEmail: string | null;
  readonly createdAt: string;
  readonly sentAt: string | null;
  readonly failedAt: string | null;
  readonly expiresAt: string;
  readonly lastError: string | null;
  readonly attempts: readonly {
    readonly attemptNo: number;
    readonly attemptedAt: string;
    readonly error: string | null;
    readonly providerId: string | null;
  }[];
  readonly payload: Record<string, unknown>;
}
