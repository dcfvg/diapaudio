import { describe, it, expect } from 'vitest';
import { formatClock, formatTime, formatClockWithSeconds, formatDateAndTime } from '../formatters.js';

describe('formatters', () => {
  describe('formatClock', () => {
    it('formats hours and minutes with leading zeros', () => {
      const date = new Date(2025, 0, 15, 9, 5);
      expect(formatClock(date)).toBe('09:05');
    });

    it('handles noon and midnight', () => {
      const noon = new Date(2025, 0, 15, 12, 0);
      const midnight = new Date(2025, 0, 15, 0, 0);
      expect(formatClock(noon)).toBe('12:00');
      expect(formatClock(midnight)).toBe('00:00');
    });

    it('handles double-digit hours and minutes', () => {
      const date = new Date(2025, 0, 15, 14, 23);
      expect(formatClock(date)).toBe('14:23');
    });
  });

  describe('formatTime', () => {
    it('formats seconds as MM:SS', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(59)).toBe('00:59');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('formats hours:minutes:seconds as HH:MM:SS', () => {
      expect(formatTime(3600)).toBe('01:00:00');
      expect(formatTime(3661)).toBe('01:01:01');
      expect(formatTime(36000)).toBe('10:00:00');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatTime(-10)).toBe('00:00');
      expect(formatTime(NaN)).toBe('00:00');
      expect(formatTime(Infinity)).toBe('00:00');
    });

    it('rounds down fractional seconds', () => {
      expect(formatTime(90.7)).toBe('01:30');
      expect(formatTime(3600.999)).toBe('01:00:00');
    });
  });

  describe('formatClockWithSeconds', () => {
    it('formats hours, minutes, and seconds with leading zeros', () => {
      const date = new Date(2025, 0, 15, 9, 5, 3);
      expect(formatClockWithSeconds(date)).toBe('09:05:03');
    });

    it('handles midnight and noon with seconds', () => {
      const noon = new Date(2025, 0, 15, 12, 0, 0);
      const midnight = new Date(2025, 0, 15, 0, 0, 0);
      expect(formatClockWithSeconds(noon)).toBe('12:00:00');
      expect(formatClockWithSeconds(midnight)).toBe('00:00:00');
    });

    it('handles double-digit values', () => {
      const date = new Date(2025, 0, 15, 23, 59, 59);
      expect(formatClockWithSeconds(date)).toBe('23:59:59');
    });
  });

  describe('formatDateAndTime', () => {
    it('formats date and time in DD/MM/YYYY — HH:MM:SS format', () => {
      const date = new Date(2025, 0, 15, 14, 23, 45);
      expect(formatDateAndTime(date)).toBe('15/01/2025 — 14:23:45');
    });

    it('handles single-digit day and month with leading zeros', () => {
      const date = new Date(2025, 0, 5, 9, 5, 3);
      expect(formatDateAndTime(date)).toBe('05/01/2025 — 09:05:03');
    });

    it('handles year-end dates', () => {
      const date = new Date(2024, 11, 31, 23, 59, 59);
      expect(formatDateAndTime(date)).toBe('31/12/2024 — 23:59:59');
    });
  });
});
