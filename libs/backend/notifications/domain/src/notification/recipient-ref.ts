import type { Brand, UserId } from '@det/shared-types';

export type TelegramChatId = Brand<string, 'TelegramChatId'>;

export const TelegramChatId = {
  from(value: string): TelegramChatId {
    return value as TelegramChatId;
  },
};

export type RecipientRef =
  | { readonly kind: 'user'; readonly userId: UserId }
  | { readonly kind: 'phone'; readonly phone: string }
  | { readonly kind: 'email'; readonly email: string }
  | { readonly kind: 'telegramChat'; readonly chatId: TelegramChatId };
