import { useCallback, useRef, useState } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Hook for managing timeline pointer interactions (hover, scrubbing, seeking)
 */
export function useTimelineInteraction({
  containerRef,
  interactionRef,
  viewStartMs,
  viewDurationMs,
  timeline,
  imageSegments,
  images,
  seekToAbsolute,
  playing,
  snapToMedia,
  findTrackAtTime,
  onInteraction = null,
}) {
  const [hoverState, setHoverState] = useState(null);
  const scrubbingRef = useRef(false);
  const pointerMovedRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const clickedStateRef = useRef(null); // Store the state at pointer down for accurate seeking

  const resolveComposition = useCallback(
    (absoluteMs) => {
      if (!Number.isFinite(absoluteMs) || !Array.isArray(imageSegments) || !images?.length) {
        return null;
      }

      const segment = imageSegments.find(
        (entry) =>
          Number.isFinite(entry?.startMs) &&
          Number.isFinite(entry?.endMs) &&
          absoluteMs >= entry.startMs &&
          absoluteMs < entry.endMs
      );

      if (!segment) {
        return null;
      }

      const slotIndexes = Array.isArray(segment.slots) ? segment.slots : [];
      const layoutSize = Math.max(1, segment.layoutSize || slotIndexes.length || 1);

      const mappedSlots = Array.from({ length: layoutSize }, (_, idx) => {
        const imageIndex = slotIndexes[idx];
        if (!Number.isInteger(imageIndex)) {
          return null;
        }
        const image = images[imageIndex];
        return image ? { image } : null;
      });

      const activeImages = mappedSlots.filter(Boolean).map((slot) => slot.image);

      return {
        segment,
        layoutSize,
        slots: mappedSlots,
        images: activeImages,
      };
    },
    [imageSegments, images]
  );

  /**
   * Update hover state and optionally seek
   */
  const updateHover = useCallback(
    (clientX, { scrubbing = false, autoplay = false, applySnap = true } = {}) => {
      if (
        !Number.isFinite(viewStartMs) ||
        !Number.isFinite(viewDurationMs) ||
        viewDurationMs <= 0
      ) {
        setHoverState(null);
        return null;
      }
      const container = containerRef.current;
      if (!container) {
        setHoverState(null);
        return null;
      }
      const rect = container.getBoundingClientRect();
      const width = rect.width || 1;
      const ratio = clamp((clientX - rect.left) / width, 0, 1);
      const rawMs = viewStartMs + viewDurationMs * ratio;
      if (!Number.isFinite(rawMs)) {
        setHoverState(null);
        return null;
      }

      const snappedMs = applySnap ? snapToMedia(rawMs, viewDurationMs, width, timeline) : rawMs;
      const displayMs = snappedMs ?? rawMs;
      const leftPercent = clamp(((displayMs - viewStartMs) / viewDurationMs) * 100, 0, 100);
      const hoverTrack = findTrackAtTime(timeline?.trackRanges || [], displayMs);
      const composition = resolveComposition(displayMs);
      const hoverImages = composition?.images || [];
      const previewLayout = composition
        ? { layoutSize: composition.layoutSize, slots: composition.slots }
        : { layoutSize: 0, slots: [] };

      const state = {
        ms: displayMs,
        rawMs,
        leftPercent,
        trackName: hoverTrack,
        images: hoverImages,
        previewLayout,
        segment: composition?.segment || null,
      };
      setHoverState(state);

      if (scrubbing) {
        // Seek to the snapped/displayed position, not the raw cursor position
        // This ensures the image shown in preview is what gets displayed after seek
        seekToAbsolute(displayMs, { autoplay });
      }
      return state;
    },
    [
      seekToAbsolute,
      timeline,
      viewDurationMs,
      viewStartMs,
      containerRef,
      snapToMedia,
      findTrackAtTime,
      resolveComposition,
    ]
  );

  /**
   * Handle pointer down - start scrubbing
   */
  const handlePointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;
      const interaction = interactionRef.current;
      if (!interaction) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      scrubbingRef.current = true;
      wasPlayingRef.current = !!playing;
      pointerMovedRef.current = false;
      if (onInteraction) onInteraction(); // Mark user interaction
      // Update hover preview and store the clicked state for later seeking
      const state = updateHover(event.clientX, { scrubbing: false, autoplay: false, applySnap: true });
      clickedStateRef.current = state; // Save the exact state at click time
    },
    [playing, updateHover, interactionRef, onInteraction]
  );

  /**
   * Handle pointer move - update hover or scrub
   */
  const handlePointerMove = useCallback(
    (event) => {
      if (!containerRef.current) return;
      const scrubbing = scrubbingRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      // Allow hover over axis, images, and tracks zones (not brush)
      // Brush is 14px at bottom with 6px margin = 20px from bottom
      const hoverHeight = rect.height - 20;
      if (!scrubbing && event.clientY - rect.top > hoverHeight) {
        setHoverState(null);
        return;
      }
      if (scrubbing) {
        pointerMovedRef.current = true;
        // During drag, seek continuously
        updateHover(event.clientX, {
          scrubbing: true,
          autoplay: wasPlayingRef.current,
          applySnap: true,
        });
      } else {
        // Just hovering, no seek
        updateHover(event.clientX, {
          scrubbing: false,
          autoplay: false,
          applySnap: true,
        });
      }
    },
    [updateHover, containerRef]
  );

  /**
   * End scrubbing
   */
  const endScrub = useCallback(() => {
    scrubbingRef.current = false;
    pointerMovedRef.current = false;
    clickedStateRef.current = null; // Clear the stored click state
  }, []);

  /**
   * Handle pointer up - complete seek if scrubbing
   */
  const handlePointerUp = useCallback(
    (event) => {
      if (!interactionRef.current) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      const autoplay = wasPlayingRef.current || !pointerMovedRef.current;

      if (scrubbingRef.current) {
        // If pointer didn't move, use the stored click state to ensure we seek to the
        // exact position that was shown in the preview at click time.
        // This prevents snapping from changing between hover and click.
        const targetState = !pointerMovedRef.current ? clickedStateRef.current : hoverState;
        
        if (targetState) {
          // Final seek on release with autoplay if was playing or was a click
          seekToAbsolute(targetState.ms, { autoplay });
        }
      }
      endScrub();
    },
    [hoverState, seekToAbsolute, endScrub, interactionRef]
  );

  return {
    hoverState,
    setHoverState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    updateHover,
  };
}
