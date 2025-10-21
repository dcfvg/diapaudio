import { buildMediaData, revokeObjectUrls } from "../helpers/mediaHelpers.js";
import { prepareMediaFromFiles } from "../../media/preprocess.js";
import { t as translate } from "../../i18n/index.js";
import { dedupeAudioTracks, dedupeImages } from "../../media/dedupe.js";
import { parseDelayField } from "../../media/delay.js";

export const createMediaSlice = (set, get) => ({
  mediaData: null,
  delaySeconds: 0,
  anomalies: [],
  duplicates: { audio: 0, images: 0 },
  objectUrls: [],
  timelineView: null,

  reset: () => {
    const { objectUrls, delaySeconds, _progressManager } = get();
    revokeObjectUrls(objectUrls);
    set({
      mediaData: null,
      anomalies: [],
      duplicates: { audio: 0, images: 0 },
      objectUrls: [],
      timelineView: null,
      error: null,
      loading: false,
      progress: { percent: 0, statusKey: "", details: "" },
      delaySeconds, // Preserve delay on reset
      _progressManager,
    });
  },

  setDelaySeconds: (value) => {
    const { mediaData, deriveMediaWithDelay, extractTimelineView } = get();
    if (!Number.isFinite(value)) return;
    const updatedMedia = deriveMediaWithDelay(mediaData, value);
    const timelineView = extractTimelineView(updatedMedia?.timeline);
    set({
      delaySeconds: value,
      mediaData: updatedMedia,
      timelineView,
    });
  },

  setDelayFromInput: (input) => {
    const { mediaData, deriveMediaWithDelay, extractTimelineView } = get();
    const parsed = parseDelayField(input);
    if (parsed === null) {
      return false;
    }
    const updatedMedia = deriveMediaWithDelay(mediaData, parsed);
    const timelineView = extractTimelineView(updatedMedia?.timeline);
    set({ delaySeconds: parsed, mediaData: updatedMedia, timelineView });
    return true;
  },

  loadFromFiles: async (inputFiles) => {
    const filesArray = Array.from(inputFiles || []).filter(Boolean);
    if (!filesArray.length) return;

    const { objectUrls, delaySeconds, _progressManager } = get();
    revokeObjectUrls(objectUrls);

    get()._setLoading(true);
    get()._setProgress(0, "loadingFiles", "");
    _progressManager.reset();

    try {
      const result = await prepareMediaFromFiles(filesArray, {
        progress: _progressManager,
        t: translate,
      });
      const payload = buildMediaData(result, delaySeconds);
      set({ loading: false, error: null, ...payload });
    } catch (error) {
      _progressManager.reset();
      set({ loading: false, error });
    }
  },

  appendFromFiles: async (inputFiles) => {
    const filesArray = Array.from(inputFiles || []).filter(Boolean);
    if (!filesArray.length) return;

    const { mediaData, objectUrls, delaySeconds, _progressManager } = get();
    if (!mediaData) return get().loadFromFiles(inputFiles);

    get()._setLoading(true);
    get()._setProgress(0, "loadingFiles", "");
    _progressManager.reset();

    try {
      const result = await prepareMediaFromFiles(filesArray, {
        progress: _progressManager,
        t: translate,
      });

      const existingTracks = mediaData.audioTracks || [];
      const existingImages = mediaData.images || [];
      const existingUrls = objectUrls || [];
      const existingFiles = mediaData.allFiles || [];

      const mergedResult = {
        ...result,
        audioTracks: [...existingTracks, ...(result.audioTracks || [])],
        images: [...existingImages, ...(result.images || [])],
        objectUrls: [...existingUrls, ...(result.objectUrls || [])],
        files: [...existingFiles, ...(result.files || [])],
        anomalies: [...(mediaData.anomalies || []), ...(result.anomalies || [])],
        duplicates: {
          audio: (mediaData.duplicates?.audio || 0) + (result.duplicates?.audio || 0),
          images: (mediaData.duplicates?.images || 0) + (result.duplicates?.images || 0),
        },
      };

      const audioDedupe = dedupeAudioTracks(mergedResult.audioTracks);
      const imageDedupe = dedupeImages(mergedResult.images);
      mergedResult.audioTracks = audioDedupe.tracks;
      mergedResult.images = imageDedupe.images;
      if (audioDedupe.removedCount) {
        mergedResult.anomalies.push({
          message: translate("removedDuplicateAudio", { count: audioDedupe.removedCount }),
          type: "audio",
        });
        mergedResult.duplicates.audio += audioDedupe.removedCount;
      }
      if (imageDedupe.removedCount) {
        mergedResult.anomalies.push({
          message: translate("removedDuplicateImage", { count: imageDedupe.removedCount }),
          type: "image",
        });
        mergedResult.duplicates.images += imageDedupe.removedCount;
      }

      const payload = buildMediaData(mergedResult, delaySeconds);
      set({ loading: false, error: null, ...payload });
    } catch (error) {
      _progressManager.reset();
      set({ loading: false, error });
    }
  },
});

export default createMediaSlice;
