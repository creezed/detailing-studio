import { DateTime } from '@det/backend-shared-ddd';

import { IanaTz, QuietHours } from './quiet-hours.value-object';

describe('QuietHours', () => {
  describe('cross-midnight range (22:00–08:00)', () => {
    const qh = QuietHours.create({
      startMinuteOfDay: 22 * 60,
      endMinuteOfDay: 8 * 60,
      timezone: IanaTz.from('UTC'),
    });

    it('23:30 UTC → within', () => {
      const now = DateTime.from('2024-06-15T23:30:00Z');
      expect(qh.isWithin(now)).toBe(true);
    });

    it('03:00 UTC → within', () => {
      const now = DateTime.from('2024-06-15T03:00:00Z');
      expect(qh.isWithin(now)).toBe(true);
    });

    it('08:30 UTC → outside', () => {
      const now = DateTime.from('2024-06-15T08:30:00Z');
      expect(qh.isWithin(now)).toBe(false);
    });

    it('22:00 UTC → within (start inclusive)', () => {
      const now = DateTime.from('2024-06-15T22:00:00Z');
      expect(qh.isWithin(now)).toBe(true);
    });

    it('08:00 UTC → outside (end exclusive)', () => {
      const now = DateTime.from('2024-06-15T08:00:00Z');
      expect(qh.isWithin(now)).toBe(false);
    });
  });

  describe('same-day range (09:00–18:00)', () => {
    const qh = QuietHours.create({
      startMinuteOfDay: 9 * 60,
      endMinuteOfDay: 18 * 60,
      timezone: IanaTz.from('UTC'),
    });

    it('10:00 UTC → within', () => {
      const now = DateTime.from('2024-06-15T10:00:00Z');
      expect(qh.isWithin(now)).toBe(true);
    });

    it('19:00 UTC → outside', () => {
      const now = DateTime.from('2024-06-15T19:00:00Z');
      expect(qh.isWithin(now)).toBe(false);
    });

    it('09:00 UTC → within (start inclusive)', () => {
      const now = DateTime.from('2024-06-15T09:00:00Z');
      expect(qh.isWithin(now)).toBe(true);
    });

    it('18:00 UTC → outside (end exclusive)', () => {
      const now = DateTime.from('2024-06-15T18:00:00Z');
      expect(qh.isWithin(now)).toBe(false);
    });
  });

  describe('timezone conversion', () => {
    it('22:00 Europe/Moscow for DateTime in UTC → converts correctly', () => {
      const qh = QuietHours.create({
        startMinuteOfDay: 22 * 60,
        endMinuteOfDay: 8 * 60,
        timezone: IanaTz.from('Europe/Moscow'),
      });

      const utcNow = DateTime.from('2024-06-15T20:30:00Z');
      expect(qh.isWithin(utcNow)).toBe(true);
    });

    it('UTC time outside Moscow quiet hours → false', () => {
      const qh = QuietHours.create({
        startMinuteOfDay: 22 * 60,
        endMinuteOfDay: 8 * 60,
        timezone: IanaTz.from('Europe/Moscow'),
      });

      const utcNow = DateTime.from('2024-06-15T10:00:00Z');
      expect(qh.isWithin(utcNow)).toBe(false);
    });
  });

  describe('snapshot', () => {
    it('roundtrips via toSnapshot / restore', () => {
      const original = QuietHours.create({
        startMinuteOfDay: 22 * 60,
        endMinuteOfDay: 8 * 60,
        timezone: IanaTz.from('Europe/Moscow'),
      });
      const restored = QuietHours.restore(original.toSnapshot());

      expect(restored.equals(original)).toBe(true);
      expect(restored.startMinuteOfDay).toBe(22 * 60);
      expect(restored.endMinuteOfDay).toBe(8 * 60);
      expect(restored.timezone).toBe('Europe/Moscow');
    });
  });

  describe('equals', () => {
    it('returns true for identical props', () => {
      const a = QuietHours.create({
        startMinuteOfDay: 0,
        endMinuteOfDay: 60,
        timezone: IanaTz.from('UTC'),
      });
      const b = QuietHours.create({
        startMinuteOfDay: 0,
        endMinuteOfDay: 60,
        timezone: IanaTz.from('UTC'),
      });

      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different props', () => {
      const a = QuietHours.create({
        startMinuteOfDay: 0,
        endMinuteOfDay: 60,
        timezone: IanaTz.from('UTC'),
      });
      const b = QuietHours.create({
        startMinuteOfDay: 0,
        endMinuteOfDay: 120,
        timezone: IanaTz.from('UTC'),
      });

      expect(a.equals(b)).toBe(false);
    });
  });
});
