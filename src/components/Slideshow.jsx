import { useMemo, useRef, useEffect, useCallback, useState, memo } from "react";
import { useMediaStore } from "../state/useMediaStore.js";
import { useSettingsStore } from "../state/useSettingsStore.js";
import { usePlaybackStore } from "../state/usePlaybackStore.js";
import { computeImageSchedule } from "../media/imageSchedule.js";
import { MAX_VISIBLE_IMAGES } from "../media/constants.js";
import { hasAudioCoverage } from "../media/images.js";
import {
  computeMinVisibleMs,
  computeScaledHoldMs,
  computeCompositionIntervalMs,
  computeSnapGridMs,
} from "../state/helpers/settingsHelpers.js";
import CompositionView from "./CompositionView.jsx";
import SlideshowPlaceholder, {
  resolvePlaceholderSources,
  buildPlaceholderSignature,
} from "./SlideshowPlaceholder.jsx";
import { EMPTY_ARRAY, DEFAULT_SLOTS } from "../constants/common.js";
import "./Slideshow.css";

function Slideshow() {
  const mediaData = useMediaStore((state) => state.mediaData);
  const loadFromDataTransfer = useMediaStore((state) => state.loadFromDataTransfer);
  const imageDisplaySeconds = useSettingsStore((state) => state.imageDisplaySeconds);
  const imageHoldSeconds = useSettingsStore((state) => state.imageHoldSeconds);
  const compositionIntervalSeconds = useSettingsStore(
    (state) => state.compositionIntervalSeconds
  );
  const speed = useSettingsStore((state) => state.speed);
  const snapToGrid = useSettingsStore((state) => state.snapToGrid);
  const snapGridSeconds = useSettingsStore((state) => state.snapGridSeconds);

  const absoluteTime = usePlaybackStore((state) => state.absoluteTime);
  const skipSilence = usePlaybackStore((state) => state.skipSilence);
  const togglePlaybackRaw = usePlaybackStore((state) => state.togglePlayback);
  const setDisplayedImages = usePlaybackStore((state) => state.setDisplayedImages);

  // Wrap togglePlayback to pass mediaData
  const togglePlayback = useCallback(() => {
    togglePlaybackRaw(mediaData);
  }, [togglePlaybackRaw, mediaData]);

  const hasAudio = Boolean(mediaData?.audioTracks?.length);
  const displayedSignatureRef = useRef("");

  const timelineStart = mediaData?.timeline?.startMs ?? null;
  const resolvedAbsolute = useMemo(() => {
    if (Number.isFinite(absoluteTime)) {
      return absoluteTime;
    }
    if (Number.isFinite(timelineStart)) {
      return timelineStart;
    }
    return null;
  }, [absoluteTime, timelineStart]);

  const displaySeconds = Number(imageDisplaySeconds);
  const speedValue = Number(speed);
  
  const minVisibleMs = useMemo(() => 
    computeMinVisibleMs(displaySeconds, speedValue),
    [displaySeconds, speedValue]
  );

  const holdSeconds = Number(imageHoldSeconds);
  const imageHoldMs = useMemo(() => 
    computeScaledHoldMs(holdSeconds, speedValue),
    [holdSeconds, speedValue]
  );

  const compositionIntervalMs = useMemo(() =>
    computeCompositionIntervalMs(compositionIntervalSeconds),
    [compositionIntervalSeconds]
  );
  
  const snapGridMs = useMemo(() =>
    computeSnapGridMs(snapGridSeconds),
    [snapGridSeconds]
  );

  const schedule = useMemo(
    () =>
      computeImageSchedule(mediaData?.images || [], {
        minVisibleMs,
        holdMs: imageHoldMs,
        maxSlots: MAX_VISIBLE_IMAGES,
        compositionIntervalMs,
        snapToGrid: Boolean(snapToGrid),
        snapGridMs,
      }),
    [mediaData?.images, minVisibleMs, imageHoldMs, compositionIntervalMs, snapToGrid, snapGridMs]
  );

  const scheduleMetadata = useMemo(() => schedule?.metadata || EMPTY_ARRAY, [schedule]);

  const inAudioCoverage = useMemo(() => {
    if (!hasAudio || !Number.isFinite(resolvedAbsolute)) {
      return true;
    }
    return hasAudioCoverage(mediaData, resolvedAbsolute);
  }, [hasAudio, mediaData, resolvedAbsolute]);

  const compositionState = useMemo(() => {
    if (!mediaData?.images?.length || !scheduleMetadata.length) {
      return null;
    }
    if (!Number.isFinite(resolvedAbsolute)) {
      return null;
    }

    if (skipSilence && hasAudio && !inAudioCoverage) {
      return null;
    }

    const activeMeta = scheduleMetadata
      .map((meta, index) => ({ ...meta, index }))
      .filter(
        (meta) =>
          meta.visible &&
          Number.isFinite(meta.startMs) &&
          Number.isFinite(meta.endMs) &&
          resolvedAbsolute >= meta.startMs &&
          resolvedAbsolute < meta.endMs
      );

    if (!activeMeta.length) {
      return null;
    }

    const layoutSize = Math.max(
      1,
      Math.min(
        MAX_VISIBLE_IMAGES,
        activeMeta.reduce(
          (max, meta) => Math.max(max, meta.maxConcurrency || 1),
          1
        )
      )
    );

    const mappedSlots = Array.from({ length: layoutSize }, (_, slotIndex) => {
      const match = activeMeta.find((meta) => meta.slotIndex === slotIndex);
      if (!match) {
        return null;
      }
      const image = mediaData.images?.[match.index] || null;
      return image ? { image } : null;
    });

    const activeImages = mappedSlots.filter(Boolean).map((slot) => slot.image);
    const primary = activeImages[0] || null;

    if (!mappedSlots.length) {
      mappedSlots.push(null);
    }

    return {
      layoutSize,
      slots: mappedSlots,
      displayImages: activeImages,
      primaryImage: primary,
    };
  }, [mediaData, scheduleMetadata, resolvedAbsolute, skipSilence, hasAudio, inAudioCoverage]);

  const layoutSize = compositionState?.layoutSize ?? 1;
  const slots = compositionState?.slots ?? DEFAULT_SLOTS;
  const displayImages = compositionState?.displayImages ?? EMPTY_ARRAY;

  const displaySignature = useMemo(
    () => displayImages.map((img) => img?.url || img?.name || "").join("|"),
    [displayImages]
  );

  useEffect(() => {
    if (displaySignature !== displayedSignatureRef.current) {
      displayedSignatureRef.current = displaySignature;
      setDisplayedImages(displayImages);
    }
  }, [displayImages, displaySignature, setDisplayedImages]);

  const surroundingImages = useMemo(() => {
    if (!mediaData?.images?.length || !scheduleMetadata.length) {
      return { previous: null, next: null };
    }

    const entries = scheduleMetadata
      .map((meta, index) =>
        meta.visible
          ? {
              image: mediaData.images[index],
              startMs: meta.startMs,
            }
          : null
      )
      .filter(Boolean)
      .sort((a, b) => a.startMs - b.startMs);

    if (!entries.length) {
      return { previous: null, next: null };
    }

    if (!Number.isFinite(resolvedAbsolute)) {
      const firstImage = entries[0]?.image || null;
      return { previous: firstImage, next: firstImage };
    }

    let previous = null;
    let next = null;
    for (const entry of entries) {
      if (!Number.isFinite(entry.startMs)) {
        continue;
      }
      if (entry.startMs <= resolvedAbsolute) {
        previous = entry.image;
      }
      if (entry.startMs > resolvedAbsolute) {
        next = entry.image;
        break;
      }
    }

    if (!previous) {
      previous = entries[0]?.image || null;
    }

    if (!next) {
      const future = entries.find((entry) => entry.startMs > resolvedAbsolute);
      next = future ? future.image : null;
    }

    return { previous, next };
  }, [mediaData, scheduleMetadata, resolvedAbsolute]);

  const placeholderData = useMemo(() => {
    const { previous, next } = surroundingImages;
    const { previousSrc, nextSrc } = resolvePlaceholderSources({ previousImage: previous, nextImage: next });
    const signature = buildPlaceholderSignature(previousSrc, nextSrc, resolvedAbsolute);
    return {
      element: <SlideshowPlaceholder previousImage={previous} nextImage={next} />,
      signature,
    };
  }, [surroundingImages, resolvedAbsolute]);

  const [isDragOver, setIsDragOver] = useState(false);
  const splitClass = `split-${Math.min(layoutSize, MAX_VISIBLE_IMAGES)}`;
  const containerClassName = ["slideshow__container", splitClass];
  if (isDragOver) {
    containerClassName.push("slideshow__container--drag");
  }

  const handleDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      if (!isDragOver) {
        setIsDragOver(true);
      }
    },
    [isDragOver]
  );

  const handleDragLeave = useCallback((event) => {
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      if (event.dataTransfer) {
        await loadFromDataTransfer(event.dataTransfer, { mode: "append" });
      }
    },
    [loadFromDataTransfer]
  );

  const handleClick = useCallback(() => {
    if (!mediaData || !hasAudio) {
      return;
    }
    togglePlayback();
  }, [hasAudio, mediaData, togglePlayback]);

  return (
    <div className="slideshow">
      <CompositionView
        className={containerClassName.join(" ")}
        slots={slots}
        layoutSize={layoutSize}
        emptyFallback={placeholderData.element}
        emptyFallbackKey={placeholderData.signature}
        placeholderClassName="slideshow__column-placeholder"
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
        role="presentation"
      />
    </div>
  );
}

export default memo(Slideshow);
