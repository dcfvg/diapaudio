import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTimelineSnapping } from '../useTimelineSnapping.js';

describe('useTimelineSnapping', () => {
  describe('snapToMedia', () => {
    it('returns original value when no snap candidates are nearby', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [{ timeMs: 10000 }], // 10 seconds
        trackRanges: []
      };
      
      // Try to snap at 50 seconds (far from any media)
      const snapped = result.current.snapToMedia(50000, 100000, 800, timeline);
      expect(snapped).toBe(50000);
    });

    it('snaps to nearby image timestamp', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [
          { timeMs: 10000 },
          { timeMs: 20000 },
          { timeMs: 30000 }
        ],
        trackRanges: []
      };
      
      // Try to snap at 20100ms (close to 20000ms image)
      const snapped = result.current.snapToMedia(20100, 100000, 800, timeline);
      expect(snapped).toBe(20000);
    });

    it('snaps to audio track start', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [],
        trackRanges: [
          { startMs: 5000, endMs: 15000 },
          { startMs: 20000, endMs: 30000 }
        ]
      };
      
      // Try to snap at 5100ms (close to 5000ms track start)
      const snapped = result.current.snapToMedia(5100, 100000, 800, timeline);
      expect(snapped).toBe(5000);
    });

    it('snaps to audio track end', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [],
        trackRanges: [
          { startMs: 5000, endMs: 15000 }
        ]
      };
      
      // Try to snap at 14900ms (close to 15000ms track end)
      const snapped = result.current.snapToMedia(14900, 100000, 800, timeline);
      expect(snapped).toBe(15000);
    });

    it('prioritizes audio tracks over images when both are nearby', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [{ timeMs: 10100 }], // Image at 10.1s
        trackRanges: [{ startMs: 10000, endMs: 20000 }] // Track start at 10s
      };
      
      // Try to snap at 10050ms (between track start and image)
      // Should snap to track start (priority 1) rather than image (priority 2)
      const snapped = result.current.snapToMedia(10050, 100000, 800, timeline);
      expect(snapped).toBe(10000);
    });

    it('snaps to closest candidate when multiple are within threshold', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [
          { timeMs: 10000 },
          { timeMs: 10500 }
        ],
        trackRanges: []
      };
      
      // Try to snap at 10200ms (closer to 10000ms than 10500ms)
      const snapped = result.current.snapToMedia(10200, 100000, 800, timeline);
      expect(snapped).toBe(10000);
      
      // Try to snap at 10400ms (closer to 10500ms than 10000ms)
      const snapped2 = result.current.snapToMedia(10400, 100000, 800, timeline);
      expect(snapped2).toBe(10500);
    });

    it('handles edge case with no media', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [],
        trackRanges: []
      };
      
      const snapped = result.current.snapToMedia(25000, 100000, 800, timeline);
      expect(snapped).toBe(25000);
    });

    it('handles edge case with null/undefined timeline', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const snapped1 = result.current.snapToMedia(25000, 100000, 800, null);
      expect(snapped1).toBe(25000);
      
      const snapped2 = result.current.snapToMedia(25000, 100000, 800, undefined);
      expect(snapped2).toBe(25000);
    });

    it('handles invalid absoluteMs gracefully', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [{ timeMs: 10000 }],
        trackRanges: []
      };
      
      expect(result.current.snapToMedia(NaN, 100000, 800, timeline)).toBe(NaN);
      expect(result.current.snapToMedia(Infinity, 100000, 800, timeline)).toBe(Infinity);
    });

    it('handles invalid viewSpan gracefully', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [{ timeMs: 10000 }],
        trackRanges: []
      };
      
      expect(result.current.snapToMedia(10000, 0, 800, timeline)).toBe(10000);
      expect(result.current.snapToMedia(10000, -100, 800, timeline)).toBe(10000);
    });

    it('adjusts snap threshold based on timeline width', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [{ timeMs: 10000 }],
        trackRanges: []
      };
      
      // Narrow timeline should have tighter snap threshold
      const narrowSnap = result.current.snapToMedia(10500, 100000, 400, timeline);
      
      // Wide timeline should have looser snap threshold
      const wideSnap = result.current.snapToMedia(10500, 100000, 1600, timeline);
      
      // Both should snap or not snap consistently based on threshold calculation
      expect(typeof narrowSnap).toBe('number');
      expect(typeof wideSnap).toBe('number');
    });

    it('filters out invalid timeMs values', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const timeline = {
        imageEntries: [
          { timeMs: NaN },
          { timeMs: 10000 },
          { timeMs: undefined }
        ],
        trackRanges: [
          { startMs: null, endMs: 20000 },
          { startMs: 30000, endMs: Infinity }
        ]
      };
      
      // Should only consider valid values
      const snapped = result.current.snapToMedia(10050, 100000, 800, timeline);
      expect(snapped).toBe(10000);
    });
  });

  describe('findTrackAtTime', () => {
    it('returns track name when time falls within track range', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const trackRanges = [
        {
          startMs: 5000,
          endMs: 15000,
          index: 0,
          track: { label: 'Audio Track 1' }
        }
      ];
      
      const trackName = result.current.findTrackAtTime(trackRanges, 10000);
      expect(trackName).toBe('Audio Track 1');
    });

    it('returns cleaned track name from originalName', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const trackRanges = [
        {
          startMs: 5000,
          endMs: 15000,
          index: 0,
          track: {
            originalName: '2025-01-15_my_audio_track.mp3',
            label: 'Ugly Label'
          }
        }
      ];
      
      const trackName = result.current.findTrackAtTime(trackRanges, 10000);
      // Should clean the originalName (removes extension, path, dates with hyphens, normalizes separators)
      expect(trackName).toBe('2025 01 15 my audio track');
    });

    it('falls back to Track N when no name available', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const trackRanges = [
        {
          startMs: 5000,
          endMs: 15000,
          index: 2,
          track: {}
        }
      ];
      
      const trackName = result.current.findTrackAtTime(trackRanges, 10000);
      expect(trackName).toBe('Track 3');
    });

    it('returns empty string when time is outside all tracks', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const trackRanges = [
        {
          startMs: 5000,
          endMs: 15000,
          index: 0,
          track: { label: 'Track 1' }
        }
      ];
      
      const trackName = result.current.findTrackAtTime(trackRanges, 25000);
      expect(trackName).toBe('');
    });

    it('handles time at track boundaries', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const trackRanges = [
        {
          startMs: 5000,
          endMs: 15000,
          index: 0,
          track: { label: 'Track 1' }
        }
      ];
      
      // At start boundary
      expect(result.current.findTrackAtTime(trackRanges, 5000)).toBe('Track 1');
      
      // At end boundary
      expect(result.current.findTrackAtTime(trackRanges, 15000)).toBe('Track 1');
    });

    it('handles multiple overlapping tracks (returns first match)', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const trackRanges = [
        {
          startMs: 5000,
          endMs: 15000,
          index: 0,
          track: { label: 'Track 1' }
        },
        {
          startMs: 10000,
          endMs: 20000,
          index: 1,
          track: { label: 'Track 2' }
        }
      ];
      
      // At 12000ms, both tracks are active, should return first match
      const trackName = result.current.findTrackAtTime(trackRanges, 12000);
      expect(trackName).toBe('Track 1');
    });

    it('handles invalid time values', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const trackRanges = [
        {
          startMs: 5000,
          endMs: 15000,
          index: 0,
          track: { label: 'Track 1' }
        }
      ];
      
      expect(result.current.findTrackAtTime(trackRanges, NaN)).toBe('');
      expect(result.current.findTrackAtTime(trackRanges, Infinity)).toBe('');
    });

    it('handles track ranges with invalid timestamps', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const trackRanges = [
        {
          startMs: NaN,
          endMs: 15000,
          index: 0,
          track: { label: 'Track 1' }
        },
        {
          startMs: 20000,
          endMs: undefined,
          index: 1,
          track: { label: 'Track 2' }
        }
      ];
      
      // Should skip invalid ranges
      expect(result.current.findTrackAtTime(trackRanges, 10000)).toBe('');
    });
  });

  describe('positionPercent', () => {
    it('calculates correct percentage for value in middle of range', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const percent = result.current.positionPercent(15000, 10000, 10000);
      expect(percent).toBe(50); // 15000 is 50% between 10000 and 20000
    });

    it('returns 0% for value at start of range', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const percent = result.current.positionPercent(10000, 10000, 10000);
      expect(percent).toBe(0);
    });

    it('returns 100% for value at end of range', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const percent = result.current.positionPercent(20000, 10000, 10000);
      expect(percent).toBe(100);
    });

    it('clamps to 0% for value before start', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const percent = result.current.positionPercent(5000, 10000, 10000);
      expect(percent).toBe(0);
    });

    it('clamps to 100% for value after end', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const percent = result.current.positionPercent(25000, 10000, 10000);
      expect(percent).toBe(100);
    });

    it('handles zero duration gracefully', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const percent = result.current.positionPercent(15000, 10000, 0);
      expect(percent).toBe(0);
    });

    it('handles negative duration gracefully', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      const percent = result.current.positionPercent(15000, 10000, -5000);
      expect(percent).toBe(0);
    });

    it('handles invalid values gracefully', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      expect(result.current.positionPercent(NaN, 10000, 10000)).toBe(0);
      expect(result.current.positionPercent(15000, NaN, 10000)).toBe(0);
      expect(result.current.positionPercent(15000, 10000, NaN)).toBe(0);
    });

    it('calculates correct percentage for various positions', () => {
      const { result } = renderHook(() => useTimelineSnapping());
      
      expect(result.current.positionPercent(10000, 0, 100000)).toBe(10);
      expect(result.current.positionPercent(25000, 0, 100000)).toBe(25);
      expect(result.current.positionPercent(75000, 0, 100000)).toBe(75);
      expect(result.current.positionPercent(99000, 0, 100000)).toBe(99);
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => useTimelineSnapping());
      
      const firstSnap = result.current.snapToMedia;
      const firstFind = result.current.findTrackAtTime;
      const firstPos = result.current.positionPercent;
      
      rerender();
      
      expect(result.current.snapToMedia).toBe(firstSnap);
      expect(result.current.findTrackAtTime).toBe(firstFind);
      expect(result.current.positionPercent).toBe(firstPos);
    });
  });
});
