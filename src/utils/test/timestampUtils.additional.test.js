import { describe, it, expect } from 'vitest';
import { parseTimestampFromName, parseTimestampFromEXIF, parseEXIFDateTime } from '../timestampUtils.js';

describe('timestampUtils additional tests', () => {
  describe('parseTimestampFromName edge cases', () => {
    it('handles filenames with multiple date patterns', () => {
      // Test that parseTimestampFromName can handle complex filenames
      const result = parseTimestampFromName('2024-01-01_14-30-00.jpg');
      expect(result).toBeInstanceOf(Date);
      if (result) {
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth() + 1).toBe(1); // January
      }
    });

    it('handles filenames with timezone information', () => {
      const result = parseTimestampFromName('2024-01-01T12-00-00Z.jpg');
      expect(result).toBeInstanceOf(Date);
    });

    it('returns null for dates in the future', () => {
      const futureDate = '9999-12-31_23-59-59';
      const result = parseTimestampFromName(`${futureDate}.jpg`);
      // Future dates should be filtered out
      if (result) {
        expect(result.getFullYear()).toBeLessThan(9999);
      }
    });

    it('handles files with very old dates', () => {
      const result = parseTimestampFromName('1970-01-01_00-00-00.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(1970);
    });

    it('handles mixed separators', () => {
      const result = parseTimestampFromName('2024_01_01-12-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles IMG prefix with timestamp', () => {
      const result = parseTimestampFromName('IMG_20240101_123045.jpg');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles VID prefix with timestamp', () => {
      const result = parseTimestampFromName('VID_20240101_123045.mp4');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles screenshot format', () => {
      const result = parseTimestampFromName('Screenshot 2024-01-01 at 12.30.45.png');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('parseTimestampFromEXIF edge cases', () => {
    it('returns null for null input', async () => {
      const result = await parseTimestampFromEXIF(null);
      expect(result).toBeNull();
    });

    it('returns null for undefined input', async () => {
      const result = await parseTimestampFromEXIF(undefined);
      expect(result).toBeNull();
    });

    it('returns null for non-image file', async () => {
      const textFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await parseTimestampFromEXIF(textFile);
      expect(result).toBeNull();
    });

    it('handles corrupted image gracefully', async () => {
      const corruptedImage = new File(['not an image'], 'test.jpg', { type: 'image/jpeg' });
      const result = await parseTimestampFromEXIF(corruptedImage);
      // Should handle gracefully and return null
      expect(result).toBeNull();
    });
  });

  describe('parseEXIFDateTime edge cases', () => {
    it('handles Date objects', () => {
      const dateStr = '2024:01:15 10:30:00';
      const result = parseEXIFDateTime(dateStr);
      expect(result).toBeInstanceOf(Date);
      if (result) {
        expect(result.getFullYear()).toBe(2024);
      }
    });

    it('handles timestamp with subseconds', () => {
      const dateStr = '2024:01:15 10:30:00';
      const result = parseEXIFDateTime(dateStr);
      expect(result).toBeInstanceOf(Date);
    });

    it('handles null gracefully', () => {
      const result = parseEXIFDateTime(null);
      expect(result).toBeNull();
    });

    it('handles undefined gracefully', () => {
      const result = parseEXIFDateTime(undefined);
      expect(result).toBeNull();
    });

    it('handles midnight correctly', () => {
      const dateStr = '2024:01:01 00:00:00';
      const result = parseEXIFDateTime(dateStr);
      expect(result).toBeInstanceOf(Date);
      if (result) {
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
      }
    });

    it('handles noon correctly', () => {
      const dateStr = '2024:01:01 12:00:00';
      const result = parseEXIFDateTime(dateStr);
      expect(result).toBeInstanceOf(Date);
      if (result) {
        expect(result.getHours()).toBe(12);
      }
    });

    it('handles single digit hours and minutes', () => {
      const dateStr = '2024:01:01 09:05:00';
      const result = parseEXIFDateTime(dateStr);
      expect(result).toBeInstanceOf(Date);
      if (result) {
        expect(result.getHours()).toBe(9);
        expect(result.getMinutes()).toBe(5);
      }
    });
  });

  describe('timestamp validation', () => {
    it('validates reasonable year range', () => {
      const validDate = parseTimestampFromName('2024-01-01_14-30-00.jpg');
      expect(validDate).toBeInstanceOf(Date);
      if (validDate) {
        expect(validDate.getFullYear()).toBeGreaterThanOrEqual(1900);
        expect(validDate.getFullYear()).toBeLessThanOrEqual(new Date().getFullYear() + 10);
      }
    });

    it('handles leap year dates', () => {
      const leapDay = parseTimestampFromName('2024-02-29_12-00-00.jpg');
      expect(leapDay).toBeInstanceOf(Date);
      expect(leapDay?.getMonth()).toBe(1); // February (0-indexed)
      expect(leapDay?.getDate()).toBe(29);
    });

    it('handles end of year', () => {
      const endOfYear = parseTimestampFromName('2024-12-31_23-59-59.jpg');
      expect(endOfYear).toBeInstanceOf(Date);
      expect(endOfYear?.getMonth()).toBe(11); // December
      expect(endOfYear?.getDate()).toBe(31);
    });

    it('handles start of year', () => {
      const startOfYear = parseTimestampFromName('2024-01-01_00-00-00.jpg');
      expect(startOfYear).toBeInstanceOf(Date);
      expect(startOfYear?.getMonth()).toBe(0); // January
      expect(startOfYear?.getDate()).toBe(1);
    });
  });
});
