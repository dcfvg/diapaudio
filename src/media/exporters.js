import { BlobReader, BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { exportPremiereXml, exportPremiereXmlPackage } from "./premiereExport.js";
import { uniqueArchiveFileName } from "./archivePaths.js";
import { formatDelay } from "./delay.js";
import { ARCHIVE_SETTINGS_FILE_NAME, serializeArchiveSettings } from "./archiveSettings.js";
import { toTimestamp, formatTimestampForFilename } from "../utils/dateUtils.js";
import * as logger from "../utils/logger.js";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export { exportPremiereXml, exportPremiereXmlPackage };

export async function exportFinalCutProXml(options) {
  return exportPremiereXml(options);
}

export async function exportZipArchive({
  mediaData,
  delaySeconds = 0,
  settings = null,
  onProgress = null,
}) {
  if (!mediaData?.images?.length) {
    throw new Error("No media to export.");
  }

  const sortedImages = [...mediaData.images].filter(
    (image) => image?.originalTimestamp instanceof Date
  );
  if (!sortedImages.length) {
    throw new Error("Images do not contain timestamps.");
  }
  sortedImages.sort((a, b) => toTimestamp(a.originalTimestamp) - toTimestamp(b.originalTimestamp));

  const startTimestamp = sortedImages[0].originalTimestamp;
  const endTimestamp = sortedImages[sortedImages.length - 1].originalTimestamp;
  const startLabel = formatTimestampForFilename(startTimestamp);
  const endLabel = formatTimestampForFilename(endTimestamp);
  const zipFilename = `diapaudio_${startLabel}-${endLabel}.zip`;

  const audioTracks = mediaData.audioTracks || [];
  const totalItems = 2 + audioTracks.length + sortedImages.length;
  let processedItems = 0;

  const reportProgress = (details = "") => {
    if (onProgress) {
      const percent = Math.round((processedItems / totalItems) * 100);
      onProgress(percent, "processingFiles", details);
    }
  };

  reportProgress("Creating archive...");

  const zipWriter = new ZipWriter(new BlobWriter("application/zip"), {
    bufferedWrite: true,
    level: 0,
  });
  const usedArchivePaths = new Set(["_delay.txt", ARCHIVE_SETTINGS_FILE_NAME]);

  await zipWriter.add("_delay.txt", new TextReader(formatDelay(delaySeconds || 0)));
  processedItems++;
  reportProgress("Added delay file");

  await zipWriter.add(ARCHIVE_SETTINGS_FILE_NAME, new TextReader(serializeArchiveSettings(settings)));
  processedItems++;
  reportProgress("Added settings file");

  for (let i = 0; i < audioTracks.length; i += 1) {
    const track = audioTracks[i];
    try {
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${track.originalName || "(audio)"}`);
      }
      const blob = await response.blob();
      const filename = uniqueArchiveFileName(
        track.originalName || track.label,
        `audio-${String(i + 1).padStart(3, "0")}.wav`,
        usedArchivePaths
      );
      await zipWriter.add(filename, new BlobReader(blob));
      processedItems++;
      reportProgress(`Added audio ${i + 1}/${audioTracks.length}: ${filename}`);
    } catch (error) {
      logger.warn("Skipped audio track during export:", error);
      processedItems++;
      reportProgress(`Skipped audio ${i + 1}/${audioTracks.length}`);
    }
  }

  for (let i = 0; i < sortedImages.length; i += 1) {
    const image = sortedImages[i];
    try {
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${image.name || "(image)"}`);
      }
      const blob = await response.blob();
      const filename = uniqueArchiveFileName(
        image.originalName || image.name,
        `image-${String(i + 1).padStart(4, "0")}.jpg`,
        usedArchivePaths
      );
      await zipWriter.add(filename, new BlobReader(blob));
      processedItems++;
      reportProgress(`Added image ${i + 1}/${sortedImages.length}`);
    } catch (error) {
      logger.warn("Skipped image during export:", error);
      processedItems++;
      reportProgress(`Skipped image ${i + 1}/${sortedImages.length}`);
    }
  }

  reportProgress("Finalizing archive...");
  const zipBlob = await zipWriter.close();
  triggerDownload(zipBlob, zipFilename);

  onProgress?.(100, "complete", `Downloaded ${zipFilename}`);
}
