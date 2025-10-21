import { formatTrackLabel } from "./fileUtils.js";
import * as logger from "../utils/logger.js";

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

export async function loadAllAudioDurations(tracks) {
  if (!Array.isArray(tracks) || !tracks.length) {
    return;
  }

  await Promise.all(
    tracks.map(
      (track) =>
        new Promise((resolve) => {
          const audio = new Audio();
          audio.preload = "metadata";

          const cleanup = () => {
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("error", onError);
          };

          const onLoaded = () => {
            cleanup();
            track.duration = audio.duration;
            resolve();
          };

          const onError = (event) => {
            cleanup();
            logger.error(`Failed to load duration for ${track.label}:`, event?.error || event);
            track.duration = null;
            resolve();
          };

          audio.addEventListener("loadedmetadata", onLoaded);
          audio.addEventListener("error", onError);
          audio.src = track.url;
        })
    )
  );
}
