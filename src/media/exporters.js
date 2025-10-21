import { ZipWriter, BlobWriter, BlobReader, TextReader } from "@zip.js/zip.js";
import {
  MIN_IMAGE_DISPLAY_DURATION_MS,
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
  IMAGE_HOLD_MAX_MS,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
  MAX_VISIBLE_IMAGES,
} from "./constants.js";
import { computeImageSchedule } from "./imageSchedule.js";
import { formatDelay } from "./delay.js";
import { useSettingsStore } from "../state/useSettingsStore.js";
import { toTimestamp, formatTimestampForFilename } from "../utils/dateUtils.js";

const FRAME_RATE = 30;
const TIMEBASE = 30;
const VIDEO_WIDTH = 3840;
const VIDEO_HEIGHT = 2160;
// NOTE: We rely on computeImageSchedule for timing; no TIME_STEP_MS scanning is needed here.

function msToFrames(ms, frameRate = FRAME_RATE) {
  return Math.max(0, Math.round((ms / 1000) * frameRate));
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fileIdForIndex(index) {
  return `file-${index}`;
}

function relativeName(name) {
  if (!name) return "";
  const segments = String(name).split(/[/\\]/);
  return segments[segments.length - 1] || name;
}

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

// Removed unused finalizeClip helper; segments are directly mapped to clips.

function simulateImageClips(mediaData, timelineStartMs, timelineEndMs) {
  const images = (mediaData.images || []).filter(
    (image) => image?.originalTimestamp instanceof Date
  );

  // Get current settings
  const settings = useSettingsStore.getState?.() || {};
  const displaySeconds = Number(settings.imageDisplaySeconds);
  const holdSeconds = Number(settings.imageHoldSeconds);
  const intervalSeconds = Number(settings.compositionIntervalSeconds);
  // Note: speed is not used for export - we always export at 1x for compatibility
  const snapToGrid = Boolean(settings.snapToGrid);
  const snapGridSeconds = Number(settings.snapGridSeconds);

  // For export, convert all durations to speed x1
  // User settings are already in "real time", so we want to use them directly for export
  const minVisibleMs = Number.isFinite(displaySeconds) && displaySeconds > 0
    ? displaySeconds * 1000
    : MIN_IMAGE_DISPLAY_DEFAULT_MS;
  
  // Explicitly handle holdSeconds = 0
  const holdMs = holdSeconds === 0
    ? 0
    : (Number.isFinite(holdSeconds) && holdSeconds >= 0
        ? Math.min(holdSeconds * 1000, IMAGE_HOLD_MAX_MS)
        : 0);
  
  const compositionIntervalMs = Number.isFinite(intervalSeconds)
    ? Math.max(intervalSeconds * 1000, MIN_COMPOSITION_CHANGE_INTERVAL_MS)
    : MAX_COMPOSITION_CHANGE_INTERVAL_MS;

  const snapGridMs = snapToGrid && Number.isFinite(snapGridSeconds) && snapGridSeconds > 0
    ? Math.round(snapGridSeconds * 1000)
    : null;

  // Use computeImageSchedule to get the proper timeline with all parameters
  const schedule = computeImageSchedule(images, {
    minVisibleMs,
    holdMs,
    maxSlots: MAX_VISIBLE_IMAGES,
    compositionIntervalMs,
    snapToGrid,
    snapGridMs,
  });

  if (!schedule?.segments?.length) {
    return {
      clips: [],
      durationMs: 0,
    };
  }

  const clips = [];
  const metadata = schedule.metadata || [];
  
  // Build clips from segments
  schedule.segments.forEach((segment) => {
    const { startMs, endMs, slots = [], layoutSize = 1 } = segment;
    
    slots.forEach((imageIndex, slotIndex) => {
      if (imageIndex == null || !Number.isInteger(imageIndex)) return;
      
      const image = images[imageIndex];
      if (!image) return;

      const meta = metadata[imageIndex];
      if (!meta?.visible) return;

      // Calculate frame positions relative to timeline start
      const startOffsetMs = Math.max(0, startMs - timelineStartMs);
      const durationMs = Math.max(0, endMs - startMs);
      const frameDuration = msToFrames(durationMs);
      
      if (frameDuration <= 0) return;

      const frameStart = msToFrames(startOffsetMs);
      const trackNum = slotIndex + 1;

      clips.push({
        id: `clip-${imageIndex}-${frameStart}`,
        fileId: fileIdForIndex(imageIndex),
        name: image.name || `Image ${imageIndex + 1}`,
        filename: relativeName(image.name) || `image_${imageIndex + 1}.jpg`,
        filepath: relativeName(image.name) || `image_${imageIndex + 1}.jpg`,
        trackNum,
        totalTracks: Math.max(1, layoutSize),
        start: frameStart,
        end: frameStart + frameDuration,
        duration: frameDuration,
      });
    });
  });

  // Merge consecutive clips on same track with same image
  const mergedClips = [];
  const trackClips = new Map();

  clips.forEach((clip) => {
    const key = `${clip.trackNum}`;
    if (!trackClips.has(key)) {
      trackClips.set(key, []);
    }
    trackClips.get(key).push(clip);
  });

  trackClips.forEach((clipList) => {
    clipList.sort((a, b) => a.start - b.start);
    
    clipList.forEach((clip) => {
      const lastOnTrack = mergedClips.find(
        (c) => c.trackNum === clip.trackNum && c.fileId === clip.fileId && c.end === clip.start
      );
      
      if (lastOnTrack) {
        // Extend the previous clip
        lastOnTrack.end = clip.end;
        lastOnTrack.duration = lastOnTrack.end - lastOnTrack.start;
      } else {
        mergedClips.push(clip);
      }
    });
  });

  // Sort by track then start time
  mergedClips.sort((a, b) => {
    if (a.trackNum !== b.trackNum) return a.trackNum - b.trackNum;
    return a.start - b.start;
  });

  const maxEndMs = schedule.maxEndMs || timelineEndMs;
  const durationMs = Math.max(0, maxEndMs - timelineStartMs);

  return {
    clips: mergedClips,
    durationMs,
  };
}

function buildLayoutMarker(trackNum, totalTracks) {
  if (totalTracks <= 1) return "";
  let layoutDesc = "";
  let scaleValue = 100;
  let positionDesc = "center";

  if (totalTracks === 2) {
    scaleValue = 50;
    positionDesc = trackNum === 1 ? "left" : "right";
    layoutDesc = `Layout: 2-column split, ${positionDesc}, scale ${scaleValue}%`;
  } else if (totalTracks === 3) {
    scaleValue = 33.33;
    positionDesc = trackNum === 1 ? "left" : trackNum === 2 ? "center" : "right";
    layoutDesc = `Layout: 3-column split, ${positionDesc}, scale ${scaleValue}%`;
  } else {
    scaleValue = Math.max(10, Math.round((100 / totalTracks) * 100) / 100);
    positionDesc = `column ${trackNum}`;
    layoutDesc = `Layout: ${totalTracks}-column split, ${positionDesc}, scale ${scaleValue}%`;
  }

  return `
            <marker>
              <name>${escapeXml(layoutDesc)}</name>
              <comment>Track ${trackNum} of ${totalTracks} | Scale: ${scaleValue}% | Position: ${positionDesc}</comment>
              <in>0</in>
              <out>-1</out>
            </marker>`;
}

export async function exportFinalCutProXml({ mediaData }) {
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

  const timelineStartMs = toTimestamp(sortedImages[0].originalTimestamp);
  const lastImageTime = toTimestamp(sortedImages[sortedImages.length - 1].originalTimestamp);
  const timelineEndMs = lastImageTime + MIN_IMAGE_DISPLAY_DURATION_MS;

  const simulation = simulateImageClips(mediaData, timelineStartMs, timelineEndMs);
  const clips = simulation.clips;
  const timelineDurationFrames = msToFrames(simulation.durationMs);

  const trackGroups = new Map();
  clips.forEach((clip) => {
    if (!trackGroups.has(clip.trackNum)) {
      trackGroups.set(clip.trackNum, []);
    }
    trackGroups.get(clip.trackNum).push(clip);
  });

  const audioTracks = mediaData.audioTracks || [];

    // Document the export settings in the XML
    const settings = useSettingsStore.getState?.() || {};
    const exportComment = `
    Diapaudio Export Settings:
    - Image Display: ${settings.imageHoldSeconds || 60}s (user setting)
    - Composition Change Interval: ${settings.compositionIntervalSeconds || 4}s
    - Snap to Grid: ${settings.snapToGrid ? 'enabled' : 'disabled'}${settings.snapToGrid ? ` (${settings.snapGridSeconds || 1}s grid)` : ''}
    - Original Playback Speed: ${settings.speed || 1}x
    - Export Speed: 1x (normalized for editing)
  
    This timeline has been exported at 1x speed for compatibility with video editors.
    All timing and compositions reflect the original settings scaled to real-time playback.
  `;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
  <!--${escapeXml(exportComment)}-->
<xmeml version="5">
  <sequence id="sequence-1">
    <name>Diapaudio Slideshow</name>
    <duration>${timelineDurationFrames}</duration>
    <rate>
      <timebase>${TIMEBASE}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <timecode>
      <rate>
        <timebase>${TIMEBASE}</timebase>
        <ntsc>FALSE</ntsc>
      </rate>
      <string>00:00:00:00</string>
      <frame>0</frame>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate>
              <timebase>${TIMEBASE}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <width>${VIDEO_WIDTH}</width>
            <height>${VIDEO_HEIGHT}</height>
            <pixelaspectratio>Square</pixelaspectratio>
          </samplecharacteristics>
        </format>`;

  Array.from(trackGroups.keys())
    .sort((a, b) => a - b)
    .forEach((trackNum) => {
      const trackClips = trackGroups.get(trackNum) || [];
      xml += `
        <track>`;
      trackClips.forEach((clip) => {
        const fileId = clip.fileId || `file-${trackNum}-${clip.start}`;
        xml += `
          <clipitem id="${clip.id}">
            <name>${escapeXml(clip.name)}</name>
            <duration>${clip.duration}</duration>
            <rate>
              <timebase>${TIMEBASE}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${clip.start}</start>
            <end>${clip.end}</end>
            <in>0</in>
            <out>${clip.duration}</out>
            <file id="${fileId}">
              <name>${escapeXml(clip.filename)}</name>
              <pathurl>${escapeXml(clip.filepath)}</pathurl>
              <rate>
                <timebase>${TIMEBASE}</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <duration>${clip.duration}</duration>
              <media>
                <video>
                  <duration>${clip.duration}</duration>
                  <samplecharacteristics>
                    <width>${VIDEO_WIDTH}</width>
                    <height>${VIDEO_HEIGHT}</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>${buildLayoutMarker(clip.trackNum, clip.totalTracks)}
          </clipitem>`;
      });
      xml += `
        </track>`;
    });

  xml += `
      </video>
      <audio>
        <numOutputChannels>2</numOutputChannels>
        <format>
          <samplecharacteristics>
            <depth>16</depth>
            <samplerate>48000</samplerate>
          </samplecharacteristics>
        </format>`;

  audioTracks.forEach((track, index) => {
    const startMs =
      track?.adjustedStartTime instanceof Date
        ? toTimestamp(track.adjustedStartTime)
        : timelineStartMs;
    const audioStartFrames = Math.max(0, msToFrames(startMs - timelineStartMs));
    const durationMs = Number(track?.duration) ? track.duration * 1000 : 0;
    const audioDurationFrames = msToFrames(durationMs);
    if (audioDurationFrames <= 0) {
      return;
    }
    const audioEndFrames = audioStartFrames + audioDurationFrames;
    if (audioStartFrames >= timelineDurationFrames || audioEndFrames <= 0) {
      return;
    }
    const relative = relativeName(track.originalName || `track_${index + 1}.wav`);
    xml += `
        <track>
          <clipitem id="audio-${index}">
            <name>${escapeXml(relative)}</name>
            <duration>${audioDurationFrames}</duration>
            <rate>
              <timebase>${TIMEBASE}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${audioStartFrames}</start>
            <end>${audioEndFrames}</end>
            <in>0</in>
            <out>${audioDurationFrames}</out>
            <file id="audio-file-${index}">
              <name>${escapeXml(relative)}</name>
              <pathurl>${escapeXml(relative)}</pathurl>
              <rate>
                <timebase>${TIMEBASE}</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <duration>${audioDurationFrames}</duration>
              <media>
                <audio>
                  <samplecharacteristics>
                    <depth>16</depth>
                    <samplerate>48000</samplerate>
                  </samplecharacteristics>
                </audio>
              </media>
            </file>
            <sourcetrack>
              <mediatype>audio</mediatype>
            </sourcetrack>
          </clipitem>
        </track>`;
  });

  xml += `
      </audio>
    </media>
  </sequence>
</xmeml>`;

  const blob = new Blob([xml], { type: "application/xml" });
  triggerDownload(blob, "diapaudio-timeline.xml");
}

// formatTimestampForFilename now imported from dateUtils.js

export async function exportZipArchive({ mediaData, delaySeconds = 0, onProgress = null }) {
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
  const totalItems = 1 + audioTracks.length + sortedImages.length; // delay file + audio + images
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

  await zipWriter.add("_delay.txt", new TextReader(formatDelay(delaySeconds || 0)));
  processedItems++;
  reportProgress("Added delay file");

  for (let i = 0; i < audioTracks.length; i++) {
    const track = audioTracks[i];
    try {
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${track.originalName || "(audio)"}`);
      }
      const blob = await response.blob();
      const filename = relativeName(track.originalName || "audio.wav");
      await zipWriter.add(filename, new BlobReader(blob));
      processedItems++;
      reportProgress(`Added audio ${i + 1}/${audioTracks.length}: ${filename}`);
    } catch (error) {
      console.warn("Skipped audio track during export:", error);
      processedItems++;
      reportProgress(`Skipped audio ${i + 1}/${audioTracks.length}`);
    }
  }

  for (let i = 0; i < sortedImages.length; i++) {
    const image = sortedImages[i];
    try {
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${image.name || "(image)"}`);
      }
      const blob = await response.blob();
      const filename = relativeName(image.name || "image.jpg");
      await zipWriter.add(filename, new BlobReader(blob));
      processedItems++;
      reportProgress(`Added image ${i + 1}/${sortedImages.length}`);
    } catch (error) {
      console.warn("Skipped image during export:", error);
      processedItems++;
      reportProgress(`Skipped image ${i + 1}/${sortedImages.length}`);
    }
  }

  reportProgress("Finalizing archive...");
  const zipBlob = await zipWriter.close();
  triggerDownload(zipBlob, zipFilename);
  
  if (onProgress) {
    onProgress(100, "complete", `Downloaded ${zipFilename}`);
  }
}
