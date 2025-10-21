import { useCallback, useRef } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
  anchorMs = null,
  minDurationMs = MIN_DURATION_MS,
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
      const anchorClamped =
        Number.isFinite(anchorMs) && Number.isFinite(summaryStartMs) && Number.isFinite(summaryEndMs)
          ? clamp(anchorMs, summaryStartMs, summaryEndMs)
          : null;
      const anchorWithinView =
        anchorClamped != null && Number.isFinite(viewStartMs) && Number.isFinite(viewEndMs)
          ? clamp(anchorClamped, viewStartMs, viewEndMs)
          : anchorClamped;

      brushDragRef.current = {
        mode,
        pointerId: event.pointerId,
        startMs: viewStartMs,
        endMs: viewEndMs,
        pointerStart: event.clientX,
        trackLeft: rect.left,
        trackWidth: rect.width || 1,
        anchorMs: anchorWithinView,
      };
      track.setPointerCapture?.(event.pointerId);
    },
    [brushDisabled, summaryDurationMs, viewStartMs, viewEndMs, brushTrackRef, anchorMs, summaryStartMs, summaryEndMs, onInteraction]
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

      const { trackWidth, trackLeft, startMs, endMs, mode, pointerStart, anchorMs: dragAnchorRaw } =
        drag;
      if (!trackWidth) return;

      const anchor =
        Number.isFinite(dragAnchorRaw) && Number.isFinite(summaryStartMs) && Number.isFinite(summaryEndMs)
          ? clamp(dragAnchorRaw, summaryStartMs, summaryEndMs)
          : null;
      const minHalfSpan = minDurationMs / 2;
      const leftCapacity =
        anchor != null && Number.isFinite(summaryStartMs) ? anchor - summaryStartMs : null;
      const rightCapacity =
        anchor != null && Number.isFinite(summaryEndMs) ? summaryEndMs - anchor : null;

      if (mode === "move") {
        // Move the entire window
        const viewDuration = endMs - startMs;
        if (!Number.isFinite(viewDuration) || viewDuration <= 0) return;
        const deltaPx = event.clientX - pointerStart;
        const deltaMs = (deltaPx / trackWidth) * summaryDurationMs;
        const maxStart = summaryEndMs - viewDuration;
        const nextStart = clamp(startMs + deltaMs, summaryStartMs, maxStart);
        setTimelineViewRange(nextStart, nextStart + viewDuration);
        return;
      }

      // Compute pointer absolute time
      let ratio = (event.clientX - trackLeft) / trackWidth;
      ratio = clamp(ratio, 0, 1);
      let pointerMs = summaryStartMs + ratio * summaryDurationMs;

      const canSymmetric =
        anchor != null &&
        ((mode === "start" && rightCapacity != null && rightCapacity >= minHalfSpan) ||
          (mode === "end" && leftCapacity != null && leftCapacity >= minHalfSpan));

      if ((mode === "start" || mode === "end") && canSymmetric) {
        const summarySpan = summaryEndMs - summaryStartMs;
        if (!Number.isFinite(summarySpan) || summarySpan <= 0) {
          return;
        }

        if (mode === "start") {
          pointerMs = Math.min(pointerMs, anchor - minHalfSpan);
        } else {
          pointerMs = Math.max(pointerMs, anchor + minHalfSpan);
        }
        pointerMs = clamp(pointerMs, summaryStartMs, summaryEndMs);

        let halfSpan = Math.abs(pointerMs - anchor);
        halfSpan = Math.max(minHalfSpan, halfSpan);
        halfSpan = Math.min(halfSpan, summarySpan / 2);

        let nextStart = anchor - halfSpan;
        let nextEnd = anchor + halfSpan;

        if (nextStart < summaryStartMs) {
          const shift = summaryStartMs - nextStart;
          nextStart += shift;
          nextEnd += shift;
        }
        if (nextEnd > summaryEndMs) {
          const shift = nextEnd - summaryEndMs;
          nextStart -= shift;
          nextEnd -= shift;
        }

        nextStart = clamp(nextStart, summaryStartMs, summaryEndMs - minDurationMs);
        nextEnd = clamp(nextEnd, nextStart + minDurationMs, summaryEndMs);

        if (nextEnd - nextStart < minDurationMs) {
          nextEnd = nextStart + minDurationMs;
          if (nextEnd > summaryEndMs) {
            nextEnd = summaryEndMs;
            nextStart = summaryEndMs - minDurationMs;
          }
        }

        setTimelineViewRange(nextStart, nextEnd);
        return;
      }

      if (mode === "start") {
        // Fallback: independent start handle
        pointerMs = clamp(pointerMs, summaryStartMs, endMs - minDurationMs);
        setTimelineViewRange(pointerMs, endMs);
        return;
      }

      if (mode === "end") {
        // Fallback: independent end handle
        pointerMs = clamp(pointerMs, startMs + minDurationMs, summaryEndMs);
        setTimelineViewRange(startMs, pointerMs);
      }
    },
    [summaryDurationMs, summaryStartMs, summaryEndMs, setTimelineViewRange, minDurationMs]
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
