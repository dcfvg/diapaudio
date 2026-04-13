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
  parseTimestampFromName, // Keep for createFileKey function
  parseTimestampFromEXIF,  // For image metadata extraction
  // NEW v1.1.0: Batch processing for 10x performance
  parseTimestampBatch,
  extractTimestampBatch,
  // Context-aware format detection
  hasAmbiguousDates,
  analyzeContextualFormat,
  // Quality indicators
  parseAndGroupByConfidence,
  // Source comparison
  compareTimestampSources,
} from "../utils/timestampUtils.js";
import { toTimestamp } from "../utils/dateUtils.js";
import { translate } from "../utils/i18nHelpers.js";
import { DEFAULT_TIMESTAMP_INTERVAL_MS } from "./constants.js";
import * as logger from "../utils/logger.js";

/**
 * Create a unique key for file deduplication based on name, size, and timestamp
 * @param {File} file - File object
 * @param {string} filePath - File path
 * @returns {string} Unique file key
 */
function createFileKey(file, filePath) {
  const fileName = filePath;
  const fileSize = file.size || 0;
  const fileTimestamp = parseTimestampFromName(filePath);
  const timestampKey = fileTimestamp ? toTimestamp(fileTimestamp) : "no_timestamp";
  return `${fileName}_${fileSize}_${timestampKey}`;
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
        logger.warn(`Invalid delay format in _delay.txt: "${text.trim()}"`);
      }
    } catch (error) {
      logger.error("Error reading _delay.txt:", error);
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
    const filePath = getFilePath(file);
    const fileKey = createFileKey(file, filePath);

    if (audioFileKeys.has(fileKey)) {
      skippedAudioDuplicates.push(filePath);
      continue;
    }

    audioFileKeys.add(fileKey);
    uniqueAudioFiles.push(file);
  }

  if (skippedAudioDuplicates.length > 0) {
    const message = translateKey("removedDuplicateAudio", { count: skippedAudioDuplicates.length });
    logger.warn(message);
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
    const filePath = getFilePath(file);
    const fileKey = createFileKey(file, filePath);

    if (imageFileKeys.has(fileKey)) {
      skippedImageDuplicates.push(filePath);
      continue;
    }

    imageFileKeys.add(fileKey);
    uniqueImageFiles.push(file);
  }

  if (skippedImageDuplicates.length > 0) {
    const message = translateKey("removedDuplicateImage", { count: skippedImageDuplicates.length });
    logger.warn(message);
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

  // OPTIMIZATION: Batch parse filenames (10x faster than individual calls)
  const audioFilePaths = uniqueAudioFiles.map(getFilePath);
  const audioBatchResults = parseTimestampBatch(audioFilePaths);
  const audioFilenameTimestamps = audioBatchResults.map(result => result?.date || null);
  
  // QUALITY INDICATOR: Check confidence levels for all files
  const allFilePaths = [...audioFilePaths, ...uniqueImageFiles.map(getFilePath)];
  const confidenceGroups = parseAndGroupByConfidence(allFilePaths);
  
  // Warn about low-confidence detections
  if (confidenceGroups.low.length > 0) {
    const message = `${confidenceGroups.low.length} files have low-confidence timestamp detection`;
    logger.warn(message);
    addAnomaly(anomalies, message, {
      type: 'lowConfidence',
      count: confidenceGroups.low.length,
      files: confidenceGroups.low.slice(0, 5), // Show first 5 examples
    });
  }
  
  // CONTEXT-AWARE FORMAT: Auto-detect DD-MM vs MM-DD
  if (hasAmbiguousDates(allFilePaths)) {
    const analysis = analyzeContextualFormat(allFilePaths);
    
    if (analysis.confidence > 0.80) {
      logger.info(
        `Auto-detected date format: ${analysis.likelyFormat.toUpperCase()} ` +
        `(${(analysis.confidence * 100).toFixed(0)}% confidence)`
      );
    } else {
      const message = 
        `Ambiguous date format detected. Suggested: ${analysis.likelyFormat.toUpperCase()} ` +
        `(${(analysis.confidence * 100).toFixed(0)}% confidence). ` +
        `Evidence: ${analysis.evidence.join(', ')}`;
      logger.warn(message);
      addAnomaly(anomalies, message, {
        type: 'ambiguousFormat',
        analysis,
        suggestion: 'Verify date format if timestamps look incorrect',
      });
    }
  }
  
  // Identify files needing metadata extraction (only those without filename timestamps)
  const audioFilesNeedingMetadata = uniqueAudioFiles.filter((_, i) => !audioFilenameTimestamps[i]);
  
  // OPTIMIZATION: Batch extract audio metadata (only for files without filename timestamps)
  const audioMetadataResults = audioFilesNeedingMetadata.length > 0
    ? await extractTimestampBatch(audioFilesNeedingMetadata, {
        priority: ['audio', 'birthtime'],
      })
    : [];

  // Map metadata results back to original indices
  let metadataIndex = 0;
  const audioTracks = await Promise.all(
    uniqueAudioFiles.map(async (file, index) => {
      const progressPercent = 20 + (index / Math.max(1, uniqueAudioFiles.length)) * 20;
      progress?.update(
        progressPercent,
        "processingFiles",
        `Processing audio ${index + 1}/${uniqueAudioFiles.length}...`
      );

      const filePath = getFilePath(file);
      let fileTimestamp = audioFilenameTimestamps[index];

      if (!fileTimestamp && audioFilesNeedingMetadata.includes(file)) {
        const metadata = audioMetadataResults[metadataIndex++];
        fileTimestamp = metadata?.timestamp;
        if (fileTimestamp) {
          logger.info(`Extracted timestamp from audio metadata for ${file.name}:`, fileTimestamp);
        }
      }
      
      // DEBUG: Log final timestamp assignment
      if (fileTimestamp) {
        const time = `${fileTimestamp.getHours()}:${fileTimestamp.getMinutes().toString().padStart(2, '0')}:${fileTimestamp.getSeconds().toString().padStart(2, '0')}`;
        logger.info(`Audio track [${index}] ${file.name} assigned timestamp: ${time}`);
      } else {
        logger.warn(`Audio track [${index}] ${file.name} has NO timestamp`);
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

  // OPTIMIZATION: Batch parse image filenames (10x faster)
  const imageFilePaths = uniqueImageFiles.map(getFilePath);
  const imageBatchResults = parseTimestampBatch(imageFilePaths);
  // Extract Date objects from batch results
  const imageFilenameTimestamps = imageBatchResults.map(result => result?.date || null);
  
  // DEBUG: Log image filename parsing results
  const imagesWithFilenameTimestamps = imageFilenameTimestamps.filter(t => t).length;
  logger.info(`Parsed ${imagesWithFilenameTimestamps}/${imageFilePaths.length} image file timestamps from filenames`);
  
  // Identify images needing EXIF extraction
  const imagesNeedingMetadata = uniqueImageFiles.filter((_, i) => !imageFilenameTimestamps[i]);
  logger.info(`${imagesNeedingMetadata.length} images need EXIF metadata extraction`);
  
  // EXIF extraction: Use parseTimestampFromEXIF directly on File objects
  const imageMetadataResults = await Promise.all(
    imagesNeedingMetadata.map(async (file) => {
      try {
        const timestamp = await parseTimestampFromEXIF(file);
        return { timestamp };
      } catch (error) {
        logger.warn(`Failed to extract EXIF from ${file.name}:`, error.message);
        return { timestamp: null };
      }
    })
  );

  // Map metadata results back to original indices
  metadataIndex = 0;
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

      let timestamp = imageFilenameTimestamps[index];
      if (!timestamp && imagesNeedingMetadata.includes(file)) {
        const metadata = imageMetadataResults[metadataIndex++];
        timestamp = metadata?.timestamp;
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

  // SOURCE COMPARISON: Check for EXIF vs filename mismatches (sample first 50 for performance)
  const imageSampleSize = Math.min(50, imagesNeedingMetadata.length);
  if (imageSampleSize > 0) {
    const mismatches = [];
    
    for (let i = 0; i < imageSampleSize; i++) {
      const file = imagesNeedingMetadata[i];
      try {
        const comparison = await compareTimestampSources(file);
        
        // Flag if difference > 1 day (86400000ms)
        if (comparison.mismatch && comparison.maxDifference > 86400000) {
          mismatches.push({
            name: file.name,
            filenameDate: comparison.filename,
            exifDate: comparison.exif,
            differenceHours: Math.round(comparison.maxDifference / 3600000),
          });
        }
      } catch (error) {
        // Skip files that can't be compared
        logger.warn(`Could not compare timestamps for ${file.name}:`, error.message);
      }
    }
    
    if (mismatches.length > 0) {
      const message = 
        `${mismatches.length} images have timestamp mismatches between filename and EXIF ` +
        `(differences > 1 day). This may indicate renamed files or incorrect camera settings.`;
      logger.warn(message);
      addAnomaly(anomalies, message, {
        type: 'timestampMismatch',
        mismatches: mismatches.slice(0, 5), // Show first 5
        totalCount: mismatches.length,
        totalChecked: imageSampleSize,
      });
    }
  }

  if (validImages.length) {
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
        times[i] = base + i * DEFAULT_TIMESTAMP_INTERVAL_MS;
      }
    } else {
      // Fill leading segment
      const firstKnown = knownIndices[0];
      for (let i = firstKnown - 1; i >= 0; i -= 1) {
        const nextValue = times[i + 1];
        const candidate =
          Number.isFinite(validImages[i].lastModified) && validImages[i].lastModified < nextValue
            ? validImages[i].lastModified
            : nextValue - DEFAULT_TIMESTAMP_INTERVAL_MS;
        times[i] = Math.min(candidate, nextValue - DEFAULT_TIMESTAMP_INTERVAL_MS);
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
        const availableSpan = Math.max(endTime - startTime, (gapCount + 1) * DEFAULT_TIMESTAMP_INTERVAL_MS);
        const step = Math.max(DEFAULT_TIMESTAMP_INTERVAL_MS, Math.floor(availableSpan / (gapCount + 1)));
        for (let offset = 1; offset <= gapCount; offset += 1) {
          const candidate = startTime + step * offset;
          const maxAllowed = endTime - DEFAULT_TIMESTAMP_INTERVAL_MS * (gapCount - offset + 1);
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
            : previous + DEFAULT_TIMESTAMP_INTERVAL_MS;
        times[i] = Math.max(candidate, previous + DEFAULT_TIMESTAMP_INTERVAL_MS);
      }
    }

    // Final pass to guarantee strict monotonic order ONLY for interpolated timestamps
    // Images with originalTimestamp should keep their exact values
    for (let i = 0; i < times.length; i += 1) {
      // Only enforce monotonic order if this image had NO originalTimestamp (was interpolated)
      if (!validImages[i].originalTimestamp && i > 0 && times[i] <= times[i - 1]) {
        times[i] = times[i - 1] + DEFAULT_TIMESTAMP_INTERVAL_MS;
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
