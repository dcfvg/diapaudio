import { useCallback } from "react";
import { SEEK_SNAP_THRESHOLD_PX } from "../media/constants.js";
import { cleanTrackNameForDisplay } from "../media/fileUtils.js";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Hook for snapping timeline interactions to media boundaries (images, audio tracks)
 */
export function useTimelineSnapping() {
  /**
   * Snap an absolute time to nearby media events (images, audio track starts/ends)
   * @param {number} absoluteMs - The raw time in milliseconds
   * @param {number} viewSpan - The duration of the visible timeline view in ms
   * @param {number} widthPx - The width of the timeline in pixels
   * @param {object} timeline - Timeline data with imageEntries and trackRanges
   * @returns {number} The snapped time, or original if no nearby snap point
   */
  const snapToMedia = useCallback((absoluteMs, viewSpan, widthPx, timeline) => {
    if (!Number.isFinite(absoluteMs) || !Number.isFinite(viewSpan) || viewSpan <= 0) {
      return absoluteMs;
    }
    const thresholdMs = (viewSpan / Math.max(widthPx || 1, 1)) * SEEK_SNAP_THRESHOLD_PX;

    // Collect all snap candidates with their types
    const candidates = [];

    // Add image timestamps (actual scheduled start times if available)
    (timeline?.imageEntries || []).forEach((entry) => {
      if (Number.isFinite(entry.timeMs)) {
        candidates.push({
          ms: entry.timeMs,
          type: "image",
          priority: 2, // Images have medium priority
        });
      }
    });

    // Add schedule segment boundaries if provided (helps align to layout changes)
    (timeline?.imageSegments || []).forEach((seg) => {
      if (Number.isFinite(seg.startMs)) {
        candidates.push({ ms: seg.startMs, type: "segment-start", priority: 2 });
      }
      if (Number.isFinite(seg.endMs)) {
        candidates.push({ ms: seg.endMs, type: "segment-end", priority: 3 });
      }
    });

    // Add audio track starts and ends
    (timeline?.trackRanges || []).forEach((range) => {
      if (Number.isFinite(range.startMs)) {
        candidates.push({
          ms: range.startMs,
          type: "audio-start",
          priority: 1, // Track starts have highest priority
        });
      }
      if (Number.isFinite(range.endMs)) {
        candidates.push({
          ms: range.endMs,
          type: "audio-end",
          priority: 1, // Track ends have highest priority
        });
      }
    });

    // Add grid snapping points when enabled on the timeline
    if (timeline?.snapToGrid && Number.isFinite(timeline.snapGridMs) && timeline.snapGridMs > 0) {
      const grid = timeline.snapGridMs;
      const start = Number.isFinite(timeline.startMs) ? timeline.startMs : absoluteMs - viewSpan;
      const end = Number.isFinite(timeline.endMs) ? timeline.endMs : absoluteMs + viewSpan;
      const first = Math.floor(start / grid) * grid;
      for (let t = first; t <= end + grid; t += grid) {
        candidates.push({ ms: t, type: "grid", priority: 3 });
      }
    }

    // Filter candidates within threshold and sort by distance
    const nearby = candidates
      .map((c) => ({
        ...c,
        distance: Math.abs(c.ms - absoluteMs),
      }))
      .filter((c) => c.distance < thresholdMs)
      .sort((a, b) => {
        // First by priority (lower number = higher priority)
        if (a.priority !== b.priority) return a.priority - b.priority;
        // Then by distance (closer is better)
        return a.distance - b.distance;
      });

    // Return the best candidate, or original value if none found
    return nearby.length > 0 ? nearby[0].ms : absoluteMs;
  }, []);

  /**
   * Find the track name at a specific time
   * @param {array} trackRanges - Array of track range objects
   * @param {number} absoluteMs - The time to check
   * @returns {string} The track name or empty string
   */
  const findTrackAtTime = useCallback((trackRanges, absoluteMs) => {
    if (!Number.isFinite(absoluteMs)) return "";
    const range = trackRanges.find((entry) => {
      if (!Number.isFinite(entry.startMs) || !Number.isFinite(entry.endMs)) return false;
      return absoluteMs >= entry.startMs && absoluteMs <= entry.endMs;
    });
    if (!range) return "";
    const track = range.track || {};
    return (
      cleanTrackNameForDisplay(track.originalName || track.label || "") ||
      track.label ||
      `Track ${range.index + 1}`
    );
  }, []);

  /**
   * Calculate the position percentage for a value within a range
   * @param {number} value - The value to position
   * @param {number} startMs - The start of the range
   * @param {number} durationMs - The duration of the range
   * @returns {number} Percentage (0-100)
   */
  const positionPercent = useCallback((value, startMs, durationMs) => {
    if (
      !Number.isFinite(value) ||
      !Number.isFinite(startMs) ||
      !Number.isFinite(durationMs) ||
      durationMs <= 0
    ) {
      return 0;
    }
    return clamp(((value - startMs) / durationMs) * 100, 0, 100);
  }, []);

  return {
    snapToMedia,
    findTrackAtTime,
    positionPercent,
  };
}
