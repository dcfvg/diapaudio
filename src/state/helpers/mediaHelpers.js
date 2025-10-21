import { applyTimelineCalculations } from "../../media/timeline.js";
import { dedupeAudioTracks, dedupeImages } from "../../media/dedupe.js";
import { t as translate } from "../../i18n/index.js";

// Revoke an array of object URLs
export function revokeObjectUrls(urls) {
  if (!Array.isArray(urls)) return;
  urls.forEach((url) => {
    if (typeof url === "string") {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore revoke errors
      }
    }
  });
}

// Return a new media object with timeline calculations applied for a delay
export function deriveMediaWithDelay(media, delay) {
  if (!media) return null;
  const cloned = {
    ...media,
    audioTracks: (media.audioTracks || []).map((track) => ({ ...track })),
    images: (media.images || []).map((image) => ({ ...image })),
  };
  return applyTimelineCalculations(cloned, delay);
}

// Extract the view from a timeline object
export function extractTimelineView(timeline) {
  if (!timeline) {
    return null;
  }
  const startMs = Number.isFinite(timeline.startMs) ? timeline.startMs : null;
  const fullEndMs = Number.isFinite(timeline.endMs) ? timeline.endMs : null;
  if (!Number.isFinite(startMs) || !Number.isFinite(fullEndMs)) {
    return null;
  }
  
  // Initial zoom: show 1 hour from start
  const INITIAL_VIEW_DURATION_MS = 60 * 60 * 1000; // 1 hour
  const endMs = Math.min(startMs + INITIAL_VIEW_DURATION_MS, fullEndMs);
  
  return { startMs, endMs };
}

// Build a new media store payload from a preprocessing result
export function buildMediaData(result, existingDelay = 0) {
  const resolvedDelay = result.delaySeconds ?? existingDelay ?? 0;
  let audioTracks = (result.audioTracks || []).map((track) => ({ ...track }));
  let images = (result.images || []).map((img) => ({
    ...img,
    originalTimestamp:
      img.timestamp instanceof Date
        ? img.timestamp
        : img.timestamp
          ? new Date(img.timestamp)
          : null,
    relative: 0,
    timecode: "00:00",
    timeOfDay: img.timestamp instanceof Date ? new Date(img.timestamp).toLocaleTimeString() : "00:00",
  }));

  // Cross-load deduplication
  const audioDedupe = dedupeAudioTracks(audioTracks);
  const imageDedupe = dedupeImages(images);
  audioTracks = audioDedupe.tracks;
  images = imageDedupe.images;

  images.sort((a, b) => {
    const aMs = a?.originalTimestamp instanceof Date ? a.originalTimestamp.getTime() : null;
    const bMs = b?.originalTimestamp instanceof Date ? b.originalTimestamp.getTime() : null;
    if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
    if (!Number.isFinite(aMs)) return -1;
    if (!Number.isFinite(bMs)) return 1;
    return aMs - bMs;
  });

  const allFiles = (result.files || []).map((file) => {
    const fileName = file.name || file.webkitRelativePath || file.path || "";
    const fileTimestamp = null;
    return {
      name: fileName,
      size: file.size || 0,
      lastModified: file.lastModified || 0,
      timestamp: fileTimestamp,
    };
  });

  const baseMediaData = {
    audioTracks,
    activeTrackIndex: 0,
    images,
    allFiles,
  };

  const mediaDataWithTimeline = deriveMediaWithDelay(baseMediaData, resolvedDelay);
  const timelineView = extractTimelineView(mediaDataWithTimeline?.timeline);

  return {
    mediaData: mediaDataWithTimeline,
    delaySeconds: resolvedDelay,
    anomalies: [
      ...(result.anomalies || []),
      ...(audioDedupe.removedCount
        ? [{ message: translate("removedDuplicateAudio", { count: audioDedupe.removedCount }), type: "audio" }]
        : []),
      ...(imageDedupe.removedCount
        ? [{ message: translate("removedDuplicateImage", { count: imageDedupe.removedCount }), type: "image" }]
        : []),
    ],
    duplicates: {
      audio: (result.duplicates?.audio || 0) + (audioDedupe.removedCount || 0),
      images: (result.duplicates?.images || 0) + (imageDedupe.removedCount || 0),
    },
    objectUrls: result.objectUrls || [],
    timelineView,
  };
}

export default {
  revokeObjectUrls,
  deriveMediaWithDelay,
  extractTimelineView,
  buildMediaData,
};
