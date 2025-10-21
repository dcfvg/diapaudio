import { describe, it, expect } from 'vitest';
import {
  isValidNumber,
  clamp,
  positive,
  withDefault,
  isInRange,
  roundTo,
} from '../numberUtils.js';

describe('numberUtils', () => {
  describe('isValidNumber', () => {
    it('returns true for finite numbers', () => {
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(1)).toBe(true);
      expect(isValidNumber(-1)).toBe(true);
      expect(isValidNumber(3.14)).toBe(true);
      expect(isValidNumber(-999.999)).toBe(true);
    });

    it('returns false for invalid numbers', () => {
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
    });

    it('returns false for non-numeric types', () => {
      expect(isValidNumber('123')).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
      expect(isValidNumber({})).toBe(false);
      expect(isValidNumber([])).toBe(false);
      expect(isValidNumber(true)).toBe(false);
    });
  });

  describe('clamp', () => {
    it('clamps values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(7.5, 0, 10)).toBe(7.5);
    });

    it('clamps values below minimum', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, 0, 10)).toBe(0);
    });

    it('clamps values above maximum', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(1000, 0, 10)).toBe(10);
    });

    it('handles edge cases at boundaries', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('handles negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });

    it('handles single-value ranges', () => {
      expect(clamp(5, 7, 7)).toBe(7);
      expect(clamp(10, 7, 7)).toBe(7);
    });
  });

  describe('positive', () => {
    it('returns positive values unchanged', () => {
      expect(positive(5)).toBe(5);
      expect(positive(100)).toBe(100);
      expect(positive(0.1)).toBe(0.1);
    });

    it('returns zero unchanged', () => {
      expect(positive(0)).toBe(0);
      expect(positive(-0)).toBe(0);
    });

    it('converts negative values to 0', () => {
      expect(positive(-5)).toBe(0);
      expect(positive(-0.1)).toBe(0);
      expect(positive(-1000)).toBe(0);
    });

    it('handles edge cases', () => {
      expect(positive(Number.MIN_VALUE)).toBeGreaterThan(0);
      expect(positive(-Number.MIN_VALUE)).toBe(0);
    });
  });

  describe('withDefault', () => {
    it('returns value when valid finite number', () => {
      expect(withDefault(5, 10)).toBe(5);
      expect(withDefault(0, 10)).toBe(0);
      expect(withDefault(-5, 10)).toBe(-5);
      expect(withDefault(3.14, 10)).toBe(3.14);
    });

    it('returns default when value is NaN', () => {
      expect(withDefault(NaN, 10)).toBe(10);
    });

    it('returns default when value is Infinity', () => {
      expect(withDefault(Infinity, 10)).toBe(10);
      expect(withDefault(-Infinity, 10)).toBe(10);
    });

    it('returns default when value is null or undefined', () => {
      expect(withDefault(null, 10)).toBe(10);
      expect(withDefault(undefined, 10)).toBe(10);
    });

    it('returns default when value is non-numeric', () => {
      expect(withDefault('123', 10)).toBe(10);
      expect(withDefault({}, 10)).toBe(10);
      expect(withDefault([], 10)).toBe(10);
    });

    it('handles default value of 0', () => {
      expect(withDefault(NaN, 0)).toBe(0);
      expect(withDefault(5, 0)).toBe(5);
    });

    it('handles negative default values', () => {
      expect(withDefault(NaN, -1)).toBe(-1);
      expect(withDefault(5, -1)).toBe(5);
    });
  });

  describe('isInRange', () => {
    it('returns true for values within range', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
      expect(isInRange(7.5, 0, 10)).toBe(true);
    });

    it('returns true for values at boundaries (inclusive)', () => {
      expect(isInRange(0, 0, 10)).toBe(true);
      expect(isInRange(10, 0, 10)).toBe(true);
    });

    it('returns false for values below minimum', () => {
      expect(isInRange(-1, 0, 10)).toBe(false);
      expect(isInRange(-0.01, 0, 10)).toBe(false);
    });

    it('returns false for values above maximum', () => {
      expect(isInRange(11, 0, 10)).toBe(false);
      expect(isInRange(10.01, 0, 10)).toBe(false);
    });

    it('returns false for invalid numbers', () => {
      expect(isInRange(NaN, 0, 10)).toBe(false);
      expect(isInRange(Infinity, 0, 10)).toBe(false);
      expect(isInRange(-Infinity, 0, 10)).toBe(false);
    });

    it('returns false for non-numeric values', () => {
      expect(isInRange('5', 0, 10)).toBe(false);
      expect(isInRange(null, 0, 10)).toBe(false);
      expect(isInRange(undefined, 0, 10)).toBe(false);
    });

    it('handles negative ranges', () => {
      expect(isInRange(-5, -10, -1)).toBe(true);
      expect(isInRange(-10, -10, -1)).toBe(true);
      expect(isInRange(-1, -10, -1)).toBe(true);
      expect(isInRange(0, -10, -1)).toBe(false);
    });

    it('handles single-value ranges', () => {
      expect(isInRange(7, 7, 7)).toBe(true);
      expect(isInRange(6, 7, 7)).toBe(false);
      expect(isInRange(8, 7, 7)).toBe(false);
    });
  });

  describe('roundTo', () => {
    it('rounds to specified decimal places', () => {
      expect(roundTo(3.14159, 2)).toBe(3.14);
      expect(roundTo(3.14159, 3)).toBe(3.142);
      expect(roundTo(3.14159, 4)).toBe(3.1416);
    });

    it('rounds to integer when decimals is 0', () => {
      expect(roundTo(3.14159, 0)).toBe(3);
      expect(roundTo(3.6, 0)).toBe(4);
      expect(roundTo(3.5, 0)).toBe(4);
    });

    it('defaults to 0 decimals when not specified', () => {
      expect(roundTo(3.14159)).toBe(3);
      expect(roundTo(3.7)).toBe(4);
    });

    it('handles edge cases', () => {
      expect(roundTo(0, 2)).toBe(0);
      expect(roundTo(0, 0)).toBe(0);
    });

    it('handles negative numbers', () => {
      expect(roundTo(-3.14159, 2)).toBe(-3.14);
      expect(roundTo(-3.14159, 0)).toBe(-3);
      expect(roundTo(-3.7, 0)).toBe(-4);
    });

    it('handles very small decimals', () => {
      expect(roundTo(0.000123, 5)).toBe(0.00012);
      expect(roundTo(0.000123, 6)).toBe(0.000123);
    });

    it('handles very large decimals', () => {
      expect(roundTo(123456.789, 1)).toBe(123456.8);
      expect(roundTo(123456.789, 0)).toBe(123457);
    });

    it('handles rounding edge cases (0.5)', () => {
      expect(roundTo(2.5, 0)).toBe(3); // Rounds up
      expect(roundTo(3.5, 0)).toBe(4); // Rounds up
      expect(roundTo(-2.5, 0)).toBe(-2); // Rounds toward zero
      expect(roundTo(-3.5, 0)).toBe(-3); // Rounds toward zero (JavaScript Math.round behavior)
    });
  });
});
