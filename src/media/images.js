import {
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
  MIN_IMAGE_DISPLAY_MIN_MS,
  DEFAULT_IMAGE_HOLD_MS,
  IMAGE_HOLD_MIN_MS,
  IMAGE_HOLD_MAX_MS,
  MAX_VISIBLE_IMAGES,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
} from "./constants.js";
import { computeImageSchedule } from "./imageSchedule.js";
import { toTimestamp } from "../utils/dateUtils.js";

export function resolveImageAbsoluteTime(image, timelineStartMs = null) {
  if (!image) return null;
  if (image.originalTimestamp instanceof Date) {
    return toTimestamp(image.originalTimestamp);
  }
  if (image.timestamp instanceof Date) {
    return toTimestamp(image.timestamp);
  }
  if (Number.isFinite(image.timeMs)) {
    return image.timeMs;
  }
  if (Number.isFinite(image.relative) && Number.isFinite(timelineStartMs)) {
    return timelineStartMs + image.relative * 1000;
  }
  return null;
}

export function hasAudioCoverage(tracks, absoluteMs) {
  if (!Array.isArray(tracks) || !tracks.length) return false;
  return tracks.some((track) => {
    const start =
      track?.adjustedStartTime instanceof Date ? toTimestamp(track.adjustedStartTime) : null;
    const end = track?.adjustedEndTime instanceof Date ? toTimestamp(track.adjustedEndTime) : null;
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return false;
    }
    return absoluteMs >= start && absoluteMs <= end;
  });
}

const scheduleCache = new WeakMap();

function clampHoldMs(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_IMAGE_HOLD_MS;
  }
  if (value < IMAGE_HOLD_MIN_MS) {
    return IMAGE_HOLD_MIN_MS;
  }
  if (value > IMAGE_HOLD_MAX_MS) {
    return IMAGE_HOLD_MAX_MS;
  }
  return value;
}

function getScheduleForMedia(mediaData, options) {
  if (!mediaData?.images?.length) {
    return null;
  }

  let cacheEntry = scheduleCache.get(mediaData);
  if (!cacheEntry) {
    cacheEntry = new Map();
    scheduleCache.set(mediaData, cacheEntry);
  }

  const key = `${options.holdMs}|${options.minVisibleMs}|${options.maxSlots}|${options.compositionIntervalMs}`;
  const cached = cacheEntry.get(key);
  if (cached && cached.imagesRef === mediaData.images) {
    return cached.schedule;
  }

  const schedule = computeImageSchedule(mediaData.images, options);
  cacheEntry.set(key, { schedule, imagesRef: mediaData.images });
  return schedule;
}

export function getVisibleImagesAtTime(
  mediaData,
  absoluteMs,
  {
    skipSilence = false,
    force = false,
    holdMs,
    minVisibleMs = MIN_IMAGE_DISPLAY_DEFAULT_MS,
    maxSlots = MAX_VISIBLE_IMAGES,
    compositionIntervalMs = MAX_COMPOSITION_CHANGE_INTERVAL_MS,
    returnDetails = false,
  } = {}
) {
  if (!mediaData?.images?.length || !Number.isFinite(absoluteMs)) {
    if (returnDetails) {
      return {
        images: [],
        slots: [],
        layoutSize: 0,
        entries: [],
      };
    }
    return [];
  }

  const resolvedHoldMs = clampHoldMs(
    Number.isFinite(holdMs) ? holdMs : DEFAULT_IMAGE_HOLD_MS
  );

  const minVisibleClamped = Math.max(minVisibleMs, MIN_IMAGE_DISPLAY_MIN_MS);
  const intervalClamped = Math.max(
    MIN_COMPOSITION_CHANGE_INTERVAL_MS,
    Math.min(
      Number.isFinite(compositionIntervalMs) ? compositionIntervalMs : MAX_COMPOSITION_CHANGE_INTERVAL_MS,
      MAX_COMPOSITION_CHANGE_INTERVAL_MS
    )
  );

  const schedule = getScheduleForMedia(mediaData, {
    holdMs: resolvedHoldMs,
    minVisibleMs: minVisibleClamped,
    maxSlots,
    compositionIntervalMs: intervalClamped,
  });

  if (!schedule) {
    if (returnDetails) {
      return {
        images: [],
        slots: [],
        layoutSize: 0,
        entries: [],
      };
    }
    return [];
  }

  if (skipSilence && !force && !hasAudioCoverage(mediaData?.audioTracks, absoluteMs)) {
    if (returnDetails) {
      return {
        images: [],
        slots: [],
        layoutSize: 0,
        entries: [],
      };
    }
    return [];
  }

  const images = mediaData.images;
  const entries = [];
  schedule.metadata.forEach((meta, index) => {
    if (!meta.visible) return;
    if (!Number.isFinite(meta.startMs) || !Number.isFinite(meta.endMs)) return;
    if (!force && (absoluteMs < meta.startMs || absoluteMs >= meta.endMs)) {
      return;
    }
    if (force && absoluteMs < meta.startMs) {
      return;
    }

    entries.push({
      image: images[index],
      imageIndex: index,
      startMs: meta.startMs,
      endMs: meta.endMs,
      slotIndex: Math.max(meta.slotIndex ?? 0, 0),
      maxConcurrency: Math.max(meta.maxConcurrency || 1, 1),
    });
  });

  entries.sort((a, b) => a.slotIndex - b.slotIndex);

  if (returnDetails) {
    const layoutSize = entries.reduce((max, entry) => Math.max(max, entry.slotIndex + 1), 0);
    const slots = Array.from({ length: Math.max(layoutSize, 1) }, (_, idx) => {
      const entry = entries.find((item) => item.slotIndex === idx);
      return entry ? { image: entry.image, metadata: entry } : null;
    });
    return {
      images: entries.map((entry) => entry.image),
      slots,
      layoutSize: Math.max(layoutSize, 1),
      entries,
    };
  }

  return entries.map((entry) => entry.image);
}

export function getSurroundingImages(mediaData, absoluteMs) {
  const images = mediaData?.images || [];
  if (!images.length || !Number.isFinite(absoluteMs)) {
    return { previous: null, next: null };
  }

  const timelineStartMs = Number.isFinite(mediaData?.timeline?.startMs)
    ? mediaData.timeline.startMs
    : null;

  const resolved = images.map((image) => ({
    image,
    time: resolveImageAbsoluteTime(image, timelineStartMs),
  }));

  let previousEntry = null;
  let nextEntry = null;

  for (const entry of resolved) {
    if (!Number.isFinite(entry.time)) {
      continue;
    }
    if (entry.time <= absoluteMs) {
      previousEntry = entry;
    }
    if (entry.time >= absoluteMs) {
      nextEntry = entry;
      if (!previousEntry || previousEntry.image !== entry.image) {
        break;
      }
    }
  }

  if (!nextEntry || (previousEntry && previousEntry.time === nextEntry.time)) {
    nextEntry =
      resolved.find((entry) => Number.isFinite(entry.time) && entry.time > absoluteMs) || nextEntry;
  }

  if (!previousEntry) {
    for (let i = resolved.length - 1; i >= 0; i -= 1) {
      const entry = resolved[i];
      if (Number.isFinite(entry.time) && entry.time < absoluteMs) {
        previousEntry = entry;
        break;
      }
    }
  }

  return {
    previous: previousEntry?.image || null,
    next: nextEntry?.image || null,
  };
}

export default {
  getVisibleImagesAtTime,
  resolveImageAbsoluteTime,
  getSurroundingImages,
  hasAudioCoverage,
};
