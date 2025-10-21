import { describe, it, expect } from 'vitest';
import { applyTimelineCalculations } from '../timeline.js';

describe('timeline calculations', () => {
  describe('applyTimelineCalculations', () => {
    it('returns null for null mediaData', () => {
      expect(applyTimelineCalculations(null)).toBeNull();
    });

    it('applies delay to audio track timestamps', () => {
      const mediaData = {
        audioTracks: [
          {
            label: 'track1',
            fileTimestamp: new Date(2025, 0, 15, 10, 0, 0),
            duration: 60, // seconds
          },
        ],
        images: [],
      };

      const result = applyTimelineCalculations(mediaData, 30); // +30 seconds delay

      expect(result.audioTracks[0].adjustedStartTime).toEqual(new Date(2025, 0, 15, 10, 0, 30));
      expect(result.audioTracks[0].adjustedEndTime).toEqual(new Date(2025, 0, 15, 10, 1, 30));
    });

    it('handles negative delay', () => {
      const mediaData = {
        audioTracks: [
          {
            label: 'track1',
            fileTimestamp: new Date(2025, 0, 15, 10, 0, 0),
            duration: 60,
          },
        ],
        images: [],
      };

      const result = applyTimelineCalculations(mediaData, -30); // -30 seconds delay

      expect(result.audioTracks[0].adjustedStartTime).toEqual(new Date(2025, 0, 15, 9, 59, 30));
    });

    it('computes relative time for images based on reference track', () => {
      const mediaData = {
        audioTracks: [
          {
            label: 'track1',
            fileTimestamp: new Date(2025, 0, 15, 10, 0, 0),
            duration: 60,
          },
        ],
        images: [
          {
            name: 'img1.jpg',
            timestamp: new Date(2025, 0, 15, 10, 0, 30), // 30 seconds after track start
          },
          {
            name: 'img2.jpg',
            timestamp: new Date(2025, 0, 15, 9, 59, 0), // 60 seconds before track start
          },
        ],
      };

      const result = applyTimelineCalculations(mediaData, 0);

      expect(result.images[0].relative).toBe(30);
      expect(result.images[1].relative).toBe(-60);
    });

    it('formats timecode for images', () => {
      const mediaData = {
        audioTracks: [
          {
            label: 'track1',
            fileTimestamp: new Date(2025, 0, 15, 10, 0, 0),
            duration: 60,
          },
        ],
        images: [
          {
            name: 'img1.jpg',
            timestamp: new Date(2025, 0, 15, 10, 0, 30),
          },
        ],
      };

      const result = applyTimelineCalculations(mediaData, 0);

      expect(result.images[0].timecode).toBe('00:30');
    });

    it('builds timeline summary with track ranges', () => {
      const mediaData = {
        audioTracks: [
          {
            label: 'track1',
            fileTimestamp: new Date(2025, 0, 15, 10, 0, 0),
            duration: 120,
          },
          {
            label: 'track2',
            fileTimestamp: new Date(2025, 0, 15, 10, 3, 0),
            duration: 60,
          },
        ],
        images: [],
      };

      const result = applyTimelineCalculations(mediaData, 0);

      expect(result.timeline.trackRanges).toHaveLength(2);
      expect(result.timeline.trackLaneCount).toBe(2);
      expect(result.timeline.trackRanges[0].lane).toBe(0);
      expect(result.timeline.trackRanges[1].lane).toBe(1);
    });

    it('detects overlapping tracks', () => {
      const mediaData = {
        audioTracks: [
          {
            label: 'track1',
            fileTimestamp: new Date(2025, 0, 15, 10, 0, 0),
            duration: 120, // 2 minutes
          },
          {
            label: 'track2',
            fileTimestamp: new Date(2025, 0, 15, 10, 1, 0), // starts 1 minute in
            duration: 60,
          },
        ],
        images: [],
      };

      const result = applyTimelineCalculations(mediaData, 0);

      expect(result.timeline.trackRanges[1].overlapMs).toBe(60000); // 60 seconds overlap
    });

    it('detects gaps between tracks', () => {
      const mediaData = {
        audioTracks: [
          {
            label: 'track1',
            fileTimestamp: new Date(2025, 0, 15, 10, 0, 0),
            duration: 60,
          },
          {
            label: 'track2',
            fileTimestamp: new Date(2025, 0, 15, 10, 3, 0), // 2 minute gap
            duration: 60,
          },
        ],
        images: [],
      };

      const result = applyTimelineCalculations(mediaData, 0);

      expect(result.timeline.trackRanges[1].gapMs).toBe(120000); // 2 minutes
    });

    it('computes timeline bounds including padding', () => {
      const mediaData = {
        audioTracks: [
          {
            label: 'track1',
            fileTimestamp: new Date(2025, 0, 15, 10, 0, 0),
            duration: 60,
          },
        ],
        images: [],
      };

      const result = applyTimelineCalculations(mediaData, 0);

      expect(result.timeline.startMs).toBe(new Date(2025, 0, 15, 10, 0, 0).getTime());
      expect(result.timeline.endMs).toBe(new Date(2025, 0, 15, 10, 1, 0).getTime());
      // viewStartMs should be before startMs (padding)
      expect(result.timeline.viewStartMs).toBeLessThan(result.timeline.startMs);
      // viewEndMs should be after endMs (padding)
      expect(result.timeline.viewEndMs).toBeGreaterThan(result.timeline.endMs);
    });

    it('handles image-only timeline (no audio)', () => {
      const mediaData = {
        audioTracks: [],
        images: [
          {
            name: 'img1.jpg',
            timestamp: new Date(2025, 0, 15, 10, 0, 0),
          },
          {
            name: 'img2.jpg',
            timestamp: new Date(2025, 0, 15, 10, 5, 0),
          },
        ],
      };

      const result = applyTimelineCalculations(mediaData, 0);

      expect(result.timeline.trackRanges).toHaveLength(0);
      expect(result.timeline.imageEntries).toHaveLength(2);
      // Should still have valid bounds
      expect(Number.isFinite(result.timeline.startMs)).toBe(true);
      expect(Number.isFinite(result.timeline.endMs)).toBe(true);
    });

    it('lays out image stack offsets to avoid visual overlap', () => {
      // Create images within the stack window
      const baseTime = new Date(2025, 0, 15, 10, 0, 0);
      const mediaData = {
        audioTracks: [],
        images: [
          { name: 'img1.jpg', timestamp: new Date(baseTime.getTime()) },
          { name: 'img2.jpg', timestamp: new Date(baseTime.getTime() + 1000) }, // +1s
          { name: 'img3.jpg', timestamp: new Date(baseTime.getTime() + 2000) }, // +2s
        ],
      };

      const result = applyTimelineCalculations(mediaData, 0);

      // Images should have different offsetIndex values
      const offsets = result.images.map((img) => img.timelineOffsetIndex);
      expect(new Set(offsets).size).toBeGreaterThan(1); // At least some different offsets
    });
  });
});
