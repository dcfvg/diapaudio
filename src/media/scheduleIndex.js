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

const MIN_READABLE_ENTRY_PX = 4;
const MAX_GROUP_SPAN_PX = 18;
const MAX_GROUP_GAP_PX = 2;

function createAggregateGroup(metric) {
  return {
    ...metric.entry,
    aggregatedCount: 1,
    aggregationKey: `single:${metric.entry.slotIndex}:${metric.entry.index}`,
    images: [metric.entry.image],
    leftPx: metric.leftPx,
    rightPx: metric.rightPx,
    firstIndex: metric.entry.index,
    lastIndex: metric.entry.index,
  };
}

function addMetricToGroup(group, metric) {
  group.startMs = Math.min(group.startMs, metric.entry.startMs);
  group.endMs = Math.max(group.endMs, metric.entry.endMs);
  group.maxConcurrency = Math.max(group.maxConcurrency, metric.entry.maxConcurrency);
  group.aggregatedCount += 1;
  group.images.push(metric.entry.image);
  group.leftPx = Math.min(group.leftPx, metric.leftPx);
  group.rightPx = Math.max(group.rightPx, metric.rightPx);
  group.firstIndex = Math.min(group.firstIndex, metric.entry.index);
  group.lastIndex = Math.max(group.lastIndex, metric.entry.index);
  group.aggregationKey = `group:${group.slotIndex}:${group.firstIndex}:${group.lastIndex}`;
}

function finalizeAggregateGroup(group) {
  if (!group) {
    return null;
  }
  if (group.aggregatedCount <= 1) {
    return {
      ...group,
      aggregatedCount: 1,
      images: [group.image],
      aggregationKey: `single:${group.slotIndex}:${group.index}`,
    };
  }
  return group;
}

function toPublicAggregateEntry(entry) {
  const publicEntry = { ...entry };
  delete publicEntry.leftPx;
  delete publicEntry.rightPx;
  delete publicEntry.firstIndex;
  delete publicEntry.lastIndex;
  return publicEntry;
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

  const metrics = visible
    .map((entry) => {
      const leftPx = Math.max(0, ((entry.startMs - viewStartMs) / durationMs) * widthPx);
      const rightPx = Math.min(widthPx, ((entry.endMs - viewStartMs) / durationMs) * widthPx);
      return {
        entry,
        leftPx,
        rightPx: Math.max(leftPx + 1, rightPx),
        widthPx: Math.max(rightPx - leftPx, 1),
        slotIndex: Math.max(entry.slotIndex || 0, 0),
      };
    })
    .sort(
      (a, b) =>
        a.slotIndex - b.slotIndex ||
        a.leftPx - b.leftPx ||
        a.entry.startMs - b.entry.startMs ||
        a.entry.index - b.entry.index
    );

  const groups = [];
  let pendingGroup = null;

  metrics.forEach((metric) => {
    const isTooSmall = metric.widthPx < MIN_READABLE_ENTRY_PX;
    if (!isTooSmall) {
      const finalized = finalizeAggregateGroup(pendingGroup);
      if (finalized) {
        groups.push(finalized);
      }
      pendingGroup = null;
      groups.push(finalizeAggregateGroup(createAggregateGroup(metric)));
      return;
    }

    if (!pendingGroup) {
      pendingGroup = createAggregateGroup(metric);
      return;
    }

    const sameSlot = pendingGroup.slotIndex === metric.slotIndex;
    const gapPx = metric.leftPx - pendingGroup.rightPx;
    const nextSpanPx = Math.max(pendingGroup.rightPx, metric.rightPx) - pendingGroup.leftPx;
    if (sameSlot && gapPx <= MAX_GROUP_GAP_PX && nextSpanPx <= MAX_GROUP_SPAN_PX) {
      addMetricToGroup(pendingGroup, metric);
      return;
    }

    const finalized = finalizeAggregateGroup(pendingGroup);
    if (finalized) {
      groups.push(finalized);
    }
    pendingGroup = createAggregateGroup(metric);
  });

  const finalized = finalizeAggregateGroup(pendingGroup);
  if (finalized) {
    groups.push(finalized);
  }

  return groups
    .map(toPublicAggregateEntry)
    .sort((a, b) => a.startMs - b.startMs || a.slotIndex - b.slotIndex || a.index - b.index);
}
