import { describe, it, expect } from 'vitest';
import {
  resolveImageAbsoluteTime,
  hasAudioCoverage,
  getSurroundingImages,
} from '../images.js';

describe('images utilities', () => {
  describe('resolveImageAbsoluteTime', () => {
    it('returns null for null image', () => {
      expect(resolveImageAbsoluteTime(null)).toBeNull();
    });

    it('extracts time from originalTimestamp Date', () => {
      const image = {
        originalTimestamp: new Date(2025, 0, 15, 10, 0, 0),
      };
      expect(resolveImageAbsoluteTime(image)).toBe(new Date(2025, 0, 15, 10, 0, 0).getTime());
    });

    it('falls back to timestamp Date', () => {
      const image = {
        timestamp: new Date(2025, 0, 15, 10, 0, 0),
      };
      expect(resolveImageAbsoluteTime(image)).toBe(new Date(2025, 0, 15, 10, 0, 0).getTime());
    });

    it('uses timeMs if available', () => {
      const image = {
        timeMs: 1234567890000,
      };
      expect(resolveImageAbsoluteTime(image)).toBe(1234567890000);
    });

    it('computes from relative time and timeline start', () => {
      const image = {
        relative: 30, // seconds
      };
      const timelineStartMs = new Date(2025, 0, 15, 10, 0, 0).getTime();
      expect(resolveImageAbsoluteTime(image, timelineStartMs)).toBe(timelineStartMs + 30000);
    });

    it('returns null if no valid timestamp', () => {
      const image = {
        name: 'img.jpg',
      };
      expect(resolveImageAbsoluteTime(image)).toBeNull();
    });
  });

  describe('hasAudioCoverage', () => {
    it('returns false for empty tracks', () => {
      expect(hasAudioCoverage([], 12345)).toBe(false);
      expect(hasAudioCoverage(null, 12345)).toBe(false);
    });

    it('returns true when time is within track range', () => {
      const tracks = [
        {
          adjustedStartTime: new Date(2025, 0, 15, 10, 0, 0),
          adjustedEndTime: new Date(2025, 0, 15, 10, 1, 0),
        },
      ];
      const targetTime = new Date(2025, 0, 15, 10, 0, 30).getTime();
      expect(hasAudioCoverage(tracks, targetTime)).toBe(true);
    });

    it('returns false when time is before track start', () => {
      const tracks = [
        {
          adjustedStartTime: new Date(2025, 0, 15, 10, 0, 0),
          adjustedEndTime: new Date(2025, 0, 15, 10, 1, 0),
        },
      ];
      const targetTime = new Date(2025, 0, 15, 9, 59, 0).getTime();
      expect(hasAudioCoverage(tracks, targetTime)).toBe(false);
    });

    it('returns false when time is after track end', () => {
      const tracks = [
        {
          adjustedStartTime: new Date(2025, 0, 15, 10, 0, 0),
          adjustedEndTime: new Date(2025, 0, 15, 10, 1, 0),
        },
      ];
      const targetTime = new Date(2025, 0, 15, 10, 2, 0).getTime();
      expect(hasAudioCoverage(tracks, targetTime)).toBe(false);
    });

    it('returns true when any track covers the time', () => {
      const tracks = [
        {
          adjustedStartTime: new Date(2025, 0, 15, 10, 0, 0),
          adjustedEndTime: new Date(2025, 0, 15, 10, 1, 0),
        },
        {
          adjustedStartTime: new Date(2025, 0, 15, 10, 2, 0),
          adjustedEndTime: new Date(2025, 0, 15, 10, 3, 0),
        },
      ];
      const targetTime = new Date(2025, 0, 15, 10, 2, 30).getTime();
      expect(hasAudioCoverage(tracks, targetTime)).toBe(true);
    });

    it('handles tracks with invalid timestamps', () => {
      const tracks = [
        {
          adjustedStartTime: null,
          adjustedEndTime: null,
        },
      ];
      expect(hasAudioCoverage(tracks, 12345)).toBe(false);
    });
  });

  describe('getSurroundingImages', () => {
    it('returns null for both when no images', () => {
      const mediaData = { images: [] };
      const result = getSurroundingImages(mediaData, 12345);
      expect(result).toEqual({ previous: null, next: null });
    });

    it('finds previous and next images around a time', () => {
      const mediaData = {
        images: [
          {
            name: 'img1.jpg',
            originalTimestamp: new Date(2025, 0, 15, 10, 0, 0),
          },
          {
            name: 'img2.jpg',
            originalTimestamp: new Date(2025, 0, 15, 10, 2, 0),
          },
          {
            name: 'img3.jpg',
            originalTimestamp: new Date(2025, 0, 15, 10, 4, 0),
          },
        ],
      };

      const targetTime = new Date(2025, 0, 15, 10, 3, 0).getTime();
      const result = getSurroundingImages(mediaData, targetTime);

      expect(result.previous?.name).toBe('img2.jpg');
      expect(result.next?.name).toBe('img3.jpg');
    });

    it('returns null for previous when time is before all images', () => {
      const mediaData = {
        images: [
          {
            name: 'img1.jpg',
            originalTimestamp: new Date(2025, 0, 15, 10, 0, 0),
          },
        ],
      };

      const targetTime = new Date(2025, 0, 15, 9, 0, 0).getTime();
      const result = getSurroundingImages(mediaData, targetTime);

      expect(result.previous).toBeNull();
      expect(result.next?.name).toBe('img1.jpg');
    });

    it('returns null for next when time is after all images', () => {
      const mediaData = {
        images: [
          {
            name: 'img1.jpg',
            originalTimestamp: new Date(2025, 0, 15, 10, 0, 0),
          },
        ],
      };

      const targetTime = new Date(2025, 0, 15, 11, 0, 0).getTime();
      const result = getSurroundingImages(mediaData, targetTime);

      expect(result.previous?.name).toBe('img1.jpg');
      expect(result.next).toBeNull();
    });

    it('handles images without valid timestamps', () => {
      const mediaData = {
        images: [
          { name: 'img1.jpg' },
          {
            name: 'img2.jpg',
            originalTimestamp: new Date(2025, 0, 15, 10, 0, 0),
          },
        ],
      };

      const targetTime = new Date(2025, 0, 15, 10, 1, 0).getTime();
      const result = getSurroundingImages(mediaData, targetTime);

      expect(result.previous?.name).toBe('img2.jpg');
      expect(result.next).toBeNull();
    });

    it('returns the same image for both when time matches exactly', () => {
      const mediaData = {
        images: [
          {
            name: 'img1.jpg',
            originalTimestamp: new Date(2025, 0, 15, 10, 0, 0),
          },
        ],
      };

      const targetTime = new Date(2025, 0, 15, 10, 0, 0).getTime();
      const result = getSurroundingImages(mediaData, targetTime);

      expect(result.previous?.name).toBe('img1.jpg');
      expect(result.next?.name).toBe('img1.jpg');
    });
  });
});
