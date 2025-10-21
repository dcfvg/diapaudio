import { ZipReader, BlobReader, BlobWriter } from "@zip.js/zip.js";
import { getMimeType, isSystemFile, shouldSkipEntry, isZipFileName } from "./fileUtils.js";
import { parseTimestampFromName } from "../utils/timestampUtils.js";
import { toTimestamp } from "../utils/dateUtils.js";
import { translate } from "../utils/i18nHelpers.js";
import { ZIP_PROCESSING_DELAY_MS } from "./constants.js";
import * as logger from "../utils/logger.js";

export async function unzipFile(zipFile, { progress, t } = {}) {
  if (!zipFile) {
    throw new Error("ZIP file not provided");
  }

  const name = zipFile.name || "archive.zip";
  const files = [];
  let systemFileCount = 0;
  let reader = null;

  try {
    reader = new ZipReader(new BlobReader(zipFile));
    const entries = await reader.getEntries();
    const totalEntries = entries.length || 1;

    progress?.update(10, "extractingZip", `${name}<br>0 / ${totalEntries}`);

    let processed = 0;
    for (const entry of entries) {
      processed += 1;
      const progressPct = 10 + (processed / totalEntries) * 80;
      progress?.update(progressPct, "extractingZip", `${name}<br>${processed} / ${totalEntries}`);

      const fileName = entry.filename;
      if (entry.directory || shouldSkipEntry(fileName)) {
        if (isSystemFile(fileName)) {
          systemFileCount += 1;
        }
        continue;
      }

      try {
        const mimeType = getMimeType(fileName);
        const blob = await entry.getData(new BlobWriter(mimeType));
        const baseName = fileName.split("/").pop() || fileName;
        const file = new File([blob], baseName, { type: mimeType });
        files.push(file);
      } catch (error) {
        logger.warn(`Failed to extract ${fileName}:`, error);
      }
    }

    progress?.update(95, "processingFiles", `${files.length} ${translate(t, "filesProcessed")}`);

    if (files.length === 0) {
      if (systemFileCount > 0 && entries.length === systemFileCount) {
        throw new Error(translate(t, "errorZipOnlySystemFiles"));
      }
      throw new Error(translate(t, "errorZipNoValidFiles"));
    }
  } catch (error) {
    const message = translate(t, "errorFailedExtractZip", { message: error.message });
    throw new Error(message);
  } finally {
    // Always close the reader to release resources
    if (reader) {
      try {
        await reader.close();
      } catch (closeError) {
        logger.warn("Error closing ZIP reader:", closeError);
      }
    }
  }

  const uniqueFiles = [];
  const fileKeys = new Set();
  let duplicateCount = 0;

  for (const file of files) {
    const fileName = file.name;
    const fileSize = file.size;
    const timestamp = parseTimestampFromName(fileName);
    const timestampKey = timestamp ? toTimestamp(timestamp) : "no_timestamp";
    const fileKey = `${fileName}_${fileSize}_${timestampKey}`;
    if (fileKeys.has(fileKey)) {
      duplicateCount += 1;
      continue;
    }
    fileKeys.add(fileKey);
    uniqueFiles.push(file);
  }

  if (duplicateCount > 0) {
    logger.warn(`Removed ${duplicateCount} duplicate file(s) inside ZIP ${zipFile.name}`);
  }

  return uniqueFiles;
}

export async function expandZipFiles(initialFiles, { progress, t, phase } = {}) {
  const expanded = [];
  const extracted = [];
  const zips = [];

  for (const file of initialFiles || []) {
    if (isZipFileName(file.name)) {
      zips.push(file);
    } else if (!isSystemFile(file.name)) {
      expanded.push(file);
    }
  }

  if (!zips.length) {
    return {
      expanded,
      extractedCount: 0,
      zipCount: 0,
    };
  }

  let processed = 0;
  // Process ZIP files sequentially to avoid worker/resource conflicts
  for (const zipFile of zips) {
    processed += 1;
    const progressPct = 10 + Math.round((processed / Math.max(1, zips.length)) * 70);
    progress?.update(progressPct, "extractingZip", `${zipFile.name}<br>${processed} / ${zips.length}`);
    
    try {
      const innerFiles = await unzipFile(zipFile, { progress, t });
      expanded.push(...innerFiles);
      extracted.push(...innerFiles);
      
      // Add a small delay between archives to ensure workers are fully released
      if (processed < zips.length) {
        await new Promise(resolve => setTimeout(resolve, ZIP_PROCESSING_DELAY_MS));
      }
    } catch (error) {
      logger.error("Failed to unzip", zipFile?.name || "(unknown)", error);
      // Continue processing remaining ZIPs even if one fails
    }
  }

  if (phase === "readingFolder") {
    progress?.update(90, "processingFiles", `${expanded.length}`);
  }

  return {
    expanded,
    extractedCount: extracted.length,
    zipCount: zips.length,
  };
}
