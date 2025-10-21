import "./Timeline.css";
import { useMemo, useCallback, useRef, memo, useEffect } from "react";
import { useMediaStore } from "../state/useMediaStore.js";
import { useSettingsStore } from "../state/useSettingsStore.js";
import { usePlaybackStore } from "../state/usePlaybackStore.js";
import { formatClockWithSeconds, formatDateAndTime, formatClock } from "../utils/dateUtils.js";
import { formatTime } from "../media/formatters.js";
import {
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
  MIN_IMAGE_DISPLAY_MIN_MS,
  DEFAULT_IMAGE_HOLD_MS,
  IMAGE_HOLD_MAX_MS,
  MAX_VISIBLE_IMAGES,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
} from "../media/constants.js";
import {
  TIMELINE_AUTO_SCROLL_DELAY_MS,
  TIMELINE_MIN_VIEW_WINDOW_MS,
  TIMELINE_HOUR_THRESHOLD_MS,
} from "../constants/ui.js";
import { computeImageSchedule } from "../media/imageSchedule.js";
import { cleanTrackNameForDisplay } from "../media/fileUtils.js";
import CompositionView from "./CompositionView.jsx";
import SlideshowPlaceholder, {
  resolvePlaceholderSources,
  buildPlaceholderSignature,
} from "./SlideshowPlaceholder.jsx";
import { useTimelineSnapping } from "../hooks/useTimelineSnapping.js";
import { useTimelineInteraction } from "../hooks/useTimelineInteraction.js";
import { useBrushControl } from "../hooks/useBrushControl.js";
import { TICK_STEPS_MS } from "../constants/timeline";
import { EMPTY_ARRAY } from "../constants/common.js";
import { clamp } from "../utils/numberUtils.js";

const isTrackRangeLoaded = (range, activeIndex) => range.index === activeIndex && range.track?.url;

/**
 * Filter track ranges that are visible in the current viewport
 */
function filterVisibleTracks(tracks, viewStartMs, viewEndMs, padding = 0.1) {
  if (!tracks || !Number.isFinite(viewStartMs) || !Number.isFinite(viewEndMs)) {
    return tracks || [];
  }

  const paddingMs = (viewEndMs - viewStartMs) * padding;
  const startWithPadding = viewStartMs - paddingMs;
  const endWithPadding = viewEndMs + paddingMs;

  return tracks.filter((track) => {
    if (!Number.isFinite(track.startMs) || !Number.isFinite(track.endMs)) return false;
    // Track is visible if it overlaps with viewport
    return track.endMs >= startWithPadding && track.startMs <= endWithPadding;
  });
}

function Timeline() {
  const mediaData = useMediaStore((state) => state.mediaData);
  const timelineView = useMediaStore((state) => state.timelineView);
  const setTimelineView = useMediaStore((state) => state.setTimelineView);
  const imageDisplaySeconds = useSettingsStore((state) => state.imageDisplaySeconds);
  const imageHoldSeconds = useSettingsStore((state) => state.imageHoldSeconds);
  const compositionIntervalSeconds = useSettingsStore(
    (state) => state.compositionIntervalSeconds
  );
  const speed = useSettingsStore((state) => state.speed);
  const snapToGrid = useSettingsStore((state) => state.snapToGrid);
  const snapGridSeconds = useSettingsStore((state) => state.snapGridSeconds);

  // Playback state/selectors
  const playing = usePlaybackStore((state) => state.playing);
  const absoluteTime = usePlaybackStore((state) => state.absoluteTime);
  const displayedImages = usePlaybackStore((state) => state.displayedImages);
  const activeTrackIndex = usePlaybackStore((state) => state.activeTrackIndex);
  const seekToAbsolute = usePlaybackStore((state) => state.seekToAbsolute);

  const resetTimelineView = useCallback(() => {
    if (!mediaData?.timeline) return;
    const { startMs, endMs } = mediaData.timeline;
    if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
      setTimelineView({ startMs, endMs });
    }
  }, [mediaData, setTimelineView]);

  // All hooks must be called before any conditional returns
  const containerRef = useRef(null);
  const interactionRef = useRef(null);
  const brushTrackRef = useRef(null);

  // Use custom hooks
  const { snapToMedia, findTrackAtTime, positionPercent } = useTimelineSnapping();

  // Get base timeline first (will extend with segments later)
  const baseTimeline = mediaData?.timeline;
  
  // Summary bounds represent the scrollable range - use content bounds (no padding)
  // This ensures tracks and brush align properly with timeline edges
  const summaryStartMs = baseTimeline && Number.isFinite(baseTimeline.startMs) ? baseTimeline.startMs : 0;
  const summaryEndMs = baseTimeline && Number.isFinite(baseTimeline.endMs) ? baseTimeline.endMs : 0;

  const setTimelineViewRange = useCallback(
    (startMs, endMs) => {
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
      setTimelineView({ startMs, endMs });
    },
    [setTimelineView]
  );

  // Resolve image display, hold and composition interval from settings
  const minVisibleMs = useMemo(() => {
    const displaySeconds = Number(imageDisplaySeconds);
    const defaultSeconds = MIN_IMAGE_DISPLAY_DEFAULT_MS / 1000;
    const seconds = Number.isFinite(displaySeconds) && displaySeconds > 0
      ? displaySeconds
      : defaultSeconds;
    const s = Number(speed) > 0 ? Number(speed) : 1;
    const scaled = Math.round(seconds * 1000 * s);
    return Math.max(MIN_IMAGE_DISPLAY_MIN_MS, scaled);
  }, [imageDisplaySeconds, speed]);

  const imageHoldMs = useMemo(() => {
    const seconds = Number(imageHoldSeconds);
    // Explicitly handle 0 to avoid any falsy value issues
    if (seconds === 0) {
      return 0;
    }
    if (!Number.isFinite(seconds)) return DEFAULT_IMAGE_HOLD_MS;
    const base = clamp(seconds * 1000, 0, IMAGE_HOLD_MAX_MS);
    const s = Number(speed) > 0 ? Number(speed) : 1;
    return Math.round(base * s);
  }, [imageHoldSeconds, speed]);

  const compositionIntervalMs = useMemo(() => {
    const sec = Number(compositionIntervalSeconds);
    if (!Number.isFinite(sec)) return MAX_COMPOSITION_CHANGE_INTERVAL_MS;
    // No upper cap; enforce minimum only
    return Math.max(sec * 1000, MIN_COMPOSITION_CHANGE_INTERVAL_MS);
  }, [compositionIntervalSeconds]);

  const schedule = useMemo(
    () =>
      computeImageSchedule(mediaData?.images || [], {
        minVisibleMs,
        holdMs: imageHoldMs,
        maxSlots: MAX_VISIBLE_IMAGES,
        compositionIntervalMs,
        snapToGrid: Boolean(snapToGrid),
        snapGridMs: (() => {
          const sec = Number(snapGridSeconds);
          return Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : null;
        })(),
      }),
    [mediaData?.images, minVisibleMs, imageHoldMs, compositionIntervalMs, snapToGrid, snapGridSeconds]
  );

  const scheduleMetadata = schedule?.metadata || EMPTY_ARRAY;
  const scheduleSegments = schedule?.segments || EMPTY_ARRAY;

  // Extend timeline with schedule segments and snap settings for snapping logic
  const timeline = useMemo(() => {
    if (!baseTimeline) return null;
    return {
      ...baseTimeline,
      imageSegments: scheduleSegments,
      snapToGrid: Boolean(snapToGrid),
      snapGridMs: (() => {
        const sec = Number(snapGridSeconds);
        return Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : null;
      })(),
    };
  }, [baseTimeline, scheduleSegments, snapToGrid, snapGridSeconds]);

  const scheduledEntries = useMemo(() => {
    const metadata = scheduleMetadata;
    if (!mediaData?.images?.length || !metadata.length) {
      return [];
    }
    return metadata
      .map((meta, index) => {
        if (!meta.visible) {
          return null;
        }
        const startMs = meta.startMs;
        const endMs = meta.endMs;
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
          return null;
        }
        const image = mediaData.images[index];
        return {
          image,
          index,
          startMs,
          endMs,
          slotIndex: Math.max(meta.slotIndex ?? 0, 0),
          maxConcurrency: Math.max(meta.maxConcurrency || 1, 1),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.startMs - b.startMs);
  }, [mediaData, scheduleMetadata]);

  // On initial load (no timelineView), show the full content range
  // This makes tracks align to edges and brush window span full width
  const activeView =
    timelineView && Number.isFinite(timelineView.startMs) && Number.isFinite(timelineView.endMs)
      ? timelineView
      : {
          startMs: summaryStartMs,
          endMs: summaryEndMs,
        };

  const viewStartMs = activeView.startMs;
  const viewEndMs = activeView.endMs;
  const viewDurationMs =
    Number.isFinite(viewStartMs) && Number.isFinite(viewEndMs)
      ? Math.max(viewEndMs - viewStartMs, 1)
      : null;

  const summaryDurationMs =
    Number.isFinite(summaryStartMs) && Number.isFinite(summaryEndMs)
      ? Math.max(summaryEndMs - summaryStartMs, 1)
      : null;

  const resolvedAbsoluteMs = Number.isFinite(absoluteTime)
    ? absoluteTime
    : Number.isFinite(viewStartMs)
      ? viewStartMs
      : Number.isFinite(summaryStartMs)
        ? summaryStartMs
        : null;

  // All hooks must be called unconditionally
  const ticks = useMemo(() => computeTicks(viewStartMs, viewEndMs), [viewStartMs, viewEndMs]);

  const visibleImageSet = useMemo(() => new Set(displayedImages || []), [displayedImages]);

  // Virtual scrolling: filter visible items based on current viewport
  const visibleImageEntries = useMemo(() => {
    if (!scheduledEntries.length || !Number.isFinite(viewStartMs) || !Number.isFinite(viewEndMs)) {
      return [];
    }
    return scheduledEntries
      .filter((entry) => entry.endMs > viewStartMs && entry.startMs < viewEndMs)
      .sort((a, b) => a.startMs - b.startMs);
  }, [scheduledEntries, viewStartMs, viewEndMs]);

  const imageRowHeightPx = 13;
  const imageRowMarginPx = 1;
  const axisHeightPx = 14;
  const axisGapPx = 3;
  const trackGapPx = 3;
  const trackHeightPx = 14;
  const brushHeightPx = 14;
  const brushOffsetPx = 6;

  const imageAreaHeightPx = imageRowHeightPx;

  const layoutVars = {
    "--timeline-axis-height": `${axisHeightPx}px`,
    "--timeline-axis-gap": `${axisGapPx}px`,
    "--timeline-image-area-height": `${imageAreaHeightPx}px`,
    "--timeline-track-gap": `${trackGapPx}px`,
    "--timeline-track-height": `${trackHeightPx}px`,
    "--timeline-brush-offset": `${brushOffsetPx}px`,
    "--timeline-brush-height": `${brushHeightPx}px`,
  };

  const visibleTrackRanges = useMemo(
    () => filterVisibleTracks(timeline?.trackRanges, viewStartMs, viewEndMs),
    [timeline?.trackRanges, viewStartMs, viewEndMs]
  );

  const cursorPercent = Number.isFinite(resolvedAbsoluteMs)
    ? positionPercent(resolvedAbsoluteMs, viewStartMs, viewDurationMs)
    : null;

  const brushStartPercent =
    Number.isFinite(viewStartMs) &&
    Number.isFinite(summaryStartMs) &&
    Number.isFinite(summaryDurationMs) &&
    summaryDurationMs > 0
      ? clamp(((viewStartMs - summaryStartMs) / summaryDurationMs) * 100, 0, 100)
      : 0;

  const brushEndPercent =
    Number.isFinite(viewEndMs) &&
    Number.isFinite(summaryStartMs) &&
    Number.isFinite(summaryDurationMs) &&
    summaryDurationMs > 0
      ? clamp(((viewEndMs - summaryStartMs) / summaryDurationMs) * 100, 0, 100)
      : 100;

  const brushWidthPercent = Math.max(brushEndPercent - brushStartPercent, 0.5);

  const brushWindowStyle = {
    left: `${brushStartPercent}%`,
    width: `${Math.min(brushWidthPercent, 100)}%`,
  };

  const brushDisabled = !Number.isFinite(summaryDurationMs) || summaryDurationMs <= 0;

  // Track user interactions for auto-scroll behavior
  const lastInteractionRef = useRef(0);
  const markUserInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  // Use timeline interaction hook
  const { hoverState, setHoverState, handlePointerDown, handlePointerMove, handlePointerUp } =
    useTimelineInteraction({
      containerRef,
      interactionRef,
      viewStartMs,
      viewDurationMs,
      timeline,
      imageSegments: scheduleSegments,
      images: mediaData?.images || [],
      seekToAbsolute: useCallback(
        (absoluteMs, options = {}) => seekToAbsolute(mediaData, absoluteMs, options),
        [seekToAbsolute, mediaData]
      ),
      playing,
      snapToMedia,
      findTrackAtTime,
      onInteraction: markUserInteraction,
    });

  const hoverPlaceholder = useMemo(() => {
    if (!hoverState || !mediaData?.images?.length || !Number.isFinite(hoverState.ms)) {
      return null;
    }
    const slots = hoverState.previewLayout?.slots || [];
    const hasImages = slots.some((slot) => slot?.image);
    if (hasImages) {
      return null;
    }
    const entries = scheduleMetadata
      .map((meta, index) =>
        meta.visible
          ? {
              startMs: meta.startMs,
              image: mediaData.images[index],
            }
          : null
      )
      .filter(Boolean)
      .sort((a, b) => a.startMs - b.startMs);

    if (!entries.length) {
      return null;
    }

    let previous = null;
    let next = null;
    for (const entry of entries) {
      if (!Number.isFinite(entry.startMs)) {
        continue;
      }
      if (entry.startMs <= hoverState.ms) {
        previous = entry.image;
      }
      if (entry.startMs > hoverState.ms) {
        next = entry.image;
        break;
      }
    }

    if (!previous) {
      previous = entries[0]?.image || null;
    }
    if (!next) {
      next = entries.find((entry) => entry.startMs > hoverState.ms)?.image || null;
    }

    const { previousSrc, nextSrc } = resolvePlaceholderSources({
      previousImage: previous,
      nextImage: next,
    });
    const signature = buildPlaceholderSignature(previousSrc, nextSrc, hoverState.ms);
    return {
      element: (
        <SlideshowPlaceholder
          previousImage={previous}
          nextImage={next}
          className="timeline__hover-placeholder"
        />
      ),
      key: signature,
    };
  }, [hoverState, mediaData, scheduleMetadata]);

  // Use brush control hook
  const { startBrushDrag, handleBrushPointerMove, handleBrushPointerUp } = useBrushControl({
    brushTrackRef,
    brushDisabled,
    summaryStartMs,
    summaryEndMs,
    summaryDurationMs,
    viewStartMs,
    viewEndMs,
    setTimelineViewRange,
    anchorMs: resolvedAbsoluteMs,
    onInteraction: markUserInteraction,
  });

  // Auto-scroll timeline when playing - track last user interaction
  useEffect(() => {
    if (
      !playing ||
      !Number.isFinite(resolvedAbsoluteMs) ||
      !Number.isFinite(viewStartMs) ||
      !Number.isFinite(viewEndMs) ||
      !Number.isFinite(summaryStartMs) ||
      !Number.isFinite(summaryEndMs)
    ) {
      return;
    }

    const viewDuration = viewEndMs - viewStartMs;
    if (!Number.isFinite(viewDuration) || viewDuration <= 0) {
      return;
    }

    // Check if enough time has passed since last user interaction
    const timeSinceInteraction = Date.now() - lastInteractionRef.current;
    const canAutoScroll = timeSinceInteraction > TIMELINE_AUTO_SCROLL_DELAY_MS;

    // Only auto-scroll if enough time has passed since last interaction
    if (!canAutoScroll) {
      return;
    }

    // Check if playhead is outside the visible window or approaching edges
    const marginRatio = 0.2;
    const triggerRatio = 0.1;
    const marginMs = viewDuration * marginRatio;
    const triggerMs = viewEndMs - viewDuration * triggerRatio;
    
    const isOutsideWindow = resolvedAbsoluteMs < viewStartMs || resolvedAbsoluteMs > viewEndMs;
    const isApproachingEdge = resolvedAbsoluteMs >= triggerMs || resolvedAbsoluteMs < viewStartMs + marginMs;

    // Auto-scroll if playhead is outside window or approaching edges
    const shouldScroll = isOutsideWindow || isApproachingEdge;

    if (!shouldScroll) {
      return;
    }

    const desiredStart = resolvedAbsoluteMs - marginMs;
    const maxStart = Math.max(summaryStartMs, summaryEndMs - viewDuration);
    const clampedStart = clamp(desiredStart, summaryStartMs, maxStart);
    if (Math.abs(clampedStart - viewStartMs) < 1) {
      return;
    }

    setTimelineViewRange(clampedStart, clampedStart + viewDuration);
  }, [
    playing,
    resolvedAbsoluteMs,
    viewStartMs,
    viewEndMs,
    summaryStartMs,
    summaryEndMs,
    setTimelineViewRange,
  ]);

  const handlePointerLeave = useCallback(() => {
    setHoverState(null);
  }, [setHoverState]);

  // Alt/Option + Scroll to zoom around cursor position
  const handleWheel = useCallback(
    (event) => {
      if (!event.altKey) return; // Only when Option key is pressed
      if (!Number.isFinite(viewStartMs) || !Number.isFinite(viewEndMs)) return;
      if (!Number.isFinite(summaryStartMs) || !Number.isFinite(summaryEndMs)) return;
      event.preventDefault();
      markUserInteraction(); // User is zooming

      const container = interactionRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = event.clientX != null ? event.clientX : rect.left + rect.width / 2;
      const ratio = clamp((x - rect.left) / Math.max(rect.width, 1), 0, 1);

      const currentDuration = Math.max(viewEndMs - viewStartMs, 1);
      // Zoom factor: wheel down (deltaY>0) zooms out, up zooms in
      const step = 1.1;
      const zoom = event.deltaY > 0 ? step : 1 / step;
      const newDuration = clamp(
        Math.round(currentDuration * zoom),
        TIMELINE_MIN_VIEW_WINDOW_MS, // minimum 0.5s window
        Math.max(summaryEndMs - summaryStartMs, 1)
      );

      const focusTime = viewStartMs + ratio * currentDuration;
      let newStart = Math.round(focusTime - ratio * newDuration);
      let newEnd = newStart + newDuration;

      // Clamp to summary bounds
      if (newStart < summaryStartMs) {
        newStart = summaryStartMs;
        newEnd = newStart + newDuration;
      }
      if (newEnd > summaryEndMs) {
        newEnd = summaryEndMs;
        newStart = newEnd - newDuration;
      }
      if (newEnd <= newStart) return;

      setTimelineViewRange(newStart, newEnd);
    },
    [interactionRef, viewStartMs, viewEndMs, summaryStartMs, summaryEndMs, setTimelineViewRange, markUserInteraction]
  );

  // Attach non-passive wheel listener to allow preventDefault without warnings
  useEffect(() => {
    const el = interactionRef.current;
    if (!el) return;
    const handler = (e) => handleWheel(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
    };
  }, [interactionRef, handleWheel]);

  // Conditional rendering after all hooks
  if (!timeline) {
    return (
      <div className="timeline__main timeline__main--placeholder">
        <div className="timeline__placeholder">
          <p>Load audio or images to populate the timeline.</p>
        </div>
      </div>
    );
  }

  if (!Number.isFinite(summaryStartMs) || !Number.isFinite(summaryEndMs)) {
    return (
      <div className="timeline__main timeline__main--placeholder">
        <div className="timeline__placeholder">
          <p>Load audio or images to populate the timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline__main" id="timeline-main" ref={containerRef} style={layoutVars}>
      <div
        className="timeline__interaction"
        id="timeline-interaction"
        ref={interactionRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerLeave}
        onPointerLeave={handlePointerLeave}
      >
        <div className="timeline__gradient" id="timeline-gradient"></div>
        <div className="timeline__gridlines" id="timeline-gridlines">
          {ticks.map((tick) => (
            <div
              key={`grid-${tick}`}
              className="timeline__gridline"
              style={{
                left: `${positionPercent(tick, viewStartMs, viewDurationMs)}%`,
              }}
            />
          ))}
        </div>
        <div className="timeline__axis" id="timeline-axis">
          {ticks.map((tick) => {
            const date = new Date(tick);
            // Show seconds only if view duration is less than 1 hour
            const showSeconds = viewDurationMs && viewDurationMs < TIMELINE_HOUR_THRESHOLD_MS;
            const label = showSeconds
              ? formatClockWithSeconds(date)
              : formatClock(date);

            return (
              <div
                key={`tick-${tick}`}
                className="timeline__axis-tick"
                style={{
                  left: `${positionPercent(tick, viewStartMs, viewDurationMs)}%`,
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
        <div
          className="timeline__tracks"
          id="timeline-tracks"
          style={{
            top: `${axisHeightPx + axisGapPx + imageAreaHeightPx + trackGapPx}px`,
          }}
        >
          {visibleTrackRanges.map((range) => {
            if (!Number.isFinite(range.startMs) || !Number.isFinite(range.endMs)) {
              return null;
            }
            const left = positionPercent(range.startMs, viewStartMs, viewDurationMs);
            const right = positionPercent(range.endMs, viewStartMs, viewDurationMs);
            const width = clamp(right - left, 0, 100 - left);
            const classes = ["timeline-track"];
            if (range.index === activeTrackIndex) {
              classes.push("timeline-track--active");
            }
            if (range.overlapMs || range.overlapAheadMs) {
              classes.push("timeline-track--overlap");
            }
            if (!isTrackRangeLoaded(range, activeTrackIndex)) {
              classes.push("timeline-track--pending");
            }
            const track = range.track || {};
            const name =
              cleanTrackNameForDisplay(track.originalName || track.label || "") ||
              track.label ||
              `Track ${range.index + 1}`;
            const titleParts = [
              `"${name}"`,
              `${formatClockWithSeconds(new Date(range.startMs))} → ${formatClockWithSeconds(new Date(range.endMs))}`,
            ];
            if (Number.isFinite(track.duration)) {
              titleParts.push(formatTime(Math.round(track.duration)));
            }
            const overlapInfo = [];
            if (Number.isFinite(range.overlapMs) && range.overlapMs > 0) {
              overlapInfo.push(
                `Overlap with previous: ${formatTime(Math.round(range.overlapMs / 1000))}`
              );
            }
            if (Number.isFinite(range.overlapAheadMs) && range.overlapAheadMs > 0) {
              overlapInfo.push(
                `Overlap with next: ${formatTime(Math.round(range.overlapAheadMs / 1000))}`
              );
            }
            const title = [...titleParts, ...overlapInfo].join("\n");

            return (
              <div
                key={`track-${range.index}`}
                className={classes.join(" ")}
                title={title}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
              >
                <span className="timeline-track__label">{name}</span>
              </div>
            );
          })}
        </div>
        <div
          className="timeline__images"
          id="timeline-images"
          style={{
            top: `${axisHeightPx + axisGapPx}px`,
            height: `${imageAreaHeightPx}px`,
          }}
        >
          {visibleImageEntries.map((entry) => {
            if (!Number.isFinite(entry.startMs) || !Number.isFinite(entry.endMs)) {
              return null;
            }

            const left = positionPercent(entry.startMs, viewStartMs, viewDurationMs);
            const right = positionPercent(entry.endMs, viewStartMs, viewDurationMs);
            const widthPercent = clamp(right - left, 0, 100 - left);

            const classes = ["timeline-image"];
            if (visibleImageSet.has(entry.image)) {
              classes.push("timeline-image--active");
            }

            const concurrency = Math.max(entry.maxConcurrency || 1, 1);
            const slotIndex = Math.max(entry.slotIndex || 0, 0);
            const marginPx = concurrency > 1 ? imageRowMarginPx : 0;
            const totalMargin = marginPx * Math.max(concurrency - 1, 0);
            const heightPx = Math.max((imageRowHeightPx - totalMargin) / concurrency, 1);
            const topPx = concurrency > 1 ? slotIndex * (heightPx + marginPx) : 0;

            const timeLabel = formatDateAndTime(new Date(entry.startMs));
            const name = entry.image?.name || `Image ${entry.index + 1}`;
            const imageKey = entry.image?.url || entry.image?.name || `${entry.startMs}-${entry.index}`;

            return (
              <div
                key={imageKey}
                className={classes.join(" ")}
                style={{
                  left: `${left}%`,
                  width: `${Math.max(widthPercent, 0)}%`,
                  top: `${topPx}px`,
                  height: `${heightPx}px`,
                }}
                title={`${name}\n${timeLabel}`}
                data-time-ms={entry.startMs}
                data-end-ms={entry.endMs}
                data-duration-ms={entry.endMs - entry.startMs}
                data-position={left.toFixed(2)}
                data-slot-index={slotIndex}
              />
            );
          })}
        </div>
        <div
          className="timeline__cursor"
          id="timeline-cursor"
          style={{
            left: cursorPercent != null ? `${cursorPercent}%` : undefined,
            opacity: cursorPercent != null ? 1 : 0,
          }}
        ></div>
        <div
          className="timeline__hover-line"
          id="timeline-hover-line"
          style={{
            left: hoverState ? `${hoverState.leftPercent}%` : undefined,
            opacity: hoverState ? 1 : 0,
          }}
        ></div>
        <div className="timeline__seeker" id="timeline-seeker" style={{ opacity: 0 }}></div>
        <div
          className={`timeline__hover-preview ${hoverState ? "" : "hidden"}`}
          id="timeline-hover-preview"
          style={{
            left: hoverState ? `${hoverState.leftPercent}%` : undefined,
          }}
        >
          <div className="timeline__hover-preview-track" id="timeline-hover-preview-track">
            {hoverState?.trackName || ""}
          </div>
          <CompositionView
            className="timeline__hover-preview-images"
            slots={hoverState?.previewLayout?.slots || []}
            layoutSize={hoverState?.previewLayout?.layoutSize || 1}
            emptyFallback={
              hoverPlaceholder?.element || <div className="timeline__hover-preview-empty">No media</div>
            }
            emptyFallbackKey={hoverPlaceholder?.key}
            placeholderClassName="slideshow__column-placeholder"
            fillPlaceholders={true}
            imageTransitionDelayMs={0}
            imageFadingClassName=""
            id="timeline-hover-preview-images"
          />
          <div className="timeline__hover-preview-time" id="timeline-hover-preview-time">
            {hoverState ? formatDateAndTime(new Date(hoverState.ms)) : ""}
          </div>
        </div>
      </div>
      <div className={`timeline__brush ${brushDisabled ? "timeline__brush--disabled" : ""}`}>
        <div
          className="timeline__brush-track"
          ref={brushTrackRef}
          onPointerDown={brushDisabled ? undefined : (event) => startBrushDrag(event, "move")}
          onPointerMove={brushDisabled ? undefined : handleBrushPointerMove}
          onPointerUp={brushDisabled ? undefined : handleBrushPointerUp}
          onPointerCancel={brushDisabled ? undefined : handleBrushPointerUp}
          onDoubleClick={(event) => {
            event.preventDefault();
            resetTimelineView();
          }}
          role="presentation"
        >
          <div
            className="timeline__brush-window"
            style={brushWindowStyle}
            onPointerDown={(event) => startBrushDrag(event, "move")}
          >
            <div
              className="timeline__brush-handle timeline__brush-handle--start"
              onPointerDown={(event) => startBrushDrag(event, "start")}
            />
            <div className="timeline__brush-range" />
            <div
              className="timeline__brush-handle timeline__brush-handle--end"
              onPointerDown={(event) => startBrushDrag(event, "end")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function computeTicks(startMs, endMs) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [];
  }
  const duration = endMs - startMs;
  let step = TICK_STEPS_MS[TICK_STEPS_MS.length - 1];
  for (const candidate of TICK_STEPS_MS) {
    if (duration / candidate <= 8) {
      step = candidate;
      break;
    }
  }
  const firstTick = Math.ceil(startMs / step) * step;
  const ticks = [];
  for (let tick = firstTick; tick <= endMs + 1; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

export default memo(Timeline);
