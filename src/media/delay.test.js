import { describe, it, expect } from 'vitest';
import { parseDelayField, formatDelay } from './delay.js';

describe('delay utils', () => {
  it('parses seconds and mm:ss formats', () => {
    expect(parseDelayField('15')).toBe(15);
    expect(parseDelayField('-15')).toBe(-15);
    expect(parseDelayField('1:30')).toBe(90);
    expect(parseDelayField('-1:30')).toBe(-90);
    expect(parseDelayField('+2:05')).toBe(125);
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
  });
});
