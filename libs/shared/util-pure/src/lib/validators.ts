import { DateTime } from './date-time.value-object';

import type { Money } from './money.value-object';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUUID(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseDate(value: string | number | Date): DateTime {
  return DateTime.from(value);
}

export function formatRubAmount(value: Money): string {
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value.toNumber());
}
