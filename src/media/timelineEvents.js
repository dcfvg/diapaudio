import { toTimestamp } from "../utils/dateUtils.js";

export const TIMELINE_VOID_MIN_MS = 10_000;
export const TIMELINE_VOID_COMPRESSED_MS = 1000;

const EMPTY_TIMELINE_INDEX = Object.freeze({
  imageTimes: Object.freeze([]),
  audioRanges: Object.freeze([]),
  audioStartTimes: Object.freeze([]),
  eventTimes: Object.freeze([]),
});

function dateToFiniteTimestamp(value) {
  if (!(value instanceof Date)) {
    return null;
  }
  const timestamp = toTimestamp(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function sortedUniqueFinite(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) {
    return [];
  }

  const unique = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const value = sorted[i];
    if (value !== unique[unique.length - 1]) {
      unique.push(value);
    }
  }
  return unique;
}

function clampValue(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export function getImageTimeMs(image) {
  if (!image) {
    return null;
  }

  return (
    dateToFiniteTimestamp(image.adjustedTimestamp) ??
    dateToFiniteTimestamp(image.originalTimestamp) ??
    dateToFiniteTimestamp(image.timestamp) ??
    (Number.isFinite(image.timeMs) ? image.timeMs : null)
  );
}

export function getTrackStartMs(track) {
  return dateToFiniteTimestamp(track?.adjustedStartTime);
}

export function getTrackEndMs(track) {
  const endMs = dateToFiniteTimestamp(track?.adjustedEndTime);
  if (Number.isFinite(endMs)) {
    return endMs;
  }

  const startMs = getTrackStartMs(track);
  const durationMs = Number.isFinite(track?.duration) ? track.duration * 1000 : null;
  return Number.isFinite(startMs) && Number.isFinite(durationMs) ? startMs + durationMs : null;
}

export function buildMediaTimelineIndex(mediaData) {
  if (!mediaData) {
    return EMPTY_TIMELINE_INDEX;
  }

  const imageTimes = sortedUniqueFinite((mediaData.images || []).map(getImageTimeMs));

  const rawAudioRanges = (mediaData.audioTracks || [])
    .map((track, index) => {
      const startMs = getTrackStartMs(track);
      const endMs = getTrackEndMs(track);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return null;
      }
      return { index, startMs, endMs };
    })
    .filter(Boolean)
    .sort((a, b) => a.startMs - b.startMs || a.index - b.index);

  let maxEndMs = Number.NEGATIVE_INFINITY;
  const audioRanges = rawAudioRanges.map((range) => {
    maxEndMs = Math.max(maxEndMs, range.endMs);
    return { ...range, maxEndMs };
  });

  const audioStartTimes = sortedUniqueFinite(audioRanges.map((range) => range.startMs));
  const eventTimes = sortedUniqueFinite([...imageTimes, ...audioStartTimes]);

  return {
    imageTimes,
    audioRanges,
    audioStartTimes,
    eventTimes,
  };
}

export function mergeAudioRanges(audioRanges) {
  if (!Array.isArray(audioRanges) || !audioRanges.length) {
    return [];
  }

  const sortedRanges = audioRanges
    .map((range) => ({
      startMs: Number.isFinite(range?.startMs) ? range.startMs : null,
      endMs: Number.isFinite(range?.endMs) ? range.endMs : null,
    }))
    .filter((range) => Number.isFinite(range.startMs) && Number.isFinite(range.endMs))
    .filter((range) => range.endMs > range.startMs)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  const merged = [];
  sortedRanges.forEach((range) => {
    const previous = merged[merged.length - 1];
    if (previous && range.startMs <= previous.endMs) {
      previous.endMs = Math.max(previous.endMs, range.endMs);
      return;
    }
    merged.push({ ...range });
  });
  return merged;
}

export function buildMediaCoverageRanges(mediaTimelineIndex, mediaCoverageRanges = []) {
  const audioCoverage = Array.isArray(mediaTimelineIndex?.audioRanges)
    ? mediaTimelineIndex.audioRanges
    : [];
  const visualCoverage = Array.isArray(mediaCoverageRanges) ? mediaCoverageRanges : [];
  return mergeAudioRanges([...audioCoverage, ...visualCoverage]);
}

export function findFirstAtOrAfter(sortedValues, target) {
  if (!Array.isArray(sortedValues) || !Number.isFinite(target)) {
    return -1;
  }

  let low = 0;
  let high = sortedValues.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedValues[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low < sortedValues.length ? low : -1;
}

export function findLastBefore(sortedValues, target) {
  if (!Array.isArray(sortedValues) || !Number.isFinite(target)) {
    return -1;
  }

  let low = 0;
  let high = sortedValues.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedValues[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low - 1;
}

export function findNextEventTime(eventTimes, currentTime, thresholdMs = 100) {
  const safeThreshold = Number.isFinite(thresholdMs) ? thresholdMs : 0;
  const boundary = currentTime + safeThreshold;
  let index = findFirstAtOrAfter(eventTimes, boundary);
  if (index < 0) {
    return null;
  }

  while (index < eventTimes.length && eventTimes[index] <= boundary) {
    index += 1;
  }

  const value = eventTimes[index];
  return Number.isFinite(value) ? value : null;
}

export function findPrevEventTime(eventTimes, currentTime, thresholdMs = 100) {
  const safeThreshold = Number.isFinite(thresholdMs) ? thresholdMs : 0;
  const index = findLastBefore(eventTimes, currentTime - safeThreshold);
  return index >= 0 ? eventTimes[index] : null;
}

export function findNextImageTime(imageTimes, absoluteMs) {
  const index = findFirstAtOrAfter(imageTimes, absoluteMs);
  return index >= 0 ? imageTimes[index] : null;
}

export function findAutoSkipTarget(mediaTimelineIndex, absoluteMs, options = {}) {
  if (!mediaTimelineIndex || !Number.isFinite(absoluteMs)) {
    return undefined;
  }

  const safeOptions = typeof options === "object" && options ? options : {};
  const safeMinVoidMs = Number.isFinite(safeOptions.minVoidMs)
    ? safeOptions.minVoidMs
    : TIMELINE_VOID_MIN_MS;
  const coverageRanges = buildMediaCoverageRanges(
    mediaTimelineIndex,
    safeOptions.mediaCoverageRanges
  );

  let previousEndMs = null;
  for (const range of coverageRanges) {
    if (absoluteMs >= range.startMs && absoluteMs <= range.endMs) {
      return undefined;
    }
    if (absoluteMs < range.startMs) {
      const gapStartMs = Number.isFinite(previousEndMs) ? previousEndMs : absoluteMs;
      return range.startMs - gapStartMs > safeMinVoidMs ? range.startMs : undefined;
    }
    previousEndMs = Math.max(previousEndMs ?? range.endMs, range.endMs);
  }

  if (!coverageRanges.length) {
    return undefined;
  }

  return null;
}

export function hasAudioCoverage(audioRanges, absoluteMs) {
  if (!Array.isArray(audioRanges) || !audioRanges.length || !Number.isFinite(absoluteMs)) {
    return false;
  }

  let low = 0;
  let high = audioRanges.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (audioRanges[mid].startMs <= absoluteMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const rangeIndex = low - 1;
  return rangeIndex >= 0 && audioRanges[rangeIndex].maxEndMs >= absoluteMs;
}

function addClippedVoidRange(voidRanges, gapStartMs, gapEndMs, startMs, endMs, minVoidMs) {
  if (
    !Number.isFinite(gapStartMs) ||
    !Number.isFinite(gapEndMs) ||
    gapEndMs <= gapStartMs ||
    gapEndMs - gapStartMs <= minVoidMs
  ) {
    return;
  }

  const clippedStartMs = clampValue(gapStartMs, startMs, endMs);
  const clippedEndMs = clampValue(gapEndMs, startMs, endMs);
  if (clippedEndMs > clippedStartMs) {
    voidRanges.push({
      startMs: clippedStartMs,
      endMs: clippedEndMs,
      sourceStartMs: gapStartMs,
      sourceEndMs: gapEndMs,
      targetMs: gapEndMs,
    });
  }
}

function buildVoidRanges(coverageRanges, startMs, endMs, minVoidMs) {
  if (!Array.isArray(coverageRanges) || !coverageRanges.length) {
    return [];
  }

  const voidRanges = [];
  let previousEndMs = null;

  for (const range of coverageRanges) {
    if (range.endMs <= startMs) {
      previousEndMs = Math.max(previousEndMs ?? range.endMs, range.endMs);
      continue;
    }

    if (range.startMs >= endMs) {
      addClippedVoidRange(
        voidRanges,
        previousEndMs ?? startMs,
        range.startMs,
        startMs,
        endMs,
        minVoidMs
      );
      break;
    }

    addClippedVoidRange(
      voidRanges,
      previousEndMs ?? startMs,
      range.startMs,
      startMs,
      endMs,
      minVoidMs
    );
    previousEndMs = Math.max(previousEndMs ?? range.endMs, range.endMs);
  }

  return voidRanges;
}

function findCoveringRange(ranges, startMs, endMs) {
  if (!Array.isArray(ranges) || !ranges.length) {
    return null;
  }

  const midpoint = startMs + (endMs - startMs) / 2;
  return ranges.find((range) => midpoint >= range.startMs && midpoint <= range.endMs) || null;
}

function buildIdentityProjection(startMs, endMs) {
  const durationMs = Math.max(endMs - startMs, 1);
  const projection = {
    enabled: false,
    startMs,
    endMs,
    durationMs,
    projectedDurationMs: durationMs,
    intervals: [
      {
        type: "media",
        startMs,
        endMs,
        durationMs,
        projectedStartMs: 0,
        projectedEndMs: durationMs,
        projectedDurationMs: durationMs,
      },
    ],
    voids: [],
  };
  attachProjectionMethods(projection);
  return projection;
}

function resolveCompressedVoidMs({
  startMs,
  endMs,
  voidRanges,
  compressedVoidMs,
  compressedVoidPx,
  viewportWidthPx,
}) {
  const fallback = Math.max(
    Number.isFinite(compressedVoidMs) ? compressedVoidMs : TIMELINE_VOID_COMPRESSED_MS,
    1
  );
  if (
    !Array.isArray(voidRanges) ||
    !voidRanges.length ||
    !Number.isFinite(compressedVoidPx) ||
    !Number.isFinite(viewportWidthPx) ||
    compressedVoidPx <= 0 ||
    viewportWidthPx <= 0
  ) {
    return fallback;
  }

  const voidCount = voidRanges.length;
  const targetPx = Math.min(compressedVoidPx, viewportWidthPx / Math.max(voidCount * 2, 1));
  const totalVoidMs = voidRanges.reduce(
    (sum, range) => sum + Math.max((range?.endMs ?? 0) - (range?.startMs ?? 0), 0),
    0
  );
  const mediaDurationMs = Math.max(endMs - startMs - totalVoidMs, 1);
  const remainingWidthPx = Math.max(viewportWidthPx - targetPx * voidCount, 1);

  return Math.max((targetPx * mediaDurationMs) / remainingWidthPx, 1);
}

function attachProjectionMethods(projection) {
  projection.timeToProjectedMs = (absoluteMs) => timeToProjectedMs(projection, absoluteMs);
  projection.projectedToTimeMs = (projectedMs) => projectedToTimeMs(projection, projectedMs);
  projection.timeToPercent = (absoluteMs) => {
    if (!Number.isFinite(projection.projectedDurationMs) || projection.projectedDurationMs <= 0) {
      return 0;
    }
    return clampValue(
      (projection.timeToProjectedMs(absoluteMs) / projection.projectedDurationMs) * 100,
      0,
      100
    );
  };
  projection.percentToTime = (percent) => {
    const ratio = clampValue(percent, 0, 100) / 100;
    return projection.projectedToTimeMs(ratio * projection.projectedDurationMs);
  };
  projection.isVoidTime = (absoluteMs) =>
    projection.voids.some((range) => absoluteMs > range.startMs && absoluteMs < range.endMs);
  return projection;
}

function findIntervalByTime(intervals, absoluteMs) {
  if (!Array.isArray(intervals) || !intervals.length) {
    return null;
  }

  let low = 0;
  let high = intervals.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (intervals[mid].endMs < absoluteMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return intervals[Math.min(low, intervals.length - 1)] || null;
}

function findIntervalByProjected(intervals, projectedMs) {
  if (!Array.isArray(intervals) || !intervals.length) {
    return null;
  }

  let low = 0;
  let high = intervals.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (intervals[mid].projectedEndMs < projectedMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return intervals[Math.min(low, intervals.length - 1)] || null;
}

function timeToProjectedMs(projection, absoluteMs) {
  const clamped = clampValue(absoluteMs, projection.startMs, projection.endMs);
  const interval = findIntervalByTime(projection.intervals, clamped);
  if (!interval) {
    return 0;
  }

  if (interval.type === "void") {
    const ratio = (clamped - interval.startMs) / Math.max(interval.durationMs, 1);
    return interval.projectedStartMs + ratio * interval.projectedDurationMs;
  }

  return interval.projectedStartMs + (clamped - interval.startMs);
}

function projectedToTimeMs(projection, projectedMs) {
  const clamped = clampValue(projectedMs, 0, projection.projectedDurationMs);
  const interval = findIntervalByProjected(projection.intervals, clamped);
  if (!interval) {
    return projection.startMs;
  }

  if (interval.type === "void") {
    return Number.isFinite(interval.targetMs) ? interval.targetMs : interval.endMs;
  }

  return clampValue(interval.startMs + (clamped - interval.projectedStartMs), interval.startMs, interval.endMs);
}

export function buildTimelineProjection({
  startMs,
  endMs,
  mediaTimelineIndex,
  mediaCoverageRanges = [],
  enabled = false,
  minVoidMs = TIMELINE_VOID_MIN_MS,
  compressedVoidMs = TIMELINE_VOID_COMPRESSED_MS,
  compressedVoidPx,
  viewportWidthPx,
} = {}) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return buildIdentityProjection(0, 1);
  }

  if (!enabled || !mediaTimelineIndex) {
    return buildIdentityProjection(startMs, endMs);
  }

  const safeMinVoidMs = Math.max(Number.isFinite(minVoidMs) ? minVoidMs : TIMELINE_VOID_MIN_MS, 0);
  const coverageRanges = buildMediaCoverageRanges(mediaTimelineIndex, mediaCoverageRanges);
  const globalVoidRanges = buildVoidRanges(coverageRanges, startMs, endMs, safeMinVoidMs);
  const safeCompressedVoidMs = resolveCompressedVoidMs({
    startMs,
    endMs,
    voidRanges: globalVoidRanges,
    compressedVoidMs,
    compressedVoidPx,
    viewportWidthPx,
  });
  const boundaries = [startMs, endMs];

  coverageRanges.forEach((range) => {
    if (range.endMs <= startMs || range.startMs >= endMs) {
      return;
    }
    boundaries.push(clampValue(range.startMs, startMs, endMs));
    boundaries.push(clampValue(range.endMs, startMs, endMs));
  });
  globalVoidRanges.forEach((range) => {
    boundaries.push(range.startMs);
    boundaries.push(range.endMs);
  });

  const sortedBoundaries = sortedUniqueFinite(boundaries)
    .filter((value) => value >= startMs && value <= endMs)
    .sort((a, b) => a - b);

  const intervals = [];
  let projectedCursor = 0;
  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const intervalStartMs = sortedBoundaries[index];
    const intervalEndMs = sortedBoundaries[index + 1];
    const durationMs = intervalEndMs - intervalStartMs;
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      continue;
    }

    const voidRange = findCoveringRange(globalVoidRanges, intervalStartMs, intervalEndMs);
    const isVoid = Boolean(voidRange);
    const projectedDurationMs = isVoid ? safeCompressedVoidMs : durationMs;
    const interval = {
      type: isVoid ? "void" : "media",
      startMs: intervalStartMs,
      endMs: intervalEndMs,
      sourceStartMs: voidRange?.sourceStartMs,
      sourceEndMs: voidRange?.sourceEndMs,
      targetMs: voidRange?.targetMs,
      durationMs,
      projectedStartMs: projectedCursor,
      projectedEndMs: projectedCursor + projectedDurationMs,
      projectedDurationMs,
    };
    intervals.push(interval);
    projectedCursor += projectedDurationMs;
  }

  const voids = intervals.filter((interval) => interval.type === "void");
  if (!voids.length) {
    return buildIdentityProjection(startMs, endMs);
  }

  const projection = {
    enabled: true,
    startMs,
    endMs,
    durationMs: endMs - startMs,
    projectedDurationMs: Math.max(projectedCursor, 1),
    intervals,
    voids,
  };
  attachProjectionMethods(projection);
  return projection;
}
