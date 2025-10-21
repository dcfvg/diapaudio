import { describe, it, expect } from 'vitest';
import {
  computeMinVisibleMs,
  computeScaledHoldMs,
  computeCompositionIntervalMs,
  computeSnapGridMs,
  resolveImageScheduleSettings,
} from '../settingsHelpers.js';

describe('settingsHelpers', () => {
  describe('computeMinVisibleMs', () => {
    it('computes with default speed', () => {
      expect(computeMinVisibleMs(6, 1)).toBe(6000);
      expect(computeMinVisibleMs(10, 1)).toBe(10000);
      expect(computeMinVisibleMs(1, 1)).toBe(1000);
    });

    it('applies speed scaling', () => {
      expect(computeMinVisibleMs(6, 2)).toBe(12000); // 2x speed
      expect(computeMinVisibleMs(6, 0.5)).toBe(3000); // 0.5x speed
      expect(computeMinVisibleMs(10, 1.5)).toBe(15000); // 1.5x speed
    });

    it('enforces minimum value', () => {
      expect(computeMinVisibleMs(0.5, 1)).toBe(1000); // Min is 1000ms
      expect(computeMinVisibleMs(0.1, 1)).toBe(1000);
      expect(computeMinVisibleMs(0, 1)).toBe(6000); // 0 is invalid, uses default
    });

    it('handles invalid imageDisplaySeconds', () => {
      expect(computeMinVisibleMs(NaN, 1)).toBe(6000); // Falls back to default (6s)
      expect(computeMinVisibleMs(-1, 1)).toBe(6000); // Negative falls back to default
      expect(computeMinVisibleMs(null, 1)).toBe(6000);
      expect(computeMinVisibleMs(undefined, 1)).toBe(6000);
    });

    it('handles invalid speed', () => {
      expect(computeMinVisibleMs(6, NaN)).toBe(6000); // Invalid speed defaults to 1
      expect(computeMinVisibleMs(6, 0)).toBe(6000); // Zero speed defaults to 1
      expect(computeMinVisibleMs(6, -1)).toBe(6000); // Negative speed defaults to 1
      expect(computeMinVisibleMs(6, Infinity)).toBe(6000);
    });

    it('rounds result to integer milliseconds', () => {
      expect(computeMinVisibleMs(5.7, 1)).toBe(5700);
      expect(computeMinVisibleMs(5.7, 1.3)).toBe(7410);
    });

    it('handles edge cases', () => {
      expect(computeMinVisibleMs(0, 0)).toBe(6000); // Both invalid, use defaults
      expect(computeMinVisibleMs(1, 1)).toBe(1000); // Exactly at minimum
    });
  });

  describe('computeScaledHoldMs', () => {
    it('computes with default speed', () => {
      expect(computeScaledHoldMs(45, 1)).toBe(45000);
      expect(computeScaledHoldMs(60, 1)).toBe(60000);
      expect(computeScaledHoldMs(0, 1)).toBe(0);
    });

    it('applies speed scaling', () => {
      expect(computeScaledHoldMs(45, 2)).toBe(90000); // 2x speed
      expect(computeScaledHoldMs(45, 0.5)).toBe(22500); // 0.5x speed
      expect(computeScaledHoldMs(30, 1.5)).toBe(45000); // 1.5x speed
    });

    it('handles zero hold time', () => {
      expect(computeScaledHoldMs(0, 1)).toBe(0);
      expect(computeScaledHoldMs(0, 2)).toBe(0);
    });

    it('handles invalid imageHoldSeconds', () => {
      expect(computeScaledHoldMs(NaN, 1)).toBe(45000); // Default hold (45s)
      expect(computeScaledHoldMs(-1, 1)).toBe(45000);
      expect(computeScaledHoldMs(null, 1)).toBe(45000);
      expect(computeScaledHoldMs(undefined, 1)).toBe(45000);
    });

    it('handles invalid speed', () => {
      expect(computeScaledHoldMs(45, NaN)).toBe(45000); // Invalid speed defaults to 1
      expect(computeScaledHoldMs(45, 0)).toBe(45000);
      expect(computeScaledHoldMs(45, -1)).toBe(45000);
    });

    it('rounds result to integer milliseconds', () => {
      expect(computeScaledHoldMs(45.5, 1)).toBe(45500);
      expect(computeScaledHoldMs(45, 1.3)).toBe(58500);
    });

    it('respects clamping from getImageHoldMs', () => {
      // Very large hold times should be clamped by getImageHoldMs (180s max)
      const result = computeScaledHoldMs(200, 1);
      // getImageHoldMs clamps to 180s, then we scale by 1x
      expect(result).toBe(180000); // Max is 180s = 180000ms
    });
  });

  describe('computeCompositionIntervalMs', () => {
    it('converts seconds to milliseconds', () => {
      expect(computeCompositionIntervalMs(1)).toBe(1000);
      expect(computeCompositionIntervalMs(2)).toBe(2000);
      expect(computeCompositionIntervalMs(5)).toBe(5000);
    });

    it('enforces minimum interval', () => {
      expect(computeCompositionIntervalMs(0.1)).toBe(500); // Min is 500ms
      expect(computeCompositionIntervalMs(0.3)).toBe(500);
      expect(computeCompositionIntervalMs(0.5)).toBe(500);
    });

    it('handles invalid input with max default', () => {
      expect(computeCompositionIntervalMs(NaN)).toBe(2000); // Max default (2s)
      expect(computeCompositionIntervalMs(0)).toBe(2000);
      expect(computeCompositionIntervalMs(-1)).toBe(2000);
      expect(computeCompositionIntervalMs(null)).toBe(2000);
      expect(computeCompositionIntervalMs(undefined)).toBe(2000);
    });

    it('handles decimal seconds', () => {
      expect(computeCompositionIntervalMs(1.5)).toBe(1500);
      expect(computeCompositionIntervalMs(0.7)).toBe(700);
    });

    it('allows values above minimum', () => {
      expect(computeCompositionIntervalMs(0.6)).toBe(600);
      expect(computeCompositionIntervalMs(1)).toBe(1000);
      expect(computeCompositionIntervalMs(10)).toBe(10000);
    });
  });

  describe('computeSnapGridMs', () => {
    it('converts seconds to milliseconds', () => {
      expect(computeSnapGridMs(1)).toBe(1000);
      expect(computeSnapGridMs(5)).toBe(5000);
      expect(computeSnapGridMs(10)).toBe(10000);
    });

    it('handles decimal seconds', () => {
      expect(computeSnapGridMs(0.5)).toBe(500);
      expect(computeSnapGridMs(1.5)).toBe(1500);
    });

    it('returns null for invalid input', () => {
      expect(computeSnapGridMs(0)).toBe(null);
      expect(computeSnapGridMs(-1)).toBe(null);
      expect(computeSnapGridMs(NaN)).toBe(null);
      expect(computeSnapGridMs(null)).toBe(null);
      expect(computeSnapGridMs(undefined)).toBe(null);
    });

    it('rounds to integer milliseconds', () => {
      expect(computeSnapGridMs(1.234)).toBe(1234);
      expect(computeSnapGridMs(2.789)).toBe(2789);
    });
  });

  describe('resolveImageScheduleSettings', () => {
    it('resolves all settings together', () => {
      const settings = {
        imageDisplaySeconds: 6,
        imageHoldSeconds: 45,
        compositionIntervalSeconds: 1,
        snapToGrid: true,
        snapGridSeconds: 5,
        speed: 1,
      };

      const result = resolveImageScheduleSettings(settings);

      expect(result.minVisibleMs).toBe(6000);
      expect(result.holdMs).toBe(45000);
      expect(result.compositionIntervalMs).toBe(1000);
      expect(result.snapToGrid).toBe(true);
      expect(result.snapGridMs).toBe(5000);
    });

    it('applies speed to time-based settings', () => {
      const settings = {
        imageDisplaySeconds: 6,
        imageHoldSeconds: 45,
        compositionIntervalSeconds: 1,
        speed: 2,
      };

      const result = resolveImageScheduleSettings(settings);

      expect(result.minVisibleMs).toBe(12000); // Scaled by 2x
      expect(result.holdMs).toBe(90000); // Scaled by 2x
      expect(result.compositionIntervalMs).toBe(1000); // NOT scaled
    });

    it('applies speed at 0.5x', () => {
      const settings = {
        imageDisplaySeconds: 10,
        imageHoldSeconds: 60,
        speed: 0.5,
      };

      const result = resolveImageScheduleSettings(settings);

      expect(result.minVisibleMs).toBe(5000); // Scaled by 0.5x
      expect(result.holdMs).toBe(30000); // Scaled by 0.5x
    });

    it('handles missing speed', () => {
      const settings = {
        imageDisplaySeconds: 6,
        imageHoldSeconds: 45,
      };

      const result = resolveImageScheduleSettings(settings);

      expect(result.minVisibleMs).toBe(6000); // Speed defaults to 1
      expect(result.holdMs).toBe(45000); // Speed defaults to 1
    });

    it('handles invalid speed', () => {
      const settings = {
        imageDisplaySeconds: 6,
        imageHoldSeconds: 45,
        speed: NaN,
      };

      const result = resolveImageScheduleSettings(settings);

      expect(result.minVisibleMs).toBe(6000); // Speed defaults to 1
      expect(result.holdMs).toBe(45000); // Speed defaults to 1
    });

    it('handles snapToGrid disabled', () => {
      const settings = {
        snapToGrid: false,
        snapGridSeconds: 5,
      };

      const result = resolveImageScheduleSettings(settings);

      expect(result.snapToGrid).toBe(false);
      expect(result.snapGridMs).toBe(5000); // Still computed
    });

    it('handles missing snapToGrid', () => {
      const settings = {
        snapGridSeconds: 5,
      };

      const result = resolveImageScheduleSettings(settings);

      expect(result.snapToGrid).toBe(false);
      expect(result.snapGridMs).toBe(5000);
    });

    it('handles all defaults', () => {
      const settings = {};

      const result = resolveImageScheduleSettings(settings);

      expect(result.minVisibleMs).toBe(6000); // Default display
      expect(result.holdMs).toBe(45000); // Default hold
      expect(result.compositionIntervalMs).toBe(2000); // Max default
      expect(result.snapToGrid).toBe(false);
      expect(result.snapGridMs).toBe(null); // Invalid grid
    });

    it('returns consistent object structure', () => {
      const settings = { speed: 1 };
      const result = resolveImageScheduleSettings(settings);

      expect(result).toHaveProperty('minVisibleMs');
      expect(result).toHaveProperty('holdMs');
      expect(result).toHaveProperty('compositionIntervalMs');
      expect(result).toHaveProperty('snapToGrid');
      expect(result).toHaveProperty('snapGridMs');
      expect(Object.keys(result).length).toBe(5);
    });
  });
});
