import {
  IMAGE_HOLD_MAX_MS,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
  MAX_VISIBLE_IMAGES,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
} from "./constants.js";
import { computeImageSchedule } from "./imageSchedule.js";

const EMPTY_INDEX = Object.freeze({
  schedule: null,
  metadata: Object.freeze([]),
  entries: Object.freeze([]),
  segments: Object.freeze([]),
});

function toPositiveMs(seconds, fallbackMs) {
  const numeric = Number(seconds);
  return Number.isFinite(numeric) && numeric > 0 ? numeric * 1000 : fallbackMs;
}

function toHoldMs(seconds) {
  const numeric = Number(seconds);
  if (numeric === 0) {
    return 0;
  }
  return Number.isFinite(numeric) && numeric >= 0 ? Math.min(numeric * 1000, IMAGE_HOLD_MAX_MS) : 0;
}

export function resolveExportScheduleOptions(settings = {}) {
  const displaySeconds = Number(settings.imageDisplaySeconds);
  const intervalSeconds = Number(settings.compositionIntervalSeconds);
  const snapGridSeconds = Number(settings.snapGridSeconds);
  const snapToGrid = Boolean(settings.snapToGrid);

  return {
    minVisibleMs: toPositiveMs(displaySeconds, MIN_IMAGE_DISPLAY_DEFAULT_MS),
    holdMs: toHoldMs(settings.imageHoldSeconds),
    maxSlots: MAX_VISIBLE_IMAGES,
    compositionIntervalMs: Number.isFinite(intervalSeconds)
      ? Math.max(intervalSeconds * 1000, MIN_COMPOSITION_CHANGE_INTERVAL_MS)
      : MAX_COMPOSITION_CHANGE_INTERVAL_MS,
    snapToGrid,
    snapGridMs:
      snapToGrid && Number.isFinite(snapGridSeconds) && snapGridSeconds > 0
        ? Math.round(snapGridSeconds * 1000)
        : null,
  };
}

export function createScheduleIndex(images = [], options = {}) {
  if (!Array.isArray(images) || !images.length) {
    return EMPTY_INDEX;
  }

  const schedule = computeImageSchedule(images, options);
  const metadata = schedule?.metadata || [];
  const entries = metadata
    .map((meta, index) => {
      if (!meta?.visible || !Number.isFinite(meta.startMs) || !Number.isFinite(meta.endMs)) {
        return null;
      }
      return {
        image: images[index] || null,
        index,
        startMs: meta.startMs,
        endMs: meta.endMs,
        slotIndex: Math.max(meta.slotIndex ?? 0, 0),
        maxConcurrency: Math.max(meta.maxConcurrency || 1, 1),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.startMs - b.startMs || a.slotIndex - b.slotIndex || a.index - b.index);

  const segments = (schedule?.segments || [])
    .filter((segment) => Number.isFinite(segment?.startMs) && Number.isFinite(segment?.endMs))
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  return {
    schedule,
    metadata,
    entries,
    segments,
  };
}

export function findScheduleSegmentAt(segments, absoluteMs) {
  if (!Array.isArray(segments) || !segments.length || !Number.isFinite(absoluteMs)) {
    return null;
  }

  let low = 0;
  let high = segments.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (segments[mid].startMs <= absoluteMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const segment = segments[low - 1];
  return segment && absoluteMs >= segment.startMs && absoluteMs < segment.endMs ? segment : null;
}

export function buildCompositionFromSegment(segment, images = []) {
  if (!segment) {
    return null;
  }

  const slotIndexes = Array.isArray(segment.slots) ? segment.slots : [];
  const layoutSize = Math.max(1, segment.layoutSize || slotIndexes.length || 1);
  const slots = Array.from({ length: layoutSize }, (_, slotIndex) => {
    const imageIndex = slotIndexes[slotIndex];
    if (!Number.isInteger(imageIndex)) {
      return null;
    }
    const image = images[imageIndex];
    return image ? { image, imageIndex } : null;
  });

  const activeImages = slots.filter(Boolean).map((slot) => slot.image);
  return {
    segment,
    layoutSize,
    slots,
    images: activeImages,
    primaryImage: activeImages[0] || null,
  };
}

export function getCompositionAtTime(scheduleIndex, images, absoluteMs) {
  const segment = findScheduleSegmentAt(scheduleIndex?.segments, absoluteMs);
  return buildCompositionFromSegment(segment, images);
}

export function findSurroundingImages(scheduleIndex, absoluteMs) {
  const entries = scheduleIndex?.entries || [];
  if (!entries.length) {
    return { previous: null, next: null };
  }

  if (!Number.isFinite(absoluteMs)) {
    const firstImage = entries[0]?.image || null;
    return { previous: firstImage, next: firstImage };
  }

  let low = 0;
  let high = entries.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (entries[mid].startMs <= absoluteMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return {
    previous: entries[Math.max(0, low - 1)]?.image || null,
    next: entries[low]?.image || null,
  };
}

export function filterEntriesInView(entries, viewStartMs, viewEndMs) {
  if (!Array.isArray(entries) || !Number.isFinite(viewStartMs) || !Number.isFinite(viewEndMs)) {
    return [];
  }
  return entries.filter((entry) => entry.endMs > viewStartMs && entry.startMs < viewEndMs);
}

export function aggregateEntriesByPixel(entries, viewStartMs, viewEndMs, widthPx) {
  const visible = filterEntriesInView(entries, viewStartMs, viewEndMs);
  const durationMs = viewEndMs - viewStartMs;
  if (
    !visible.length ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0 ||
    !Number.isFinite(widthPx) ||
    widthPx <= 0
  ) {
    return visible;
  }

  const buckets = new Map();
  visible.forEach((entry) => {
    const leftPx = Math.max(0, Math.floor(((entry.startMs - viewStartMs) / durationMs) * widthPx));
    const rightPx = Math.min(
      widthPx,
      Math.ceil(((entry.endMs - viewStartMs) / durationMs) * widthPx)
    );
    const key = `${entry.slotIndex}:${leftPx}:${Math.max(leftPx + 1, rightPx)}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { ...entry, aggregatedCount: 1, images: [entry.image] });
      return;
    }
    existing.startMs = Math.min(existing.startMs, entry.startMs);
    existing.endMs = Math.max(existing.endMs, entry.endMs);
    existing.maxConcurrency = Math.max(existing.maxConcurrency, entry.maxConcurrency);
    existing.aggregatedCount += 1;
    existing.images.push(entry.image);
  });

  return Array.from(buckets.values()).sort(
    (a, b) => a.startMs - b.startMs || a.slotIndex - b.slotIndex || a.index - b.index
  );
}
