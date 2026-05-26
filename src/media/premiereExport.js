import { BlobReader, BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { MAX_VISIBLE_IMAGES } from "./constants.js";
import { createScheduleIndex, resolveExportScheduleOptions } from "./scheduleIndex.js";
import { useSettingsStore } from "../state/useSettingsStore.js";
import { toTimestamp, formatTimestampForFilename } from "../utils/dateUtils.js";
import * as logger from "../utils/logger.js";

export const PREMIERE_FRAME_RATE = 30;
export const PREMIERE_TIMEBASE = 30;
export const PREMIERE_VIDEO_WIDTH = 3840;
export const PREMIERE_VIDEO_HEIGHT = 2160;
export const PREMIERE_LAYOUT_PADDING_PX = Math.round(PREMIERE_VIDEO_WIDTH * 0.04);
export const PREMIERE_LAYOUT_GAP_PX = 48;

function msToFrames(ms, frameRate = PREMIERE_FRAME_RATE) {
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

function relativeName(name) {
  if (!name) {
    return "";
  }
  const segments = String(name).split(/[/\\]/);
  return segments[segments.length - 1] || name;
}

function extensionFromName(name, fallback = "") {
  const match = /\.([^.]+)$/.exec(name || "");
  return match ? `.${match[1]}` : fallback;
}

function safeFilename(name, fallback) {
  const base = relativeName(name || fallback)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return base || fallback;
}

function uniquePackagePath(folder, preferredName, fallbackName, usedPaths) {
  const safe = safeFilename(preferredName, fallbackName);
  const ext = extensionFromName(safe, extensionFromName(fallbackName));
  const stem = ext ? safe.slice(0, -ext.length) : safe;
  let candidate = `${folder}/${safe}`;
  let suffix = 2;
  while (usedPaths.has(candidate.toLowerCase())) {
    candidate = `${folder}/${stem}-${suffix}${ext}`;
    suffix += 1;
  }
  usedPaths.add(candidate.toLowerCase());
  return candidate;
}

function normalizeBasePathUrl(mediaBasePathUrl) {
  if (!mediaBasePathUrl) {
    return null;
  }
  const base = String(mediaBasePathUrl).replace(/\/+$/, "");
  return /^file:\/\/(localhost|\/)/.test(base) ? encodeURI(base) : null;
}

function pathUrlForAsset(asset, mediaBasePathUrl) {
  const base = normalizeBasePathUrl(mediaBasePathUrl);
  if (!base || !asset?.packagePath) {
    return "";
  }
  return `${base}/${asset.packagePath.split("/").map(encodeURIComponent).join("/")}`;
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

function getImageTimeMs(image) {
  if (image?.adjustedTimestamp instanceof Date) {
    return toTimestamp(image.adjustedTimestamp);
  }
  if (image?.originalTimestamp instanceof Date) {
    return toTimestamp(image.originalTimestamp);
  }
  if (image?.timestamp instanceof Date) {
    return toTimestamp(image.timestamp);
  }
  return Number.isFinite(image?.timeMs) ? image.timeMs : null;
}

function getAudioRangeMs(track) {
  const startMs =
    track?.adjustedStartTime instanceof Date ? toTimestamp(track.adjustedStartTime) : null;
  const endMs =
    track?.adjustedEndTime instanceof Date
      ? toTimestamp(track.adjustedEndTime)
      : Number.isFinite(startMs) && Number.isFinite(track?.duration)
        ? startMs + track.duration * 1000
        : null;
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
    ? { startMs, endMs }
    : null;
}

function resolveTimelineBounds(scheduleIndex, audioTracks) {
  const starts = [];
  const ends = [];

  scheduleIndex.entries.forEach((entry) => {
    starts.push(entry.startMs);
    ends.push(entry.endMs);
  });

  audioTracks.forEach((track) => {
    const range = getAudioRangeMs(track);
    if (range) {
      starts.push(range.startMs);
      ends.push(range.endMs);
    }
  });

  const timelineStartMs = starts.filter(Number.isFinite).sort((a, b) => a - b)[0];
  const timelineEndMs = ends.filter(Number.isFinite).sort((a, b) => b - a)[0];

  if (!Number.isFinite(timelineStartMs) || !Number.isFinite(timelineEndMs)) {
    throw new Error("No valid timeline range to export.");
  }

  return {
    timelineStartMs,
    timelineEndMs: Math.max(timelineEndMs, timelineStartMs + 1000),
  };
}

function buildFileElement(asset, mediaType, mediaBasePathUrl) {
  const pathUrl = pathUrlForAsset(asset, mediaBasePathUrl);
  const pathUrlXml = pathUrl ? `\n              <pathurl>${escapeXml(pathUrl)}</pathurl>` : "";
  if (mediaType === "audio") {
    return `<file id="${asset.id}">
              <name>${escapeXml(asset.name)}</name>${pathUrlXml}
              <rate>
                <timebase>${PREMIERE_TIMEBASE}</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <duration>${asset.durationFrames}</duration>
              <media>
                <audio>
                  <samplecharacteristics>
                    <depth>16</depth>
                    <samplerate>48000</samplerate>
                  </samplecharacteristics>
                  <channelcount>2</channelcount>
                </audio>
              </media>
            </file>`;
  }

  return `<file id="${asset.id}">
              <name>${escapeXml(asset.name)}</name>${pathUrlXml}
              <rate>
                <timebase>${PREMIERE_TIMEBASE}</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <duration>${asset.durationFrames}</duration>
              <media>
                <video>
                  <duration>${asset.durationFrames}</duration>
                  <samplecharacteristics>
                    <rate>
                      <timebase>${PREMIERE_TIMEBASE}</timebase>
                      <ntsc>FALSE</ntsc>
                    </rate>
                    <width>${asset.width}</width>
                    <height>${asset.height}</height>
                    <anamorphic>FALSE</anamorphic>
                    <pixelaspectratio>Square</pixelaspectratio>
                    <fielddominance>none</fielddominance>
                  </samplecharacteristics>
                </video>
              </media>
            </file>`;
}

export function resolveSlotFrame({ layoutSize, slotIndex }) {
  const columns = Math.max(1, Math.min(layoutSize || 1, MAX_VISIBLE_IMAGES));
  const column = Math.min(Math.max(slotIndex || 0, 0), columns - 1);
  const safeWidth =
    PREMIERE_VIDEO_WIDTH - PREMIERE_LAYOUT_PADDING_PX * 2 - PREMIERE_LAYOUT_GAP_PX * (columns - 1);
  const slotWidth = safeWidth / columns;
  const slotHeight = PREMIERE_VIDEO_HEIGHT - PREMIERE_LAYOUT_PADDING_PX * 2;
  const x = PREMIERE_LAYOUT_PADDING_PX + column * (slotWidth + PREMIERE_LAYOUT_GAP_PX);
  const y = PREMIERE_LAYOUT_PADDING_PX;

  return {
    x,
    y,
    width: slotWidth,
    height: slotHeight,
    centerX: x + slotWidth / 2,
    centerY: y + slotHeight / 2,
    columns,
    rows: 1,
  };
}

export function calculateSlotMotion({ imageWidth, imageHeight, layoutSize, slotIndex }) {
  const frame = resolveSlotFrame({ layoutSize, slotIndex });
  const width = Number.isFinite(imageWidth) && imageWidth > 0 ? imageWidth : PREMIERE_VIDEO_WIDTH;
  const height =
    Number.isFinite(imageHeight) && imageHeight > 0 ? imageHeight : PREMIERE_VIDEO_HEIGHT;
  const scale = Math.min(frame.width / width, frame.height / height) * 100;
  const centerH = (frame.centerX - PREMIERE_VIDEO_WIDTH / 2) / PREMIERE_VIDEO_WIDTH;
  const centerV = (PREMIERE_VIDEO_HEIGHT / 2 - frame.centerY) / PREMIERE_VIDEO_HEIGHT;

  return {
    scale: Math.max(0.01, Number(scale.toFixed(4))),
    centerH: Number(centerH.toFixed(6)),
    centerV: Number(centerV.toFixed(6)),
    frame,
  };
}

function buildBasicMotionFilter(motion) {
  return `<filter>
              <enabled>TRUE</enabled>
              <effect>
                <name>Basic Motion</name>
                <effectid>basic</effectid>
                <effectcategory>motion</effectcategory>
                <effecttype>motion</effecttype>
                <mediatype>video</mediatype>
                <parameter>
                  <parameterid>scale</parameterid>
                  <name>Scale</name>
                  <value>${motion.scale}</value>
                </parameter>
                <parameter>
                  <parameterid>center</parameterid>
                  <name>Center</name>
                  <value>
                    <horiz>${motion.centerH}</horiz>
                    <vert>${motion.centerV}</vert>
                  </value>
                </parameter>
              </effect>
            </filter>`;
}

function createImageClips({ scheduleIndex, imageAssets, timelineStartMs }) {
  const clips = [];
  scheduleIndex.segments.forEach((segment, segmentIndex) => {
    const durationFrames = msToFrames(segment.endMs - segment.startMs);
    if (durationFrames <= 0) {
      return;
    }
    const start = msToFrames(segment.startMs - timelineStartMs);
    const end = start + durationFrames;
    const layoutSize = Math.max(1, Math.min(segment.layoutSize || 1, MAX_VISIBLE_IMAGES));
    const slots = Array.isArray(segment.slots) ? segment.slots : [];

    slots.forEach((imageIndex, slotIndex) => {
      if (!Number.isInteger(imageIndex)) {
        return;
      }
      const asset = imageAssets[imageIndex];
      if (!asset) {
        return;
      }
      clips.push({
        id: `image-${imageIndex}-${segmentIndex}-${slotIndex}`,
        asset,
        start,
        end,
        inFrame: 0,
        outFrame: durationFrames,
        durationFrames,
        trackIndex: slotIndex,
        layoutSize,
        motion: calculateSlotMotion({
          imageWidth: asset.width,
          imageHeight: asset.height,
          layoutSize,
          slotIndex,
        }),
      });
    });
  });
  return clips;
}

function createAudioClips({ audioAssets, audioTracks, timelineStartMs }) {
  return audioTracks
    .map((track, index) => {
      const range = getAudioRangeMs(track);
      const asset = audioAssets[index];
      if (!range || !asset) {
        return null;
      }
      const start = msToFrames(range.startMs - timelineStartMs);
      const durationFrames = msToFrames(range.endMs - range.startMs);
      return {
        id: `audio-${index}`,
        asset,
        start,
        end: start + durationFrames,
        inFrame: 0,
        outFrame: durationFrames,
        durationFrames,
      };
    })
    .filter(Boolean);
}

export function buildPremiereXml({
  sequenceName = "Diapaudio Premiere",
  scheduleIndex,
  imageAssets,
  audioTracks = [],
  audioAssets = [],
  mediaBasePathUrl = null,
}) {
  const { timelineStartMs, timelineEndMs } = resolveTimelineBounds(scheduleIndex, audioTracks);
  const durationFrames = Math.max(1, msToFrames(timelineEndMs - timelineStartMs));
  const imageClips = createImageClips({ scheduleIndex, imageAssets, timelineStartMs });
  const audioClips = createAudioClips({ audioAssets, audioTracks, timelineStartMs });

  const imageTracks = new Map();
  imageClips.forEach((clip) => {
    if (!imageTracks.has(clip.trackIndex)) {
      imageTracks.set(clip.trackIndex, []);
    }
    imageTracks.get(clip.trackIndex).push(clip);
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence id="sequence-1">
    <name>${escapeXml(sequenceName)}</name>
    <duration>${durationFrames}</duration>
    <rate>
      <timebase>${PREMIERE_TIMEBASE}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <timecode>
      <rate>
        <timebase>${PREMIERE_TIMEBASE}</timebase>
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
              <timebase>${PREMIERE_TIMEBASE}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <width>${PREMIERE_VIDEO_WIDTH}</width>
            <height>${PREMIERE_VIDEO_HEIGHT}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>Square</pixelaspectratio>
            <fielddominance>none</fielddominance>
          </samplecharacteristics>
        </format>`;

  Array.from(imageTracks.keys())
    .sort((a, b) => a - b)
    .forEach((trackIndex) => {
      xml += `
        <track>`;
      imageTracks.get(trackIndex).forEach((clip) => {
        xml += `
          <clipitem id="${clip.id}">
            <name>${escapeXml(clip.asset.name)}</name>
            <enabled>TRUE</enabled>
            <duration>${clip.durationFrames}</duration>
            <rate>
              <timebase>${PREMIERE_TIMEBASE}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${clip.start}</start>
            <end>${clip.end}</end>
            <in>${clip.inFrame}</in>
            <out>${clip.outFrame}</out>
            ${buildFileElement(clip.asset, "video", mediaBasePathUrl)}
            <sourcetrack>
              <mediatype>video</mediatype>
              <trackindex>1</trackindex>
            </sourcetrack>
            <stillframe>TRUE</stillframe>
            <alphatype>none</alphatype>
            ${buildBasicMotionFilter(clip.motion)}
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

  audioClips.forEach((clip) => {
    xml += `
        <track>
          <clipitem id="${clip.id}">
            <name>${escapeXml(clip.asset.name)}</name>
            <enabled>TRUE</enabled>
            <duration>${clip.durationFrames}</duration>
            <rate>
              <timebase>${PREMIERE_TIMEBASE}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${clip.start}</start>
            <end>${clip.end}</end>
            <in>${clip.inFrame}</in>
            <out>${clip.outFrame}</out>
            ${buildFileElement(clip.asset, "audio", mediaBasePathUrl)}
            <sourcetrack>
              <mediatype>audio</mediatype>
              <trackindex>1</trackindex>
            </sourcetrack>
          </clipitem>
        </track>`;
  });

  xml += `
      </audio>
    </media>
  </sequence>
</xmeml>`;

  return {
    xml,
    durationFrames,
    imageClips,
    audioClips,
    timelineStartMs,
    timelineEndMs,
  };
}

async function fetchBlob(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to read ${label}`);
  }
  return response.blob();
}

async function readImageDimensions(blob) {
  if (typeof globalThis.createImageBitmap === "function") {
    const bitmap = await globalThis.createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return dimensions;
  }

  if (typeof globalThis.Image === "function" && typeof URL !== "undefined") {
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise((resolve, reject) => {
        const image = new globalThis.Image();
        image.onload = () => {
          resolve({
            width: image.naturalWidth || image.width || PREMIERE_VIDEO_WIDTH,
            height: image.naturalHeight || image.height || PREMIERE_VIDEO_HEIGHT,
          });
        };
        image.onerror = () => reject(new Error("Image dimensions could not be read."));
        image.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return { width: PREMIERE_VIDEO_WIDTH, height: PREMIERE_VIDEO_HEIGHT };
}

async function prepareImageAssets(images, usedPaths, onProgress) {
  const assets = [];
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const blob = await fetchBlob(image.url, image.name || `image ${index + 1}`);
    const dimensions = await readImageDimensions(blob).catch((error) => {
      logger.warn("Could not read image dimensions:", error);
      return { width: PREMIERE_VIDEO_WIDTH, height: PREMIERE_VIDEO_HEIGHT };
    });
    const packagePath = uniquePackagePath(
      "media/images",
      image.name,
      `image-${String(index + 1).padStart(4, "0")}.jpg`,
      usedPaths
    );
    assets.push({
      id: `file-image-${index}`,
      name: relativeName(packagePath),
      packagePath,
      blob,
      width: dimensions.width,
      height: dimensions.height,
      durationFrames: 24 * 60 * PREMIERE_FRAME_RATE,
    });
    onProgress?.(index + 1, images.length, assets[assets.length - 1].name);
  }
  return assets;
}

async function prepareAudioAssets(audioTracks, usedPaths, onProgress) {
  const assets = [];
  for (let index = 0; index < audioTracks.length; index += 1) {
    const track = audioTracks[index];
    const blob = await fetchBlob(track.url, track.originalName || `audio ${index + 1}`);
    const packagePath = uniquePackagePath(
      "media/audio",
      track.originalName || track.label,
      `audio-${String(index + 1).padStart(3, "0")}.wav`,
      usedPaths
    );
    assets.push({
      id: `file-audio-${index}`,
      name: relativeName(packagePath),
      packagePath,
      blob,
      durationFrames: Number.isFinite(track.duration) ? msToFrames(track.duration * 1000) : 0,
    });
    onProgress?.(index + 1, audioTracks.length, assets[assets.length - 1].name);
  }
  return assets;
}

async function buildPremiereExport({ mediaData, mediaBasePathUrl = null, onProgress = null }) {
  const settings = readExportSettings();
  const images = (mediaData?.images || []).filter((image) =>
    Number.isFinite(getImageTimeMs(image))
  );
  const audioTracks = mediaData?.audioTracks || [];
  if (!images.length && !audioTracks.length) {
    throw new Error("No media to export.");
  }

  const scheduleIndex = createScheduleIndex(images, resolveExportScheduleOptions(settings));
  if (!scheduleIndex.entries.length && !audioTracks.length) {
    throw new Error("Images do not contain timestamps.");
  }

  const usedPaths = new Set();
  onProgress?.(5, "processingFiles", "Preparing Premiere media...");
  const imageAssets = await prepareImageAssets(images, usedPaths, (count, total, name) => {
    onProgress?.(5 + Math.round((count / Math.max(1, total)) * 35), "processingFiles", name);
  });
  const audioAssets = await prepareAudioAssets(audioTracks, usedPaths, (count, total, name) => {
    onProgress?.(45 + Math.round((count / Math.max(1, total)) * 25), "processingFiles", name);
  });
  onProgress?.(75, "processingFiles", "Building Premiere XML...");

  const xmlResult = buildPremiereXml({
    sequenceName: "Diapaudio Premiere",
    scheduleIndex,
    imageAssets,
    audioTracks,
    audioAssets,
    mediaBasePathUrl,
  });

  const firstMs = xmlResult.timelineStartMs;
  const lastMs = xmlResult.timelineEndMs;
  const startLabel = formatTimestampForFilename(new Date(firstMs));
  const endLabel = formatTimestampForFilename(new Date(lastMs));

  return {
    ...xmlResult,
    imageAssets,
    audioAssets,
    filenameBase: `diapaudio_premiere_${startLabel}-${endLabel}`,
  };
}

function readExportSettings() {
  return globalThis.__DIAPAUDIO_EXPORT_SETTINGS__ || useSettingsStore.getState?.() || {};
}

export function setPremiereExportSettingsForTests(settings) {
  if (settings == null) {
    delete globalThis.__DIAPAUDIO_EXPORT_SETTINGS__;
    return;
  }
  globalThis.__DIAPAUDIO_EXPORT_SETTINGS__ = settings;
}

export async function exportPremiereXml({ mediaData, mediaBasePathUrl = null }) {
  const result = await buildPremiereExport({ mediaData, mediaBasePathUrl });
  const blob = new Blob([result.xml], { type: "application/xml" });
  triggerDownload(blob, `${result.filenameBase}.xml`);
}

function buildPremiereReadme(mediaBasePathUrl) {
  return `Diapaudio Premiere package

Import:
1. Unzip this archive.
2. In Premiere Pro, choose File > Import and select diapaudio-premiere.xml.
3. If Premiere asks to relink media, choose the media folder from this archive.

Notes:
- Video is exported as a 3840x2160 editable multi-track sequence with the same horizontal split layout as the preview.
- If a mediaBasePathUrl was provided, XML pathurl fields point to that folder.
- mediaBasePathUrl: ${mediaBasePathUrl || "(not provided)"}
`;
}

export async function exportPremiereXmlPackage({
  mediaData,
  mediaBasePathUrl = null,
  onProgress = null,
}) {
  const result = await buildPremiereExport({ mediaData, mediaBasePathUrl, onProgress });
  const zipWriter = new ZipWriter(new BlobWriter("application/zip"), {
    bufferedWrite: true,
    level: 0,
  });

  await zipWriter.add("diapaudio-premiere.xml", new TextReader(result.xml));
  await zipWriter.add(
    "README_IMPORT_PREMIERE.txt",
    new TextReader(buildPremiereReadme(mediaBasePathUrl))
  );

  const mediaAssets = [...result.imageAssets, ...result.audioAssets];
  for (let index = 0; index < mediaAssets.length; index += 1) {
    const asset = mediaAssets[index];
    onProgress?.(
      80 + Math.round(((index + 1) / Math.max(1, mediaAssets.length)) * 15),
      "processingFiles",
      asset.packagePath
    );
    await zipWriter.add(asset.packagePath, new BlobReader(asset.blob));
  }

  onProgress?.(98, "processingFiles", "Finalizing Premiere package...");
  const zipBlob = await zipWriter.close();
  triggerDownload(zipBlob, `${result.filenameBase}.zip`);
  onProgress?.(100, "complete", `${result.filenameBase}.zip`);
}
