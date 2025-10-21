// Utilities to detect and remove duplicates across loads

function normalizeBaseName(name = "") {
  try {
    const base = String(name).split(/[\\/]/).pop() || ""; // strip directories
    const withoutExt = base.replace(/\.[^.]+$/i, "");
    return withoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "") // remove separators/punctuation
      .trim();
  } catch {
    return "";
  }
}

import { toTimestamp } from "../utils/dateUtils.js";

function timeMs(value) {
  if (value instanceof Date) return toTimestamp(value);
  if (Number.isFinite(value)) return value;
  return null;
}

function isTimeClose(a, b, toleranceMs = 0) {
  const ams = timeMs(a);
  const bms = timeMs(b);
  if (!Number.isFinite(ams) || !Number.isFinite(bms)) return false;
  return Math.abs(ams - bms) <= toleranceMs;
}

function isDurationClose(a, b, toleranceSeconds = 0) {
  const av = Number(a);
  const bv = Number(b);
  if (!Number.isFinite(av) || !Number.isFinite(bv)) return false;
  return Math.abs(av - bv) <= toleranceSeconds;
}

// Build a fuzzy signature for audio tracks using name + timestamp + duration (when available)
function audioSignature(track) {
  const base = normalizeBaseName(track?.originalName || track?.label || "");
  const ts = timeMs(track?.fileTimestamp);
  const dur = Number(track?.duration);
  // No bucketing: exact duration value for strict comparison
  const durExact = Number.isFinite(dur) ? dur : null;
  return `${base}|${ts ?? "-"}|${durExact ?? "-"}`;
}

export function dedupeAudioTracks(tracks = []) {
  if (!Array.isArray(tracks) || tracks.length <= 1) {
    return { tracks: Array.isArray(tracks) ? tracks.slice() : [], removed: [], removedCount: 0 };
  }

  // First pass: exact-ish signature map
  const seen = new Map();
  const result = [];
  const removed = [];

  for (const t of tracks) {
    const key = audioSignature(t);
    if (!seen.has(key)) {
      seen.set(key, t);
      result.push(t);
      continue;
    }
    // If duration missing on either, do a softer comparison before removing
    const candidate = seen.get(key);
    const nameClose = normalizeBaseName(candidate?.originalName) === normalizeBaseName(t?.originalName);
  const tsClose = isTimeClose(candidate?.fileTimestamp, t?.fileTimestamp, 0);
  const durClose = isDurationClose(candidate?.duration, t?.duration, 0);
    if (nameClose && (durClose || tsClose)) {
      removed.push(t);
    } else {
      // Different enough, keep both (rare)
      result.push(t);
    }
  }

  return { tracks: result, removed, removedCount: removed.length };
}

// Build a fuzzy signature for images using name + timestamp
function imageSignature(img) {
  const base = normalizeBaseName(img?.name || img?.url || "");
  const ts = timeMs(img?.originalTimestamp ?? img?.timestamp);
  return `${base}|${ts ?? "-"}`;
}

export function dedupeImages(images = []) {
  if (!Array.isArray(images) || images.length <= 1) {
    return { images: Array.isArray(images) ? images.slice() : [], removed: [], removedCount: 0 };
  }

  const seen = new Map();
  const result = [];
  const removed = [];

  for (const img of images) {
    const key = imageSignature(img);
    if (!seen.has(key)) {
      seen.set(key, img);
      result.push(img);
      continue;
    }
    const candidate = seen.get(key);
    const nameClose = normalizeBaseName(candidate?.name) === normalizeBaseName(img?.name);
  const tsClose = isTimeClose(candidate?.originalTimestamp ?? candidate?.timestamp, img?.originalTimestamp ?? img?.timestamp, 0);
    if (nameClose && tsClose) {
      removed.push(img);
    } else {
      // Keep if sufficiently different
      result.push(img);
    }
  }

  return { images: result, removed, removedCount: removed.length };
}

export default {
  dedupeAudioTracks,
  dedupeImages,
};
