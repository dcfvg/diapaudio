import { useEffect, useCallback, useRef, useMemo, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useMediaStore } from "./state/useMediaStore.js";
import { usePlaybackStore } from "./state/usePlaybackStore.js";
import { useSettingsStore } from "./state/useSettingsStore.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Icon from "./components/Icon.jsx";
import { formatDelay } from "./media/delay.js";
import { toTimestamp, formatLocaleDate, calculateClockAngles, formatClockWithSeconds } from "./utils/dateUtils.js";
import Dropzone from "./components/Dropzone.jsx";
import Clock from "./components/Clock.jsx";
import "./styles/loader.css";
import { useUiStore } from "./state/useUiStore.js";
import { HUD_INACTIVITY_TIMEOUT_MS } from "./constants/ui.js";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.js";
import { SPEED_OPTIONS } from "./constants/playback.js";
import {
  DEFAULT_IMAGE_HOLD_MS,
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
} from "./media/constants.js";
import ProgressModal from "./components/ProgressModal.jsx";
import ErrorModal from "./components/ErrorModal.jsx";
import * as logger from "./utils/logger.js";

// Lazy-load heavy components only needed after media is loaded
const Slideshow = lazy(() => import("./components/Slideshow.jsx"));
const Timeline = lazy(() => import("./components/Timeline.jsx"));
const TimelineNotices = lazy(() => import("./components/TimelineNotices.jsx"));
const TimelineSettingsPanel = lazy(() => import("./components/TimelineSettingsPanel.jsx"));
const KeyboardShortcutsHelp = lazy(() => import("./components/KeyboardShortcutsHelp.jsx"));

// Lazy-load export functions (only needed on user action)
// Using a cached promise to ensure module is only loaded once
let exportersModulePromise = null;
const getExportersModule = () => {
  if (!exportersModulePromise) {
    exportersModulePromise = import("./media/exporters.js");
  }
  return exportersModulePromise;
};

export default function App() {
  return (
    <ErrorBoundary componentName="Application" showDetails={true}>
      <AppShell />
    </ErrorBoundary>
  );
}

function AppShell() {
  const { t } = useTranslation();

  // Media store
  const loadFromFiles = useMediaStore((state) => state.loadFromFiles);
  const loadFromDataTransfer = useMediaStore((state) => state.loadFromDataTransfer);
  const mediaData = useMediaStore((state) => state.mediaData);
  const loading = useMediaStore((state) => state.loading);
  const progress = useMediaStore((state) => state.progress);
  const error = useMediaStore((state) => state.error);
  const delaySeconds = useMediaStore((state) => state.delaySeconds);
  const setDelayFromInput = useMediaStore((state) => state.setDelayFromInput);
  const anomalies = useMediaStore((state) => state.anomalies);
  const setError = useMediaStore((state) => state.setError);
  const clearError = useMediaStore((state) => state.clearError);

  // Playback store
  const togglePlaybackRaw = usePlaybackStore((state) => state.togglePlayback);
  const playing = usePlaybackStore((state) => state.playing);
  const loadingTrack = usePlaybackStore((state) => state.loadingTrack);
  const absoluteTime = usePlaybackStore((state) => state.absoluteTime);
  const initAudio = usePlaybackStore((state) => state.initAudio);
  const initializeFromMedia = usePlaybackStore((state) => state.initializeFromMedia);
  const seekToAbsoluteAction = usePlaybackStore((state) => state.seekToAbsolute);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);

  // Settings store (persistent)
  const speed = useSettingsStore((state) => state.speed);
  const autoSkipVoids = useSettingsStore((state) => state.autoSkipVoids);
  const imageDisplaySeconds = useSettingsStore((state) => state.imageDisplaySeconds);
  const setImageDisplaySeconds = useSettingsStore((state) => state.setImageDisplaySeconds);
  const imageHoldSeconds = useSettingsStore((state) => state.imageHoldSeconds);
  const setImageHoldSeconds = useSettingsStore((state) => state.setImageHoldSeconds);
  const snapToGrid = useSettingsStore((state) => state.snapToGrid);
  const setSnapToGrid = useSettingsStore((state) => state.setSnapToGrid);
  const snapGridSeconds = useSettingsStore((state) => state.snapGridSeconds);
  const setSnapGridSeconds = useSettingsStore((state) => state.setSnapGridSeconds);
  const setAutoSkipVoids = useSettingsStore((state) => state.setAutoSkipVoids);
  const showClock = useSettingsStore((state) => state.showClock);
  const setShowClock = useSettingsStore((state) => state.setShowClock);
  const clockMode = useSettingsStore((state) => state.clockMode);
  const setClockMode = useSettingsStore((state) => state.setClockMode);
  const imageDisplayValue = Number.isFinite(imageDisplaySeconds) && imageDisplaySeconds > 0
    ? imageDisplaySeconds
    : Math.round(MIN_IMAGE_DISPLAY_DEFAULT_MS / 1000);
  // Explicitly handle 0 for imageHoldSeconds to avoid any falsy value issues
  const imageHoldValue = imageHoldSeconds === 0
    ? 0
    : (Number.isFinite(imageHoldSeconds) && imageHoldSeconds >= 0
        ? imageHoldSeconds
        : Math.round(DEFAULT_IMAGE_HOLD_MS / 1000));

  // Wrap togglePlayback to pass mediaData
  const togglePlayback = useCallback(() => {
    togglePlaybackRaw(mediaData);
  }, [togglePlaybackRaw, mediaData]);

  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const filesInputRef = useRef(null);
  const isDragging = useUiStore((state) => state.isDragging);
  const setDragging = useUiStore((state) => state.setDragging);
  const delayDraft = useUiStore((state) => state.delayDraft);
  const setDelayDraft = useUiStore((state) => state.setDelayDraft);
  const noticesOpen = useUiStore((state) => state.noticesOpen);
  const setNoticesOpen = useUiStore((state) => state.setNoticesOpen);
  const hudVisible = useUiStore((state) => state.hudVisible);
  const showHudState = useUiStore((state) => state.showHud);
  const hideHudState = useUiStore((state) => state.hideHud);
  const lastAnomalyKeyRef = useRef("");
  const hudHideTimerRef = useRef(null);
  const hasAudio = Boolean(mediaData?.audioTracks?.length);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef(null);
  const [zipExporting, setZipExporting] = useState(false);
  const [zipProgress, setZipProgress] = useState({ percent: 0, status: "", details: "" });

  // Get audio element getter and state setters from playback store
  const getAudioElement = usePlaybackStore((state) => state.getAudioElement);
  const setPlaying = usePlaybackStore((state) => state.setPlaying);
  const setLoadingTrack = usePlaybackStore((state) => state.setLoadingTrack);
  const setAbsoluteTimeState = usePlaybackStore((state) => state.setAbsoluteTime);
  const playbackTickerRef = useRef({
    rafId: null,
    lastNow: null,
    pendingTrack: null,
    lastSeekToken: 0,
  });

  // Initialize audio element on mount
  useEffect(() => {
    initAudio();
  }, [initAudio]);

  // Cleanup audio on unmount to prevent multiple instances
  useEffect(() => {
    return () => {
      const audio = getAudioElement();
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load();
      }
    };
  }, [getAudioElement]);

  // Set up audio event listeners
  useEffect(() => {
    const audio = getAudioElement();
    if (!audio) return;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => {
      const playbackState = usePlaybackStore.getState();
      if (playbackState.playing && playbackState.activeTrackIndex === null) {
        return;
      }
      setPlaying(false);
    };
    const handleWaiting = () => {
      if (hasAudio) {
        setLoadingTrack(true);
      }
    };
    const handleCanPlay = () => setLoadingTrack(false);
    const handleEnded = () => {
      // When audio track ends, check if there's a next track at current time
      // If not, pause (audio should align with time-of-day)
      setPlaying(false);
    };

    const handleTimeUpdate = () => {
      // Monitor playback to ensure audio stays aligned with time-of-day
      // If we've moved past the current track's end time, pause
      if (!mediaData?.audioTracks?.length) return;

      const playbackState = usePlaybackStore.getState();
      const activeTrackIndex = playbackState.activeTrackIndex;
      if (activeTrackIndex === null) return;

      const track = mediaData.audioTracks[activeTrackIndex];
      if (!track) return;

      const endTime =
        track?.adjustedEndTime instanceof Date ? toTimestamp(track.adjustedEndTime) : null;
      const startTime =
        track?.adjustedStartTime instanceof Date ? toTimestamp(track.adjustedStartTime) : null;

      if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return;

      const currentAudioTime = audio.currentTime;
      const currentAbsoluteTime = startTime + currentAudioTime * 1000;

      if (
        Number.isFinite(currentAbsoluteTime) &&
        (!Number.isFinite(playbackState.absoluteTime) ||
          Math.abs(playbackState.absoluteTime - currentAbsoluteTime) > 0.5)
      ) {
        setAbsoluteTimeState(currentAbsoluteTime);
      }

      // If we've passed the end of this track, check if there's another track
      if (currentAbsoluteTime >= endTime) {
        // Find if there's a track that covers the time right after this one
        const findTrackIndexForAbsolute = playbackState.findTrackIndexForAbsolute;
        const nextTrackIndex = findTrackIndexForAbsolute(mediaData, currentAbsoluteTime + 100);

        if (nextTrackIndex < 0) {
          // No track covers this time - pause playback
          // Audio should only play when it matches time-of-day
          const pause = playbackState.pause;
          pause();
        }
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("canplaythrough", handleCanPlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("canplaythrough", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [hasAudio, mediaData, getAudioElement, setPlaying, setLoadingTrack, setAbsoluteTimeState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const tickerState = playbackTickerRef.current;

    const stopTicker = () => {
      if (tickerState.rafId != null) {
        window.cancelAnimationFrame(tickerState.rafId);
      }
      tickerState.rafId = null;
      tickerState.lastNow = null;
      tickerState.pendingTrack = null;
    };

    if (!mediaData || !playing) {
      stopTicker();
      return;
    }

    if (typeof window.requestAnimationFrame !== "function") {
      return;
    }

    let cancelled = false;
    const tick = (now) => {
      if (cancelled) return;

      const state = usePlaybackStore.getState();
      const playbackSpeed = Number.isFinite(state.speed) && state.speed > 0 ? state.speed : 1;
      const settings = useSettingsStore.getState?.();
      const autoSkipVoids = Boolean(settings?.autoSkipVoids);
      const audio = typeof state.getAudioElement === "function" ? state.getAudioElement() : null;
      const activeTrack =
        typeof state.getActiveTrack === "function" ? state.getActiveTrack(mediaData) : null;

      if (tickerState.lastSeekToken !== state._lastSeekTimeRef) {
        tickerState.lastSeekToken = state._lastSeekTimeRef;
        tickerState.lastNow = now;
      }

      let nextAbsolute = null;

      if (
        activeTrack &&
        activeTrack.adjustedStartTime instanceof Date &&
        audio &&
        !audio.paused &&
        !audio.seeking
      ) {
        const start = toTimestamp(activeTrack.adjustedStartTime);
        if (Number.isFinite(start)) {
          const currentSeconds = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
          nextAbsolute = start + currentSeconds * 1000;
        }
      }

      if (!Number.isFinite(nextAbsolute)) {
        const baseAbsolute = Number.isFinite(state.absoluteTime)
          ? state.absoluteTime
          : Number.isFinite(mediaData?.timeline?.startMs)
            ? mediaData.timeline.startMs
            : Number.isFinite(mediaData?.timeline?.viewStartMs)
              ? mediaData.timeline.viewStartMs
              : null;

        if (!Number.isFinite(baseAbsolute)) {
          tickerState.lastNow = now;
          tickerState.rafId = window.requestAnimationFrame(tick);
          return;
        }

        if (tickerState.lastNow == null) {
          tickerState.lastNow = now;
          tickerState.rafId = window.requestAnimationFrame(tick);
          return;
        }

        const deltaMs = (now - tickerState.lastNow) * playbackSpeed;
        nextAbsolute = baseAbsolute + deltaMs;
      }

      if (Number.isFinite(nextAbsolute)) {
        const currentAbsolute = state.absoluteTime;
        if (!Number.isFinite(currentAbsolute) || Math.abs(currentAbsolute - nextAbsolute) > 0.5) {
          state.setAbsoluteTime(nextAbsolute);
        }

        // Auto-skip voids: no audio coverage and no fresh image at this time (ignoring hold)
        if (autoSkipVoids && mediaData) {
          const hasAnyAudio = Boolean(mediaData.audioTracks?.length);
          const inAudio = hasAnyAudio
            ? mediaData.audioTracks.some((track) => {
                const s = track?.adjustedStartTime instanceof Date ? toTimestamp(track.adjustedStartTime) : null;
                const e = track?.adjustedEndTime instanceof Date ? toTimestamp(track.adjustedEndTime) : null;
                return Number.isFinite(s) && Number.isFinite(e) && nextAbsolute >= s && nextAbsolute <= e;
              })
            : false;

          // Determine if there is a "fresh" image starting at or near current time
          let hasFreshImage = false;
          let nextImageTime = null;
          if (Array.isArray(mediaData.images) && mediaData.images.length) {
            const images = mediaData.images
              .map((img, idx) => ({
                idx,
                t:
                  img?.adjustedTimestamp instanceof Date
                    ? toTimestamp(img.adjustedTimestamp)
                    : img?.originalTimestamp instanceof Date
                      ? toTimestamp(img.originalTimestamp)
                      : img?.timestamp instanceof Date
                        ? toTimestamp(img.timestamp)
                        : Number.isFinite(img?.timeMs)
                          ? img.timeMs
                          : null,
              }))
              .filter((e) => Number.isFinite(e.t))
              .sort((a, b) => a.t - b.t);

            // Find the next image at or after current time
            const idx = images.findIndex((e) => e.t >= nextAbsolute);
            if (idx >= 0) {
              nextImageTime = images[idx].t;
              // Consider image "fresh" if it's within 100ms of current time (accounts for timing variance)
              hasFreshImage = Math.abs(images[idx].t - nextAbsolute) < 100;
            }
          }
          
          // If no audio and no fresh image nearby, jump to next media event
          // This handles both gaps during audio and after audio ends
          if (!inAudio && !hasFreshImage) {
            const nextAudioStart = (mediaData.audioTracks || [])
              .map((track) =>
                track?.adjustedStartTime instanceof Date ? toTimestamp(track.adjustedStartTime) : null
              )
              .filter((v) => Number.isFinite(v) && v > nextAbsolute)
              .sort((a, b) => a - b)[0];

            const nextEvent = [nextImageTime, nextAudioStart]
              .filter((v) => Number.isFinite(v))
              .sort((a, b) => a - b)[0];

            if (Number.isFinite(nextEvent)) {
              state.seekToAbsolute(mediaData, nextEvent, { autoplay: state.playing });
              tickerState.lastNow = now; // reset drift
              tickerState.rafId = window.requestAnimationFrame(tick);
              return;
            } else {
              // No more media events: pause playback
              state.pause?.();
            }
          }
        }

        if (mediaData?.audioTracks?.length) {
          const targetIndex = state.findTrackIndexForAbsolute(mediaData, nextAbsolute);
          if (targetIndex >= 0) {
            if (
              targetIndex !== state.activeTrackIndex &&
              tickerState.pendingTrack !== targetIndex
            ) {
              const targetTrack = mediaData.audioTracks[targetIndex];
              const startMs =
                targetTrack?.adjustedStartTime instanceof Date
                  ? toTimestamp(targetTrack.adjustedStartTime)
                  : null;
              const seekSeconds = Number.isFinite(startMs)
                ? Math.max(0, (nextAbsolute - startMs) / 1000)
                : 0;
              tickerState.pendingTrack = targetIndex;
              state
                .ensureTrackLoaded(mediaData, {
                  index: targetIndex,
                  autoplay: state.playing,
                  preserveTime: false,
                  seekToTime: seekSeconds,
                })
                .catch(() => {})
                .finally(() => {
                  const currentTicker = playbackTickerRef.current;
                  if (currentTicker && currentTicker.pendingTrack === targetIndex) {
                    currentTicker.pendingTrack = null;
                  }
                });
            }
          } else if (audio && !audio.paused) {
            try {
              audio.pause();
            } catch {
              // Ignore pause errors
            }
            if (state.activeTrackIndex !== null) {
              state.setActiveTrackIndex(null);
            }
            state.setLoadingTrack(false);
          }
        }
      }

      tickerState.lastNow = now;
      tickerState.rafId = window.requestAnimationFrame(tick);
    };

    tickerState.lastNow = null;
    tickerState.lastSeekToken =
      usePlaybackStore.getState()._lastSeekTimeRef ?? tickerState.lastSeekToken;
    tickerState.pendingTrack = null;
    tickerState.rafId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      stopTicker();
    };
  }, [mediaData, playing]);

  // Initialize playback state when media changes
  useEffect(() => {
    if (mediaData) {
      initializeFromMedia(mediaData);

      // Auto-play when media is first loaded and ready
      if (!hasAudio) {
        // For image-only mode, start time progression automatically
        setPlaying(true);
        setLoadingTrack(false);
      } else {
        // For media with audio, start playback automatically
        togglePlaybackRaw(mediaData);
      }
    }
  }, [mediaData, initializeFromMedia, hasAudio, setPlaying, setLoadingTrack, togglePlaybackRaw]);

  useEffect(() => {
    const audio = usePlaybackStore.getState().getAudioElement?.();
    const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
    if (audio) {
      audio.playbackRate = safeSpeed;
      audio.defaultPlaybackRate = safeSpeed;
    }
  }, [speed]);

  useEffect(() => {
    if (!mediaData) {
      setSettingsOpen(false);
    }
  }, [mediaData]);

  // Check if device has hover capability
  const alwaysShowHud = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia && window.matchMedia("(hover: none)").matches;
  }, []);

  // Show HUD and schedule auto-hide
  const showHud = useCallback(() => {
    if (alwaysShowHud) return;
    showHudState();

    // Clear existing timer
    if (hudHideTimerRef.current) {
      clearTimeout(hudHideTimerRef.current);
    }

    // Schedule hide after inactivity timeout (but not if settings panel is open)
    hudHideTimerRef.current = setTimeout(() => {
      // Don't hide if settings panel is open
      if (!settingsOpen) {
        hideHudState();
      }
    }, HUD_INACTIVITY_TIMEOUT_MS);
  }, [alwaysShowHud, hideHudState, showHudState, settingsOpen]);

  // Handle global activity (mouse move, touch, keyboard)
  useEffect(() => {
    if (alwaysShowHud || !mediaData) return;

    const handleActivity = (event) => {
      // Ignore keyboard events when typing in inputs
      if (event.type === "keydown") {
        const target = event.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
          return;
        }
      }
      showHud();
    };

    document.addEventListener("mousemove", handleActivity, { passive: true });
    document.addEventListener("touchstart", handleActivity, { passive: true });
    document.addEventListener("keydown", handleActivity, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleActivity);
      document.removeEventListener("touchstart", handleActivity);
      document.removeEventListener("keydown", handleActivity);
      if (hudHideTimerRef.current) {
        clearTimeout(hudHideTimerRef.current);
      }
    };
  }, [alwaysShowHud, mediaData, showHud]);

  // Always show HUD on touch devices
  useEffect(() => {
    if (alwaysShowHud) {
      showHudState();
    }
  }, [alwaysShowHud, showHudState]);

  // Keep HUD visible while settings panel is open
  useEffect(() => {
    if (settingsOpen) {
      // Show HUD when settings opens
      showHudState();
      // Clear any pending hide timer
      if (hudHideTimerRef.current) {
        clearTimeout(hudHideTimerRef.current);
        hudHideTimerRef.current = null;
      }
    }
  }, [settingsOpen, showHudState]);

  // Keyboard shortcut handlers
  const handleSeekForward = useCallback(
    (ms) => {
      if (!mediaData) return;
      const baseTime = Number.isFinite(absoluteTime)
        ? absoluteTime
        : mediaData?.timeline?.startMs;
      if (!Number.isFinite(baseTime)) return;
      const newTime = baseTime + ms;
      seekToAbsoluteAction(mediaData, newTime, { autoplay: playing });
    },
    [mediaData, absoluteTime, seekToAbsoluteAction, playing]
  );

  const handleSeekBackward = useCallback(
    (ms) => {
      if (!mediaData) return;
      const baseTime = Number.isFinite(absoluteTime)
        ? absoluteTime
        : mediaData?.timeline?.startMs;
      if (!Number.isFinite(baseTime)) return;
      const newTime = baseTime - ms;
      seekToAbsoluteAction(mediaData, newTime, { autoplay: playing });
    },
    [mediaData, absoluteTime, seekToAbsoluteAction, playing]
  );

  const handleNextMedia = useCallback(() => {
    if (!mediaData) return;
    const currentTime = Number.isFinite(absoluteTime)
      ? absoluteTime
      : mediaData?.timeline?.startMs;
    if (!Number.isFinite(currentTime)) return;

    // Collect all media events (audio starts and images)
    const events = [];

    // Add audio track start times
    (mediaData.audioTracks || []).forEach((track) => {
      const startTime = track?.adjustedStartTime instanceof Date 
        ? toTimestamp(track.adjustedStartTime) 
        : null;
      if (Number.isFinite(startTime)) {
        events.push(startTime);
      }
    });

    // Add image times
    (mediaData.images || []).forEach((img) => {
      const imgTime = img?.adjustedTimestamp instanceof Date
        ? toTimestamp(img.adjustedTimestamp)
        : img?.originalTimestamp instanceof Date
          ? toTimestamp(img.originalTimestamp)
          : img?.timestamp instanceof Date
            ? toTimestamp(img.timestamp)
            : Number.isFinite(img?.timeMs)
              ? img.timeMs
              : null;
      if (Number.isFinite(imgTime)) {
        events.push(imgTime);
      }
    });

    // Find next event after current time
    const nextEvent = events
      .filter((t) => t > currentTime + 100) // 100ms threshold to avoid same event
      .sort((a, b) => a - b)[0];

    if (Number.isFinite(nextEvent)) {
      seekToAbsoluteAction(mediaData, nextEvent, { autoplay: playing });
    }
  }, [mediaData, absoluteTime, seekToAbsoluteAction, playing]);

  const handlePrevMedia = useCallback(() => {
    if (!mediaData) return;
    const currentTime = Number.isFinite(absoluteTime)
      ? absoluteTime
      : mediaData?.timeline?.startMs;
    if (!Number.isFinite(currentTime)) return;

    // Collect all media events (audio starts and images)
    const events = [];

    // Add audio track start times
    (mediaData.audioTracks || []).forEach((track) => {
      const startTime = track?.adjustedStartTime instanceof Date 
        ? toTimestamp(track.adjustedStartTime) 
        : null;
      if (Number.isFinite(startTime)) {
        events.push(startTime);
      }
    });

    // Add image times
    (mediaData.images || []).forEach((img) => {
      const imgTime = img?.adjustedTimestamp instanceof Date
        ? toTimestamp(img.adjustedTimestamp)
        : img?.originalTimestamp instanceof Date
          ? toTimestamp(img.originalTimestamp)
          : img?.timestamp instanceof Date
            ? toTimestamp(img.timestamp)
            : Number.isFinite(img?.timeMs)
              ? img.timeMs
              : null;
      if (Number.isFinite(imgTime)) {
        events.push(imgTime);
      }
    });

    // Find previous event before current time
    const prevEvent = events
      .filter((t) => t < currentTime - 100) // 100ms threshold to avoid same event
      .sort((a, b) => b - a)[0];

    if (Number.isFinite(prevEvent)) {
      seekToAbsoluteAction(mediaData, prevEvent, { autoplay: playing });
    }
  }, [mediaData, absoluteTime, seekToAbsoluteAction, playing]);

  const handleSpeedIncrease = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed);
    if (currentIndex < SPEED_OPTIONS.length - 1) {
      setSpeed(SPEED_OPTIONS[currentIndex + 1]);
    }
  }, [speed, setSpeed]);

  const handleSpeedDecrease = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed);
    if (currentIndex > 0) {
      setSpeed(SPEED_OPTIONS[currentIndex - 1]);
    }
  }, [speed, setSpeed]);

  const handleImageDisplayChange = useCallback(
    (value) => {
      if (value === "") {
        return;
      }
      setImageDisplaySeconds(Number(value));
    },
    [setImageDisplaySeconds]
  );

  const handleImageHoldChange = useCallback(
    (value) => {
      if (value === "") {
        return;
      }
      setImageHoldSeconds(Number(value));
    },
    [setImageHoldSeconds]
  );

  const handleToggleSnapToGrid = useCallback(
    (enabled) => {
      setSnapToGrid(Boolean(enabled));
    },
    [setSnapToGrid]
  );

  const handleSnapGridSecondsChange = useCallback(
    (value) => {
      if (value === "") {
        return;
      }
      setSnapGridSeconds(Number(value));
    },
    [setSnapGridSeconds]
  );

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const handleShowHelp = useCallback(() => {
    setSettingsOpen(false);
    setShowKeyboardHelp((prev) => !prev);
  }, [setSettingsOpen, setShowKeyboardHelp]);

  const handleOpenKeyboardHelp = useCallback(() => {
    setSettingsOpen(false);
    setShowKeyboardHelp(true);
  }, [setSettingsOpen, setShowKeyboardHelp]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onPlayPause: mediaData ? togglePlayback : undefined,
    onSeekForward: handleSeekForward,
    onSeekBackward: handleSeekBackward,
    onNextMedia: handleNextMedia,
    onPrevMedia: handlePrevMedia,
    onSpeedIncrease: handleSpeedIncrease,
    onSpeedDecrease: handleSpeedDecrease,
    onToggleFullscreen: handleToggleFullscreen,
    onShowHelp: handleShowHelp,
    disabled: !mediaData || loading,
  });

  const handleFileSelection = useCallback(
    (event) => {
      const { files } = event.target;
      if (files && files.length) {
        loadFromFiles(files);
        event.target.value = "";
      }
    },
    [loadFromFiles]
  );

  const dropzoneClassName = useMemo(() => {
    if (mediaData) return "dropzone hidden";
    return isDragging ? "dropzone dragover" : "dropzone";
  }, [mediaData, isDragging]);
  const viewerContentClassName = useMemo(
    () => (mediaData ? "viewer__content" : "viewer__content hidden"),
    [mediaData]
  );
  const dropzoneCtaClassName = useMemo(
    () => (loading ? "dropzone__cta hidden" : "dropzone__cta"),
    [loading]
  );
  const dropzoneBodyClassName = useMemo(
    () => (loading ? "dropzone__body hidden" : "dropzone__body"),
    [loading]
  );
  const dropzoneLoaderClassName = useMemo(
    () => (loading ? "dropzone__loader" : "dropzone__loader hidden"),
    [loading]
  );
  const progressPercent = progress?.percent;
  const loaderBarStyle =
    typeof progressPercent === "number"
      ? { width: `${Math.min(100, Math.max(0, progressPercent))}%` }
      : undefined;
  const loaderStatusText = t(progress?.statusKey || "loadingFiles");
  const loaderDetailsContent = progress?.details || "";
  const loaderDetailsIsHtml = Boolean(loaderDetailsContent && loaderDetailsContent.includes("<"));

  // Handle error display - error could be string or Error object
  const dropzoneMessageContent = error
    ? typeof error === "string"
      ? error
      : error?.message || String(error)
    : t("dropMessage");
  const dropzoneMessageIsHtml = Boolean(error);

  const playButtonState = loadingTrack ? "loading" : playing ? "pause" : "play";
  const playButtonConfig = {
    play: { icon: <Icon name="play" size={18} />, labelKey: "play" },
    pause: { icon: <Icon name="pause" size={18} />, labelKey: "pause" },
    loading: { icon: <Icon name="loader" size={18} className="button-primary__spinner" />, labelKey: "loadingFiles" },
  }[playButtonState];
  const playButtonLabel = t(playButtonConfig.labelKey);

  useEffect(() => {
    const formatted = formatDelay(delaySeconds);
    if (delayDraft !== formatted) {
      setDelayDraft(formatted);
    }
  }, [delayDraft, delaySeconds, setDelayDraft]);

  const anomalyKey = Array.isArray(anomalies) ? anomalies.join("\n") : "";

  useEffect(() => {
    if (anomalyKey && anomalyKey !== lastAnomalyKeyRef.current) {
      setNoticesOpen(true);
      lastAnomalyKeyRef.current = anomalyKey;
    }
    if (!anomalyKey) {
      setNoticesOpen(false);
      lastAnomalyKeyRef.current = "";
    }
  }, [anomalyKey, setNoticesOpen]);

  const commitDelay = useCallback(() => {
    if (!setDelayFromInput(delayDraft)) {
      setDelayDraft(formatDelay(delaySeconds));
    }
  }, [delayDraft, delaySeconds, setDelayDraft, setDelayFromInput]);

  const handleDelayKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitDelay();
        event.currentTarget.blur();
      }
    },
    [commitDelay]
  );

  const handleBrowseClick = useCallback((inputRef) => {
    inputRef.current?.click();
  }, []);

  const handleDragOver = useCallback(
    (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      if (!isDragging) {
        setDragging(true);
      }
    },
    [isDragging, setDragging]
  );

  const handleDragEnter = useCallback(
    (event) => {
      event.preventDefault();
      setDragging(true);
    },
    [setDragging]
  );

  const handleDragLeave = useCallback(
    (event) => {
      if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
        return;
      }
      setDragging(false);
    },
    [setDragging]
  );

  const handleDragEnd = useCallback(() => {
    setDragging(false);
  }, [setDragging]);

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      setDragging(false);
      await loadFromDataTransfer(event.dataTransfer);
    },
    [loadFromDataTransfer, setDragging]
  );

  const handleExportXml = useCallback(async () => {
    if (!mediaData) {
      setError(new Error(t("alertNoMediaToExport")));
      return;
    }
    setSettingsOpen(false);
    try {
      const { exportFinalCutProXml } = await getExportersModule();
      await exportFinalCutProXml({ mediaData });
    } catch (error) {
      logger.error("Failed to export XML:", error);
      setError(error);
    }
  }, [mediaData, setError, setSettingsOpen, t]);

  const handleExportZip = useCallback(async () => {
    if (!mediaData) {
      setError(new Error(t("alertNoMediaToExport")));
      return;
    }
    setSettingsOpen(false);
    setZipExporting(true);
    setZipProgress({ percent: 0, status: t("processingFiles"), details: "" });
    try {
      const { exportZipArchive } = await getExportersModule();
      await exportZipArchive({
        mediaData,
        delaySeconds,
        onProgress: (percent, statusKey, details) => {
          setZipProgress({
            percent,
            status: t(statusKey || "processingFiles"),
            details,
          });
        },
      });
    } catch (error) {
      logger.error("Failed to export ZIP:", error);
      setError(error);
    } finally {
      setZipExporting(false);
    }
  }, [delaySeconds, mediaData, setError, setSettingsOpen, t]);

  const timelineStartMs = mediaData?.timeline?.startMs ?? null;

  const resolvedAbsoluteMs = useMemo(() => {
    if (Number.isFinite(absoluteTime)) return absoluteTime;
    if (Number.isFinite(timelineStartMs)) return timelineStartMs;
    return null;
  }, [absoluteTime, timelineStartMs]);

  const clockDisplays = useMemo(() => {
    if (!Number.isFinite(resolvedAbsoluteMs)) {
      return {
        time: "--:--:--",
        date: "--/--/----",
        minimalDate: "-- --",
      };
    }
    const date = new Date(resolvedAbsoluteMs);
    return {
      time: formatClockWithSeconds(date),
      date: formatLocaleDate(date, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
      minimalDate: formatLocaleDate(date, {
        month: "short",
        day: "2-digit",
      }),
    };
  }, [resolvedAbsoluteMs]);

  const analogAngles = useMemo(() => {
    if (!Number.isFinite(resolvedAbsoluteMs)) {
      return { hour: 0, minute: 0, second: 0 };
    }
    const date = new Date(resolvedAbsoluteMs);
    return calculateClockAngles(date);
  }, [resolvedAbsoluteMs]);

  const handleToggleClockMode = useCallback(() => {
    setClockMode(clockMode === 'analog' ? 'digital' : 'analog');
  }, [clockMode, setClockMode]);

  return (
    <div className="app">
      <main className="app__main">
        <section className="viewer">
          <Dropzone
            className={dropzoneClassName}
            isLoading={loading}
            dropzoneCtaClassName={dropzoneCtaClassName}
            dropzoneBodyClassName={dropzoneBodyClassName}
            dropzoneLoaderClassName={dropzoneLoaderClassName}
            dropMessage={dropzoneMessageContent}
            dropMessageIsHtml={dropzoneMessageIsHtml}
            loaderBarStyle={loaderBarStyle}
            loaderStatusText={loaderStatusText}
            loaderDetails={loaderDetailsContent}
            loaderDetailsIsHtml={loaderDetailsIsHtml}
            progressPercent={progressPercent}
            folderInputRef={folderInputRef}
            zipInputRef={zipInputRef}
            filesInputRef={filesInputRef}
            onBrowseClick={handleBrowseClick}
            onFileSelection={handleFileSelection}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
          />
          <div className={viewerContentClassName} id="viewer-content">
            <div className="viewer__slideshow">
              <ErrorBoundary componentName="Slideshow">
                <Suspense fallback={<div className="loading-placeholder" />}>
                  <Slideshow />
                </Suspense>
              </ErrorBoundary>
              {showClock && (
                <Clock
                  analogAngles={analogAngles}
                  clockDisplays={clockDisplays}
                  mode={clockMode}
                  onToggleMode={handleToggleClockMode}
                  title={t("tooltipClock")}
                />
              )}
            </div>
            <div className="viewer__meta"></div>
            <div
              className={`viewer__hud ${hudVisible ? "viewer__hud--visible" : ""}`}
              id="viewer-hud"
            >
              <div className={mediaData ? "timeline" : "timeline hidden"} id="timeline">
                <div className="timeline__toolbar">
                    <div className="timeline__controls-left">
                    <button
                      type="button"
                      className="button-primary button-primary--icon"
                      id="play-toggle"
                      disabled={!mediaData}
                      aria-label={playButtonLabel}
                      aria-pressed={playing}
                      title={t("tooltipPlayPause")}
                      onClick={togglePlayback}
                    >
                      <span className="button-primary__icon" aria-hidden="true">
                        {playButtonConfig.icon}
                      </span>
                      <span className="visually-hidden control-button__sr-label">
                        {playButtonLabel}
                      </span>
                    </button>
                    {Array.isArray(anomalies) && anomalies.length ? (
                      <button
                        type="button"
                        className="timeline__notices-button button-secondary"
                        onClick={() => setNoticesOpen(true)}
                        aria-label={t("timelineNoticesButton", { count: anomalies.length })}
                        title={t("timelineNoticesButton", { count: anomalies.length })}
                      >
                        <Icon name="warning" size={18} className="timeline__notices-icon" />
                        <span>{anomalies.length}</span>
                      </button>
                    ) : null}
                  </div>
                  <div className="timeline__scrubber" title={t("tooltipTimeline")}>
                    <ErrorBoundary componentName="Timeline">
                      <Suspense fallback={<div className="loading-placeholder" />}>
                        <Timeline />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                  <div className="timeline__controls-right">
                    <label className="speed-control" title={t("tooltipSpeed")} htmlFor="speed-select">
                      <span>{t("speed")}</span>
                      <select
                        id="speed-select"
                        value={String(speed)}
                        className="speed-control__select"
                        title={t("tooltipSpeedSelect")}
                        onChange={(event) => setSpeed(Number(event.target.value))}
                      >
                        {SPEED_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}×
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className={`timeline__settings-button ${settingsOpen ? "is-open" : ""}`}
                      ref={settingsButtonRef}
                      onClick={() => setSettingsOpen((prev) => !prev)}
                      aria-label={t("timelineSettings")}
                      title={t("timelineSettings")}
                    >
                      <GearIcon />
                    </button>
                  </div>
                </div>
                <Suspense fallback={<div className="loading-placeholder" />}>
                  <TimelineSettingsPanel
                    open={settingsOpen}
                    anchorRef={settingsButtonRef}
                    delayDraft={delayDraft}
                    onDelayChange={(event) => setDelayDraft(event.target.value)}
                    onCommitDelay={commitDelay}
                    onDelayKeyDown={handleDelayKeyDown}
                    imageDisplaySeconds={String(Math.round(imageDisplayValue))}
                    onImageDisplayChange={handleImageDisplayChange}
                    imageHoldSeconds={String(Math.round(imageHoldValue))}
                    onImageHoldChange={handleImageHoldChange}
                    snapToGrid={snapToGrid}
                    onToggleSnapToGrid={handleToggleSnapToGrid}
                    snapGridSeconds={String(snapGridSeconds)}
                    onSnapGridSecondsChange={handleSnapGridSecondsChange}
                    autoSkipVoids={autoSkipVoids}
                    onToggleAutoSkipVoids={setAutoSkipVoids}
                    showClock={showClock}
                    onToggleShowClock={setShowClock}
                    onExportXml={handleExportXml}
                    onExportZip={handleExportZip}
                    disabled={!mediaData}
                    onClose={() => setSettingsOpen(false)}
                    onShowKeyboardHelp={handleOpenKeyboardHelp}
                    t={t}
                  />
                </Suspense>
              </div>
            </div>
            <ErrorBoundary componentName="Timeline Notices">
              <Suspense fallback={null}>
                <TimelineNotices open={noticesOpen} onClose={() => setNoticesOpen(false)} />
              </Suspense>
            </ErrorBoundary>
      </div>
    </section>
  </main>

      <ProgressModal
        open={loading}
        title={t("progressLoadingTitle")}
        status={loaderStatusText}
        percent={progressPercent ?? null}
        details={loaderDetailsContent}
      />

      <ProgressModal
        open={zipExporting}
        title={t("progressExportingTitle")}
        status={zipProgress.status || t("processingFiles")}
        percent={zipProgress.percent ?? null}
        details={zipProgress.details}
        icon="📦"
      />

      <ErrorModal
        open={Boolean(error)}
        error={error}
        onClose={clearError}
        title={t("errorModalTitle")}
      />

      <Suspense fallback={null}>
        <KeyboardShortcutsHelp open={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
      </Suspense>
    </div>
  );
}

function GearIcon(props) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a1.65 1.65 0 0 0 0-2l1.9-1.09-1.9-3.28-2.2.58a1.65 1.65 0 0 0-1.42-.82L15 3h-6l-.38 2.39a1.65 1.65 0 0 0-1.42.82l-2.2-.58-1.9 3.28L4 11a1.65 1.65 0 0 0 0 2l-1.9 1.09 1.9 3.28 2.2-.58a1.65 1.65 0 0 0 1.42.82L9 21h6l.38-2.39a1.65 1.65 0 0 0 1.42-.82l2.2.58 1.9-3.28z" />
    </svg>
  );
}
