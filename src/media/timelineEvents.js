import { toTimestamp } from "../utils/dateUtils.js";

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
