import {
  getBaseName,
  getFilePath,
  isAudioFileName,
  isImageFileName,
  shouldSkipEntry,
} from "./fileUtils.js";
import { parseDelayField, formatDelay } from "./delay.js";
import { createAudioTrack, loadAllAudioDurations } from "./audio.js";
import {
  parseTimestampFromAudio,
  parseTimestampFromEXIF,
  parseTimestampFromName,
} from "../utils/timestampUtils.js";
import { toTimestamp } from "../utils/dateUtils.js";

function translate(t, key, params) {
  if (typeof t === "function") {
    return t(key, params);
  }
  return key;
}

function addAnomaly(anomalies, message, meta = {}) {
  if (!message) return;
  anomalies.push({
    message,
    ...meta,
  });
}

export async function prepareMediaFromFiles(files, options = {}) {
  const { progress, t, onDelayLoaded, onAnomaly } = options;

  const anomalies = [];
  const objectUrls = [];

  const translateKey = (key, params) => translate(t, key, params);

  progress?.update(0, "readingFolder", "Starting...");

  // Dynamically import ZIP handling only when needed
  const { expandZipFiles } = await import("./zip.js");
  const { expanded, zipCount, extractedCount } = await expandZipFiles(files, { progress, t });
  let effectiveFiles = expanded.length ? expanded : files.slice();

  // Load delay configuration if present
  progress?.update(5, "readingFolder", "Checking for delay file...");
  const delayFiles = effectiveFiles.filter(
    (file) => getBaseName(getFilePath(file)) === "_delay.txt"
  );
  let delaySeconds = null;
  if (delayFiles.length > 0) {
    const chosenDelayFile = delayFiles[delayFiles.length - 1];
    try {
      const text = await chosenDelayFile.text();
      const parsed = parseDelayField(text.trim());
      if (parsed !== null) {
        delaySeconds = parsed;
        onDelayLoaded?.(parsed, {
          source: "file",
          fileName: chosenDelayFile.name,
        });
        if (delayFiles.length > 1) {
          const message = translateKey("multipleDelayFilesDetected", {
            count: delayFiles.length,
            delay: formatDelay(parsed),
          });
          addAnomaly(anomalies, message, { type: "delay" });
          onAnomaly?.(message, { type: "delay" });
        }
      } else {
        console.warn(`Invalid delay format in _delay.txt: "${text.trim()}"`);
      }
    } catch (error) {
      console.error("Error reading _delay.txt:", error);
    }
  }

  progress?.update(10, "processingFiles", "Scanning files...");

  const audioCandidates = effectiveFiles
    .filter((file) => {
      const path = getFilePath(file);
      if (shouldSkipEntry(path)) return false;
      return isAudioFileName(path);
    })
    .sort((a, b) =>
      getFilePath(a).localeCompare(getFilePath(b), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

  progress?.update(15, "processingFiles", "Checking for duplicates...");
  const uniqueAudioFiles = [];
  const audioFileKeys = new Set();
  const skippedAudioDuplicates = [];

  for (const file of audioCandidates) {
    const fileName = getFilePath(file);
    const fileSize = file.size || 0;
    const fileTimestamp = parseTimestampFromName(fileName);
    const timestampKey = fileTimestamp ? toTimestamp(fileTimestamp) : "no_timestamp";
    const fileKey = `${fileName}_${fileSize}_${timestampKey}`;

    if (audioFileKeys.has(fileKey)) {
      skippedAudioDuplicates.push(fileName);
      continue;
    }

    audioFileKeys.add(fileKey);
    uniqueAudioFiles.push(file);
  }

  if (skippedAudioDuplicates.length > 0) {
    const message = translateKey("removedDuplicateAudio", { count: skippedAudioDuplicates.length });
    console.warn(message);
    addAnomaly(anomalies, message, { type: "audio" });
    onAnomaly?.(message, { type: "audio" });
  }

  const imageCandidates = effectiveFiles.filter((file) => {
    const path = getFilePath(file);
    return !shouldSkipEntry(path) && isImageFileName(path);
  });

  const uniqueImageFiles = [];
  const imageFileKeys = new Set();
  const skippedImageDuplicates = [];

  for (const file of imageCandidates) {
    const fileName = getFilePath(file);
    const fileSize = file.size || 0;
    const fileTimestamp = parseTimestampFromName(fileName);
    const timestampKey = fileTimestamp ? toTimestamp(fileTimestamp) : "no_timestamp";
    const fileKey = `${fileName}_${fileSize}_${timestampKey}`;

    if (imageFileKeys.has(fileKey)) {
      skippedImageDuplicates.push(fileName);
      continue;
    }

    imageFileKeys.add(fileKey);
    uniqueImageFiles.push(file);
  }

  if (skippedImageDuplicates.length > 0) {
    const message = translateKey("removedDuplicateImage", { count: skippedImageDuplicates.length });
    console.warn(message);
    addAnomaly(anomalies, message, { type: "image" });
    onAnomaly?.(message, { type: "image" });
  }

  if (!uniqueAudioFiles.length && !uniqueImageFiles.length) {
    if (skippedAudioDuplicates.length > 0 || skippedImageDuplicates.length > 0) {
      throw new Error(translateKey("errorOnlyDuplicates"));
    }
    throw new Error(translateKey("errorNoMediaFiles"));
  }

  progress?.update(20, "processingFiles", `Processing ${uniqueAudioFiles.length} audio files...`);

  const audioTracks = await Promise.all(
    uniqueAudioFiles.map(async (file, index) => {
      const progressPercent = 20 + (index / Math.max(1, uniqueAudioFiles.length)) * 20;
      progress?.update(
        progressPercent,
        "processingFiles",
        `Processing audio ${index + 1}/${uniqueAudioFiles.length}...`
      );

      const filePath = getFilePath(file);
      let fileTimestamp = parseTimestampFromName(filePath);

      if (!fileTimestamp) {
        fileTimestamp = await parseTimestampFromAudio(file);
        if (fileTimestamp) {
          console.log(`Extracted timestamp from audio metadata for ${file.name}:`, fileTimestamp);
        }
      }

      const url = URL.createObjectURL(file);
      objectUrls.push(url);

      return createAudioTrack({
        url,
        originalName: filePath,
        index,
        fileTimestamp,
      });
    })
  );

  if (audioTracks.length > 0) {
    progress?.update(40, "processingFiles", "Loading audio durations...");
    await loadAllAudioDurations(audioTracks);
  }

  progress?.update(50, "processingFiles", `Processing ${uniqueImageFiles.length} images...`);

  const images = await Promise.all(
    uniqueImageFiles.map(async (file, index) => {
      const progressPercent = 50 + (index / Math.max(1, uniqueImageFiles.length)) * 40;
      progress?.update(
        progressPercent,
        "processingFiles",
        `Processing image ${index + 1}/${uniqueImageFiles.length}...`
      );

      const url = URL.createObjectURL(file);
      objectUrls.push(url);
      const path = getFilePath(file);

      let timestamp = parseTimestampFromName(path);
      if (!timestamp) {
        timestamp = await parseTimestampFromEXIF(file);
      }

      return {
        name: file.name,
        url,
        originalTimestamp: timestamp, // Store the parsed timestamp (from filename or EXIF)
        timestamp, // Will be adjusted for monotonic ordering later
        lastModified:
          Number.isFinite(file.lastModified) && file.lastModified > 0 ? file.lastModified : null,
        fallback: !timestamp,
      };
    })
  );

  const validImages = images.filter(Boolean);

  if (validImages.length) {
    const DEFAULT_INTERVAL = 1_000;
    const times = validImages.map((image) =>
      image.timestamp instanceof Date ? toTimestamp(image.timestamp) : null
    );

    // Seed missing entries with lastModified when available
    for (let i = 0; i < validImages.length; i += 1) {
      if (times[i] == null && Number.isFinite(validImages[i].lastModified)) {
        times[i] = validImages[i].lastModified;
      }
    }

    const knownIndices = [];
    for (let i = 0; i < times.length; i += 1) {
      if (Number.isFinite(times[i])) {
        knownIndices.push(i);
      }
    }

    if (!knownIndices.length) {
      const base = validImages[0]?.lastModified ?? Date.now();
      for (let i = 0; i < times.length; i += 1) {
        times[i] = base + i * DEFAULT_INTERVAL;
      }
    } else {
      // Fill leading segment
      const firstKnown = knownIndices[0];
      for (let i = firstKnown - 1; i >= 0; i -= 1) {
        const nextValue = times[i + 1];
        const candidate =
          Number.isFinite(validImages[i].lastModified) && validImages[i].lastModified < nextValue
            ? validImages[i].lastModified
            : nextValue - DEFAULT_INTERVAL;
        times[i] = Math.min(candidate, nextValue - DEFAULT_INTERVAL);
      }

      // Fill gaps between known points
      for (let k = 0; k < knownIndices.length - 1; k += 1) {
        const startIdx = knownIndices[k];
        const endIdx = knownIndices[k + 1];
        const startTime = times[startIdx];
        const endTime = times[endIdx];
        const gapCount = endIdx - startIdx - 1;
        if (gapCount <= 0) {
          continue;
        }
        const availableSpan = Math.max(endTime - startTime, (gapCount + 1) * DEFAULT_INTERVAL);
        const step = Math.max(DEFAULT_INTERVAL, Math.floor(availableSpan / (gapCount + 1)));
        for (let offset = 1; offset <= gapCount; offset += 1) {
          const candidate = startTime + step * offset;
          const maxAllowed = endTime - DEFAULT_INTERVAL * (gapCount - offset + 1);
          times[startIdx + offset] = Math.min(candidate, maxAllowed);
        }
      }

      // Fill trailing segment
      const lastKnown = knownIndices[knownIndices.length - 1];
      for (let i = lastKnown + 1; i < times.length; i += 1) {
        const previous = times[i - 1];
        const candidate =
          Number.isFinite(validImages[i].lastModified) && validImages[i].lastModified > previous
            ? validImages[i].lastModified
            : previous + DEFAULT_INTERVAL;
        times[i] = Math.max(candidate, previous + DEFAULT_INTERVAL);
      }
    }

    // Final pass to guarantee strict monotonic order ONLY for interpolated timestamps
    // Images with originalTimestamp should keep their exact values
    for (let i = 0; i < times.length; i += 1) {
      // Only enforce monotonic order if this image had NO originalTimestamp (was interpolated)
      if (!validImages[i].originalTimestamp && i > 0 && times[i] <= times[i - 1]) {
        times[i] = times[i - 1] + DEFAULT_INTERVAL;
      }
      validImages[i].timestamp = new Date(times[i]);
    }
  }

  if (audioTracks.length === 0 && validImages.length === 0) {
    throw new Error(translateKey("errorNoValidMediaFiles"));
  }

  progress?.update(95, "processingFiles", "Finalizing...");

  return {
    audioTracks,
    images: validImages,
    delaySeconds,
    anomalies,
    duplicates: {
      audio: skippedAudioDuplicates.length,
      images: skippedImageDuplicates.length,
    },
    metadata: {
      zipCount,
      extractedCount,
    },
    objectUrls,
    files: effectiveFiles,
  };
}

export default prepareMediaFromFiles;
