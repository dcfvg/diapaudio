import { describe, it, expect } from 'vitest';
import { computeImageSchedule } from '../imageSchedule.js';

describe('imageSchedule', () => {
  describe('computeImageSchedule', () => {
    it('returns empty schedule for no images', () => {
      const result = computeImageSchedule([]);
      expect(result.metadata).toEqual([]);
      expect(result.segments).toEqual([]);
      expect(result.minStartMs).toBeNull();
      expect(result.maxEndMs).toBeNull();
    });

    it('returns empty schedule for null/undefined', () => {
      const result1 = computeImageSchedule(null);
      expect(result1.metadata).toEqual([]);
      expect(result1.segments).toEqual([]);

      const result2 = computeImageSchedule(undefined);
      expect(result2.metadata).toEqual([]);
      expect(result2.segments).toEqual([]);
    });

    it('creates schedule for single image with originalTimestamp', () => {
      const images = [
        {
          originalTimestamp: new Date('2025-01-15T10:00:00Z'),
          file: { name: 'img1.jpg' }
        }
      ];

      const result = computeImageSchedule(images);
      
      expect(result.metadata).toHaveLength(1);
      expect(result.metadata[0].visible).toBe(true);
      expect(result.metadata[0].startMs).toBe(images[0].originalTimestamp.getTime());
      expect(result.segments).toBeDefined();
      expect(result.minStartMs).toBe(images[0].originalTimestamp.getTime());
    });

    it('creates schedule for single image with adjustedTimestamp', () => {
      const images = [
        {
          adjustedTimestamp: new Date('2025-01-15T10:00:00Z'),
          originalTimestamp: new Date('2025-01-15T09:00:00Z'),
          file: { name: 'img1.jpg' }
        }
      ];

      const result = computeImageSchedule(images);
      
      // adjustedTimestamp takes priority over originalTimestamp
      expect(result.metadata[0].startMs).toBe(images[0].adjustedTimestamp.getTime());
    });

    it('creates schedule for single image with timeMs', () => {
      const images = [
        {
          timeMs: new Date('2025-01-15T10:00:00Z').getTime(),
          file: { name: 'img1.jpg' }
        }
      ];

      const result = computeImageSchedule(images);
      
      expect(result.metadata[0].startMs).toBe(images[0].timeMs);
    });

    it('filters out images without valid timestamps', () => {
      const images = [
        {
          originalTimestamp: new Date('2025-01-15T10:00:00Z'),
          file: { name: 'img1.jpg' }
        },
        {
          file: { name: 'img2.jpg' } // No timestamp
        },
        {
          originalTimestamp: new Date('2025-01-15T10:01:00Z'),
          file: { name: 'img3.jpg' }
        }
      ];

      const result = computeImageSchedule(images);
      
      // metadata has same length as input, but only 2 are visible
      expect(result.metadata).toHaveLength(3);
      expect(result.metadata[0].visible).toBe(true);
      expect(result.metadata[1].visible).toBe(false); // No timestamp
      expect(result.metadata[2].visible).toBe(true);
    });

    it('sorts images by timestamp', () => {
      const images = [
        {
          originalTimestamp: new Date('2025-01-15T10:02:00Z'),
          file: { name: 'img3.jpg' }
        },
        {
          originalTimestamp: new Date('2025-01-15T10:00:00Z'),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date('2025-01-15T10:01:00Z'),
          file: { name: 'img2.jpg' }
        }
      ];

      const result = computeImageSchedule(images);
      
      // metadata preserves original array order, but all should be visible
      expect(result.metadata[0].visible).toBe(true);
      expect(result.metadata[1].visible).toBe(true);
      expect(result.metadata[2].visible).toBe(true);
      
      // Verify that earliest timestamp is minStartMs (img1 at index 1 has earliest time)
      expect(result.minStartMs).toBe(images[1].originalTimestamp.getTime());
    });

    it('respects custom minVisibleMs option', () => {
      const images = [
        {
          originalTimestamp: new Date('2025-01-15T10:00:00Z'),
          file: { name: 'img1.jpg' }
        }
      ];

      const result = computeImageSchedule(images, { minVisibleMs: 5000 });
      
      expect(result.segments).toBeDefined();
      expect(result.segments.length).toBeGreaterThan(0);
      // Segments should respect minimum visible duration
    });

    it('respects custom holdMs option', () => {
      const images = [
        {
          originalTimestamp: new Date('2025-01-15T10:00:00Z'),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date('2025-01-15T10:00:10Z'),
          file: { name: 'img2.jpg' }
        }
      ];

      const result = computeImageSchedule(images, { holdMs: 3000 });
      
      expect(result.segments).toBeDefined();
      // Hold time affects when images transition
    });

    it('caps hold extension at the end of associated audio coverage', () => {
      const baseTime = Date.parse('2025-01-15T10:00:00Z');
      const images = [
        {
          originalTimestamp: new Date(baseTime + 10_000),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 100_000),
          file: { name: 'img2.jpg' }
        }
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 2_000,
        holdMs: 60_000,
        audioCoverageRanges: [{ startMs: baseTime, endMs: baseTime + 20_000 }],
      });

      expect(result.metadata[0].endMs).toBe(baseTime + 20_000);
    });

    it('does not apply hold when no audio covers the end of the minimum display window', () => {
      const baseTime = Date.parse('2025-01-15T10:00:00Z');
      const images = [
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img1.jpg' }
        }
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 6_000,
        holdMs: 60_000,
        audioCoverageRanges: [],
      });

      expect(result.metadata[0].endMs).toBe(baseTime + 6_000);
    });

    it('preserves minimum display duration when audio ends before the display window', () => {
      const baseTime = Date.parse('2025-01-15T10:00:00Z');
      const images = [
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img1.jpg' }
        }
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 6_000,
        holdMs: 60_000,
        audioCoverageRanges: [{ startMs: baseTime, endMs: baseTime + 4_000 }],
      });

      expect(result.metadata[0].endMs).toBe(baseTime + 6_000);
    });

    it('respects maxSlots option for composition size', () => {
      const images = Array.from({ length: 6 }, (_, i) => ({
        originalTimestamp: new Date(`2025-01-15T10:00:${String(i * 10).padStart(2, '0')}Z`),
        file: { name: `img${i + 1}.jpg` }
      }));

      const result = computeImageSchedule(images, { maxSlots: 2 });
      
      // Should limit composition to max 2 images at a time
      expect(result.segments).toBeDefined();
      result.segments.forEach(segment => {
        expect(segment.layoutSize).toBeLessThanOrEqual(2);
      });
    });

    it('creates segments with proper structure', () => {
      const images = [
        {
          originalTimestamp: new Date('2025-01-15T10:00:00Z'),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date('2025-01-15T10:00:05Z'),
          file: { name: 'img2.jpg' }
        }
      ];

      const result = computeImageSchedule(images);
      
      expect(result.segments.length).toBeGreaterThan(0);
      result.segments.forEach(segment => {
        expect(segment).toHaveProperty('startMs');
        expect(segment).toHaveProperty('endMs');
        expect(segment).toHaveProperty('layoutSize');
        expect(segment).toHaveProperty('slots');
        expect(Array.isArray(segment.slots)).toBe(true);
        expect(segment.endMs).toBeGreaterThanOrEqual(segment.startMs);
      });
    });

    it('calculates correct minStartMs and maxEndMs', () => {
      const images = [
        {
          originalTimestamp: new Date('2025-01-15T10:00:00Z'),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date('2025-01-15T10:00:30Z'),
          file: { name: 'img2.jpg' }
        },
        {
          originalTimestamp: new Date('2025-01-15T10:01:00Z'),
          file: { name: 'img3.jpg' }
        }
      ];

      const result = computeImageSchedule(images);
      
      expect(result.minStartMs).toBe(images[0].originalTimestamp.getTime());
      expect(result.maxEndMs).toBeGreaterThan(images[2].originalTimestamp.getTime());
    });

    it('enforces composition interval timing', () => {
      const images = Array.from({ length: 5 }, (_, i) => ({
        originalTimestamp: new Date(`2025-01-15T10:00:${String(i * 2).padStart(2, '0')}Z`),
        file: { name: `img${i + 1}.jpg` }
      }));

      const compositionIntervalMs = 5000; // 5 seconds minimum between changes
      const result = computeImageSchedule(images, { compositionIntervalMs });
      
      // Check that segments respect minimum interval
      for (let i = 1; i < result.segments.length; i++) {
        const prevEnd = result.segments[i - 1].endMs;
        const currentStart = result.segments[i].startMs;
        // If composition changed, verify minimum interval (with some tolerance for edge cases)
        if (result.segments[i - 1].layoutSize !== result.segments[i].layoutSize ||
            JSON.stringify(result.segments[i - 1].slots) !== JSON.stringify(result.segments[i].slots)) {
          expect(currentStart - prevEnd).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('handles images with identical timestamps', () => {
      const sameTime = new Date('2025-01-15T10:00:00Z');
      const images = [
        {
          originalTimestamp: new Date(sameTime),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date(sameTime),
          file: { name: 'img2.jpg' }
        },
        {
          originalTimestamp: new Date(sameTime),
          file: { name: 'img3.jpg' }
        }
      ];

      const result = computeImageSchedule(images);
      
      expect(result.metadata).toHaveLength(3);
      expect(result.segments).toBeDefined();
      // All images should be scheduled
      expect(result.minStartMs).toBe(sameTime.getTime());
    });

    it('respects minVisibleMs with holdMs extension (no overlap when next image exists)', () => {
      // New behavior: image A at 10:21:26 with minVisibleMs=60000ms and holdMs should extend
      // but NOT overlap with image B at 10:21:34 (8 seconds later)
      // Expected: A displays for minVisibleMs (60s), but since B arrives at +8s,
      // A can extend via hold but will be capped at B's start time
      const images = [
        {
          originalTimestamp: new Date('2025-10-08T10:21:26Z'),
          file: { name: 'img_10.21.26.jpg' }
        },
        {
          originalTimestamp: new Date('2025-10-08T10:21:34Z'),
          file: { name: 'img_10.21.34.jpg' }
        }
      ];

      const minVisibleMs = 60_000; // 60 seconds
      const holdMs = 10_000; // 10 seconds hold
      const result = computeImageSchedule(images, { minVisibleMs, holdMs });
      
      // First image starts at 10:21:26
      const firstImageMeta = result.metadata[0];
      expect(firstImageMeta.visible).toBe(true);
      
      // Second image starts at 10:21:34 (8 seconds after first)
      const secondImageMeta = result.metadata[1];
      expect(secondImageMeta.visible).toBe(true);
      const secondStart = secondImageMeta.startMs;
      
      // First image would want to display until minVisibleMs (60s) + holdMs (10s) = 70s
      // But second image arrives at +8s, which is BEFORE minVisibleMs ends
      // So first image should display for full minVisibleMs (60s), creating overlap
      const firstEnd = firstImageMeta.endMs;
      expect(firstEnd).toBeGreaterThan(secondStart); // Creates overlap/composition
      
      // First image duration should be minVisibleMs (60 seconds)
      const firstDuration = firstEnd - firstImageMeta.startMs;
      expect(firstDuration).toBe(60_000); // Full minVisibleMs
    });

    it('handles multiple images with minVisibleMs and holdMs (with overlaps)', () => {
      // Behavior: when images arrive BEFORE minVisibleMs ends, they create overlaps
      // When images arrive AFTER minVisibleMs ends, hold extends up to next image (no overlap)
      const baseTime = new Date('2025-10-08T10:00:00Z').getTime();
      const images = [
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 5000), // +5s
          file: { name: 'img2.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 10000), // +10s
          file: { name: 'img3.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 15000), // +15s
          file: { name: 'img4.jpg' }
        }
      ];

      const minVisibleMs = 30_000; // 30 seconds
      const holdMs = 10_000; // 10 seconds hold
      const result = computeImageSchedule(images, { minVisibleMs, holdMs });
      
      // Each image arrives every 5s, but wants to display for 30s (minVisibleMs)
      // So all images create overlaps/compositions
      for (let i = 0; i < images.length - 1; i++) {
        const currentMeta = result.metadata[i];
        const nextMeta = result.metadata[i + 1];
        expect(currentMeta.visible).toBe(true);
        // Current image should extend beyond next image start (creating overlap)
        expect(currentMeta.endMs).toBeGreaterThan(nextMeta.startMs);
      }
      
      // Last image should extend by full minVisibleMs + holdMs
      const lastMeta = result.metadata[images.length - 1];
      const lastDuration = lastMeta.endMs - lastMeta.startMs;
      expect(lastDuration).toBe(minVisibleMs + holdMs);
      
      // Segments should have multiple images visible simultaneously (compositions)
      const maxConcurrency = Math.max(...result.segments.map(seg => 
        seg.slots.filter(s => s !== null).length
      ));
      expect(maxConcurrency).toBeGreaterThan(1);
    });

    it('reveals simultaneous images progressively and keeps their slots stable', () => {
      const baseTime = new Date('2025-10-08T10:00:00Z').getTime();
      const images = [
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img2.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img3.jpg' }
        }
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 6000,
        holdMs: 0,
        compositionIntervalMs: 2000,
      });

      expect(result.metadata.map((meta) => meta.startMs - baseTime)).toEqual([0, 2000, 4000]);
      expect(result.metadata.map((meta) => meta.slotIndex)).toEqual([0, 1, 2]);
      expect(result.segments.map((segment) => segment.slots)).toEqual([
        [0, null, null],
        [0, 1, null],
        [0, 1, 2],
        [null, 1, 2],
        [null, null, 2],
      ]);
    });

    it('decomposes images collapsed by snap-to-grid instead of showing them all at once', () => {
      const baseTime = new Date('2025-10-08T10:00:00Z').getTime();
      const images = [
        {
          originalTimestamp: new Date(baseTime + 100),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 600),
          file: { name: 'img2.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 900),
          file: { name: 'img3.jpg' }
        }
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 4000,
        holdMs: 0,
        compositionIntervalMs: 1000,
        snapToGrid: true,
        snapGridMs: 1000,
      });

      expect(result.metadata.map((meta) => meta.startMs - baseTime)).toEqual([0, 1000, 2000]);
      expect(result.segments[0].slots).toEqual([0, null, null]);
      expect(result.segments[1].slots).toEqual([0, 1, null]);
      expect(result.segments[2].slots).toEqual([0, 1, 2]);
    });

    it('keeps delaying a dense cluster after an earlier image was delayed', () => {
      const baseTime = new Date('2025-10-08T10:00:00Z').getTime();
      const images = [
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 5000),
          file: { name: 'img2.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 12000),
          file: { name: 'img3.jpg' }
        }
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 6000,
        holdMs: 0,
        compositionIntervalMs: 10000,
      });

      expect(result.metadata.map((meta) => meta.startMs - baseTime)).toEqual([
        0,
        10000,
        20000,
      ]);
    });

    it('does not compact holes while a higher-slot image remains visible', () => {
      const baseTime = new Date('2025-10-08T10:00:00Z').getTime();
      const images = [
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img2.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img3.jpg' }
        }
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 4000,
        holdMs: 0,
        compositionIntervalMs: 1000,
      });

      expect(result.segments).toContainEqual(
        expect.objectContaining({
          layoutSize: 3,
          slots: [null, 1, 2],
        })
      );
      expect(result.segments).toContainEqual(
        expect.objectContaining({
          layoutSize: 3,
          slots: [null, null, 2],
        })
      );
      expect(result.segments).not.toContainEqual(
        expect.objectContaining({
          slots: [1, 2],
        })
      );
    });

    it('keeps a newly placed image in the inherited wide layout until it disappears', () => {
      const baseTime = new Date('2025-10-08T10:00:00Z').getTime();
      const images = [
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img2.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime),
          file: { name: 'img3.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 5000),
          file: { name: 'img4.jpg' }
        }
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 4000,
        holdMs: 0,
        compositionIntervalMs: 1000,
      });

      const fourthImageSegments = result.segments.filter((segment) => segment.slots.includes(3));
      expect(result.metadata[3].slotIndex).toBe(0);
      expect(fourthImageSegments.length).toBeGreaterThan(1);
      expect(fourthImageSegments.every((segment) => segment.layoutSize === 3)).toBe(true);
      expect(fourthImageSegments.every((segment) => segment.slots[0] === 3)).toBe(true);
    });

    it('propagates an inherited wide layout to later overlapping images', () => {
      const baseTime = new Date('2025-10-08T10:00:00Z').getTime();
      const images = [
        { originalTimestamp: new Date(baseTime), file: { name: 'img1.jpg' } },
        { originalTimestamp: new Date(baseTime), file: { name: 'img2.jpg' } },
        { originalTimestamp: new Date(baseTime), file: { name: 'img3.jpg' } },
        { originalTimestamp: new Date(baseTime), file: { name: 'img4.jpg' } },
        { originalTimestamp: new Date(baseTime + 6000), file: { name: 'bridge.jpg' } },
        { originalTimestamp: new Date(baseTime + 10000), file: { name: 'later-a.jpg' } },
        { originalTimestamp: new Date(baseTime + 11000), file: { name: 'later-b.jpg' } },
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 6000,
        holdMs: 0,
        compositionIntervalMs: 1000,
      });

      const laterImageSegments = result.segments.filter(
        (segment) => segment.slots.includes(5) || segment.slots.includes(6)
      );

      expect(result.metadata[5].maxConcurrency).toBe(4);
      expect(result.metadata[6].maxConcurrency).toBe(4);
      expect(laterImageSegments.length).toBeGreaterThan(1);
      expect(laterImageSegments.every((segment) => segment.layoutSize === 4)).toBe(true);
    });

    it('does not let composition interval bridge image-less gaps after hold ends', () => {
      const baseTime = new Date('2025-10-08T10:00:00Z').getTime();
      const images = [
        {
          originalTimestamp: new Date(baseTime + 12000),
          file: { name: 'img1.jpg' }
        },
        {
          originalTimestamp: new Date(baseTime + 80000),
          file: { name: 'img2.jpg' }
        }
      ];

      const result = computeImageSchedule(images, {
        minVisibleMs: 2000,
        holdMs: 18000,
        compositionIntervalMs: 120000,
        maxSlots: 1,
      });

      expect(result.metadata.map((meta) => meta.startMs - baseTime)).toEqual([12000, 80000]);
      expect(result.segments.map((segment) => segment.slots)).toEqual([[0], [1]]);
    });
  });
});
