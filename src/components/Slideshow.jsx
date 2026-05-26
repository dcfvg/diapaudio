import { useMemo, useRef, useEffect, useCallback, useState, memo } from "react";
import { useMediaStore } from "../state/useMediaStore.js";
import { useSettingsStore } from "../state/useSettingsStore.js";
import { usePlaybackStore } from "../state/usePlaybackStore.js";
import { MAX_VISIBLE_IMAGES } from "../media/constants.js";
import { hasAudioCoverage } from "../media/images.js";
import {
  computeMinVisibleMs,
  computeScaledHoldMs,
  computeCompositionIntervalMs,
  computeSnapGridMs,
} from "../state/helpers/settingsHelpers.js";
import {
  createScheduleIndex,
  findSurroundingImages,
  getCompositionAtTime,
} from "../media/scheduleIndex.js";
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
  const compositionIntervalSeconds = useSettingsStore((state) => state.compositionIntervalSeconds);
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

  const minVisibleMs = useMemo(
    () => computeMinVisibleMs(displaySeconds, speedValue),
    [displaySeconds, speedValue]
  );

  const holdSeconds = Number(imageHoldSeconds);
  const imageHoldMs = useMemo(
    () => computeScaledHoldMs(holdSeconds, speedValue),
    [holdSeconds, speedValue]
  );

  const compositionIntervalMs = useMemo(
    () => computeCompositionIntervalMs(compositionIntervalSeconds),
    [compositionIntervalSeconds]
  );

  const snapGridMs = useMemo(() => computeSnapGridMs(snapGridSeconds), [snapGridSeconds]);

  const scheduleIndex = useMemo(
    () =>
      createScheduleIndex(mediaData?.images || [], {
        minVisibleMs,
        holdMs: imageHoldMs,
        maxSlots: MAX_VISIBLE_IMAGES,
        compositionIntervalMs,
        snapToGrid: Boolean(snapToGrid),
        snapGridMs,
      }),
    [mediaData?.images, minVisibleMs, imageHoldMs, compositionIntervalMs, snapToGrid, snapGridMs]
  );

  const inAudioCoverage = useMemo(() => {
    if (!Number.isFinite(resolvedAbsolute)) {
      return true;
    }
    // If no audio exists, consider we're never in audio coverage
    if (!hasAudio) {
      return false;
    }
    return hasAudioCoverage(mediaData, resolvedAbsolute);
  }, [hasAudio, mediaData, resolvedAbsolute]);

  const compositionState = useMemo(() => {
    if (!mediaData?.images?.length || !scheduleIndex.metadata.length) {
      return null;
    }
    if (!Number.isFinite(resolvedAbsolute)) {
      return null;
    }

    const composition = getCompositionAtTime(scheduleIndex, mediaData.images, resolvedAbsolute);

    // When skipSilence is enabled, only skip if BOTH no audio AND no images
    // This creates true "silent periods" where nothing is happening
    if (skipSilence && !inAudioCoverage && !composition?.images?.length) {
      return null;
    }

    if (!composition?.images?.length) {
      return null;
    }

    return {
      layoutSize: Math.max(1, Math.min(MAX_VISIBLE_IMAGES, composition.layoutSize)),
      slots: composition.slots?.length ? composition.slots : DEFAULT_SLOTS,
      displayImages: composition.images,
      primaryImage: composition.primaryImage,
    };
  }, [mediaData, scheduleIndex, resolvedAbsolute, skipSilence, inAudioCoverage]);

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
    if (!mediaData?.images?.length || !scheduleIndex.entries.length) {
      return { previous: null, next: null };
    }

    return findSurroundingImages(scheduleIndex, resolvedAbsolute);
  }, [mediaData?.images?.length, scheduleIndex, resolvedAbsolute]);

  const placeholderData = useMemo(() => {
    const { previous, next } = surroundingImages;
    const { previousSrc, nextSrc } = resolvePlaceholderSources({
      previousImage: previous,
      nextImage: next,
    });
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
