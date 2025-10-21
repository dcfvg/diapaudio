import { describe, it, expect, beforeEach } from 'vitest';
import { getImageHoldMs, getImageHoldSeconds } from '../imageSettings.js';
import { useSettingsStore } from '../../state/useSettingsStore.js';

describe('imageSettings', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useSettingsStore.setState({
      imageHoldSeconds: 45, // Default
    });
  });

  describe('getImageHoldMs', () => {
    it('converts seconds to milliseconds', () => {
      expect(getImageHoldMs({ imageHoldSeconds: 45 })).toBe(45000);
      expect(getImageHoldMs({ imageHoldSeconds: 60 })).toBe(60000);
      expect(getImageHoldMs({ imageHoldSeconds: 30 })).toBe(30000);
    });

    it('handles zero explicitly', () => {
      expect(getImageHoldMs({ imageHoldSeconds: 0 })).toBe(0);
    });

    it('handles small positive values', () => {
      expect(getImageHoldMs({ imageHoldSeconds: 1 })).toBe(1000);
      expect(getImageHoldMs({ imageHoldSeconds: 0.5 })).toBe(500);
    });

    it('clamps to maximum value', () => {
      expect(getImageHoldMs({ imageHoldSeconds: 200 })).toBe(180000); // Max is 180s
      expect(getImageHoldMs({ imageHoldSeconds: 1000 })).toBe(180000);
      expect(getImageHoldMs({ imageHoldSeconds: 181 })).toBe(180000);
    });

    it('uses default when value is negative', () => {
      expect(getImageHoldMs({ imageHoldSeconds: -10 })).toBe(45000); // Invalid, uses default
      expect(getImageHoldMs({ imageHoldSeconds: -1 })).toBe(45000);
    });

    it('uses default when value is NaN', () => {
      expect(getImageHoldMs({ imageHoldSeconds: NaN })).toBe(45000);
      expect(getImageHoldMs({ imageHoldSeconds: 'not a number' })).toBe(45000);
    });

    it('uses default when value is undefined', () => {
      expect(getImageHoldMs({})).toBe(45000);
      expect(getImageHoldMs({ imageHoldSeconds: undefined })).toBe(45000);
    });

    it('uses default when value is null', () => {
      expect(getImageHoldMs({ imageHoldSeconds: null })).toBe(45000);
    });

    it('uses default when value is Infinity', () => {
      expect(getImageHoldMs({ imageHoldSeconds: Infinity })).toBe(45000);
      expect(getImageHoldMs({ imageHoldSeconds: -Infinity })).toBe(45000);
    });

    it('reads from store when no override provided', () => {
      useSettingsStore.setState({ imageHoldSeconds: 30 });
      expect(getImageHoldMs()).toBe(30000);

      useSettingsStore.setState({ imageHoldSeconds: 60 });
      expect(getImageHoldMs()).toBe(60000);
    });

    it('override takes precedence over store', () => {
      useSettingsStore.setState({ imageHoldSeconds: 30 });
      expect(getImageHoldMs({ imageHoldSeconds: 60 })).toBe(60000);
    });

    it('handles edge case at boundaries', () => {
      expect(getImageHoldMs({ imageHoldSeconds: 180 })).toBe(180000); // Exactly at max
      expect(getImageHoldMs({ imageHoldSeconds: 0 })).toBe(0); // Exactly at min
    });

    it('handles decimal seconds', () => {
      expect(getImageHoldMs({ imageHoldSeconds: 45.5 })).toBe(45500);
      expect(getImageHoldMs({ imageHoldSeconds: 1.234 })).toBe(1234);
    });
  });

  describe('getImageHoldSeconds', () => {
    it('returns hold time in seconds', () => {
      useSettingsStore.setState({ imageHoldSeconds: 45 });
      expect(getImageHoldSeconds()).toBe(45);

      useSettingsStore.setState({ imageHoldSeconds: 60 });
      expect(getImageHoldSeconds()).toBe(60);
    });

    it('rounds milliseconds to seconds', () => {
      useSettingsStore.setState({ imageHoldSeconds: 45.5 });
      expect(getImageHoldSeconds()).toBe(46); // Rounds 45500ms to 46s

      useSettingsStore.setState({ imageHoldSeconds: 45.4 });
      expect(getImageHoldSeconds()).toBe(45); // Rounds 45400ms to 45s
    });

    it('handles zero', () => {
      useSettingsStore.setState({ imageHoldSeconds: 0 });
      expect(getImageHoldSeconds()).toBe(0);
    });

    it('handles default value', () => {
      // Default is 45 seconds
      const result = getImageHoldSeconds();
      expect(result).toBe(45);
    });

    it('returns integer seconds', () => {
      useSettingsStore.setState({ imageHoldSeconds: 30.7 });
      const result = getImageHoldSeconds();
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBe(31);
    });
  });

  describe('integration', () => {
    it('getImageHoldSeconds uses getImageHoldMs internally', () => {
      // Set a value and verify consistency
      useSettingsStore.setState({ imageHoldSeconds: 75 });
      
      const ms = getImageHoldMs();
      const seconds = getImageHoldSeconds();
      
      expect(ms).toBe(75000);
      expect(seconds).toBe(75);
      expect(seconds * 1000).toBe(ms);
    });

    it('handles clamping consistently', () => {
      useSettingsStore.setState({ imageHoldSeconds: 200 });
      
      const ms = getImageHoldMs();
      const seconds = getImageHoldSeconds();
      
      expect(ms).toBe(180000); // Clamped to max
      expect(seconds).toBe(180); // Also clamped
    });
  });
});
