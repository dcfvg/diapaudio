import "./Timeline.css";
import { useMemo, useCallback, useRef, memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMediaStore } from "../state/useMediaStore.js";
import { useSettingsStore } from "../state/useSettingsStore.js";
import { usePlaybackStore } from "../state/usePlaybackStore.js";
import { formatClockWithSeconds, formatDateAndTime, formatClock } from "../utils/dateUtils.js";
import { formatTime } from "../media/formatters.js";
import { MAX_VISIBLE_IMAGES } from "../media/constants.js";
import {
  TIMELINE_AUTO_SCROLL_DELAY_MS,
  TIMELINE_MIN_VIEW_WINDOW_MS,
  TIMELINE_HOUR_THRESHOLD_MS,
} from "../constants/ui.js";
import {
  computeMinVisibleMs,
  computeScaledHoldMs,
  computeCompositionIntervalMs,
  computeSnapGridMs,
} from "../state/helpers/settingsHelpers.js";
import { cleanTrackNameForDisplay } from "../media/fileUtils.js";
import {
  aggregateEntriesByPixel,
  createScheduleIndex,
  findSurroundingImages,
} from "../media/scheduleIndex.js";
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
import { buildMediaTimelineIndex, buildTimelineProjection } from "../media/timelineEvents.js";

const TIMELINE_VOID_TARGET_WIDTH_PX = 24;

function trackRangeCoversTime(range, absoluteMs) {
  return (
    Number.isFinite(absoluteMs) &&
    Number.isFinite(range?.startMs) &&
    Number.isFinite(range?.endMs) &&
    absoluteMs >= range.startMs &&
    absoluteMs <= range.endMs
  );
}

function resolveActiveTrackRangeIndex(trackRanges, activeIndex, absoluteMs) {
  if (!Array.isArray(trackRanges)) {
    return Number.isInteger(activeIndex) ? activeIndex : null;
  }

  if (!Number.isFinite(absoluteMs)) {
    return Number.isInteger(activeIndex) ? activeIndex : null;
  }

  const activeRange = trackRanges.find((range) => range.index === activeIndex);
  if (trackRangeCoversTime(activeRange, absoluteMs)) {
    return activeIndex;
  }

  const timeRange = trackRanges.find((range) => trackRangeCoversTime(range, absoluteMs));
  return Number.isInteger(timeRange?.index) ? timeRange.index : null;
}

const isTrackRangeLoaded = (range, activeIndex, resolvedActiveIndex) =>
  (range.index === activeIndex || range.index === resolvedActiveIndex) && range.track?.url;

function computeCompressedVoidMs(startMs, endMs, widthPx) {
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    endMs <= startMs ||
    !Number.isFinite(widthPx) ||
    widthPx <= 0
  ) {
    return undefined;
  }

  return ((endMs - startMs) / widthPx) * TIMELINE_VOID_TARGET_WIDTH_PX;
}

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
  const { t } = useTranslation();
  const mediaData = useMediaStore((state) => state.mediaData);
  const timelineView = useMediaStore((state) => state.timelineView);
  const setTimelineView = useMediaStore((state) => state.setTimelineView);
  const imageDisplaySeconds = useSettingsStore((state) => state.imageDisplaySeconds);
  const imageHoldSeconds = useSettingsStore((state) => state.imageHoldSeconds);
  const compositionIntervalSeconds = useSettingsStore((state) => state.compositionIntervalSeconds);
  const speed = useSettingsStore((state) => state.speed);
  const snapToGrid = useSettingsStore((state) => state.snapToGrid);
  const snapGridSeconds = useSettingsStore((state) => state.snapGridSeconds);
  const autoSkipVoids = useSettingsStore((state) => state.autoSkipVoids);

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
  const [timelineWidthPx, setTimelineWidthPx] = useState(null);

  // Use custom hooks
  const { snapToMedia, findTrackAtTime } = useTimelineSnapping();

  // Get base timeline first (will extend with segments later)
  const baseTimeline = mediaData?.timeline;
  const mediaTimelineIndex = useMemo(() => buildMediaTimelineIndex(mediaData), [mediaData]);

  // Summary bounds represent the scrollable range - use content bounds (no padding)
  // This ensures tracks and brush align properly with timeline edges
  const summaryStartMs =
    baseTimeline && Number.isFinite(baseTimeline.startMs) ? baseTimeline.startMs : 0;
  const summaryEndMs = baseTimeline && Number.isFinite(baseTimeline.endMs) ? baseTimeline.endMs : 0;

  const setTimelineViewRange = useCallback(
    (startMs, endMs) => {
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
      setTimelineView({ startMs, endMs });
    },
    [setTimelineView]
  );

  // Resolve image display, hold and composition interval from settings
  const displaySeconds = Number(imageDisplaySeconds);
  const speedValue = Number(speed);
  const holdSecondsValue = Number(imageHoldSeconds);

  const minVisibleMs = useMemo(
    () => computeMinVisibleMs(displaySeconds, speedValue),
    [displaySeconds, speedValue]
  );

  const imageHoldMs = useMemo(
    () => computeScaledHoldMs(holdSecondsValue, speedValue),
    [holdSecondsValue, speedValue]
  );

  const compositionIntervalMs = useMemo(
    () => computeCompositionIntervalMs(compositionIntervalSeconds),
    [compositionIntervalSeconds]
  );

  const snapGridMs = useMemo(() => computeSnapGridMs(snapGridSeconds), [snapGridSeconds]);

  const scheduleIndex = useMemo(
    () =>
      createScheduleIndex(mediaData?.images || [], {
        minVisibleMs,
        holdMs: imageHoldMs,
        maxSlots: MAX_VISIBLE_IMAGES,
        compositionIntervalMs,
        snapToGrid: Boolean(snapToGrid),
        snapGridMs,
      }),
    [mediaData?.images, minVisibleMs, imageHoldMs, compositionIntervalMs, snapToGrid, snapGridMs]
  );

  const scheduleSegments = scheduleIndex.segments || EMPTY_ARRAY;
  const scheduledEntries = scheduleIndex.entries || EMPTY_ARRAY;

  // Extend timeline with schedule segments and snap settings for snapping logic
  const timeline = useMemo(() => {
    if (!baseTimeline) return null;
    return {
      ...baseTimeline,
      imageSegments: scheduleSegments,
      snapToGrid: Boolean(snapToGrid),
      snapGridMs,
    };
  }, [baseTimeline, scheduleSegments, snapToGrid, snapGridMs]);

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

  const summaryProjection = useMemo(
    () =>
      buildTimelineProjection({
        startMs: summaryStartMs,
        endMs: summaryEndMs,
        mediaTimelineIndex,
        mediaCoverageRanges: scheduledEntries,
        enabled: Boolean(autoSkipVoids),
        minVoidMs: minVisibleMs,
        compressedVoidMs: computeCompressedVoidMs(summaryStartMs, summaryEndMs, timelineWidthPx),
        compressedVoidPx: TIMELINE_VOID_TARGET_WIDTH_PX,
        viewportWidthPx: timelineWidthPx,
      }),
    [
      summaryStartMs,
      summaryEndMs,
      mediaTimelineIndex,
      scheduledEntries,
      autoSkipVoids,
      minVisibleMs,
      timelineWidthPx,
    ]
  );

  const viewProjection = useMemo(
    () =>
      buildTimelineProjection({
        startMs: viewStartMs,
        endMs: viewEndMs,
        mediaTimelineIndex,
        mediaCoverageRanges: scheduledEntries,
        enabled: Boolean(autoSkipVoids),
        minVoidMs: minVisibleMs,
        compressedVoidMs: computeCompressedVoidMs(viewStartMs, viewEndMs, timelineWidthPx),
        compressedVoidPx: TIMELINE_VOID_TARGET_WIDTH_PX,
        viewportWidthPx: timelineWidthPx,
      }),
    [
      viewStartMs,
      viewEndMs,
      mediaTimelineIndex,
      scheduledEntries,
      autoSkipVoids,
      minVisibleMs,
      timelineWidthPx,
    ]
  );

  const resolvedAbsoluteMs = Number.isFinite(absoluteTime)
    ? absoluteTime
    : Number.isFinite(viewStartMs)
      ? viewStartMs
      : Number.isFinite(summaryStartMs)
        ? summaryStartMs
        : null;

  // All hooks must be called unconditionally
  const ticks = useMemo(() => computeTicks(viewStartMs, viewEndMs), [viewStartMs, viewEndMs]);
  const visibleTicks = useMemo(() => filterProjectedTicks(ticks, viewProjection), [ticks, viewProjection]);

  const visibleImageSet = useMemo(() => new Set(displayedImages || []), [displayedImages]);

  useEffect(() => {
    const node = interactionRef.current;
    const ResizeObserverCtor = globalThis.ResizeObserver;
    if (!node) {
      return undefined;
    }
    const measureWidth = () => {
      const width = node.getBoundingClientRect().width;
      if (Number.isFinite(width) && width > 0) {
        setTimelineWidthPx(width);
      }
    };
    measureWidth();
    if (typeof ResizeObserverCtor !== "function") {
      return undefined;
    }
    const observer = new ResizeObserverCtor((entries) => {
      const width = entries[0]?.contentRect?.width || node.getBoundingClientRect().width;
      if (Number.isFinite(width) && width > 0) {
        setTimelineWidthPx(width);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [timeline]);

  // Virtual scrolling: filter visible items based on current viewport
  const visibleImageEntries = useMemo(() => {
    if (!scheduledEntries.length || !Number.isFinite(viewStartMs) || !Number.isFinite(viewEndMs)) {
      return [];
    }
    return aggregateEntriesByPixel(
      scheduledEntries,
      viewStartMs,
      viewEndMs,
      timelineWidthPx,
      viewProjection
    );
  }, [scheduledEntries, viewStartMs, viewEndMs, timelineWidthPx, viewProjection]);

  const imageRowHeightPx = 13;
  const imageRowMarginPx = 1;
  const axisHeightPx = 14;
  const axisGapPx = 3;
  const trackGapPx = 3;
  const trackHeightPx = 18;
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
  const activeTrackRangeIndex = useMemo(
    () => resolveActiveTrackRangeIndex(visibleTrackRanges, activeTrackIndex, absoluteTime),
    [visibleTrackRanges, activeTrackIndex, absoluteTime]
  );

  const cursorPercent = Number.isFinite(resolvedAbsoluteMs)
    ? viewProjection.timeToPercent(resolvedAbsoluteMs)
    : null;

  const brushStartPercent =
    Number.isFinite(viewStartMs) &&
    Number.isFinite(summaryStartMs) &&
    Number.isFinite(summaryProjection.projectedDurationMs) &&
    summaryProjection.projectedDurationMs > 0
      ? summaryProjection.timeToPercent(viewStartMs)
      : 0;

  const brushEndPercent =
    Number.isFinite(viewEndMs) &&
    Number.isFinite(summaryStartMs) &&
    Number.isFinite(summaryProjection.projectedDurationMs) &&
    summaryProjection.projectedDurationMs > 0
      ? summaryProjection.timeToPercent(viewEndMs)
      : 100;

  const brushWidthPercent = Math.max(brushEndPercent - brushStartPercent, 0.5);

  const brushWindowStyle = {
    left: `${brushStartPercent}%`,
    width: `${Math.min(brushWidthPercent, 100)}%`,
  };

  const brushDisabled =
    !Number.isFinite(summaryProjection.projectedDurationMs) ||
    summaryProjection.projectedDurationMs <= 0;

  // Track user interactions for auto-scroll behavior
  const lastInteractionRef = useRef(0);
  const markUserInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  const seekToTimelineAbsolute = useCallback(
    (absoluteMs, options = {}) => seekToAbsolute(mediaData, absoluteMs, options),
    [seekToAbsolute, mediaData]
  );

  const handleVoidCutPointerDown = useCallback(
    (event, targetMs) => {
      if (event.button != null && event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      markUserInteraction();
      seekToTimelineAbsolute(targetMs, { autoplay: true });
    },
    [markUserInteraction, seekToTimelineAbsolute]
  );

  const handleVoidCutKeyDown = useCallback(
    (event, targetMs) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      markUserInteraction();
      seekToTimelineAbsolute(targetMs, { autoplay: true });
    },
    [markUserInteraction, seekToTimelineAbsolute]
  );

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
      seekToAbsolute: seekToTimelineAbsolute,
      playing,
      snapToMedia,
      findTrackAtTime,
      axisProjection: viewProjection,
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
    const { previous, next } = findSurroundingImages(scheduleIndex, hoverState.ms);

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
  }, [hoverState, mediaData, scheduleIndex]);

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
    axisProjection: summaryProjection,
    onInteraction: markUserInteraction,
  });

  const voidCutMarkers = useMemo(() => {
    if (!viewProjection.enabled || !viewProjection.voids.length) {
      return [];
    }
    return viewProjection.voids.map((range, index) => {
      const left = viewProjection.timeToPercent(range.startMs);
      const right = viewProjection.timeToPercent(range.endMs);
      const sourceStartMs = Number.isFinite(range.sourceStartMs)
        ? range.sourceStartMs
        : range.startMs;
      const sourceEndMs = Number.isFinite(range.sourceEndMs)
        ? range.sourceEndMs
        : range.endMs;
      const startLabel = formatClockWithSeconds(new Date(sourceStartMs));
      const endLabel = formatClockWithSeconds(new Date(sourceEndMs));
      const targetMs = Number.isFinite(range.targetMs) ? range.targetMs : range.endMs;
      const resumeLabel = formatClockWithSeconds(new Date(targetMs));
      const width = Math.max(right - left, 0.1);
      const widthPx = Number.isFinite(timelineWidthPx) ? (width / 100) * timelineWidthPx : 0;
      const resumeLabelMinWidthPx = resumeLabel.length * 6 + 22;
      return {
        key: `void-${index}-${range.startMs}-${range.endMs}`,
        startMs: range.startMs,
        endMs: range.endMs,
        left,
        width,
        targetMs,
        resumeLabel,
        showResumeLabel: widthPx / 2 >= resumeLabelMinWidthPx,
        label: t("timelineSkippedBlankTitle", {
          start: startLabel,
          end: endLabel,
        }),
      };
    });
  }, [viewProjection, timelineWidthPx, t]);

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
    const isApproachingEdge =
      resolvedAbsoluteMs >= triggerMs || resolvedAbsoluteMs < viewStartMs + marginMs;

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

      const focusTime =
        viewProjection?.enabled && typeof viewProjection.percentToTime === "function"
          ? viewProjection.percentToTime(ratio * 100)
          : viewStartMs + ratio * currentDuration;
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
    [
      interactionRef,
      viewStartMs,
      viewEndMs,
      summaryStartMs,
      summaryEndMs,
      setTimelineViewRange,
      markUserInteraction,
      viewProjection,
    ]
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
    <div
      className={`timeline__main ${viewProjection.enabled ? "timeline__main--compressed" : ""}`}
      id="timeline-main"
      ref={containerRef}
      style={layoutVars}
    >
      {viewProjection.enabled ? (
        <p id="timeline-compressed-axis-note" className="visually-hidden">
          {t("timelineCompressedAxisNote")}
        </p>
      ) : null}
      <div
        className="timeline__interaction"
        id="timeline-interaction"
        ref={interactionRef}
        aria-describedby={viewProjection.enabled ? "timeline-compressed-axis-note" : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerLeave}
        onPointerLeave={handlePointerLeave}
      >
        <div className="timeline__gradient" id="timeline-gradient"></div>
        <div className="timeline__gridlines" id="timeline-gridlines">
          {visibleTicks.map((tick) => (
            <div
              key={`grid-${tick}`}
              className="timeline__gridline"
              style={{
                left: `${viewProjection.timeToPercent(tick)}%`,
              }}
            />
          ))}
        </div>
        {voidCutMarkers.length ? (
          <div className="timeline__void-cuts">
            {voidCutMarkers.map((marker) => (
              <div
                key={marker.key}
                className="timeline__void-cut"
                title={marker.label}
                role="button"
                tabIndex={0}
                aria-label={marker.label}
                data-start-ms={marker.startMs}
                data-end-ms={marker.endMs}
                style={{
                  left: `${marker.left}%`,
                  width: `${marker.width}%`,
                }}
                onPointerDown={(event) => handleVoidCutPointerDown(event, marker.targetMs)}
                onKeyDown={(event) => handleVoidCutKeyDown(event, marker.targetMs)}
              >
                {marker.showResumeLabel ? (
                  <span className="timeline__void-cut-label">{marker.resumeLabel}</span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className="timeline__axis" id="timeline-axis">
          {visibleTicks.map((tick) => {
            const date = new Date(tick);
            // Show seconds only if view duration is less than 1 hour
            const showSeconds = viewDurationMs && viewDurationMs < TIMELINE_HOUR_THRESHOLD_MS;
            const label = showSeconds ? formatClockWithSeconds(date) : formatClock(date);

            return (
              <div
                key={`tick-${tick}`}
                className="timeline__axis-tick"
                style={{
                  left: `${viewProjection.timeToPercent(tick)}%`,
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
            const left = viewProjection.timeToPercent(range.startMs);
            const right = viewProjection.timeToPercent(range.endMs);
            const width = clamp(right - left, 0, 100 - left);
            const classes = ["timeline-track"];
            if (range.index === activeTrackRangeIndex) {
              classes.push("timeline-track--active");
            }
            if (range.overlapMs || range.overlapAheadMs) {
              classes.push("timeline-track--overlap");
            }
            if (!isTrackRangeLoaded(range, activeTrackIndex, activeTrackRangeIndex)) {
              classes.push("timeline-track--pending");
            }
            const track = range.track || {};
            const name =
              cleanTrackNameForDisplay(track.originalName || track.label || "") ||
              track.label ||
              `Track ${range.index + 1}`;
            const labelClasses = ["timeline-track__label"];
            if (left > 70) {
              labelClasses.push("timeline-track__label--align-end");
            }
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
                <span className={labelClasses.join(" ")}>{name}</span>
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

            const left = viewProjection.timeToPercent(entry.startMs);
            const right = viewProjection.timeToPercent(entry.endMs);
            const widthPercent = clamp(right - left, 0, 100 - left);
            const widthPx = Number.isFinite(timelineWidthPx)
              ? (widthPercent / 100) * timelineWidthPx
              : 0;
            const isGrouped = entry.aggregatedCount > 1;
            const showGroupLabel = isGrouped && widthPx >= 30;
            const concurrency = Math.max(entry.maxConcurrency || 1, 1);
            const slotIndex = Math.max(entry.slotIndex || 0, 0);

            const classes = ["timeline-image"];
            if (isGrouped) {
              classes.push("timeline-image--grouped");
            }
            if (concurrency > 1) {
              classes.push("timeline-image--stacked");
            }
            if (
              visibleImageSet.has(entry.image) ||
              entry.images?.some((image) => visibleImageSet.has(image))
            ) {
              classes.push("timeline-image--active");
            }

            const marginPx = concurrency > 1 ? imageRowMarginPx : 0;
            const totalMargin = marginPx * Math.max(concurrency - 1, 0);
            const heightPx = Math.max((imageRowHeightPx - totalMargin) / concurrency, 1);
            const topPx = concurrency > 1 ? slotIndex * (heightPx + marginPx) : 0;

            const timeLabel = formatDateAndTime(new Date(entry.startMs));
            const name = isGrouped
              ? t("timelineImageGroup", { count: entry.aggregatedCount })
              : entry.image?.name || `Image ${entry.index + 1}`;
            const imageKey =
              isGrouped
                ? entry.aggregationKey ||
                  `group-${slotIndex}-${entry.index}-${entry.aggregatedCount}`
                : entry.image?.url || entry.image?.name || `${entry.startMs}-${entry.index}`;

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
                data-aggregated-count={entry.aggregatedCount || 1}
                data-aggregation-key={entry.aggregationKey || imageKey}
              >
                {showGroupLabel ? (
                  <span className="timeline-image__count">
                    {t("timelineImageGroupShort", { count: entry.aggregatedCount })}
                  </span>
                ) : null}
              </div>
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
              hoverPlaceholder?.element || (
                <div className="timeline__hover-preview-empty">No media</div>
              )
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

function filterProjectedTicks(ticks, projection, minDistancePercent = 3) {
  if (!Array.isArray(ticks) || !ticks.length || !projection?.enabled) {
    return ticks || [];
  }

  const visible = [];
  let previousPercent = Number.NEGATIVE_INFINITY;
  ticks.forEach((tick) => {
    if (projection.isVoidTime(tick)) {
      return;
    }
    const percent = projection.timeToPercent(tick);
    if (percent - previousPercent < minDistancePercent) {
      return;
    }
    visible.push(tick);
    previousPercent = percent;
  });
  return visible;
}

export default memo(Timeline);
