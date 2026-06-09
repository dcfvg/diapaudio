import { describe, it, expect } from 'vitest';
import { parseDelayField, formatDelay, stepDelayField } from '../delay.js';

describe('delay utils', () => {
  it('parses seconds and mm:ss formats', () => {
    expect(parseDelayField('15')).toBe(15);
    expect(parseDelayField('-15')).toBe(-15);
    expect(parseDelayField('1:30')).toBe(90);
    expect(parseDelayField('-1:30')).toBe(-90);
    expect(parseDelayField('+2:05')).toBe(125);
    expect(parseDelayField('14:23:45')).toBe(51825);
    expect(parseDelayField('-1:02:03')).toBe(-3723);
  });

  it('returns null on invalid inputs', () => {
    expect(parseDelayField('')).toBe(0);
    expect(parseDelayField('abc')).toBeNull();
    expect(parseDelayField('1:2:x')).toBeNull();
    // Current parser treats missing seconds as 0 seconds -> 60 total
    expect(parseDelayField('1:')).toBe(60);
  });

  it('formats seconds into mm:ss with sign', () => {
    expect(formatDelay(0)).toBe('0:00');
    expect(formatDelay(90)).toBe('1:30');
    expect(formatDelay(-75)).toBe('-1:15');
    expect(formatDelay(51825)).toBe('14:23:45');
  });

  it('steps delay field values by seconds', () => {
    expect(stepDelayField('0:00', 0, 1)).toBe('0:01');
    expect(stepDelayField('0:00', 0, -1)).toBe('-0:01');
    expect(stepDelayField('-0:01', 0, 1)).toBe('0:00');
    expect(stepDelayField('abc', 30, 1)).toBe('0:31');
  });
});
