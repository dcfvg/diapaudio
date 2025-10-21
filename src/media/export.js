import { BlobWriter, ZipWriter, TextReader, BlobReader } from "@zip.js/zip.js";
import { formatDelay } from "./delay.js";
import { formatTimestampForFilename } from "../utils/dateUtils.js";

// formatTimestampForFilename now imported from dateUtils

/**
 * Export media data as a ZIP archive
 * @param {object} mediaData - Media data with images and audioTracks
 * @param {number} delaySeconds - Delay value to include in _delay.txt
 * @param {function} onProgress - Progress callback (percent, statusKey, details)
 * @returns {Promise<void>}
 */
export async function exportZipArchive(mediaData, delaySeconds, onProgress) {
  if (!mediaData || !mediaData.images || mediaData.images.length === 0) {
    throw new Error("No media loaded to export");
  }

  try {
    onProgress?.(0, "processingFiles", "Preparing ZIP archive...");

    // Calculate timeline start and end timestamps for filename
    const firstImage = mediaData.images[0];
    const lastImage = mediaData.images[mediaData.images.length - 1];
    const startTimestamp = firstImage.originalTimestamp;
    const endTimestamp = lastImage.originalTimestamp;

    const startStr = formatTimestampForFilename(startTimestamp);
    const endStr = formatTimestampForFilename(endTimestamp);
    const zipFilename = `diapaudio_${startStr}-${endStr}.zip`;

    // Create _delay.txt content
    const delayContent = formatDelay(delaySeconds);

    // Initialize zip.js writer
    const zipWriter = new ZipWriter(new BlobWriter("application/zip"), {
      bufferedWrite: true,
      level: 0, // No compression for faster export
    });

    // Add _delay.txt file
    onProgress?.(5, "processingFiles", "Adding delay file...");
    await zipWriter.add("_delay.txt", new TextReader(delayContent));

    // Add all media files (images and audio)
    const totalFiles = mediaData.images.length + (mediaData.audioTracks?.length || 0);
    let processedFiles = 0;

    // Add audio files
    if (mediaData.audioTracks && mediaData.audioTracks.length > 0) {
      for (const track of mediaData.audioTracks) {
        try {
          const progress = 10 + (processedFiles / totalFiles) * 80;
          const filename = track.originalName.split("/").pop() || track.originalName;
          onProgress?.(progress, "processingFiles", `Adding ${filename}...`);

          // Fetch the blob from the URL
          const response = await fetch(track.url);
          const blob = await response.blob();

          // Add to ZIP with original filename
          await zipWriter.add(filename, new BlobReader(blob));

          processedFiles++;
        } catch (err) {
          console.error(`Failed to add audio file ${track.originalName}:`, err);
        }
      }
    }

    // Add image files
    for (const image of mediaData.images) {
      try {
        const progress = 10 + (processedFiles / totalFiles) * 80;
        onProgress?.(progress, "processingFiles", `Adding ${image.name}...`);

        // Fetch the blob from the URL
        const response = await fetch(image.url);
        const blob = await response.blob();

        // Add to ZIP with original filename
        await zipWriter.add(image.name, new BlobReader(blob));

        processedFiles++;
      } catch (err) {
        console.error(`Failed to add image file ${image.name}:`, err);
      }
    }

    // Finalize ZIP
    onProgress?.(95, "processingFiles", "Finalizing ZIP archive...");
    const zipBlob = await zipWriter.close();

    // Download ZIP file
    onProgress?.(100, "processingFiles", "Complete!");
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipFilename;
    a.click();
    URL.revokeObjectURL(url);

    return zipFilename;
  } catch (error) {
    console.error("Error creating ZIP archive:", error);
    throw error;
  }
}
