import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { SEEK_DEBOUNCE_MS } from "../constants/playback.js";
import { useSettingsStore } from "./useSettingsStore.js";
import * as logger from "../utils/logger.js";

function getEarliestMediaTime(mediaData) {
  let earliest = null;
  const tracks = mediaData?.audioTracks || [];
  for (const track of tracks) {
    const start =
      track?.adjustedStartTime instanceof Date ? track.adjustedStartTime.getTime() : null;
    if (Number.isFinite(start)) {
      earliest = earliest == null ? start : Math.min(earliest, start);
    }
  }
  const images = mediaData?.images || [];
  for (const image of images) {
    const ts =
      image?.originalTimestamp instanceof Date
        ? image.originalTimestamp.getTime()
        : image?.timestamp instanceof Date
          ? image.timestamp.getTime()
          : null;
    if (Number.isFinite(ts)) {
      earliest = earliest == null ? ts : Math.min(earliest, ts);
    }
  }
  return earliest;
}

function trackCoversAbsolute(track, absoluteMs) {
  if (!track || !Number.isFinite(absoluteMs)) {
    return false;
  }
  const start = track?.adjustedStartTime instanceof Date ? track.adjustedStartTime.getTime() : null;
  if (!Number.isFinite(start)) {
    return false;
  }

  const end = track?.adjustedEndTime instanceof Date ? track.adjustedEndTime.getTime() : null;
  if (Number.isFinite(end)) {
    return absoluteMs >= start && absoluteMs <= end;
  }

  const durationMs =
    Number.isFinite(track?.duration) && track.duration > 0 ? track.duration * 1000 : null;
  if (Number.isFinite(durationMs)) {
    return absoluteMs >= start && absoluteMs <= start + durationMs;
  }
  return absoluteMs >= start;
}

const playbackStoreImpl = (set, get) => ({
  // State
  playing: false,
  loadingTrack: false,
  activeTrackIndex: null,
  absoluteTime: null,
  displayedImages: [],

  // Refs (not persisted, managed outside Zustand)
  _audioRef: null,
  _playPromiseRef: null,
  _rafRef: null,
  _lastTickRef: null,
  _initialAbsoluteRef: null,
  _seekingRef: false,
  _lastSeekTimeRef: 0,

  // Initialize audio element (call this once on app mount)
  initAudio: () => {
    const speed = useSettingsStore.getState().speed;
    const audioElement = new Audio();
    audioElement.preload = "auto";
    audioElement.playbackRate = speed;
    audioElement.defaultPlaybackRate = speed;
    set({ _audioRef: audioElement });
    return audioElement;
  },

  // Get audio element
  getAudioElement: () => get()._audioRef,

  // Helper: Get active track
  getActiveTrack: (mediaData) => {
    if (!mediaData?.audioTracks?.length) return null;
    const { activeTrackIndex } = get();
    const index =
      activeTrackIndex ??
      (Number.isInteger(mediaData.activeTrackIndex) ? mediaData.activeTrackIndex : 0);
    return mediaData.audioTracks[index] || null;
  },

  // Helper: Find track index for absolute time
  findTrackIndexForAbsolute: (mediaData, absoluteMs) => {
    if (!mediaData?.audioTracks?.length) return -1;
    for (let i = 0; i < mediaData.audioTracks.length; i += 1) {
      const track = mediaData.audioTracks[i];
      const start =
        track?.adjustedStartTime instanceof Date ? track.adjustedStartTime.getTime() : null;
      const end = track?.adjustedEndTime instanceof Date ? track.adjustedEndTime.getTime() : null;
      if (!Number.isFinite(start)) {
        continue;
      }
      if (Number.isFinite(end)) {
        if (absoluteMs >= start && absoluteMs <= end) {
          return i;
        }
      } else if (absoluteMs >= start) {
        return i;
      }
    }
    return -1;
  },

  // Helper: Get audio absolute time
  getAudioAbsoluteTime: (mediaData) => {
    const { getActiveTrack, _audioRef } = get();
    const track = getActiveTrack(mediaData);
    if (!track?.adjustedStartTime) return null;
    const startMs = track.adjustedStartTime.getTime();
    if (!Number.isFinite(startMs)) return null;
    const audioSeconds = Number.isFinite(_audioRef?.currentTime) ? _audioRef.currentTime : 0;
    return startMs + audioSeconds * 1000;
  },

  // Action: Initialize state based on mediaData
  initializeFromMedia: (mediaData) => {
    const earliest = getEarliestMediaTime(mediaData);
    set({
      _initialAbsoluteRef: earliest,
      absoluteTime: earliest ?? null,
      displayedImages: [],
    });
  },

  // Action: Play
  play: async (mediaData) => {
    const {
      _audioRef,
      activeTrackIndex,
      ensureTrackLoaded,
      findTrackIndexForAbsolute,
      absoluteTime,
      setActiveTrackIndex,
      setLoadingTrack,
    } = get();
    const hasAudio = Boolean(mediaData?.audioTracks?.length);

    if (!hasAudio) {
      set({ playing: true });
      return;
    }

    const resolvedAbsolute = Number.isFinite(absoluteTime)
      ? absoluteTime
      : getEarliestMediaTime(mediaData);

    const tracks = mediaData?.audioTracks || [];

    const isTrackActiveForAbsolute = (index) => {
      if (!Number.isInteger(index) || index < 0 || index >= tracks.length) {
        return false;
      }
      return trackCoversAbsolute(tracks[index], resolvedAbsolute);
    };

    let targetIndex = Number.isInteger(activeTrackIndex) ? activeTrackIndex : null;
    if (!isTrackActiveForAbsolute(targetIndex)) {
      targetIndex = Number.isFinite(resolvedAbsolute)
        ? findTrackIndexForAbsolute(mediaData, resolvedAbsolute)
        : -1;
    }

    if (!Number.isInteger(targetIndex) || targetIndex < 0) {
      if (_audioRef) {
        try {
          _audioRef.pause();
        } catch {
          // Ignore pause errors
        }
      }
      setActiveTrackIndex(null);
      setLoadingTrack(false);
      set({ playing: true });
      return;
    }

    const targetTrack = tracks[targetIndex];
    const startMs =
      targetTrack?.adjustedStartTime instanceof Date
        ? targetTrack.adjustedStartTime.getTime()
        : null;
    const seekSeconds =
      Number.isFinite(startMs) && Number.isFinite(resolvedAbsolute)
        ? Math.max(0, (resolvedAbsolute - startMs) / 1000)
        : 0;

    if (_audioRef?.src && targetTrack?.url && _audioRef.src === targetTrack.url) {
      try {
        if (Number.isFinite(seekSeconds)) {
          _audioRef.currentTime = seekSeconds;
        }
        const playPromise = _audioRef.play();
        set({ _playPromiseRef: playPromise, playing: true });
        await playPromise;
        set({ _playPromiseRef: null, playing: true });
      } catch (error) {
        set({ _playPromiseRef: null, playing: false });
        if (error.name !== "AbortError") {
          logger.warn("Playback resume failed:", error);
        }
      }
      return;
    }

    try {
      set({ playing: true });
      await ensureTrackLoaded(mediaData, {
        index: targetIndex,
        autoplay: true,
        preserveTime: false,
        seekToTime: Number.isFinite(seekSeconds) ? seekSeconds : 0,
      });
    } catch (error) {
      if (error?.name !== "AbortError") {
        logger.warn("Playback start failed:", error);
      }
    }
  },

  // Action: Pause
  pause: () => {
    const { _audioRef, _playPromiseRef } = get();
    if (_playPromiseRef) {
      set({ _playPromiseRef: null });
    }
    if (_audioRef) {
      _audioRef.pause();
    }
    set({ playing: false });
  },

  // Action: Toggle playback
  togglePlayback: (mediaData) => {
    const { playing, play, pause } = get();
    if (playing) {
      pause();
    } else {
      play(mediaData);
    }
  },

  // Action: Set speed (delegates to settings store)
  setSpeed: (value) => {
    const { _audioRef } = get();
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) return;
    useSettingsStore.getState().setSpeed(next);
    if (_audioRef) {
      _audioRef.playbackRate = next;
      _audioRef.defaultPlaybackRate = next;
    }
  },

  // Action: Set skip silence (delegates to settings store)
  setSkipSilence: (value) => {
    useSettingsStore.getState().setSkipSilence(Boolean(value));
  },

  // Action: Set active track index
  setActiveTrackIndex: (index) => {
    set({ activeTrackIndex: index });
  },

  // Action: Set absolute time
  setAbsoluteTime: (time) => {
    set({ absoluteTime: time });
  },

  // Action: Set displayed images
  setDisplayedImages: (images) => {
    set({ displayedImages: images });
  },

  // Action: Set loading track
  setLoadingTrack: (loading) => {
    set({ loadingTrack: loading });
  },

  // Action: Set playing
  setPlaying: (playing) => {
    set({ playing });
  },

  // Action: Ensure track is loaded
  ensureTrackLoaded: async (
    mediaData,
    { index = 0, autoplay = false, preserveTime = false, seekToTime = null } = {}
  ) => {
    const { _audioRef, _playPromiseRef, playing } = get();
    const hasAudio = Boolean(mediaData?.audioTracks?.length);

    if (!hasAudio) {
      set({ activeTrackIndex: null });
      if (_audioRef) {
        _audioRef.pause();
        _audioRef.removeAttribute("src");
      }
      return;
    }

    const tracks = mediaData.audioTracks || [];
    const targetIndex = Math.max(0, Math.min(index, tracks.length - 1));
    const track = tracks[targetIndex];
    if (!track?.url) {
      return;
    }

    const previousWasPlaying = autoplay || playing;
    const currentTime = preserveTime ? _audioRef.currentTime : seekToTime !== null ? seekToTime : 0;
    const nextSrc = track.url;

    // Cancel any pending play promise
    if (_playPromiseRef) {
      try {
        _audioRef.pause();
      } catch {
        // Ignore errors from pause
      }
      set({ _playPromiseRef: null });
    }

    const playbackSpeed = useSettingsStore.getState().speed;
    _audioRef.playbackRate = playbackSpeed;
    _audioRef.defaultPlaybackRate = playbackSpeed;

    if (_audioRef.src !== nextSrc) {
      set({ loadingTrack: true, activeTrackIndex: targetIndex });
      _audioRef.pause();
      _audioRef.src = nextSrc;
      try {
        _audioRef.load();
      } catch {
        // Ignore load errors; browser will emit 'error'
      }
      _audioRef.currentTime = currentTime;
    } else {
      set({ activeTrackIndex: targetIndex });
      // If staying on same track but seekToTime specified, seek now
      if (seekToTime !== null) {
        _audioRef.currentTime = seekToTime;
      }
    }

    if (previousWasPlaying) {
      try {
        const playPromise = _audioRef.play();
        set({ _playPromiseRef: playPromise });
        await playPromise;
        set({ _playPromiseRef: null, playing: true });
      } catch (error) {
        set({ _playPromiseRef: null });
        // Only log if it's not an AbortError
        if (error.name !== "AbortError") {
          logger.warn("Unable to start playback:", error);
        }
        set({ playing: false });
      }
    }
  },

  // Action: Seek to absolute time
  seekToAbsolute: async (mediaData, absoluteMs, options = {}) => {
    const { autoplay } = options;
    const {
      _lastSeekTimeRef,
      findTrackIndexForAbsolute,
      ensureTrackLoaded,
      getAudioElement,
      setActiveTrackIndex,
      setLoadingTrack,
      playing: currentPlaying,
    } = get();

    if (!Number.isFinite(absoluteMs)) return;

    // Debounce seeks to prevent excessive seeking
    const now = Date.now();
    if (now - _lastSeekTimeRef < SEEK_DEBOUNCE_MS) {
      return;
    }

    set({ _lastSeekTimeRef: now });

    const hasAudio = Boolean(mediaData?.audioTracks?.length);
    // If autoplay is explicitly set, use it; otherwise preserve current playing state
    const resumePlayback = autoplay !== undefined ? Boolean(autoplay) : currentPlaying;

    if (hasAudio && mediaData?.audioTracks?.length) {
      const trackIndex = findTrackIndexForAbsolute(mediaData, absoluteMs);
      if (trackIndex >= 0) {
        const track = mediaData.audioTracks[trackIndex];
        const start =
          track?.adjustedStartTime instanceof Date ? track.adjustedStartTime.getTime() : null;
        if (Number.isFinite(start)) {
          if (currentPlaying !== resumePlayback) {
            set({ playing: resumePlayback });
          }
          const offsetSeconds = (absoluteMs - start) / 1000;
          const clamped = Math.max(0, offsetSeconds);
          await ensureTrackLoaded(mediaData, {
            index: trackIndex,
            autoplay: resumePlayback,
            preserveTime: false,
            seekToTime: clamped,
          });
          set({ absoluteTime: absoluteMs });
          return;
        }
      } else {
        const audio = typeof getAudioElement === "function" ? getAudioElement() : null;
        if (audio) {
          try {
            audio.pause();
          } catch {
            // Ignore pause errors
          }
        }
        setActiveTrackIndex(null);
        setLoadingTrack(false);
        if (currentPlaying !== resumePlayback) {
          set({ playing: resumePlayback });
        }
        set({ absoluteTime: absoluteMs });
        return;
      }
    }

    // Image-only or out of range
    if (currentPlaying !== resumePlayback) {
      set({ playing: resumePlayback });
    }
    set({ absoluteTime: absoluteMs });
  },

  // Action: Set track index with options
  setTrackIndex: (mediaData, index, { autoplay = false, preserveTime = false } = {}) => {
    const { ensureTrackLoaded } = get();
    const hasAudio = Boolean(mediaData?.audioTracks?.length);
    if (!hasAudio) return;
    ensureTrackLoaded(mediaData, { index, autoplay, preserveTime });
  },

  // Action: Reset playback state (settings are in separate store)
  reset: () => {
    const { _audioRef } = get();
    if (_audioRef) {
      _audioRef.pause();
      _audioRef.removeAttribute("src");
    }
    set({
      playing: false,
      loadingTrack: false,
      activeTrackIndex: null,
      absoluteTime: null,
      displayedImages: [],
      _playPromiseRef: null,
      _rafRef: null,
      _lastTickRef: null,
      _initialAbsoluteRef: null,
      _seekingRef: false,
      _lastSeekTimeRef: 0,
      // Preserve _audioRef
      _audioRef,
    });
  },
});

const enableDevtools =
  import.meta.env?.DEV && import.meta.env?.VITE_ENABLE_STORE_DEVTOOLS === "true";

export const usePlaybackStore = create(
  enableDevtools ? devtools(playbackStoreImpl, { name: "PlaybackStore" }) : playbackStoreImpl
);

// Reset playback store on every page load (not persisted anymore)
// This ensures the app returns to dropzone after reload
if (typeof window !== "undefined") {
  usePlaybackStore.getState().reset();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Stop and cleanup audio on HMR to prevent multiple audio instances
    try {
      const audio = usePlaybackStore.getState().getAudioElement?.();
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load(); // Reset the audio element
      }
    } catch {
      // Ignore cleanup errors
    }
    usePlaybackStore.destroy();
  });
}
