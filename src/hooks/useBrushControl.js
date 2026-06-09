import { useCallback, useRef } from "react";
import { clamp } from "../utils/numberUtils.js";

// Minimum view duration (1 second)
const MIN_DURATION_MS = 1000;

/**
 * Hook for managing timeline brush (zoom window) drag interactions
 */
export function useBrushControl({
  brushTrackRef,
  brushDisabled,
  summaryStartMs,
  summaryEndMs,
  summaryDurationMs,
  viewStartMs,
  viewEndMs,
  setTimelineViewRange,
  minDurationMs = MIN_DURATION_MS,
  axisProjection = null,
  onInteraction = null,
}) {
  const brushDragRef = useRef(null);

  /**
   * Start brush drag operation
   */
  const startBrushDrag = useCallback(
    (event, mode) => {
      if (brushDisabled) return;
      event.preventDefault();
      event.stopPropagation();
      if (onInteraction) onInteraction(); // Mark user interaction
      if (!Number.isFinite(summaryDurationMs) || summaryDurationMs <= 0) return;
      if (!Number.isFinite(viewStartMs) || !Number.isFinite(viewEndMs)) return;
      const track = brushTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();

      brushDragRef.current = {
        mode,
        pointerId: event.pointerId,
        startMs: viewStartMs,
        endMs: viewEndMs,
        pointerStart: event.clientX,
        trackLeft: rect.left,
        trackWidth: rect.width || 1,
      };
      track.setPointerCapture?.(event.pointerId);
    },
    [brushDisabled, summaryDurationMs, viewStartMs, viewEndMs, brushTrackRef, onInteraction]
  );

  /**
   * Handle brush pointer move - update brush position/size
   */
  const handleBrushPointerMove = useCallback(
    (event) => {
      const drag = brushDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      event.preventDefault();

      if (!Number.isFinite(summaryDurationMs) || summaryDurationMs <= 0) {
        return;
      }

      const { mode, pointerStart, trackLeft, trackWidth, startMs, endMs } = drag;
      const nextRange = resolveBrushDragRange({
        mode,
        pointerClientX: event.clientX,
        pointerStart,
        trackLeft,
        trackWidth,
        startMs,
        endMs,
        summaryStartMs,
        summaryEndMs,
        summaryDurationMs,
        minDurationMs,
        axisProjection,
      });

      if (nextRange) {
        setTimelineViewRange(nextRange.startMs, nextRange.endMs);
      }
    },
    [
      summaryDurationMs,
      summaryStartMs,
      summaryEndMs,
      setTimelineViewRange,
      minDurationMs,
      axisProjection,
    ]
  );

  /**
   * Handle brush pointer up - end drag
   */
  const handleBrushPointerUp = useCallback(
    (event) => {
      const track = brushTrackRef.current;
      if (track && track.hasPointerCapture?.(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }
      brushDragRef.current = null;
    },
    [brushTrackRef]
  );

  return {
    startBrushDrag,
    handleBrushPointerMove,
    handleBrushPointerUp,
  };
}

export function resolveBrushDragRange({
  mode,
  pointerClientX,
  pointerStart,
  trackLeft,
  trackWidth,
  startMs,
  endMs,
  summaryStartMs,
  summaryEndMs,
  summaryDurationMs,
  minDurationMs = MIN_DURATION_MS,
  axisProjection = null,
}) {
  if (!Number.isFinite(summaryDurationMs) || summaryDurationMs <= 0) return null;
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return null;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  if (!Number.isFinite(summaryStartMs) || !Number.isFinite(summaryEndMs)) return null;

  const usesProjection =
    axisProjection?.enabled &&
    typeof axisProjection.timeToProjectedMs === "function" &&
    typeof axisProjection.projectedToTimeMs === "function" &&
    typeof axisProjection.percentToTime === "function" &&
    Number.isFinite(axisProjection.projectedDurationMs) &&
    axisProjection.projectedDurationMs > 0;

  if (mode === "move") {
    const viewDuration = endMs - startMs;
    const deltaPx = pointerClientX - pointerStart;
    if (usesProjection) {
      const startProjected = axisProjection.timeToProjectedMs(startMs);
      const endProjected = axisProjection.timeToProjectedMs(endMs);
      const viewProjectedDuration = Math.max(endProjected - startProjected, 1);
      const deltaProjectedMs = (deltaPx / trackWidth) * axisProjection.projectedDurationMs;
      const maxProjectedStart = Math.max(0, axisProjection.projectedDurationMs - viewProjectedDuration);
      const nextProjectedStart = clamp(startProjected + deltaProjectedMs, 0, maxProjectedStart);
      const nextProjectedEnd = nextProjectedStart + viewProjectedDuration;
      let nextStart = axisProjection.projectedToTimeMs(nextProjectedStart);
      let nextEnd = axisProjection.projectedToTimeMs(nextProjectedEnd);
      if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd)) {
        return null;
      }
      if (nextEnd <= nextStart) {
        nextStart = clamp(nextStart, summaryStartMs, Math.max(summaryStartMs, summaryEndMs - viewDuration));
        nextEnd = clamp(nextStart + viewDuration, nextStart + minDurationMs, summaryEndMs);
      }
      return nextEnd > nextStart ? { startMs: nextStart, endMs: nextEnd } : null;
    }

    const deltaMs = (deltaPx / trackWidth) * summaryDurationMs;
    const maxStart = summaryEndMs - viewDuration;
    const nextStart = clamp(startMs + deltaMs, summaryStartMs, maxStart);
    return { startMs: nextStart, endMs: nextStart + viewDuration };
  }

  const ratio = clamp((pointerClientX - trackLeft) / trackWidth, 0, 1);
  const pointerMs = usesProjection
    ? axisProjection.percentToTime(ratio * 100)
    : summaryStartMs + ratio * summaryDurationMs;

  if (mode === "start") {
    const nextStart = clamp(pointerMs, summaryStartMs, endMs - minDurationMs);
    return { startMs: nextStart, endMs };
  }

  if (mode === "end") {
    const nextEnd = clamp(pointerMs, startMs + minDurationMs, summaryEndMs);
    return { startMs, endMs: nextEnd };
  }

  return null;
}
