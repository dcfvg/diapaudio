import { formatTrackLabel } from "./fileUtils.js";
import * as logger from "../utils/logger.js";

const DEFAULT_AUDIO_DURATION_CONCURRENCY = 4;
const DEFAULT_AUDIO_DURATION_TIMEOUT_MS = 15_000;

export function createAudioTrack({ url, originalName, index, fileTimestamp = null }) {
  return {
    url,
    originalName,
    label: formatTrackLabel(originalName, index),
    duration: null,
    fileTimestamp,
    adjustedStartTime: null,
  };
}

function normalizePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function loadAudioDuration(track, { timeoutMs }) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    let timeoutId = null;
    let settled = false;

    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("error", onError);
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
    };

    const settle = (duration) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      track.duration = Number.isFinite(duration) ? duration : null;
      resolve();
    };

    const onLoaded = () => {
      settle(audio.duration);
    };

    const onError = (event) => {
      logger.error(`Failed to load duration for ${track.label}:`, event?.error || event);
      settle(null);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("error", onError);

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        logger.warn(`Timed out loading duration for ${track.label}`);
        settle(null);
      }, timeoutMs);
    }

    audio.src = track.url;
  });
}

export async function loadAllAudioDurations(tracks, options = {}) {
  if (!Array.isArray(tracks) || !tracks.length) {
    return;
  }

  const concurrency = Math.min(
    tracks.length,
    normalizePositiveInteger(options.maxConcurrency, DEFAULT_AUDIO_DURATION_CONCURRENCY)
  );
  const timeoutMs = normalizePositiveInteger(options.timeoutMs, DEFAULT_AUDIO_DURATION_TIMEOUT_MS);
  let nextIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (nextIndex < tracks.length) {
      const track = tracks[nextIndex];
      nextIndex += 1;
      await loadAudioDuration(track, { timeoutMs });
    }
  });

  await Promise.all(workers);
}
