import { formatClock, formatTime } from "./formatters.js";
import {
  TIMELINE_PADDING_RATIO,
  IMAGE_STACK_WINDOW_MS,
  IMAGE_STACK_OFFSET_ORDER,
  OVERLAP_REPORT_THRESHOLD_MS,
} from "./constants.js";
import { t } from "../i18n/index.js";
import { toTimestamp } from "../utils/dateUtils.js";

export function applyTimelineCalculations(mediaData, delaySeconds = 0) {
  if (!mediaData) {
    return mediaData;
  }

  const delayMs = Number.isFinite(delaySeconds) ? delaySeconds * 1000 : 0;
  const audioTracks = (mediaData.audioTracks || []).map((track) => {
    const fileTimestamp = track.fileTimestamp instanceof Date ? track.fileTimestamp : null;
    const startMs = fileTimestamp ? toTimestamp(fileTimestamp) + delayMs : null;
    const durationMs = Number.isFinite(track.duration) ? track.duration * 1000 : null;

    const adjustedStartTime = Number.isFinite(startMs) ? new Date(startMs) : null;
    const adjustedEndTime =
      adjustedStartTime && Number.isFinite(durationMs) ? new Date(startMs + durationMs) : null;

    return {
      ...track,
      adjustedStartTime,
      adjustedEndTime,
    };
  });

  const activeIndex = mediaData.activeTrackIndex ?? 0;
  const activeTrack =
    audioTracks[activeIndex] ||
    audioTracks.find((track) => track.adjustedStartTime instanceof Date) ||
    null;

  const referenceStart =
    activeTrack?.adjustedStartTime ||
    audioTracks.find((track) => track.adjustedStartTime instanceof Date)?.adjustedStartTime ||
    null;

  const images = (mediaData.images || []).map((image) => {
    const originalTimestamp =
      image.originalTimestamp instanceof Date
        ? image.originalTimestamp
        : image.timestamp instanceof Date
          ? image.timestamp
          : null;

    const relativeSeconds =
      referenceStart && originalTimestamp
        ? (toTimestamp(originalTimestamp) - toTimestamp(referenceStart)) / 1000
        : 0;

    return {
      ...image,
      originalTimestamp,
      relative: relativeSeconds,
      timecode: formatTime(relativeSeconds),
      timeOfDay: originalTimestamp ? formatClock(originalTimestamp) : image.timeOfDay,
    };
  });

  const summary = buildTimelineSummary(audioTracks, images);

  return {
    ...mediaData,
    audioTracks,
    images,
    timeline: summary,
  };
}

export default {
  applyTimelineCalculations,
};

function buildTimelineSummary(audioTracks, images) {
  const trackRanges = [];
  const anomalies = [];

  let minContentMs = Number.POSITIVE_INFINITY;
  let maxContentMs = Number.NEGATIVE_INFINITY;

  audioTracks.forEach((track, index) => {
    const start =
      track?.adjustedStartTime instanceof Date ? toTimestamp(track.adjustedStartTime) : null;
    const end = track?.adjustedEndTime instanceof Date ? toTimestamp(track.adjustedEndTime) : null;
    if (!Number.isFinite(start)) return;
    const resolvedEnd = Number.isFinite(end) ? end : start + (Number(track.duration) || 0) * 1000;
    trackRanges.push({
      track,
      index,
      startMs: start,
      endMs: resolvedEnd,
    });
    if (start < minContentMs) minContentMs = start;
    if (resolvedEnd > maxContentMs) maxContentMs = resolvedEnd;
  });

  trackRanges.sort((a, b) => a.startMs - b.startMs);

  let latestRange = null;
  let latestEndMs = null;
  trackRanges.forEach((range, lane) => {
    range.lane = lane;
    if (latestRange) {
      const overlap = (latestEndMs ?? latestRange.endMs) - range.startMs;
      if (overlap > 0) {
        range.overlapMs = overlap;
        latestRange.overlapAheadMs = Math.max(latestRange.overlapAheadMs || 0, overlap);
        if (overlap >= OVERLAP_REPORT_THRESHOLD_MS) {
          if (anomalies.length === 0) {
            anomalies.push(t("overlapHandlingInfo"));
          }
          anomalies.push(
            t("overlapWarning", {
              trackA: range.track.label,
              duration: formatTime(Math.round(overlap / 1000)),
              trackB: latestRange.track.label,
            })
          );
        }
      } else {
        range.gapMs = -overlap;
      }
    }
    latestEndMs = Math.max(latestEndMs ?? range.endMs, range.endMs);
    if (!latestRange || range.endMs >= latestRange.endMs) {
      latestRange = range;
    }
  });

  const imageEntries = images
    .map((image, index) => ({
      image,
      index,
      timeMs: image?.originalTimestamp instanceof Date ? toTimestamp(image.originalTimestamp) : null,
    }))
    .filter((entry) => Number.isFinite(entry.timeMs))
    .sort((a, b) => a.timeMs - b.timeMs);

  imageEntries.forEach((entry) => {
    if (entry.timeMs < minContentMs) minContentMs = entry.timeMs;
    if (entry.timeMs > maxContentMs) maxContentMs = entry.timeMs;
  });

  const imageStackMagnitude = layoutImageEntries(imageEntries, images);

  if (!Number.isFinite(minContentMs) || !Number.isFinite(maxContentMs)) {
    return {
      startMs: null,
      endMs: null,
      durationMs: null,
      viewStartMs: null,
      viewEndMs: null,
      viewDurationMs: null,
      trackRanges,
      trackLaneCount: trackRanges.length,
      imageEntries,
      imageStackMagnitude,
      anomalies,
    };
  }

  // For image-only timelines, add padding to ensure some viewable range
  if (!trackRanges.length && imageEntries.length) {
    maxContentMs += 30_000;
  }

  const baseSpan = Math.max(maxContentMs - minContentMs, 1);
  const padding = Math.max(
    5 * 60 * 1000,
    Math.min(baseSpan * TIMELINE_PADDING_RATIO, 30 * 60 * 1000)
  );
  const viewStartMs = minContentMs - padding;
  const viewEndMs = maxContentMs + padding;
  const viewDurationMs = Math.max(viewEndMs - viewStartMs, 1);

  return {
    startMs: minContentMs,
    endMs: maxContentMs,
    durationMs: maxContentMs - minContentMs,
    viewStartMs,
    viewEndMs,
    viewDurationMs,
    trackRanges,
    trackLaneCount: trackRanges.length,
    imageEntries,
    imageStackMagnitude,
    anomalies,
  };
}

function layoutImageEntries(entries, images) {
  if (!entries.length) {
    return 0;
  }
  const active = [];
  let maxMagnitude = 0;

  entries.forEach((entry) => {
    while (active.length && entry.timeMs - active[0].timeMs > IMAGE_STACK_WINDOW_MS) {
      active.shift();
    }

    const usedOffsets = new Set(active.map((item) => item.offsetIndex));
    let offsetIndex = IMAGE_STACK_OFFSET_ORDER.find((candidate) => !usedOffsets.has(candidate));
    if (offsetIndex === undefined) {
      offsetIndex = 0;
    }

    entry.offsetIndex = offsetIndex;
    const image = images[entry.index];
    if (image) {
      image.timelineOffsetIndex = offsetIndex;
    }

    active.push({ timeMs: entry.timeMs, offsetIndex });
    maxMagnitude = Math.max(maxMagnitude, Math.abs(offsetIndex));
  });

  return maxMagnitude;
}
