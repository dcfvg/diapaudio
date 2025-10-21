import {
  MAX_VISIBLE_IMAGES,
  MIN_IMAGE_DISPLAY_DURATION_MS,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
} from "./constants.js";
import { getImageHoldMs } from "./imageSettings.js";
import { toTimestamp } from "../utils/dateUtils.js";
import { useSettingsStore } from "../state/useSettingsStore.js";

const DEFAULT_LAYOUT_SIZE = 1;
const MAX_PENDING_CHANGES = 12;

function createEmptySlots(size) {
  return Array.from({ length: Math.max(1, size) }, () => null);
}

function getImageTimestampMs(image) {
  if (!image) return null;
  const ts = image.originalTimestamp || image.timestamp;
  if (ts instanceof Date) return toTimestamp(ts);
  if (typeof ts === "number") return ts;
  if (ts && typeof ts.getTime === "function") return toTimestamp(ts);
  return null;
}

function getImageKey(image) {
  return image?.url || image?.name || String((getImageTimestampMs(image) ?? Math.random()));
}

function ensurePendingQueue(state) {
  if (!state.pendingChanges || !Array.isArray(state.pendingChanges)) {
    state.pendingChanges = [];
  }
  return state.pendingChanges;
}

function normalizeTargetsArray(targets = []) {
  if (!Array.isArray(targets)) return [];
  return targets.filter(Boolean).slice(0, MAX_VISIBLE_IMAGES);
}

function getCurrentImages(state) {
  if (!state?.slots?.length) {
    return [];
  }
  return state.slots.map((entry) => entry?.image || null).filter(Boolean);
}

function haveSameImageMultiset(a = [], b = []) {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  const counts = new Map();
  for (const image of a) {
    counts.set(image, (counts.get(image) || 0) + 1);
  }
  for (const image of b) {
    const count = counts.get(image);
    if (!count) {
      return false;
    }
    if (count === 1) {
      counts.delete(image);
    } else {
      counts.set(image, count - 1);
    }
  }
  return counts.size === 0;
}

function enqueuePendingChange(queue, entry) {
  if (!queue || !entry) {
    return;
  }
  const normalizedImages = normalizeTargetsArray(entry.images || []);
  const layoutSize = normalizeLayoutSize(entry.layoutSize ?? (normalizedImages.length || 1));

  const last = queue[queue.length - 1];
  if (
    last &&
    last.layoutSize === layoutSize &&
    haveSameImageMultiset(last.images, normalizedImages)
  ) {
    last.absoluteMs = entry.absoluteMs ?? last.absoluteMs ?? null;
    last.force = last.force || Boolean(entry.force);
    return;
  }

  queue.push({
    images: normalizedImages,
    layoutSize,
    absoluteMs: entry.absoluteMs ?? null,
    force: Boolean(entry.force),
  });

  if (queue.length > MAX_PENDING_CHANGES) {
    queue.splice(0, queue.length - MAX_PENDING_CHANGES);
  }
}

export function createCompositionState() {
  return {
    layoutSize: DEFAULT_LAYOUT_SIZE,
    slots: createEmptySlots(DEFAULT_LAYOUT_SIZE),
    lastChangeMs: -Infinity,
    lastAbsoluteMs: null,
    imageHistory: new Map(),
    pendingChanges: [],
  };
}

export function resetCompositionState(state) {
  if (!state) {
    return;
  }
  state.layoutSize = DEFAULT_LAYOUT_SIZE;
  state.slots = createEmptySlots(DEFAULT_LAYOUT_SIZE);
  state.lastChangeMs = -Infinity;
  state.lastAbsoluteMs = null;
  if (state.imageHistory?.clear) {
    state.imageHistory.clear();
  } else {
    state.imageHistory = new Map();
  }
  if (state.pendingChanges?.length) {
    state.pendingChanges.length = 0;
  } else {
    state.pendingChanges = [];
  }
}

function normalizeLayoutSize(size) {
  if (!Number.isFinite(size) || size < 1) {
    return DEFAULT_LAYOUT_SIZE;
  }
  return Math.min(Math.max(Math.round(size), 1), MAX_VISIBLE_IMAGES);
}

export function updateCompositionState(state, targetImages, absoluteMs, { force = false } = {}) {
  if (!state) {
    return {
      layoutSize: DEFAULT_LAYOUT_SIZE,
      slots: createEmptySlots(DEFAULT_LAYOUT_SIZE),
      orderedImages: [],
      changed: false,
    };
  }

  const queue = ensurePendingQueue(state);
  const now = Number.isFinite(absoluteMs) ? absoluteMs : Date.now();
  const incomingTargets = normalizeTargetsArray(targetImages);
  const incomingLayoutSize = normalizeLayoutSize(
    incomingTargets.length ? incomingTargets.length : state.layoutSize || DEFAULT_LAYOUT_SIZE
  );
  const currentImages = getCurrentImages(state);
  const lastChangeMs = Number.isFinite(state.lastChangeMs) ? state.lastChangeMs : -Infinity;
  const deltaFromLastAbsolute =
    state.lastAbsoluteMs != null && Number.isFinite(state.lastAbsoluteMs)
      ? Math.abs(now - state.lastAbsoluteMs)
      : Infinity;

  const intervalMs = MAX_COMPOSITION_CHANGE_INTERVAL_MS;
  const forcedByOption = Boolean(force);
  const effectiveForce = forcedByOption || deltaFromLastAbsolute > intervalMs * 2;
  const canApplyChange = effectiveForce || now - lastChangeMs >= intervalMs;
  const allowLayoutAdjustment = effectiveForce || now - lastChangeMs >= intervalMs;

  const layoutMatchesIncoming =
    incomingTargets.length === 0 ||
    normalizeLayoutSize(incomingTargets.length) === (state.layoutSize || DEFAULT_LAYOUT_SIZE);
  const imagesMatchIncoming = haveSameImageMultiset(incomingTargets, currentImages);
  const changeNeededForIncoming =
    incomingTargets.length === 0
      ? currentImages.length > 0
      : !imagesMatchIncoming || !layoutMatchesIncoming;

  if (!forcedByOption && changeNeededForIncoming && !canApplyChange) {
    enqueuePendingChange(queue, {
      images: incomingTargets,
      layoutSize: incomingLayoutSize,
      absoluteMs: now,
      force: false,
    });
  }

  if (forcedByOption && queue.length) {
    queue.length = 0;
  }

  let appliedEntry = null;
  let workingTargets = incomingTargets;
  let appliedFromQueue = false;
  if (!forcedByOption && canApplyChange && queue.length) {
    appliedEntry = queue.shift() || null;
    const queuedImages = Array.isArray(appliedEntry?.images) ? appliedEntry.images : [];
    workingTargets = normalizeTargetsArray(queuedImages);
    appliedFromQueue = true;
  }

  const appliedLayoutHint = appliedEntry?.layoutSize;
  const hasTargets = workingTargets.length > 0;
  let desiredLayoutSize = hasTargets
    ? normalizeLayoutSize(workingTargets.length)
    : state.layoutSize || DEFAULT_LAYOUT_SIZE;
  if (Number.isFinite(appliedLayoutHint)) {
    desiredLayoutSize = normalizeLayoutSize(appliedLayoutHint);
  }

  let nextLayoutSize = state.layoutSize || DEFAULT_LAYOUT_SIZE;
  if (hasTargets) {
    if (desiredLayoutSize > nextLayoutSize) {
      nextLayoutSize = desiredLayoutSize;
    } else if (desiredLayoutSize < nextLayoutSize && allowLayoutAdjustment) {
      nextLayoutSize = desiredLayoutSize;
    }
  }

  let layoutAdjusted = false;
  if (nextLayoutSize !== state.layoutSize) {
    const existingImages = currentImages;
    state.layoutSize = nextLayoutSize;
    state.slots = createEmptySlots(nextLayoutSize);
    existingImages.slice(0, nextLayoutSize).forEach((image, index) => {
      if (!image) return;
      const historyKey = getImageKey(image);
      state.imageHistory.set(historyKey, {
        slot: index,
        layoutSize: nextLayoutSize,
      });
      state.slots[index] = {
        image,
        enteredAtMs: now,
        assignedSlot: index,
        layoutSize: nextLayoutSize,
      };
    });
    state.lastChangeMs = now;
    layoutAdjusted = true;
  }

  if (!state.slots || state.slots.length !== state.layoutSize) {
    state.slots = createEmptySlots(state.layoutSize);
  }

  const targetSet = new Set(workingTargets);
  const visibleSet = new Set();
  let changeOccurred = layoutAdjusted;
  // Only force immediate replacement for explicit forces and layout changes
  // effectiveForce (time-based) should respect minimum display duration
  const allowImmediateReplacement =
    forcedByOption || layoutAdjusted || Boolean(appliedEntry?.force);
  const mayChange = allowImmediateReplacement || appliedFromQueue || effectiveForce || now - state.lastChangeMs >= intervalMs;

  const maxCarryoverMs = getImageHoldMs();

  for (let i = 0; i < state.slots.length; i += 1) {
    const entry = state.slots[i];
    if (!entry) continue;

    const elapsed = now - entry.enteredAtMs;
    const inTarget = targetSet.has(entry.image);
    const imageTimestamp = getImageTimestampMs(entry.image);
    const exceededMaxDuration =
      Number.isFinite(imageTimestamp) && now - imageTimestamp > maxCarryoverMs;
    // Scale min display duration by current playback speed so on-screen time remains constant
    const s = Number(useSettingsStore.getState?.().speed) > 0 ? Number(useSettingsStore.getState().speed) : 1;
    const minDisplayMs = Math.round(MIN_IMAGE_DISPLAY_DURATION_MS * s);
    const meetsMinDuration = elapsed >= minDisplayMs;
    const hasAnyTargets = targetSet.size > 0;

    const shouldKeep =
      (inTarget && !exceededMaxDuration) ||
      (!hasAnyTargets && !exceededMaxDuration) ||
      (!mayChange && !exceededMaxDuration) ||
      (!allowImmediateReplacement && !meetsMinDuration && !exceededMaxDuration);

    if (shouldKeep) {
      visibleSet.add(entry.image);
      entry.assignedSlot = i;
      entry.layoutSize = state.layoutSize;
    } else {
      state.slots[i] = null;
      changeOccurred = true;
    }
  }

  const availableIndices = [];
  for (let i = 0; i < state.slots.length; i += 1) {
    if (!state.slots[i]) {
      availableIndices.push(i);
    }
  }

  if ((effectiveForce || mayChange) && availableIndices.length && workingTargets.length) {
    const orderedTargets = workingTargets
      .filter((image) => !visibleSet.has(image))
      .slice(0, MAX_VISIBLE_IMAGES)
      .sort((a, b) => {
        const aMs = getImageTimestampMs(a);
        const bMs = getImageTimestampMs(b);
        if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
        if (!Number.isFinite(aMs)) return -1;
        if (!Number.isFinite(bMs)) return 1;
        return aMs - bMs;
      });

    for (const image of orderedTargets) {
      if (!availableIndices.length) break;
      const historyKey = getImageKey(image);
      const history = state.imageHistory.get(historyKey);
      let slotIndex = null;

      if (
        history &&
        history.layoutSize === state.layoutSize &&
        availableIndices.includes(history.slot)
      ) {
        slotIndex = history.slot;
        availableIndices.splice(availableIndices.indexOf(slotIndex), 1);
      } else {
        slotIndex = availableIndices.shift();
      }

      state.imageHistory.set(historyKey, {
        slot: slotIndex,
        layoutSize: state.layoutSize,
      });

      state.slots[slotIndex] = {
        image,
        enteredAtMs: now,
        assignedSlot: slotIndex,
        layoutSize: state.layoutSize,
      };
      visibleSet.add(image);
      changeOccurred = true;
    }
  }

  if (!forcedByOption && appliedEntry) {
    const postImages = getCurrentImages(state);
    const layoutMatches =
      incomingTargets.length === 0 ||
      normalizeLayoutSize(incomingTargets.length || 1) === (state.layoutSize || DEFAULT_LAYOUT_SIZE);
    const imagesMatch = haveSameImageMultiset(incomingTargets, postImages);
    const stillNeedsIncoming =
      incomingTargets.length === 0 ? postImages.length > 0 : !imagesMatch || !layoutMatches;
    
    // Only re-queue if the incoming targets are different from what we just applied
    const incomingMatchesApplied = haveSameImageMultiset(incomingTargets, workingTargets);
    if (stillNeedsIncoming && !incomingMatchesApplied) {
      enqueuePendingChange(queue, {
        images: incomingTargets,
        layoutSize: normalizeLayoutSize(incomingTargets.length || 1),
        absoluteMs: now,
        force: false,
      });
    }
  }

  if (!hasTargets && !state.slots.some(Boolean) && state.layoutSize !== DEFAULT_LAYOUT_SIZE) {
    state.layoutSize = DEFAULT_LAYOUT_SIZE;
    state.slots = createEmptySlots(DEFAULT_LAYOUT_SIZE);
    changeOccurred = true;
  }

  if (changeOccurred) {
    state.lastChangeMs = now;
  }
  state.lastAbsoluteMs = now;

  const normalizedSlots = state.slots.map((slot, index) =>
    slot ? { ...slot, assignedSlot: index, layoutSize: state.layoutSize } : null
  );
  const orderedImages = normalizedSlots
    .map((slot) => slot?.image || null)
    .filter(Boolean)
    .sort((a, b) => {
      const aMs = getImageTimestampMs(a);
      const bMs = getImageTimestampMs(b);
      if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
      if (!Number.isFinite(aMs)) return -1;
      if (!Number.isFinite(bMs)) return 1;
      return aMs - bMs;
    });

  return {
    layoutSize: state.layoutSize,
    slots: normalizedSlots,
    orderedImages,
    changed: changeOccurred,
  };
}

export function buildStaticSlots(images = [], { maxSlots = MAX_VISIBLE_IMAGES } = {}) {
  if (!Array.isArray(images) || !images.length) {
    return {
      layoutSize: 1,
      slots: [],
    };
  }
  const layoutSize = Math.max(1, Math.min(images.length, maxSlots));
  const slots = Array.from({ length: layoutSize }, (_, index) => {
    const image = images[index] || null;
    if (!image) {
      return null;
    }
    return {
      image,
      assignedSlot: index,
      layoutSize,
      enteredAtMs: null,
    };
  });
  return { layoutSize, slots };
}
