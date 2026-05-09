import type { DateTime } from './date-time.value-object';

export const CLOCK = Symbol('CLOCK');

export interface IClock {
  now(): DateTime;
}
