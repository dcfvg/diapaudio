import { create } from "zustand";
import { devtools } from "zustand/middleware";
import ProgressManager from "../media/progress.js";
import { getVisibleImagesAtTime } from "../media/images.js";
import { useSettingsStore } from "./useSettingsStore.js";
import {
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
  MIN_IMAGE_DISPLAY_MIN_MS,
  DEFAULT_IMAGE_HOLD_MS,
  IMAGE_HOLD_MAX_MS,
  MAX_VISIBLE_IMAGES,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
} from "../media/constants.js";
import createProgressSlice from "./slices/progressSlice.js";
import createMediaSlice from "./slices/mediaSlice.js";
import createDragDropSlice from "./slices/dragDropSlice.js";

// Helper functions moved to helpers
import { deriveMediaWithDelay, extractTimelineView, buildMediaData as buildMediaDataHelper } from "./helpers/mediaHelpers.js";

const initialState = {
  mediaData: null,
  delaySeconds: 0,
  anomalies: [],
  duplicates: { audio: 0, images: 0 },
  loading: false,
  error: null,
  progress: { percent: 0, statusKey: "", details: "" },
  objectUrls: [],
  timelineView: null,
};

const mediaStoreImpl = (set, get) => ({
  // State
  ...initialState,

  // Compose slices first so their internal helpers exist
  ...createProgressSlice(set, get),
  ...createMediaSlice(set, get),
  ...createDragDropSlice(set, get),

  // Progress manager instance (not part of state, but accessible)
  _progressManager: new ProgressManager({
    onUpdate: ({ percent, statusKey, details }) => {
      set(() => ({
        progress: { percent, statusKey, details },
      }));
    },
  }),

  // Helper: Derive media with delay
  deriveMediaWithDelay: (media, delay) => deriveMediaWithDelay(media, delay),

  // Helper: Extract timeline view from timeline
  extractTimelineView: (timeline) => extractTimelineView(timeline),

  // Helper: Build media data from preprocessing result
  buildMediaData: (result, existingDelay) => buildMediaDataHelper(result, existingDelay),

  // Error actions provided by progress slice (setError/clearError)

  // Delay setters are provided by media slice (setDelayFromInput, setDelaySeconds)

  // Action: Set timeline view (remain local)
  setTimelineView: (timelineView) => {
    set({ timelineView });
  },

  // Action: Get visible images at a specific time
  getVisibleImages: (absoluteMs, options = {}) => {
    const { mediaData } = get();
    const settings = useSettingsStore.getState();
    const displaySeconds = Number(settings?.imageDisplaySeconds);
    const holdSeconds = Number(settings?.imageHoldSeconds);
    const speed = Number(settings?.speed);
    
    const defaultDisplaySeconds = MIN_IMAGE_DISPLAY_DEFAULT_MS / 1000;
    const minVisibleMs = (() => {
      const seconds = Number.isFinite(displaySeconds) && displaySeconds > 0
        ? displaySeconds
        : defaultDisplaySeconds;
      const s = Number.isFinite(speed) && speed > 0 ? speed : 1;
      const scaled = Math.round(seconds * 1000 * s);
      return Math.max(MIN_IMAGE_DISPLAY_MIN_MS, scaled);
    })();
    
    // Explicitly handle holdSeconds = 0 to avoid any falsy value issues
    const resolvedHold = holdSeconds === 0
      ? 0
      : (Number.isFinite(holdSeconds) && holdSeconds >= 0
          ? Math.min(holdSeconds * 1000, IMAGE_HOLD_MAX_MS)
          : DEFAULT_IMAGE_HOLD_MS);
    const scaledHold = Number.isFinite(speed) && speed > 0 ? Math.round(resolvedHold * speed) : resolvedHold;
    
    const intervalSeconds = Number(settings?.compositionIntervalSeconds);
    const resolvedInterval = Number.isFinite(intervalSeconds)
      ? Math.max(intervalSeconds * 1000, MIN_COMPOSITION_CHANGE_INTERVAL_MS)
      : MAX_COMPOSITION_CHANGE_INTERVAL_MS;

    const result = getVisibleImagesAtTime(mediaData, absoluteMs, {
      skipSilence: options.skipSilence,
      holdMs: scaledHold,
      minVisibleMs,
      maxSlots: MAX_VISIBLE_IMAGES,
      compositionIntervalMs: resolvedInterval,
      snapToGrid: Boolean(settings?.snapToGrid),
      snapGridMs: (() => {
        const sec = Number(settings?.snapGridSeconds);
        return Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : null;
      })(),
      returnDetails: options.returnDetails,
    });

    return result || (options.returnDetails ? { images: [], slots: [], layoutSize: 0, entries: [] } : []);
  },

  // File loading provided by media slice (loadFromFiles)

  // File appending provided by media slice (appendFromFiles)

  // Action: Load media from ZIP (thin wrapper)
  loadFromZip: async (zipFile) => {
    if (!zipFile) return;
    // prepareMediaFromFiles already expands zips; delegate to loadFromFiles
    await get().loadFromFiles([zipFile]);
  },

  // Drag/drop provided by dragDrop slice (loadFromDataTransfer)
});

const enableDevtools =
  import.meta.env?.DEV && import.meta.env?.VITE_ENABLE_STORE_DEVTOOLS === "true";

export const useMediaStore = create(
  enableDevtools ? devtools(mediaStoreImpl, { name: "MediaStore" }) : mediaStoreImpl
);

// Reset media store on every page load (not persisted anymore)
// This ensures the app returns to dropzone after reload
if (typeof window !== "undefined") {
  // Reset store on page load using media slice's reset
  try {
    useMediaStore.getState().reset();
  } catch {
    // If reset isn't ready yet, ignore
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    useMediaStore.destroy();
  });
}
