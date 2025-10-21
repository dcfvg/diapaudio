import {
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
  MIN_IMAGE_DISPLAY_MIN_MS,
  DEFAULT_IMAGE_HOLD_MS,
  MAX_VISIBLE_IMAGES,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
} from "./constants.js";
import { toTimestamp } from "../utils/dateUtils.js";
import { clamp } from "../utils/numberUtils.js";

function getImageStartMs(image) {
  if (!image) return null;
  if (image.adjustedTimestamp instanceof Date) {
    return toTimestamp(image.adjustedTimestamp);
  }
  if (image.originalTimestamp instanceof Date) {
    return toTimestamp(image.originalTimestamp);
  }
  if (image.timestamp instanceof Date) {
    return toTimestamp(image.timestamp);
  }
  if (Number.isFinite(image.timeMs)) {
    return image.timeMs;
  }
  return null;
}



function cloneSegment(segment) {
  return {
    startMs: segment.startMs,
    endMs: segment.endMs,
    layoutSize: segment.layoutSize,
    slots: Array.isArray(segment.slots) ? [...segment.slots] : [],
  };
}

function segmentSignature(segment) {
  const parts = Array.isArray(segment.slots)
    ? segment.slots.map((slot) => (Number.isInteger(slot) ? slot : "null")).join(",")
    : "";
  return `${segment.layoutSize}|${parts}`;
}

function enforceCompositionInterval(segments, compositionIntervalMs) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return segments;
  }
  if (!Number.isFinite(compositionIntervalMs) || compositionIntervalMs <= 0 || compositionIntervalMs === Infinity) {
    return segments.map(cloneSegment);
  }

  const compressed = [];
  segments.forEach((segment) => {
    if (!Number.isFinite(segment?.startMs) || !Number.isFinite(segment?.endMs)) {
      return;
    }
    if (compressed.length) {
      const prev = compressed[compressed.length - 1];
      if (segmentSignature(prev) === segmentSignature(segment)) {
        prev.endMs = Math.max(prev.endMs, segment.endMs);
        return;
      }
    }
    compressed.push(cloneSegment(segment));
  });

  if (compressed.length === 0) {
    return [];
  }

  const constrained = [];
  let current = cloneSegment(compressed[0]);
  let currentSignature = segmentSignature(current);
  let lastChange = current.startMs;

  for (let i = 1; i < compressed.length; i += 1) {
    const request = cloneSegment(compressed[i]);
    const requestSignature = segmentSignature(request);
    if (requestSignature === currentSignature) {
      current.endMs = Math.max(current.endMs, request.endMs);
      continue;
    }

    const desiredStart = request.startMs;
    const allowedStart = lastChange + compositionIntervalMs;

    if (desiredStart >= allowedStart) {
      current.endMs = desiredStart;
      if (current.endMs > current.startMs) {
        constrained.push(current);
      }
      current = request;
      currentSignature = requestSignature;
      lastChange = current.startMs;
      continue;
    }

    if (request.endMs <= allowedStart) {
      current.endMs = Math.max(current.endMs, request.endMs);
      continue;
    }

    const switchTime = Math.max(allowedStart, request.startMs);
    current.endMs = Math.max(current.endMs, switchTime);
    if (current.endMs > current.startMs) {
      constrained.push(current);
    }

    const nextSegment = cloneSegment(request);
    nextSegment.startMs = switchTime;
    if (nextSegment.endMs <= nextSegment.startMs) {
      // zero-length switch, skip applying
      current = nextSegment;
      currentSignature = requestSignature;
      lastChange = switchTime;
      continue;
    }
    current = nextSegment;
    currentSignature = requestSignature;
    lastChange = current.startMs;
  }

  if (current.endMs > current.startMs) {
    constrained.push(current);
  }

  return constrained;
}

export function computeImageSchedule(images = [], options = {}) {
  const {
    minVisibleMs = MIN_IMAGE_DISPLAY_DEFAULT_MS,
    holdMs = DEFAULT_IMAGE_HOLD_MS,
    maxSlots = MAX_VISIBLE_IMAGES,
    compositionIntervalMs = MAX_COMPOSITION_CHANGE_INTERVAL_MS,
    snapToGrid = false,
    snapGridMs: snapGridMsRaw,
  } = options;

  if (!Array.isArray(images) || !images.length) {
    return {
      metadata: [],
      segments: [],
      minStartMs: null,
      maxEndMs: null,
    };
  }

  const minVisibleClamped = Math.max(minVisibleMs, MIN_IMAGE_DISPLAY_MIN_MS);
  const intervalClamped = Number.isFinite(compositionIntervalMs)
    ? Math.max(MIN_COMPOSITION_CHANGE_INTERVAL_MS, compositionIntervalMs)
    : compositionIntervalMs;

  const gridStepMs = (() => {
    const v = Number(snapGridMsRaw);
    if (!Number.isFinite(v) || v <= 0) return null;
    return Math.round(v);
  })();

  const sorted = images
    .map((image, index) => ({
      image,
      index,
      startMs: (() => {
        const raw = getImageStartMs(image);
        if (!Number.isFinite(raw)) return raw;
        if (!snapToGrid || !Number.isFinite(gridStepMs) || gridStepMs <= 0) return raw;
        const step = gridStepMs;
        // Snap to nearest multiple of step
        const snapped = Math.round(raw / step) * step;
        return snapped;
      })(),
    }))
    .filter((entry) => Number.isFinite(entry.startMs))
    .sort((a, b) => a.startMs - b.startMs || a.index - b.index);

  if (!sorted.length) {
    return {
      metadata: images.map(() => ({ visible: false })),
      segments: [],
      minStartMs: null,
      maxEndMs: null,
    };
  }

  const metadata = images.map(() => ({
    visible: false,
    startMs: null,
    endMs: null,
    slotIndex: -1,
    maxConcurrency: 1,
  }));

  let minStartMs = Number.POSITIVE_INFINITY;
  let maxEndMs = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    const start = current.startMs;
    const next = sorted[i + 1];
    const hasNextImage = next && Number.isFinite(next.startMs);

    // minVisibleClamped: user's "Image Display" setting - minimum duration for ALL images
    // holdMs: user's "Image Hold" setting - additional extension when there's space
    const displayEnd = start + minVisibleClamped;
    
    let end;
    if (hasNextImage) {
      const nextImageStart = next.startMs;
      
      // If next image arrives BEFORE displayEnd, extend to displayEnd (create overlap/composition)
      // If next image arrives AFTER displayEnd, extend by hold up to next image start (no overlap)
      if (nextImageStart < displayEnd) {
        // Next image arrives early: respect minVisibleMs and create composition overlap
        end = displayEnd;
      } else {
        // Next image arrives after displayEnd: extend with hold, but cap at next image start
        const holdExtension = Number.isFinite(holdMs) && holdMs >= 0 ? holdMs : 0;
        const maxEndWithHold = displayEnd + holdExtension;
        end = Math.min(maxEndWithHold, nextImageStart);
      }
    } else {
      // No next image: extend by full Image Hold duration beyond Image Display
      const holdExtension = Number.isFinite(holdMs) && holdMs >= 0 ? holdMs : 0;
      const extendedEnd = displayEnd + holdExtension;
      end = clamp(extendedEnd, displayEnd, extendedEnd);
    }

    metadata[current.index] = {
      visible: true,
      startMs: start,
      endMs: end,
      slotIndex: -1,
      maxConcurrency: 1,
    };

    if (start < minStartMs) minStartMs = start;
    if (end > maxEndMs) maxEndMs = end;
  }

  const events = [];
  metadata.forEach((meta, index) => {
    if (!meta.visible) return;
    if (Number.isFinite(meta.startMs) && Number.isFinite(meta.endMs) && meta.endMs > meta.startMs) {
      events.push({ time: meta.startMs, type: "start", index });
      events.push({ time: meta.endMs, type: "end", index });
    } else {
      metadata[index].visible = false;
      metadata[index].startMs = null;
      metadata[index].endMs = null;
    }
  });

  events.sort((a, b) => {
    if (a.time === b.time) {
      if (a.type === b.type) {
        return a.index - b.index;
      }
      return a.type === "end" ? -1 : 1;
    }
    return a.time - b.time;
  });

  // First pass: assign stable slot indices and record max concurrency
  const slotAssignments = Array(maxSlots).fill(null);
  const activeIndices = new Set();

  events.forEach((event) => {
    const meta = metadata[event.index];
    if (!meta || !meta.visible) {
      return;
    }

    if (event.type === "end") {
      if (meta.slotIndex != null && slotAssignments[meta.slotIndex] === event.index) {
        slotAssignments[meta.slotIndex] = null;
      }
      activeIndices.delete(event.index);
    } else {
      let slotIndex = slotAssignments.findIndex((value) => value == null);
      if (slotIndex === -1) {
        // No available slot; mark as invisible
        meta.visible = false;
        meta.startMs = null;
        meta.endMs = null;
        meta.slotIndex = -1;
        activeIndices.delete(event.index);
        return;
      }
      meta.slotIndex = slotIndex;
      slotAssignments[slotIndex] = event.index;
      activeIndices.add(event.index);
    }

    const currentActive = Array.from(activeIndices);
    const concurrency = Math.max(currentActive.length, 0);
    currentActive.forEach((idx) => {
      const itemMeta = metadata[idx];
      if (itemMeta) {
        itemMeta.maxConcurrency = Math.max(itemMeta.maxConcurrency || 1, concurrency || 1);
      }
    });
  });

  // Second pass: build segments with anticipated layout sizes
  const filteredEvents = events.filter((event) => metadata[event.index]?.visible);
  const segments = [];
  const slotState = Array(maxSlots).fill(null);
  const activeSet = new Set();
  let lastTime = filteredEvents.length ? filteredEvents[0].time : null;

  const pushSegment = (start, end) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return;
    }
    const activeIndicesArray = Array.from(activeSet);
    if (!activeIndicesArray.length) {
      return;
    }
    const layoutSize = Math.max(
      1,
      Math.min(
        maxSlots,
        activeIndicesArray.reduce(
          (max, idx) => Math.max(max, metadata[idx]?.maxConcurrency || 1),
          1
        )
      )
    );
    const layoutSlots = Array.from({ length: layoutSize }, (_, idx) => {
      const metaIndex = slotState[idx];
      return Number.isInteger(metaIndex) && metadata[metaIndex]?.visible ? metaIndex : null;
    });
    segments.push({ startMs: start, endMs: end, slots: layoutSlots, layoutSize });
  };

  filteredEvents.forEach((event) => {
    const time = event.time;
    if (lastTime != null && time > lastTime) {
      pushSegment(lastTime, time);
    }

    const meta = metadata[event.index];
    if (!meta || !meta.visible) {
      lastTime = time;
      return;
    }

    if (event.type === "end") {
      if (meta.slotIndex != null && slotState[meta.slotIndex] === event.index) {
        slotState[meta.slotIndex] = null;
      }
      activeSet.delete(event.index);
    } else {
      const slotIndex = meta.slotIndex ?? slotState.findIndex((value) => value == null);
      if (slotIndex >= 0) {
        slotState[slotIndex] = event.index;
      }
      activeSet.add(event.index);
    }

    lastTime = time;
  });

  const constrainedSegments = enforceCompositionInterval(segments, intervalClamped);

  return {
    metadata,
    segments: constrainedSegments,
    minStartMs: Number.isFinite(minStartMs) ? minStartMs : null,
    maxEndMs: Number.isFinite(maxEndMs) ? maxEndMs : null,
  };
}

export default {
  computeImageSchedule,
};
