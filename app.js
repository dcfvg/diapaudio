(() => {
  const dropzone = document.getElementById("dropzone");
  const dropzoneMessage = document.getElementById("dropzone-message");
  const dropzoneLoader = document.getElementById("dropzone-loader");
  const folderInput = document.getElementById("folder-input");
  const browseTrigger = document.getElementById("browse-trigger");
  const playToggle = document.getElementById("play-toggle");
  const playToggleIcon = playToggle ? playToggle.querySelector(".control-button__icon") : null;
  const playToggleLabel = playToggle ? playToggle.querySelector(".control-button__sr-label") : null;
  const speedSelect = document.getElementById("speed-select");
  const viewerContent = document.getElementById("viewer-content");
  const slideshowContainer = document.getElementById("slideshow-container");
  const timelineRoot = document.getElementById("timeline");
  const timelineMain = timelineRoot ? timelineRoot.querySelector(".timeline__main") : null;
  const timelineGradient = document.getElementById("timeline-gradient");
  const timelineGridlines = document.getElementById("timeline-gridlines");
  const timelineAxis = document.getElementById("timeline-axis");
  const timelineTracks = document.getElementById("timeline-tracks");
  const timelineImages = document.getElementById("timeline-images");
  const timelineCursor = document.getElementById("timeline-cursor");
  const timelineSeeker = document.getElementById("timeline-seeker");
  const timelineMinimap = document.getElementById("timeline-minimap");
  const timelineMinimapGradient = document.getElementById("timeline-minimap-gradient");
  const timelineMinimapTracks = document.getElementById("timeline-minimap-tracks");
  const timelineMinimapImages = document.getElementById("timeline-minimap-images");
  const timelineNotices = document.getElementById("timeline-notices");
  const timelineHoverPreview = document.getElementById("timeline-hover-preview");
  const timelineHoverPreviewImages = document.getElementById("timeline-hover-preview-images");
  const timelineHoverPreviewTime = document.getElementById("timeline-hover-preview-time");
  const imageTimecode = document.getElementById("image-timecode");
  const imageTimeOfDay = document.getElementById("image-timeofday");
  const delayField = document.getElementById("delay-field");
  const exportFcpButton = document.getElementById("export-fcp-button");
  const viewerHud = document.getElementById("viewer-hud");
  const slideshowPreview = document.getElementById("slideshow-preview");
  const clockHourHand = document.getElementById("clock-hour-hand");
  const clockMinuteHand = document.getElementById("clock-minute-hand");
  const clockSecondHand = document.getElementById("clock-second-hand");
  const clockDate = document.getElementById("clock-date");
  const viewerClock = document.getElementById("viewer-clock");
  const clockAnalog = document.getElementById("clock-analog");
  const clockDigital = document.getElementById("clock-digital");
  const clockTime = document.getElementById("clock-time");

  const utils = typeof window !== "undefined" ? window.DiapAudioUtils : null;
  const parseTimestampFromName = utils ? utils.parseTimestampFromName : null;
  const parseTimestampFromEXIF = utils ? utils.parseTimestampFromEXIF : null;
  const parseTimestampFromAudio = utils ? utils.parseTimestampFromAudio : null;
  if (typeof parseTimestampFromName !== "function") {
    throw new Error("DiapAudio timestamp utilities not loaded");
  }
  if (typeof parseTimestampFromEXIF !== "function") {
    throw new Error("DiapAudio EXIF utilities not loaded");
  }
  if (typeof parseTimestampFromAudio !== "function") {
    throw new Error("DiapAudio audio metadata utilities not loaded");
  }

  const audioMimeByExtension = new Map([
    ["mp3", "audio/mpeg"],
    ["wav", "audio/wav"],
    ["ogg", "audio/ogg"],
    ["m4a", "audio/mp4"],
    ["aac", "audio/aac"],
    ["flac", "audio/flac"],
    ["aifc", "audio/aiff"],
    ["aiff", "audio/aiff"],
  ]);

  // Configuration: Visual Comfort & Smoothness Focus
  const MIN_IMAGE_DISPLAY_DURATION = 6; // Requirement 1: minimum 6 seconds
  const MIN_IMAGE_DISPLAY_DURATION_MS = MIN_IMAGE_DISPLAY_DURATION * 1000;
  const MAX_IMAGE_CARRYOVER_MS = 120_000; // Requirement 2: maximum 120 seconds after timestamp
  const MAX_COMPOSITION_CHANGE_INTERVAL_MS = 4_000; // Requirement 4: layout changes every 4 seconds max
  const MAX_VISIBLE_IMAGES = 6; // Requirement 7: up to 6 horizontal segments
  const BATCH_THRESHOLD_MS = 2_000; // Requirement 8: images within 2s are considered a batch
  const IMAGE_STACK_WINDOW_MS = 25_000;
  const IMAGE_STACK_STEP_PX = 18;
  const IMAGE_STACK_OFFSET_ORDER = [0, -1, 1, -2, 2, -3, 3];
  const IMAGE_BASE_HEIGHT = 64;
  const TRACK_LANE_HEIGHT = 18;
  const TIMELINE_PADDING_RATIO = 0.08;
  const OVERLAP_REPORT_THRESHOLD_MS = 5_000;
  const AUDIO_MARKER_MIN_WIDTH_PCT = 0.2;
  const HUD_INACTIVITY_TIMEOUT_MS = 3500;

  const audioElement = new Audio();
  audioElement.preload = "metadata";

  const PLAY_TOGGLE_ICONS = {
    play: { icon: "▶", label: "Play" },
    pause: { icon: "⏸", label: "Pause" },
    replay: { icon: "↺", label: "Replay" },
    loading: { icon: "⏳", label: "Loading" },
  };

  function createPlaybackController({
    audioElement,
    getDelaySeconds,
    onAbsoluteTimeUpdate,
    requestTrack,
  }) {
    const AUDIO_SYNC_TOLERANCE = 0.05; // seconds
    const state = {
      playing: false,
      absoluteMs: null,
      rafId: null,
      lastFrameTime: null,
      requestedTrackIndex: null,
    };

    function getPlaybackRate() {
      const rate = Number.isFinite(audioElement.playbackRate)
        ? audioElement.playbackRate
        : 1;
      return Number.isFinite(rate) && rate > 0 ? rate : 1;
    }

    function getActiveTrack() {
      if (!mediaData || mediaData.activeTrackIndex == null) return null;
      return mediaData.audioTracks?.[mediaData.activeTrackIndex] || null;
    }

    function getInitialAbsoluteTime() {
      const active = getActiveTrack();
      if (active?.adjustedStartTime instanceof Date) {
        return active.adjustedStartTime.getTime();
      }
      const firstTrack = mediaData?.audioTracks?.find(
        (track) => track?.adjustedStartTime instanceof Date
      );
      if (firstTrack?.adjustedStartTime) {
        return firstTrack.adjustedStartTime.getTime();
      }
      const firstImage = mediaData?.images?.find(
        (image) => image?.originalTimestamp instanceof Date
      );
      if (firstImage?.originalTimestamp) {
        return firstImage.originalTimestamp.getTime();
      }
      return null;
    }

    function ensureTicker() {
      if (state.rafId == null) {
        state.rafId = requestAnimationFrame(tick);
      }
    }

    function cancelTicker() {
      if (state.rafId != null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      state.lastFrameTime = null;
    }

    function commitAbsolute(absoluteMs, { fromAudio = false } = {}) {
      if (!Number.isFinite(absoluteMs)) return;
      state.absoluteMs = absoluteMs;
      if (fromAudio) {
        state.lastFrameTime = null;
      }
      onAbsoluteTimeUpdate(absoluteMs);
    }

    function computeAbsolute(now) {
      const activeTrack = getActiveTrack();

      if (
        state.playing &&
        activeTrack &&
        activeTrack.adjustedStartTime instanceof Date &&
        !audioElement.paused &&
        !audioElement.seeking
      ) {
        const trackStartMs = activeTrack.adjustedStartTime.getTime();
        const audioSeconds = Number.isFinite(audioElement.currentTime)
          ? audioElement.currentTime
          : 0;
        // Note: delay is already applied in adjustedStartTime
        return trackStartMs + audioSeconds * 1000;
      }

      if (!Number.isFinite(state.absoluteMs)) {
        return null;
      }

      if (!state.playing) {
        return state.absoluteMs;
      }

      if (state.lastFrameTime == null) {
        state.lastFrameTime = now;
        return state.absoluteMs;
      }

      const delta = (now - state.lastFrameTime) * getPlaybackRate();
      return state.absoluteMs + delta;
    }

    function syncTrackForAbsolute(absoluteMs) {
      if (!Number.isFinite(absoluteMs)) return;

      const targetIndex = findAudioTrackForTimestamp(absoluteMs);
      const activeIndex = mediaData?.activeTrackIndex ?? null;

      if (targetIndex === -1) {
        if (!audioElement.paused) {
          audioElement.pause();
        }
        state.requestedTrackIndex = null;
        return;
      }

      if (targetIndex !== activeIndex) {
        if (state.requestedTrackIndex !== targetIndex) {
          setPendingSeek(null, state.playing, targetIndex, absoluteMs);
          state.requestedTrackIndex = targetIndex;
          requestTrack(targetIndex, state.playing);
        }
        return;
      }

      state.requestedTrackIndex = null;

      const track = mediaData.audioTracks?.[targetIndex];
      if (!track || !(track.adjustedStartTime instanceof Date)) return;

      const trackStartMs = track.adjustedStartTime.getTime();
      const relativeSeconds = (absoluteMs - trackStartMs) / 1000;
      // Note: delay is already applied in adjustedStartTime, so relativeSeconds is the actual position in the audio

      const canControlAudio =
        audioElement.readyState >= 1 || Number.isFinite(audioElement.duration);

      if (canControlAudio) {
        const duration =
          Number.isFinite(audioElement.duration) && audioElement.duration > 0
            ? audioElement.duration
            : track.duration;
        // Ensure we don't seek beyond the duration, but allow getting very close to the end
        // Only apply a tiny buffer (0.01 seconds) to prevent seeking past the actual end
        const maxSeekPosition = Number.isFinite(duration) ? Math.max(0, duration - 0.01) : duration;
        const targetSeconds = Number.isFinite(duration)
          ? clamp(relativeSeconds, 0, maxSeekPosition)
          : Math.max(relativeSeconds, 0);

        if (
          Math.abs(audioElement.currentTime - targetSeconds) >
          AUDIO_SYNC_TOLERANCE
        ) {
          audioElement.currentTime = targetSeconds;
        }
      }

      if (state.playing) {
        if (audioElement.paused) {
          audioElement.play().catch(() => {});
        }
      } else if (!audioElement.paused) {
        audioElement.pause();
      }
    }

    function tick(now) {
      state.rafId = requestAnimationFrame(tick);

      if (!state.playing) {
        state.lastFrameTime = null;
        return;
      }

      const absolute = computeAbsolute(now);
      if (!Number.isFinite(absolute)) {
        state.lastFrameTime = now;
        return;
      }

      commitAbsolute(absolute, { fromAudio: false });
      syncTrackForAbsolute(absolute);
      state.lastFrameTime = now;
    }

    return {
      isPlaying() {
        return state.playing;
      },
      getAbsoluteTime() {
        return state.absoluteMs;
      },
      setAbsoluteTime(absoluteMs, { autoplay = null } = {}) {
        if (autoplay === true) {
          state.playing = true;
          ensureTicker();
        } else if (autoplay === false) {
          state.playing = false;
          cancelTicker();
        } else if (state.playing) {
          ensureTicker();
        }

        if (Number.isFinite(absoluteMs)) {
          commitAbsolute(absoluteMs);
          syncTrackForAbsolute(absoluteMs);
        }
      },
      play() {
        if (state.playing) return;

        if (!Number.isFinite(state.absoluteMs)) {
          const initial = getInitialAbsoluteTime();
          if (Number.isFinite(initial)) {
            state.absoluteMs = initial;
          }
        }

        if (!Number.isFinite(state.absoluteMs)) return;

        state.playing = true;
        ensureTicker();
        commitAbsolute(state.absoluteMs);
        syncTrackForAbsolute(state.absoluteMs);
      },
      pause() {
        if (!state.playing) return;
        state.playing = false;
        cancelTicker();
        if (!audioElement.paused) {
          audioElement.pause();
        }
        if (Number.isFinite(state.absoluteMs)) {
          commitAbsolute(state.absoluteMs);
          syncTrackForAbsolute(state.absoluteMs);
        }
      },
      toggle() {
        if (state.playing) {
          this.pause();
        } else {
          this.play();
        }
      },
      reset() {
        cancelTicker();
        state.playing = false;
        state.absoluteMs = null;
        state.requestedTrackIndex = null;
      },
      notifyTrackReady() {
        state.requestedTrackIndex = null;
        if (state.playing) {
          ensureTicker();
        }
        if (Number.isFinite(state.absoluteMs)) {
          syncTrackForAbsolute(state.absoluteMs);
        }
      },
      handleAudioEnded() {
        const activeTrack = getActiveTrack();
        if (!activeTrack?.adjustedEndTime) return;
        const endMs = activeTrack.adjustedEndTime.getTime();
        commitAbsolute(endMs);
        if (state.playing) {
          syncTrackForAbsolute(endMs);
        }
      },
      refresh() {
        state.lastFrameTime = null;
        if (Number.isFinite(state.absoluteMs)) {
          syncTrackForAbsolute(state.absoluteMs);
          commitAbsolute(state.absoluteMs);
        }
      },
    };
  }

  function setPlayToggleState(state) {
    if (!playToggle) return;
    const config = PLAY_TOGGLE_ICONS[state] || PLAY_TOGGLE_ICONS.play;
    if (playToggleIcon) playToggleIcon.textContent = config.icon;
    if (playToggleLabel) playToggleLabel.textContent = config.label;
    playToggle.setAttribute("aria-label", config.label);
    playToggle.dataset.state = state;
  }

  let mediaData = null;
  let currentDisplayedImages = [];
  const compositionState = {
    layoutSize: 1,
    slots: [], // Array of { image, enteredAtMs, assignedSlot, layoutSize }
    lastChangeMs: -Infinity,
    renderedLayoutSize: 0,
    renderedSlotSignature: [],
    imageHistory: new Map(), // Requirement 9: Track image -> { slot, layoutSize } to reuse layouts
  };
  let forceNextComposition = false;
  let pendingSeek = null;
  let pendingSeekToken = 0;
  let audioLoadToken = 0;
  const timelineState = {
    initialized: false,
    trackRanges: [],
    imageEntries: [],
    trackLaneCount: 0,
    minMs: 0,
    maxMs: 0,
    totalMs: 0,
    viewStartMs: 0,
    viewEndMs: 0,
    currentCursorMs: null,
    highlightTimeMs: null,
    imageStackMagnitude: 0,
    anomalyMessages: [],
  };
  let timelineInteractionsReady = false;
  let isHoverScrubbing = false;
  let hoverOriginalImages = null;
  let hoverOriginalCursorMs = null;
  let hudHideTimer = null;
  let delaySeconds = 0;
  const alwaysShowHud = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none)").matches;
  let timelineHoverReady = false;
  let currentHoverPreviewKey = null;
  let isAnalogClock = true; // Track clock mode

  // LocalStorage helpers
  const STORAGE_KEYS = {
    PLAYBACK_SPEED: 'diapaudio_playback_speed',
    SKIP_SILENCE: 'diapaudio_skip_silence',
    CLOCK_MODE: 'diapaudio_clock_mode'
  };

  function saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  function loadFromStorage(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
      return defaultValue;
    }
  }

  // Initialize settings from localStorage
  const savedSpeed = loadFromStorage(STORAGE_KEYS.PLAYBACK_SPEED, 1);
  if (speedSelect) {
    speedSelect.value = String(savedSpeed);
  }
  // Always set playbackRate regardless of speedSelect availability
  if (Number.isFinite(savedSpeed) && savedSpeed > 0) {
    audioElement.playbackRate = savedSpeed;
  }

  const playback = createPlaybackController({
    audioElement,
    getDelaySeconds,
    onAbsoluteTimeUpdate: (absoluteMs) => {
      updateSlideForAbsoluteTime(absoluteMs);
    },
    requestTrack: (index, autoPlay) => {
      loadAudioTrack(index, autoPlay);
    },
  });

  isAnalogClock = loadFromStorage(STORAGE_KEYS.CLOCK_MODE, true);
  if (clockAnalog && clockDigital) {
    if (isAnalogClock) {
      clockAnalog.classList.remove("hidden");
      clockDigital.classList.add("hidden");
    } else {
      clockAnalog.classList.add("hidden");
      clockDigital.classList.remove("hidden");
    }
  }

  browseTrigger.addEventListener("click", () => folderInput.click());

  setPlayToggleState("play");

  // Toggle between analog and digital clock on click
  if (viewerClock) {
    viewerClock.addEventListener("click", (event) => {
      event.stopPropagation();
      isAnalogClock = !isAnalogClock;
      saveToStorage(STORAGE_KEYS.CLOCK_MODE, isAnalogClock);
      
      if (isAnalogClock) {
        clockAnalog.classList.remove("hidden");
        clockDigital.classList.add("hidden");
      } else {
        clockAnalog.classList.add("hidden");
        clockDigital.classList.remove("hidden");
      }
    });
  }

  folderInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      handleFolder(files);
      folderInput.value = "";
    }
  });

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add("dragover"));
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove("dragover"));
  });

  dropzone.addEventListener("drop", (event) => {
    const items = event.dataTransfer.items;
    
    // Only handle folders
    if (items && items.length > 0) {
      const item = items[0];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry && entry.isDirectory) {
          handleDirectoryEntry(entry);
          return;
        }
      }
    }
    
    showError("Please drop a folder containing audio files and images.");
  });

  playToggle.addEventListener("click", () => {
    if (!mediaData || !mediaData.audioTracks.length) return;
    playback.toggle();
    setPlayToggleState(playback.isPlaying() ? "pause" : "play");
  });

  speedSelect.addEventListener("change", () => {
    const speed = parseFloat(speedSelect.value);
    audioElement.playbackRate = Number.isFinite(speed) ? speed : 1;
    playback.refresh();
    saveToStorage(STORAGE_KEYS.PLAYBACK_SPEED, audioElement.playbackRate);
  });

  if (delayField) {
    const commitDelay = () => {
      const parsed = parseDelayField(delayField.value);
      if (parsed === null) {
        updateDelayField();
        return;
      }
      setDelaySeconds(parsed);
    };
    delayField.addEventListener("blur", commitDelay);
    delayField.addEventListener("change", commitDelay);
    delayField.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitDelay();
        delayField.blur();
      }
    });
  }

  if (exportFcpButton) {
    exportFcpButton.addEventListener("click", () => {
      if (!mediaData || !mediaData.images || mediaData.images.length === 0) {
        alert("No media loaded. Please load a folder with images and audio first.");
        return;
      }
      exportFinalCutProXML();
    });
  }

  setupTimelineInteractions();
  setupTimelineHover();
  setDelaySeconds(0);

  audioElement.addEventListener("play", () => {
    // Only update UI state - isPlaying is controlled separately
    setPlayToggleState("pause");
  });

  audioElement.addEventListener("pause", () => {
    // Only update UI if we're actually stopping playback (not just paused in a gap)
    if (!playback.isPlaying()) {
      const duration = Number.isFinite(audioElement.duration) ? audioElement.duration : 0;
      const shouldReplay = duration && Math.abs(audioElement.currentTime - duration) < 0.05;
      setPlayToggleState(shouldReplay ? "replay" : "play");
    }
  });

  audioElement.addEventListener("ended", () => {
    // When audio track ends, continue advancing time if we're playing
    if (playback.isPlaying()) {
      playback.handleAudioEnded();
    } else {
      setPlayToggleState("replay");
    }
  });

  function getDelaySeconds() {
    return delaySeconds;
  }

  function setDelaySeconds(value) {
    if (!Number.isFinite(value)) return;
    delaySeconds = value;
    updateDelayField();
    
    // Recalculate track positions and images with new delay
    if (mediaData && mediaData.audioTracks) {
      recalculateImageTimestamps();
      initializeTimeline({ preserveView: true });
    }
    
    playback.refresh();
  }

  function updateDelayField() {
    if (!delayField) return;
    delayField.value = formatDelay(delaySeconds);
  }

  function parseDelayField(raw) {
    if (typeof raw !== "string") return null;
    let value = raw.trim();
    if (!value) return 0;
    let sign = 1;
    if (value.startsWith("-")) {
      sign = -1;
      value = value.slice(1);
    } else if (value.startsWith("+")) {
      value = value.slice(1);
    }
    if (!value) return 0;
    const parts = value.split(":");
    if (parts.length === 1) {
      const secondsOnly = Number(parts[0]);
      if (!Number.isFinite(secondsOnly)) return null;
      return sign * secondsOnly;
    }
    if (parts.length !== 2) return null;
    const minutesPart = Number(parts[0]);
    const secondsPart = Number(parts[1]);
    if (!Number.isFinite(minutesPart) || !Number.isFinite(secondsPart)) {
      return null;
    }
    const totalSeconds = Math.abs(minutesPart) * 60 + Math.abs(secondsPart);
    return sign * totalSeconds;
  }

  function formatDelay(value) {
    if (!Number.isFinite(value)) return "0:00";
    const sign = value < 0 ? "-" : "";
    const absValue = Math.abs(value);
    const minutes = Math.floor(absValue / 60);
    const seconds = absValue - minutes * 60;
    const hasFraction = Math.abs(seconds - Math.round(seconds)) > 0.001;
    let secondsDisplay;
    if (hasFraction) {
      const fixed = seconds.toFixed(1);
      const [intPart, decimalPart] = fixed.split(".");
      const paddedInt = intPart.padStart(2, "0");
      secondsDisplay = `${paddedInt}.${decimalPart}`;
    } else {
      secondsDisplay = String(Math.round(seconds)).padStart(2, "0");
    }
    return `${sign}${minutes}:${secondsDisplay}`;
  }

  function showHud() {
    if (!viewerHud || alwaysShowHud) return;
    viewerHud.classList.add("viewer__hud--visible");
    scheduleHudHide();
  }

  function scheduleHudHide() {
    if (!viewerHud || alwaysShowHud) return;
    clearTimeout(hudHideTimer);
    hudHideTimer = window.setTimeout(() => {
      viewerHud.classList.remove("viewer__hud--visible");
    }, HUD_INACTIVITY_TIMEOUT_MS);
  }

  function hideHudImmediate() {
    if (!viewerHud || alwaysShowHud) return;
    clearTimeout(hudHideTimer);
    hudHideTimer = null;
    viewerHud.classList.remove("viewer__hud--visible");
  }

  if (typeof document !== "undefined" && !alwaysShowHud) {
    ["mousemove", "touchstart", "keydown"].forEach((eventName) => {
      document.addEventListener(
        eventName,
        (event) => handleGlobalActivity(event),
        { passive: true }
      );
    });
  }

  function handleGlobalActivity(event) {
    if (alwaysShowHud || !viewerHud) return;
    if (viewerContent && viewerContent.classList.contains("hidden")) return;
    if (event.type === "keydown") {
      const target = event.target;
      if (target && target.tagName === "INPUT") {
        return;
      }
    }
    showHud();
  }

  // Timeline visibility state
  let timelineHidden = false;
  let timelineShowTimer = null;

  function hideTimeline() {
    if (!timelineRoot || timelineHidden) return;
    timelineHidden = true;
    timelineRoot.classList.add("timeline--fading");
    // Clear any pending show timer
    if (timelineShowTimer) {
      clearTimeout(timelineShowTimer);
      timelineShowTimer = null;
    }
  }

  function showTimeline() {
    if (!timelineRoot) return;
    if (timelineShowTimer) {
      clearTimeout(timelineShowTimer);
    }
    timelineRoot.classList.remove("timeline--fading");
    timelineHidden = false;
  }

  // Show timeline on mouse movement (with debounce)
  document.addEventListener("mousemove", () => {
    if (timelineHidden && mediaData && !viewerContent.classList.contains("hidden")) {
      showTimeline();
      // Auto-hide again after 3 seconds of no mouse movement
      if (timelineShowTimer) {
        clearTimeout(timelineShowTimer);
      }
      timelineShowTimer = setTimeout(() => {
        hideTimeline();
      }, 3000);
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (event) => {
    // Ignore if typing in an input field
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
      return;
    }

    // Ignore if no media loaded
    if (!mediaData || viewerContent.classList.contains("hidden")) {
      return;
    }

    switch (event.key) {
      case " ": // Space - play/pause
        event.preventDefault();
        playback.toggle();
        setPlayToggleState(playback.isPlaying() ? "pause" : "play");
        break;

      case "ArrowLeft": // Left arrow - seek backward 10 seconds
        event.preventDefault();
        const currentMsLeft = playback.getAbsoluteTime();
        if (currentMsLeft !== null) {
          const newMs = currentMsLeft - 10000; // 10 seconds
          seekToAbsoluteMs(newMs, null, { forceDisplay: true });
        }
        break;

      case "ArrowRight": // Right arrow - seek forward 10 seconds
        event.preventDefault();
        const currentMsRight = playback.getAbsoluteTime();
        if (currentMsRight !== null) {
          const newMs = currentMsRight + 10000; // 10 seconds
          seekToAbsoluteMs(newMs, null, { forceDisplay: true });
        }
        break;

      case "Escape": // Esc - hide timeline (shows back on mouse move)
        event.preventDefault();
        hideTimeline();
        break;
    }
  });

  // Remember the freshest seek request while a track is still loading.
  function setPendingSeek(image, shouldPlay, trackIndex, timeMs = null) {
    pendingSeekToken += 1;
    pendingSeek = {
      id: pendingSeekToken,
      image: image || null,
      shouldPlay,
      trackIndex,
      timeMs,
    };
    return pendingSeek;
  }

  function consumePendingSeek(trackIndex) {
    if (pendingSeek && pendingSeek.trackIndex === trackIndex) {
      const request = pendingSeek;
      pendingSeek = null;
      return request;
    }
    return null;
  }

  function clearPendingSeek() {
    pendingSeek = null;
  }

  async function handleFolder(files) {
    showLoadingState(true);

    try {
      // Check for _delay.txt file and read delay setting
      const delayFile = files.find(file => {
        const path = getFilePath(file);
        const name = path.split('/').pop();
        return name === '_delay.txt';
      });

      if (delayFile) {
        try {
          const text = await delayFile.text();
          const parsed = parseDelayField(text.trim());
          if (parsed !== null) {
            setDelaySeconds(parsed);
            console.log(`Loaded delay setting from _delay.txt: ${formatDelay(parsed)}`);
          } else {
            console.warn(`Invalid delay format in _delay.txt: "${text.trim()}"`);
          }
        } catch (err) {
          console.error('Error reading _delay.txt:', err);
        }
      }

      const audioFiles = files
        .filter((file) => {
          const path = getFilePath(file);
          if (shouldSkipEntry(path)) return false;
          const match = path.match(/\.([a-z0-9]+)$/i);
          if (!match) return false;
          const ext = match[1].toLowerCase();
          return audioMimeByExtension.has(ext);
        })
        .sort((a, b) => getFilePath(a).localeCompare(getFilePath(b), undefined, { numeric: true, sensitivity: "base" }));

      if (!audioFiles.length) {
        throw new Error("No audio file detected in the folder.");
      }

      const imageFiles = files.filter(
        (file) => {
          const path = getFilePath(file);
          return !shouldSkipEntry(path) && isImage(path);
        }
      );

      if (!imageFiles.length) {
        throw new Error("No images with timestamps found in the folder.");
      }

      const audioTracks = await Promise.all(
        audioFiles.map(async (file, index) => {
          const filePath = getFilePath(file);
          let fileTimestamp = parseTimestampFromName(filePath);
          
          // If no timestamp from filename, try audio metadata
          if (!fileTimestamp) {
            fileTimestamp = await parseTimestampFromAudio(file);
            if (fileTimestamp) {
              console.log(`Extracted timestamp from audio metadata for ${file.name}:`, fileTimestamp);
            }
          }
          
          return createAudioTrack({
            url: URL.createObjectURL(file),
            originalName: filePath,
            index,
            fileTimestamp,
          });
        })
      );

      // Load durations for all audio tracks
      console.log('Loading durations for all audio tracks...');
      await loadAllAudioDurations(audioTracks);
      console.log('All audio durations loaded:', audioTracks.map(t => ({ label: t.label, duration: t.duration })));

      const images = await Promise.all(
        imageFiles.map(async (file) => {
          const url = URL.createObjectURL(file);
          const timestamp = parseTimestampFromName(getFilePath(file));
          
          // If no timestamp from filename, try EXIF metadata
          let finalTimestamp = timestamp;
          if (!timestamp) {
            finalTimestamp = await parseTimestampFromEXIF(file);
            if (!finalTimestamp) {
              console.warn(`Unable to parse timestamp from ${file.name}. Skipping.`);
              return null;
            }
          }
          
          return {
            name: file.name,
            url,
            timestamp: finalTimestamp,
          };
        })
      );

      const validImages = images.filter(Boolean);
      if (!validImages.length) {
        throw new Error("Images are missing recognizable timestamps.");
      }

      await processMediaData(audioTracks, validImages);
    } catch (error) {
      console.error(error);
      showError(error.message);
    } finally {
      showLoadingState(false);
    }
  }

  async function handleDirectoryEntry(dirEntry) {
    showLoadingState(true);

    try {
      const files = await readDirectoryRecursive(dirEntry);
      await handleFolder(files);
    } catch (error) {
      console.error(error);
      showError(error.message);
      showLoadingState(false);
    }
  }

  async function readDirectoryRecursive(dirEntry) {
    const files = [];
    const reader = dirEntry.createReader();

    async function readEntries() {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    }

    let entries = await readEntries();
    while (entries.length > 0) {
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await new Promise((resolve, reject) => {
            entry.file(resolve, reject);
          });
          files.push(file);
        } else if (entry.isDirectory) {
          const subFiles = await readDirectoryRecursive(entry);
          files.push(...subFiles);
        }
      }
      entries = await readEntries();
    }

    return files;
  }

  async function processMediaData(audioTracks, validImages) {
    // Sort images by timestamp but keep absolute timestamps
    const sortedImages = [...validImages].sort((a, b) => a.timestamp - b.timestamp);

    destroyWaveform();
    releaseMediaResources(mediaData);
    destroyTimeline();

    mediaData = {
      audioTracks,
      activeTrackIndex: 0,
      images: sortedImages.map(img => ({
        ...img,
        originalTimestamp: img.timestamp,
        relative: 0, // Will be calculated when audio loads
        timecode: "00:00",
        timeOfDay: formatClock(img.timestamp),
      })),
    };

    precomputeImageCompositions(mediaData.images);

    clearPendingSeek();

    initializeTimeline();
    loadAudioTrack(0);
    viewerContent.classList.remove("hidden");
    dropzone.classList.add("hidden");
  }

  function showLoadingState(isLoading) {
    if (isLoading) {
      dropzoneMessage.parentElement.classList.add("hidden");
      dropzoneLoader.classList.remove("hidden");
    } else {
      dropzoneMessage.parentElement.classList.remove("hidden");
      dropzoneLoader.classList.add("hidden");
    }
  }

  function showError(message) {
    showLoadingState(false);
    dropzone.classList.remove("hidden");
    viewerContent.classList.add("hidden");
    dropzoneMessage.innerHTML = message;
    releaseMediaResources(mediaData);
    mediaData = null;
    destroyWaveform();
    clearPendingSeek();
    if (timelineRoot) {
      destroyTimeline();
      timelineRoot.classList.add("hidden");
    }
  }

  function isImage(name) {
    return /\.(jpe?g|png|gif)$/i.test(name);
  }

  function isAudio(name) {
    const match = name.match(/\.([a-z0-9]+)$/i);
    if (!match) return false;
    const ext = match[1].toLowerCase();
    return audioMimeByExtension.has(ext);
  }

  function shouldSkipEntry(name) {
    const normalized = name.replace(/\\/g, "/");
    if (normalized.startsWith("__MACOSX/") || normalized.includes("/__MACOSX/")) {
      return true;
    }
    const basename = normalized.split("/").pop() || normalized;
    if (basename.startsWith("._") || basename.toLowerCase() === ".ds_store") {
      return true;
    }
    return normalized.toLowerCase().includes("/thumbnails/");
  }

  function createAudioTrack({ url, originalName, index, fileTimestamp = null }) {
    return {
      url,
      originalName,
      label: formatTrackLabel(originalName, index),
      duration: null,
      fileTimestamp,
      adjustedStartTime: null,
    };
  }

  function formatTrackLabel(name, index) {
    const basename = (name.split(/[/\\]/).pop() || "").replace(/\.[^.]+$/, "");
    const cleaned = basename.replace(/[_-]+/g, " ").trim();
    return cleaned || `Track ${index + 1}`;
  }

  function getFilePath(file) {
    return file.webkitRelativePath || file.path || file.name;
  }

  /**
   * Extract timestamp from EXIF metadata (DateTimeOriginal or DateTime)
   */
  /**
   * Load durations for all audio tracks by creating temporary audio elements.
   * This allows us to know all track durations before playback starts.
   */
  async function loadAllAudioDurations(tracks) {
    const promises = tracks.map((track) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.preload = 'metadata';
        
        audio.addEventListener('loadedmetadata', () => {
          track.duration = audio.duration;
          console.log(`Loaded duration for ${track.label}: ${audio.duration.toFixed(1)}s`);
          resolve();
        });
        
        audio.addEventListener('error', (e) => {
          console.error(`Failed to load duration for ${track.label}:`, e);
          track.duration = null;
          resolve(); // Resolve anyway to not block other tracks
        });
        
        audio.src = track.url;
      });
    });
    
    await Promise.all(promises);
  }

  function recalculateImageTimestamps() {
    if (!mediaData || !mediaData.images || !mediaData.audioTracks) return;

    const delayMs = getDelaySeconds() * 1000;

    mediaData.audioTracks.forEach((track) => {
      if (!track || !track.fileTimestamp || !track.duration) return;
      const referenceMs = track.fileTimestamp.getTime();
      const durationMs = track.duration * 1000;
      
      // Apply delay: negative delay means audio started recording earlier than the timestamp
      // So startMs should be earlier (timestamp + negative delay = earlier time)
      const startMs = referenceMs + delayMs;
      const endMs = startMs + durationMs;
      
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return;

      track.adjustedStartTime = new Date(startMs);
      track.adjustedEndTime = new Date(endMs);
    });

    const activeTrack = mediaData.audioTracks[mediaData.activeTrackIndex];
    if (!activeTrack || !activeTrack.adjustedStartTime) return;

    const audioStartMs = activeTrack.adjustedStartTime.getTime();

    mediaData.images.forEach((image) => {
      const imageMs = image.originalTimestamp.getTime();
      const relative = (imageMs - audioStartMs) / 1000;
      image.relative = relative;
      image.timecode = formatTime(Math.max(0, relative));
    });

    precomputeImageCompositions(mediaData.images);

    const firstVisibleImage =
      mediaData.images.find((img) => img.relative >= 0) || mediaData.images[0];
    if (firstVisibleImage) {
      const firstMs = firstVisibleImage.originalTimestamp?.getTime?.();
      showMainImages([firstVisibleImage], {
        absoluteMs: Number.isFinite(firstMs) ? firstMs : Date.now(),
        force: true,
      });
      if (firstVisibleImage.originalTimestamp) {
        updateAnalogClock(firstVisibleImage.originalTimestamp);
      }
    }

    initializeTimeline({ preserveView: true });
  }

  function loadAudioTrack(index, autoPlay = false) {
    if (!mediaData || !Array.isArray(mediaData.audioTracks) || !mediaData.audioTracks.length) return;
    if (index < 0 || index >= mediaData.audioTracks.length) return;

    if (pendingSeek && pendingSeek.trackIndex !== index) {
      clearPendingSeek();
    }

    mediaData.activeTrackIndex = index;
    timelineSetActiveTrack(index);
    setupAudioForTrack(mediaData.audioTracks[index], autoPlay);
  }

  function setupAudioForTrack(track, autoPlay = false) {
    if (!track) return;

    destroyWaveform({ preserveClock: true, resetComposition: false });

    audioLoadToken += 1;
    const loadId = audioLoadToken;

    setPlayToggleState("loading");

    // Preserve playback rate from settings
    const currentSpeed = speedSelect ? parseFloat(speedSelect.value) : 1;
    audioElement.playbackRate = Number.isFinite(currentSpeed) && currentSpeed > 0 ? currentSpeed : 1;

    const handleLoadedMetadata = () => {
      if (loadId !== audioLoadToken) return;
      audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.removeEventListener("error", handleAudioError);

      if (Number.isFinite(audioElement.duration)) {
        track.duration = audioElement.duration;
      }

      // Reapply playback rate after load (some browsers reset it)
      audioElement.playbackRate = currentSpeed;

      playToggle.disabled = false;
      setPlayToggleState("play");

      recalculateImageTimestamps();
      playback.notifyTrackReady();

      let handledPlayback = false;
      const pendingRequest = consumePendingSeek(mediaData.activeTrackIndex);
      if (pendingRequest) {
        if (pendingRequest.image) {
          seekToImageInCurrentTrack(pendingRequest.image, pendingRequest.shouldPlay);
          handledPlayback = Boolean(pendingRequest.shouldPlay);
        } else if (typeof pendingRequest.timeMs === "number") {
          seekToAbsoluteMs(pendingRequest.timeMs, pendingRequest.shouldPlay, {
            forceDisplay: true,
          });
          handledPlayback = Boolean(pendingRequest.shouldPlay);
        }
      } else {
        playback.refresh();
      }

      if (autoPlay && !handledPlayback) {
        playback.play();
        setPlayToggleState("pause");
      }
    };

    const handleAudioError = (event) => {
      if (loadId !== audioLoadToken) return;
      console.error("Failed to load audio track", event);
      audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.removeEventListener("error", handleAudioError);
      playToggle.disabled = true;
      setPlayToggleState("play");
    };

    audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    audioElement.addEventListener("error", handleAudioError);
    audioElement.src = track.url;
    audioElement.load();
  }

  /**
   * Find which audio track contains the given image timestamp.
   * Returns the track index, or -1 if no track matches.
   * When multiple tracks match (overlapping recordings), prefers the longest one.
   */
  function findAudioTrackForTimestamp(imageTimestamp) {
    if (!mediaData || !mediaData.audioTracks || !imageTimestamp) {
      return -1;
    }

    const imageTime = imageTimestamp instanceof Date ? imageTimestamp.getTime() : imageTimestamp;

    let bestMatch = -1;
    let longestDuration = 0;

    for (let i = 0; i < mediaData.audioTracks.length; i++) {
      const track = mediaData.audioTracks[i];
      if (!track.duration) {
        continue;
      }

      // Use adjusted start/end times which include delay
      let audioStartTime, audioEndTime;
      
      if (track.adjustedStartTime && track.adjustedEndTime) {
        audioStartTime = track.adjustedStartTime.getTime();
        audioEndTime = track.adjustedEndTime.getTime();
      } else if (track.fileTimestamp) {
        // Fallback: calculate with delay if adjusted times not yet set
        const delayMs = getDelaySeconds() * 1000;
        const trackTime = track.fileTimestamp.getTime();
        audioStartTime = trackTime + delayMs;
        audioEndTime = audioStartTime + (track.duration * 1000);
      } else {
        continue;
      }

      // Check if image timestamp falls within this track's time range
      // Use < instead of <= for the end boundary to avoid exact end-of-file edge cases
      if (imageTime >= audioStartTime && imageTime < audioEndTime) {
        // If multiple tracks match, prefer the longest one (most complete recording)
        if (track.duration > longestDuration) {
          bestMatch = i;
          longestDuration = track.duration;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Seek to the position of the given image in the currently loaded audio track.
   */
  function seekToImageInCurrentTrack(image, shouldPlay) {
    if (!image?.originalTimestamp) return;
    const targetMs = image.originalTimestamp.getTime();
    if (!Number.isFinite(targetMs)) return;
    seekToAbsoluteMs(targetMs, shouldPlay, { forceDisplay: true });
  }

  function seekToAbsoluteMs(absoluteMs, shouldPlay = null, options = {}) {
    if (!Number.isFinite(absoluteMs)) return;

    if (options.forceDisplay) {
      forceNextComposition = true;
    }

    playback.setAbsoluteTime(absoluteMs, {
      autoplay: typeof shouldPlay === "boolean" ? shouldPlay : null,
    });

    if (shouldPlay === true) {
      setPlayToggleState("pause");
    } else if (shouldPlay === false) {
      setPlayToggleState("play");
    }
  }

  function destroyWaveform({ preserveClock = false, resetComposition = true } = {}) {
    if (resetComposition) {
      resetCompositionState({ clearDom: !preserveClock });
    }
    if (!preserveClock) {
      playback.reset();
      setPlayToggleState("play");
    }
    audioElement.pause();
    audioElement.currentTime = 0;
    playToggle.disabled = true;
  }

  function updateSlideForAbsoluteTime(absoluteMs) {
    if (!mediaData || !Number.isFinite(absoluteMs)) return;
    
    // Update timeline state
    timelineState.currentCursorMs = absoluteMs;
    
    // Get images for this absolute time
    const images = getImagesForAbsoluteTime(absoluteMs);
    const visibleImages = showMainImages(images, { absoluteMs });
    const orderedImages = sortImagesByTimestamp(visibleImages);
    highlightTimelineImages(orderedImages);
    
    // Update timeline
    updateTimelineCursor(absoluteMs);
    const primaryImage = orderedImages.length
      ? orderedImages[orderedImages.length - 1]
      : null;
    const highlightMs = primaryImage?.originalTimestamp?.getTime?.() ?? absoluteMs;
    updateTimelineActiveStates(highlightMs);
    
    // Update analog clock
    if (!isHoverScrubbing) {
      updateAnalogClock(new Date(absoluteMs));
    }
  }

  function updateSlideForCurrentTime() {
    const absoluteMs = playback.getAbsoluteTime();
    if (Number.isFinite(absoluteMs)) {
      updateSlideForAbsoluteTime(absoluteMs);
    }
  }

  function precomputeImageCompositions(images) {
    if (!Array.isArray(images) || !images.length) return;

    for (let i = 0; i < images.length; i++) {
      const anchor = images[i];
      const anchorMs = anchor?.originalTimestamp?.getTime?.();
      if (!Number.isFinite(anchorMs)) {
        anchor.precomputedVisible = [];
        anchor.compositionSize = 1;
        continue;
      }

      // Requirement 8: Batch images that arrive at nearly the same time
      // Look for images within BATCH_THRESHOLD_MS
      const batchStart = anchorMs - BATCH_THRESHOLD_MS;
      const batchEnd = anchorMs + BATCH_THRESHOLD_MS;

      let start = i;
      while (start > 0) {
        const candidateMs = images[start - 1]?.originalTimestamp?.getTime?.();
        if (!Number.isFinite(candidateMs) || candidateMs < batchStart) break;
        start -= 1;
      }

      let end = i;
      while (end + 1 < images.length) {
        const candidateMs = images[end + 1]?.originalTimestamp?.getTime?.();
        if (!Number.isFinite(candidateMs) || candidateMs > batchEnd) break;
        end += 1;
      }

      const cluster = [];
      let clusterStartMs = Number.POSITIVE_INFINITY;
      let clusterEndMs = Number.NEGATIVE_INFINITY;
      
      // Requirement 10: Maximize size - take up to MAX_VISIBLE_IMAGES
      for (let j = start; j <= end && cluster.length < MAX_VISIBLE_IMAGES; j++) {
        const candidate = images[j];
        const candidateMs = candidate?.originalTimestamp?.getTime?.();
        if (!Number.isFinite(candidateMs)) continue;
        cluster.push(candidate);
        clusterStartMs = Math.min(clusterStartMs, candidateMs);
        clusterEndMs = Math.max(clusterEndMs, candidateMs);
      }

      const finalCluster = cluster.length ? cluster : [anchor];
      if (!Number.isFinite(clusterStartMs) || !Number.isFinite(clusterEndMs)) {
        const times = finalCluster
          .map((entry) => entry?.originalTimestamp?.getTime?.())
          .filter((value) => Number.isFinite(value));
        const fallbackStart = times.length ? Math.min(...times) : anchorMs;
        const fallbackEnd = times.length ? Math.max(...times) : anchorMs;
        clusterStartMs = fallbackStart;
        clusterEndMs = fallbackEnd;
      }
      anchor.precomputedVisible = finalCluster;
      anchor.clusterStartMs = Number.isFinite(clusterStartMs) ? clusterStartMs : anchorMs;
      anchor.clusterEndMs = Number.isFinite(clusterEndMs) ? clusterEndMs : anchorMs;
      anchor.compositionSize = Math.max(Math.min(finalCluster.length, MAX_VISIBLE_IMAGES), 1);
    }
  }

  function getImagesForAbsoluteTime(absoluteMs) {
    if (!mediaData || !Array.isArray(mediaData.images) || !mediaData.images.length) {
      return [];
    }
    if (!Number.isFinite(absoluteMs)) {
      return [];
    }

    const images = mediaData.images;
    let anchorIndex = -1;
    
    // Find the most recent image at or before current time
    for (let i = 0; i < images.length; i++) {
      const timestamp = images[i].originalTimestamp?.getTime?.() ?? null;
      if (!Number.isFinite(timestamp)) continue;
      if (timestamp <= absoluteMs) {
        anchorIndex = i;
      } else {
        break;
      }
    }

    if (anchorIndex === -1) {
      return images.length ? [images[0]] : [];
    }

    const anchor = images[anchorIndex];
    if (!anchor) return [];

    // Use precomputed cluster if available
    const baseVisible = Array.isArray(anchor.precomputedVisible)
      ? anchor.precomputedVisible
      : [anchor];

    const clusterStart = Number.isFinite(anchor.clusterStartMs)
      ? anchor.clusterStartMs
      : anchor.originalTimestamp?.getTime?.();

    if (!Number.isFinite(clusterStart)) {
      return baseVisible.slice(0, MAX_VISIBLE_IMAGES);
    }

    // Requirement 2: Maximum display time of 45 seconds after timestamp
    const windowEnd = clusterStart + MAX_IMAGE_CARRYOVER_MS;
    if (absoluteMs < clusterStart || absoluteMs > windowEnd) {
      return [];
    }

    // Requirement 10: Maximize image size - limit to MAX_VISIBLE_IMAGES
    return baseVisible.slice(0, MAX_VISIBLE_IMAGES);
  }

  function showMainImages(images, options = {}) {
    if (!slideshowContainer) return [];

    const absoluteMs = Number.isFinite(options.absoluteMs)
      ? options.absoluteMs
      : images?.[0]?.originalTimestamp?.getTime?.() ?? Date.now();
    const requestedForce = Boolean(options.force);
    const shouldForce = requestedForce || forceNextComposition;
    if (forceNextComposition) {
      forceNextComposition = false;
    }

    const targetImages = Array.isArray(images)
      ? images.slice(0, MAX_VISIBLE_IMAGES)
      : [];

    const slots = updateCompositionSlots(targetImages, absoluteMs, { force: shouldForce });
    const visibleImages = slots
      .map((entry) => entry?.image || null)
      .filter(Boolean);
    const orderedVisible = sortImagesByTimestamp(visibleImages);
    renderSlideshow(slots);
    currentDisplayedImages = orderedVisible;

    return orderedVisible;
  }

  function resetCompositionState({ clearDom = false } = {}) {
    compositionState.layoutSize = 1;
    compositionState.slots = Array.from({ length: compositionState.layoutSize }, () => null);
    compositionState.lastChangeMs = -Infinity;
    compositionState.renderedLayoutSize = 0;
    compositionState.renderedSlotSignature = [];
    compositionState.imageHistory.clear(); // Clear history on reset
    currentDisplayedImages = [];
    forceNextComposition = false;

    if (!slideshowContainer) return;

    slideshowContainer.className = "slideshow__container";
    slideshowContainer.innerHTML = "";
    delete slideshowContainer.dataset.imageCount;
    delete slideshowContainer.dataset.layoutSize;
  }

  function updateCompositionSlots(targetImages, absoluteMs, { force = false } = {}) {
    const now = Number.isFinite(absoluteMs) ? absoluteMs : Date.now();
    const hasTargets = Array.isArray(targetImages) && targetImages.length > 0;

    // Requirement 10: Maximize image size - use minimum layout size needed
    let desiredLayoutSize = hasTargets ? targetImages.length : 1;
    desiredLayoutSize = Math.min(desiredLayoutSize, MAX_VISIBLE_IMAGES);
    desiredLayoutSize = Math.max(desiredLayoutSize, 1);

    const lastChangeMs = Number.isFinite(compositionState.lastChangeMs)
      ? compositionState.lastChangeMs
      : -Infinity;
    
    // Requirement 4: Layout changes at most every 4 seconds
    const allowLayoutAdjustment = force || (now - lastChangeMs >= MAX_COMPOSITION_CHANGE_INTERVAL_MS);

    let nextLayoutSize = compositionState.layoutSize || 1;

    if (!hasTargets) {
      nextLayoutSize = 1;
    } else {
      // Grow immediately if needed, shrink only when allowed
      if (desiredLayoutSize > nextLayoutSize) {
        nextLayoutSize = desiredLayoutSize;
      } else if (desiredLayoutSize < nextLayoutSize && allowLayoutAdjustment) {
        nextLayoutSize = desiredLayoutSize;
      }
    }

    let layoutAdjusted = false;

    // Requirement 4: Change layout only when time threshold is met
    if (nextLayoutSize !== compositionState.layoutSize && (force || allowLayoutAdjustment || desiredLayoutSize > compositionState.layoutSize)) {
      const existingImages = (compositionState.slots || [])
        .map((entry) => entry?.image || null)
        .filter(Boolean);

      compositionState.layoutSize = nextLayoutSize;
      compositionState.slots = Array.from({ length: nextLayoutSize }, (_, index) => {
        const image = existingImages[index] || null;
        if (image) {
          // Requirement 9: Remember this image's layout
          const historyKey = getImageKey(image);
          compositionState.imageHistory.set(historyKey, { 
            slot: index, 
            layoutSize: nextLayoutSize 
          });
          return { image, enteredAtMs: now, assignedSlot: index, layoutSize: nextLayoutSize };
        }
        return null;
      });
      compositionState.lastChangeMs = now;
      layoutAdjusted = true;
    }

    if (!compositionState.slots || compositionState.slots.length !== compositionState.layoutSize) {
      compositionState.slots = Array.from({ length: compositionState.layoutSize }, () => null);
    }

    if (!hasTargets) {
      if (compositionState.slots.some(Boolean)) {
        compositionState.slots = Array.from({ length: compositionState.layoutSize }, () => null);
        compositionState.lastChangeMs = now;
      }
      return compositionState.slots;
    }

    const targetSet = new Set(targetImages);
    const visibleSet = new Set();
    let changeOccurred = false;

    const allowImmediateReplacement = force || layoutAdjusted;
    
    // Requirement 4: Changes allowed at most every 4 seconds
    const mayChange = allowImmediateReplacement || (now - compositionState.lastChangeMs >= MAX_COMPOSITION_CHANGE_INTERVAL_MS);

    // Requirement 3: Keep images in their slots as long as valid
    for (let i = 0; i < compositionState.slots.length; i++) {
      const entry = compositionState.slots[i];
      if (!entry) continue;

      const elapsed = now - entry.enteredAtMs;
      const inTarget = targetSet.has(entry.image);
      
      // Requirement 1 & 2: Display for at least 6 seconds, max 45 seconds after timestamp
      const meetsMinDuration = elapsed >= MIN_IMAGE_DISPLAY_DURATION_MS;
      const shouldKeep = inTarget || (!allowImmediateReplacement && (!meetsMinDuration || !mayChange));

      if (shouldKeep) {
        visibleSet.add(entry.image);
        // Requirement 3: Update slot info but keep position constant
        if (entry.assignedSlot !== i || entry.layoutSize !== compositionState.layoutSize) {
          entry.assignedSlot = i;
          entry.layoutSize = compositionState.layoutSize;
        }
      } else {
        compositionState.slots[i] = null;
        changeOccurred = true;
      }
    }

    const availableIndices = [];
    for (let i = 0; i < compositionState.slots.length; i++) {
      if (!compositionState.slots[i]) {
        availableIndices.push(i);
      }
    }

    if ((force || mayChange) && availableIndices.length) {
      const orderedTargets = targetImages
        .filter((image) => !visibleSet.has(image))
        .sort((a, b) => {
          const aMs = a?.originalTimestamp?.getTime?.() ?? 0;
          const bMs = b?.originalTimestamp?.getTime?.() ?? 0;
          return aMs - bMs;
        });

      for (const image of orderedTargets) {
        if (!availableIndices.length) break;
        
        // Requirement 9: Try to reuse previous slot if available
        const historyKey = getImageKey(image);
        const history = compositionState.imageHistory.get(historyKey);
        let slotIndex;
        
        if (history && history.layoutSize === compositionState.layoutSize && 
            availableIndices.includes(history.slot)) {
          // Reuse the same slot
          slotIndex = history.slot;
          availableIndices.splice(availableIndices.indexOf(slotIndex), 1);
        } else {
          // Assign to first available slot
          slotIndex = availableIndices.shift();
          // Remember this assignment
          compositionState.imageHistory.set(historyKey, { 
            slot: slotIndex, 
            layoutSize: compositionState.layoutSize 
          });
        }
        
        compositionState.slots[slotIndex] = { 
          image, 
          enteredAtMs: now, 
          assignedSlot: slotIndex,
          layoutSize: compositionState.layoutSize
        };
        visibleSet.add(image);
        changeOccurred = true;
      }
    }

    if (changeOccurred) {
      compositionState.lastChangeMs = now;
    }

    return compositionState.slots;
  }

  function getImageKey(image) {
    // Create unique key for image history tracking
    return image?.name || image?.url || String(image?.originalTimestamp?.getTime() || 0);
  }

  function renderSlideshow(slots) {
    if (!slideshowContainer) return;

    const layoutSize = Math.max(compositionState.layoutSize || 1, 1);
    const normalizedSlots = Array.from({ length: layoutSize }, (_, index) => slots?.[index] ?? null);
    const signature = normalizedSlots.map((entry) => entry?.image || null);

    const isSame =
      compositionState.renderedLayoutSize === layoutSize &&
      compositionState.renderedSlotSignature.length === signature.length &&
      signature.every((image, index) => compositionState.renderedSlotSignature[index] === image);

    if (isSame) return;

    compositionState.renderedLayoutSize = layoutSize;
    compositionState.renderedSlotSignature = signature.slice();

    slideshowContainer.className = "slideshow__container";
    slideshowContainer.dataset.layoutSize = String(layoutSize);
    slideshowContainer.dataset.imageCount = String(signature.filter(Boolean).length);
    slideshowContainer.classList.add(`split-${Math.min(layoutSize, MAX_VISIBLE_IMAGES)}`);

    for (let index = 0; index < normalizedSlots.length; index++) {
      const entry = normalizedSlots[index];
      const existing = slideshowContainer.children[index] || null;

      if (entry?.image) {
        const image = entry.image;

        if (
          existing &&
          existing.tagName === "IMG" &&
          existing.dataset.imageId === image.url &&
          existing.dataset.slotIndex === String(index)
        ) {
          existing.dataset.slotIndex = String(index);
          existing.dataset.imageId = image.url;
          existing.classList.add("slideshow__image", "slideshow__image--visible");
          continue;
        }

        const imgEl = existing && existing.tagName === "IMG" ? existing : document.createElement("img");

        if (!imgEl.classList.contains("slideshow__image")) {
          imgEl.classList.add("slideshow__image");
        }

        // Hide immediately if src is changing to prevent ghost images
        const srcChanging = imgEl.dataset.imageId !== image.url;
        if (srcChanging && imgEl.classList.contains("slideshow__image--visible")) {
          imgEl.classList.remove("slideshow__image--visible");
        }

        imgEl.dataset.slotIndex = String(index);
        imgEl.dataset.imageId = image.url;
        imgEl.src = image.url;
        imgEl.alt = image.name || `Capture ${index + 1}`;
        imgEl.loading = "lazy";
        imgEl.decoding = "async";

        if (existing === imgEl) {
          // reused element, no need to reinsert
        } else if (existing) {
          slideshowContainer.replaceChild(imgEl, existing);
        } else {
          slideshowContainer.appendChild(imgEl);
        }

        requestAnimationFrame(() => {
          imgEl.classList.add("slideshow__image--visible");
        });
      } else {
        if (
          existing &&
          existing.classList &&
          existing.classList.contains("slideshow__placeholder") &&
          existing.dataset.slotIndex === String(index)
        ) {
          existing.dataset.slotIndex = String(index);
          continue;
        }

        const placeholder =
          existing && existing.classList && existing.classList.contains("slideshow__placeholder")
            ? existing
            : document.createElement("div");

        placeholder.className = "slideshow__placeholder";
        placeholder.dataset.slotIndex = String(index);
        placeholder.setAttribute("aria-hidden", "true");

        if (existing === placeholder) {
          // already in place
        } else if (existing) {
          slideshowContainer.replaceChild(placeholder, existing);
        } else {
          slideshowContainer.appendChild(placeholder);
        }
      }
    }

    while (slideshowContainer.children.length > normalizedSlots.length) {
      const lastChild = slideshowContainer.lastElementChild;
      if (!lastChild) break;
      slideshowContainer.removeChild(lastChild);
    }
  }

  function jumpToImage(image, { thumbnailNode } = {}) {
    if (!image || !mediaData || !mediaData.audioTracks) return;

    const correctTrackIndex = findAudioTrackForTimestamp(image.originalTimestamp);

    if (correctTrackIndex === -1) {
      console.warn(
        `Image "${image.name}" timestamp doesn't match any audio track`
      );
      const targetMs = image.originalTimestamp?.getTime?.();
      const visibleAlone = showMainImages([image], {
        absoluteMs: Number.isFinite(targetMs) ? targetMs : Date.now(),
        force: true,
      });
      const orderedVisible = sortImagesByTimestamp(visibleAlone);
      highlightTimelineImages(orderedVisible);
      const fallbackImage = orderedVisible.length
        ? orderedVisible[orderedVisible.length - 1]
        : null;
      const fallbackMs = fallbackImage?.originalTimestamp?.getTime?.() ?? targetMs;
      if (Number.isFinite(fallbackMs ?? NaN)) {
        timelineState.currentCursorMs = fallbackMs;
        updateTimelineCursor(fallbackMs);
        updateTimelineActiveStates(fallbackMs);
      }
      if (image.originalTimestamp) {
        updateAnalogClock(image.originalTimestamp);
      }
      return;
    }

    const wasPlaying = playback.isPlaying();
    const audioReady = audioElement.readyState >= 1 || Number.isFinite(audioElement.duration);

    if (correctTrackIndex !== mediaData.activeTrackIndex) {
      setPendingSeek(image, wasPlaying, correctTrackIndex);
      loadAudioTrack(correctTrackIndex, wasPlaying);
    } else if (audioReady) {
      seekToImageInCurrentTrack(image, wasPlaying);
    } else {
      setPendingSeek(image, wasPlaying, correctTrackIndex);
    }

    const targetMs = image.originalTimestamp?.getTime?.();
    const visibleImages = showMainImages([image], {
      absoluteMs: Number.isFinite(targetMs) ? targetMs : Date.now(),
      force: true,
    });
    const orderedVisible = sortImagesByTimestamp(visibleImages);
    highlightTimelineImages(orderedVisible);
    const highlightImage = orderedVisible.length
      ? orderedVisible[orderedVisible.length - 1]
      : null;
    const highlightMs = highlightImage?.originalTimestamp?.getTime?.() ?? targetMs;
    if (Number.isFinite(highlightMs ?? NaN)) {
      timelineState.currentCursorMs = highlightMs;
      updateTimelineCursor(highlightMs);
      updateTimelineActiveStates(highlightMs);
    }
    if (image.originalTimestamp) {
      updateAnalogClock(image.originalTimestamp);
    }
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hrs) {
      return [hrs, mins, secs].map((part) => String(part).padStart(2, "0")).join(":");
    }
    return [mins, secs].map((part) => String(part).padStart(2, "0")).join(":");
  }

  function formatClock(date) {
    const hrs = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  }

  function formatClockWithSeconds(date) {
    const hrs = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    const secs = String(date.getSeconds()).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  }

  function sortImagesByTimestamp(images) {
    if (!Array.isArray(images)) return [];
    return [...images].sort((a, b) => {
      const aMs = a?.originalTimestamp?.getTime?.();
      const bMs = b?.originalTimestamp?.getTime?.();
      if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
      if (!Number.isFinite(aMs)) return -1;
      if (!Number.isFinite(bMs)) return 1;
      return aMs - bMs;
    });
  }

  function updateAnalogClock(date) {
    if (!clockHourHand || !clockMinuteHand || !clockDate) return;
    
    const hours = date.getHours() % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    // Calculate angles (12 o'clock is 0 degrees, clockwise)
    const hourAngle = (hours * 30) + (minutes * 0.5) + (seconds * 0.00833); // 30° per hour + minute adjustment
    const minuteAngle = (minutes * 6) + (seconds * 0.1); // 6° per minute + second adjustment
    const secondAngle = seconds * 6; // 6° per second
    
    // Apply rotation to clock hands (analog)
    clockHourHand.setAttribute('transform', `rotate(${hourAngle} 50 50)`);
    clockMinuteHand.setAttribute('transform', `rotate(${minuteAngle} 50 50)`);
    
    if (clockSecondHand) {
      clockSecondHand.setAttribute('transform', `rotate(${secondAngle} 50 50)`);
    }
    
    // Update digital clock
    if (clockTime) {
      clockTime.textContent = formatClockWithSeconds(date);
    }
    
    // Update date display
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    clockDate.textContent = `${day}/${month}/${year}`;
  }

  function formatDurationMs(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    return formatTime(seconds);
  }

  function setupTimelineInteractions() {
    if (timelineInteractionsReady) return;
    timelineInteractionsReady = true;
  }

  function setupTimelineHover() {
    if (timelineHoverReady) return;
    if (!timelineMain) return;

    timelineHoverReady = true;
    timelineMain.addEventListener("mousemove", handleTimelineHoverMove);
    timelineMain.addEventListener("mouseleave", handleTimelineHoverLeave);
    timelineMain.addEventListener("click", handleTimelineClick);
  }

  function handleTimelineHoverMove(event) {
    if (!timelineState.initialized || !timelineMain) return;
    showHud();

    const rect = timelineMain.getBoundingClientRect();
    if (!rect.width) return;

    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const viewSpan = timelineState.viewEndMs - timelineState.viewStartMs;
    if (viewSpan <= 0) {
      hideTimelineHoverPreview();
      isHoverScrubbing = false;
      return;
    }

    const absoluteMs = timelineState.viewStartMs + viewSpan * ratio;
    if (!Number.isFinite(absoluteMs)) {
      hideTimelineHoverPreview();
      isHoverScrubbing = false;
      return;
    }

    if (!isHoverScrubbing) {
      isHoverScrubbing = true;
      hoverOriginalCursorMs = timelineState.currentCursorMs;
    }

    // Update seeker and preview position immediately (no flicker)
    if (timelineHoverPreview) {
      timelineHoverPreview.classList.remove("hidden");
      timelineHoverPreview.style.left = `${ratio * 100}%`;
    }

    if (timelineHoverPreviewTime) {
      timelineHoverPreviewTime.textContent = formatClockWithSeconds(new Date(absoluteMs));
    }

    updateTimelineSeeker(absoluteMs);

    // Render image preview immediately
    const images = getImagesForAbsoluteTime(absoluteMs);
    const orderedPreviewImages = sortImagesByTimestamp(images);
    renderTimelineHoverImages(orderedPreviewImages);
    highlightTimelineImages(orderedPreviewImages);
  }

  function handleTimelineHoverLeave() {
    hideTimelineHoverPreview();
    hideTimelineSeeker();
    if (isHoverScrubbing) {
      isHoverScrubbing = false;
      // Update to current playback position
      const absolute = playback.getAbsoluteTime();
      if (Number.isFinite(absolute)) {
        updateSlideForAbsoluteTime(absolute);
      } else {
        updateSlideForCurrentTime();
      }
    }
    scheduleHudHide();
  }

  function handleTimelineClick(event) {
    if (!timelineState.initialized || !timelineMain) return;

    const rect = timelineMain.getBoundingClientRect();
    if (!rect.width) return;

    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const viewSpan = timelineState.viewEndMs - timelineState.viewStartMs;
    if (viewSpan <= 0) return;

    const absoluteMs = timelineState.viewStartMs + viewSpan * ratio;
    if (!Number.isFinite(absoluteMs)) return;

    // Always start playing when clicking on timeline
    const shouldPlay = true;

    hideTimelineHoverPreview();
    isHoverScrubbing = false;

    // Always seek to the clicked time, regardless of images
    seekToAbsoluteMs(absoluteMs, shouldPlay, { forceDisplay: true });
    
    showHud();
  }

  function renderTimelineHoverImages(images) {
    if (!timelineHoverPreviewImages) return;
    const key = images.map((img) => img.url || img.name || "").join("|");
    if (currentHoverPreviewKey !== key) {
      currentHoverPreviewKey = key;
      timelineHoverPreviewImages.innerHTML = "";
      timelineHoverPreviewImages.className = "timeline__hover-preview-images";
      const count = Math.min(images.length, 4);
      if (count > 1) {
        timelineHoverPreviewImages.classList.add(`split-${count}`);
      }
      images.slice(0, 4).forEach((image, index) => {
        const img = document.createElement("img");
        img.src = image.url;
        img.alt = image.name || `Preview ${index + 1}`;
        timelineHoverPreviewImages.appendChild(img);
      });
    }
  }

  // REMOVED: Large preview images no longer shown on timeline hover
  // function renderPreviewImages(images) {
  //   if (!slideshowPreview) return;
  //   if (!Array.isArray(images) || images.length === 0) {
  //     hidePreviewImages();
  //     return;
  //   }
  //
  //   slideshowPreview.className = "slideshow__preview";
  //   slideshowPreview.innerHTML = "";
  //   const count = Math.min(images.length, 4);
  //   if (count > 1) {
  //     slideshowPreview.classList.add(`split-${Math.min(count, 4)}`);
  //   }
  //
  //   images.slice(0, 4).forEach((image, index) => {
  //     const img = document.createElement("img");
  //     img.src = image.url;
  //     img.alt = image.name || `Preview ${index + 1}`;
  //     slideshowPreview.appendChild(img);
  //   });
  //
  //   slideshowPreview.classList.remove("hidden");
  //   slideshowPreview.classList.add("active");
  // }

  // function hidePreviewImages() {
  //   if (!slideshowPreview) return;
  //   slideshowPreview.classList.remove("active");
  //   slideshowPreview.className = "slideshow__preview";
  //   slideshowPreview.innerHTML = "";
  //   if (!slideshowPreview.classList.contains("hidden")) {
  //     slideshowPreview.classList.add("hidden");
  //   }
  // }

  function hideTimelineHoverPreview() {
    currentHoverPreviewKey = null;
    if (timelineHoverPreview) {
      timelineHoverPreview.classList.add("hidden");
    }
    if (timelineHoverPreviewImages) {
      timelineHoverPreviewImages.className = "timeline__hover-preview-images";
      timelineHoverPreviewImages.innerHTML = "";
    }
  }

  function initializeTimeline(options = {}) {
    if (!timelineRoot || !mediaData || !mediaData.audioTracks) return;

    const data = buildTimelineData();
    if (!data) {
      destroyTimeline();
      timelineRoot.classList.add("hidden");
      return;
    }

    destroyTimeline();

    timelineState.initialized = true;
    timelineState.trackRanges = data.trackRanges;
    timelineState.imageEntries = data.imageEntries;
    timelineState.trackLaneCount = data.trackLaneCount;
    timelineState.imageStackMagnitude = data.imageStackMagnitude || 0;
    timelineState.anomalyMessages = data.anomalies || [];
    timelineState.minMs = data.minMs;
    timelineState.maxMs = data.maxMs;
    timelineState.totalMs = Math.max(data.maxMs - data.minMs, 1);
    timelineState.viewStartMs = timelineState.minMs;
    timelineState.viewEndMs = timelineState.maxMs;

    createTimelineTrackElements();
    createTimelineImageElements();
    updateTimelineGeometry();
    updateTimelineGradients();
    updateTimelineAxis();
    positionTimelineElements();
    timelineSetActiveTrack(mediaData.activeTrackIndex);
    highlightTimelineImages(sortImagesByTimestamp(currentDisplayedImages));
    updateTimelineCursor(timelineState.currentCursorMs);
    updateTimelineNotices();

    timelineRoot.classList.remove("hidden");
  }

  function destroyTimeline() {
    timelineState.initialized = false;
    timelineState.trackRanges = [];
    timelineState.imageEntries = [];
    timelineState.trackLaneCount = 0;
    timelineState.minMs = 0;
    timelineState.maxMs = 0;
    timelineState.totalMs = 0;
    timelineState.viewStartMs = 0;
    timelineState.viewEndMs = 0;
    timelineState.currentCursorMs = null;
    timelineState.highlightTimeMs = null;
    timelineState.imageStackMagnitude = 0;
    timelineState.anomalyMessages = [];

    if (timelineTracks) {
      timelineTracks.innerHTML = "";
      timelineTracks.style.removeProperty("--timeline-tracks-height");
    }
    if (timelineImages) {
      timelineImages.innerHTML = "";
      timelineImages.style.removeProperty("--timeline-images-height");
    }
    if (timelineMinimapTracks) {
      timelineMinimapTracks.innerHTML = "";
    }
    if (timelineMinimapImages) {
      timelineMinimapImages.innerHTML = "";
    }
    if (timelineAxis) {
      timelineAxis.innerHTML = "";
    }
    if (timelineGradient) {
      timelineGradient.style.removeProperty("backgroundImage");
    }
    if (timelineMinimapGradient) {
      timelineMinimapGradient.style.removeProperty("backgroundImage");
    }
    if (timelineNotices) {
      timelineNotices.innerHTML = "";
      timelineNotices.classList.add("hidden");
    }
    if (timelineCursor) {
      timelineCursor.classList.remove("timeline__cursor--visible");
      timelineCursor.style.removeProperty("left");
    }
    if (timelineMain) {
      timelineMain.style.removeProperty("height");
    }

    if (mediaData?.audioTracks) {
      mediaData.audioTracks.forEach((track) => {
        if (track) {
          track.timelineMainEl = null;
          track.timelineMiniEl = null;
        }
      });
    }
    if (mediaData?.images) {
      mediaData.images.forEach((image) => {
        if (image) {
          image.timelineMainEl = null;
          image.timelineMiniEl = null;
        }
      });
    }

    hideTimelineHoverPreview();
  }

  function buildTimelineData() {
    if (!mediaData || !Array.isArray(mediaData.audioTracks)) return null;

    const trackRanges = [];
    let minMs = Number.POSITIVE_INFINITY;
    let maxMs = Number.NEGATIVE_INFINITY;

    const delayMs = getDelaySeconds() * 1000;

    mediaData.audioTracks.forEach((track, index) => {
      if (!track || !track.duration) return;
      let startMs = track.adjustedStartTime ? track.adjustedStartTime.getTime() : null;
      if (!Number.isFinite(startMs)) {
        if (!(track.fileTimestamp instanceof Date)) return;
        const referenceMs = track.fileTimestamp.getTime();
        const durationMs = track.duration * 1000;
        // Apply delay: negative delay means audio started recording earlier
        startMs = referenceMs + delayMs;
        track.adjustedStartTime = new Date(startMs);
        track.adjustedEndTime = new Date(startMs + durationMs);
      }
      if (!Number.isFinite(startMs)) return;
      const endMs = startMs + track.duration * 1000;
      track.adjustedEndTime = new Date(endMs);
      trackRanges.push({ track, index, startMs, endMs });
      if (startMs < minMs) minMs = startMs;
      if (endMs > maxMs) maxMs = endMs;
    });

    if (!trackRanges.length) return null;

    trackRanges.sort((a, b) => a.startMs - b.startMs);

    const anomalies = [];
    let latestEndMs = null;
    let latestRange = null;

    trackRanges.forEach((range, lane) => {
      range.lane = lane;
      if (latestRange) {
        const overlap = (latestEndMs ?? latestRange.endMs) - range.startMs;
        if (overlap > 0) {
          range.overlapMs = overlap;
          latestRange.overlapAheadMs = Math.max(latestRange.overlapAheadMs || 0, overlap);
          if (overlap >= OVERLAP_REPORT_THRESHOLD_MS) {
            anomalies.push(
              `Overlap detected: "${range.track.label}" begins ${formatDurationMs(overlap)} before "${latestRange.track.label}" ends.`
            );
          }
        } else {
          range.gapMs = -overlap;
        }
      }
      latestEndMs = Math.max(latestEndMs ?? range.endMs, range.endMs);
      if (!latestRange || range.endMs >= latestRange.endMs) {
        latestRange = range;
      }
    });

    const imageEntries = mediaData.images
      .filter((image) => image && image.originalTimestamp instanceof Date)
      .map((image, idx) => {
        const timeMs = image.originalTimestamp.getTime();
        if (timeMs < minMs) minMs = timeMs;
        if (timeMs > maxMs) maxMs = timeMs;
        return { image, index: idx, timeMs };
      })
      .sort((a, b) => a.timeMs - b.timeMs);

    const maxOffsetMagnitude = layoutImageEntries(imageEntries);

    if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) {
      return null;
    }

    const baseSpan = Math.max(maxMs - minMs, 1);
    const padding = Math.max(
      5 * 60 * 1000,
      Math.min(baseSpan * TIMELINE_PADDING_RATIO, 30 * 60 * 1000)
    );
    const paddedMin = minMs - padding;
    const paddedMax = maxMs + padding;

    return {
      trackRanges,
      imageEntries,
      trackLaneCount: trackRanges.length,
      imageStackMagnitude: maxOffsetMagnitude,
      minMs: paddedMin,
      maxMs: paddedMax,
      anomalies,
    };
  }

  function layoutImageEntries(entries) {
    if (!entries.length) return 0;
    const active = [];
    let maxMagnitude = 0;

    entries.forEach((entry) => {
      while (active.length && entry.timeMs - active[0].timeMs > IMAGE_STACK_WINDOW_MS) {
        active.shift();
      }

      const usedOffsets = new Set(active.map((item) => item.offsetIndex));
      let offsetIndex = IMAGE_STACK_OFFSET_ORDER.find(
        (candidate) => !usedOffsets.has(candidate)
      );
      if (offsetIndex === undefined) {
        offsetIndex = 0;
      }

      entry.lane = 0;
      entry.offsetIndex = offsetIndex;
      entry.image.timelineLane = 0;
      entry.image.timelineOffsetIndex = offsetIndex;

      active.push({ timeMs: entry.timeMs, offsetIndex });
      maxMagnitude = Math.max(maxMagnitude, Math.abs(offsetIndex));
    });

    return maxMagnitude;
  }

  function updateTimelineGeometry() {
    if (!timelineState.initialized) return;

    // Fixed minimal timeline - all tracks on one line
    // No dynamic height calculation needed since CSS handles it
    
    // Don't override the CSS styles - keep timeline compact
    if (timelineTracks) {
      timelineTracks.style.removeProperty("--timeline-tracks-height");
    }
    if (timelineImages) {
      timelineImages.style.removeProperty("--timeline-images-height");
    }
    if (timelineMain) {
      timelineMain.style.removeProperty("height");
    }
  }

  function createTimelineTrackElements() {
    if (!timelineTracks) return;

    const mainFragment = document.createDocumentFragment();

    timelineState.trackRanges.forEach((range) => {
      const mainEl = document.createElement("div");
      mainEl.className = "timeline-track";
      mainEl.style.setProperty("--lane", range.lane);
      mainEl.dataset.index = String(range.index);
      const startLabel = formatClock(new Date(range.startMs));
      const endLabel = formatClock(new Date(range.endMs));
      let title = `"${range.track.label}"\n${startLabel} → ${endLabel}`;
      if (range.track.duration) {
        title += ` • ${formatTime(Math.round(range.track.duration))}`;
      }
      if (range.overlapMs) {
        title += `\nOverlap with previous: ${formatDurationMs(range.overlapMs)}`;
      } else if (range.overlapAheadMs) {
        title += `\nOverlap with next: ${formatDurationMs(range.overlapAheadMs)}`;
      }
      mainEl.title = title;

      // Remove click handler - clicking timeline background will handle seeking
      // mainEl.addEventListener("click", () => { ... });

      mainFragment.appendChild(mainEl);
      range.track.timelineMainEl = mainEl;

      // Minimap removed - set to null
      range.track.timelineMiniEl = null;
    });

    timelineTracks.innerHTML = "";
    timelineTracks.appendChild(mainFragment);
  }

  function createTimelineImageElements() {
    if (!timelineImages) return;

    const mainFragment = document.createDocumentFragment();

    timelineState.imageEntries.forEach((entry) => {
      const { image } = entry;
      const mainEl = document.createElement("div");
      mainEl.className = "timeline-image";
      const lane = entry.lane || 0;
      const offsetIndex = entry.offsetIndex || 0;
      mainEl.style.setProperty("--lane", lane);
      mainEl.style.setProperty("--stack-offset", `${offsetIndex * IMAGE_STACK_STEP_PX}px`);
      mainEl.title = `${image.timeOfDay} • ${image.timecode}`;

      const imgEl = document.createElement("img");
      imgEl.src = image.url;
      imgEl.alt = image.name || `Capture ${entry.index + 1}`;
      mainEl.appendChild(imgEl);

      // Remove click handler - images are not clickable
      // mainEl.addEventListener("click", (event) => { ... });

      mainFragment.appendChild(mainEl);
      image.timelineMainEl = mainEl;

      // Minimap removed - set to null
      image.timelineMiniEl = null;
    });

    timelineImages.innerHTML = "";
    timelineImages.appendChild(mainFragment);
  }

  function positionTimelineElements() {
    if (!timelineState.initialized) return;

    const viewRange = timelineState.viewEndMs - timelineState.viewStartMs;
    const totalRange = timelineState.totalMs;
    if (viewRange <= 0 || totalRange <= 0) return;

    // Batch DOM reads and writes to prevent layout thrashing
    const trackUpdates = [];
    const imageUpdates = [];

    // First pass: Calculate all positions (DOM reads)
    timelineState.trackRanges.forEach((range) => {
      const { track } = range;
      const mainEl = track.timelineMainEl;
      
      if (mainEl) {
        const inViewStart = clamp(range.startMs, timelineState.viewStartMs, timelineState.viewEndMs);
        const inViewEnd = clamp(range.endMs, timelineState.viewStartMs, timelineState.viewEndMs);
        const isVisible = !(inViewEnd <= timelineState.viewStartMs || inViewStart >= timelineState.viewEndMs);
        const spanPct = ((inViewEnd - inViewStart) / viewRange) * 100;
        
        trackUpdates.push({
          mainEl,
          isVisible,
          leftPct: isVisible ? ((inViewStart - timelineState.viewStartMs) / viewRange) * 100 : 0,
          widthPct: isVisible ? clamp(spanPct, AUDIO_MARKER_MIN_WIDTH_PCT, 100) : 0,
          lane: range.lane
        });
      }
    });

    timelineState.imageEntries.forEach((entry) => {
      const { image, timeMs, lane } = entry;
      const mainEl = image.timelineMainEl;
      const leftMain = ((timeMs - timelineState.viewStartMs) / viewRange) * 100;

      if (mainEl) {
        const isVisible = !(leftMain < -10 || leftMain > 110);
        imageUpdates.push({
          mainEl,
          isVisible,
          leftMain,
          lane,
          offsetIndex: entry.offsetIndex || 0
        });
      }
    });

    // Second pass: Apply all DOM writes in batch
    trackUpdates.forEach(update => {
      update.mainEl.style.display = update.isVisible ? 'block' : 'none';
      if (update.isVisible) {
        update.mainEl.style.setProperty('--lane', update.lane);
        update.mainEl.style.left = `${update.leftPct}%`;
        update.mainEl.style.width = `${update.widthPct}%`;
      }
    });

    imageUpdates.forEach(update => {
      update.mainEl.style.display = update.isVisible ? 'block' : 'none';
      if (update.isVisible) {
        update.mainEl.style.setProperty('--lane', update.lane);
        update.mainEl.style.setProperty('--stack-offset', `${update.offsetIndex * IMAGE_STACK_STEP_PX}px`);
        update.mainEl.style.left = `${update.leftMain}%`;
      }
    });
  }

  function updateTimelineAxis() {
    if (!timelineAxis || !timelineState.initialized) return;
    const range = timelineState.viewEndMs - timelineState.viewStartMs;
    timelineAxis.innerHTML = "";
    if (timelineGridlines) {
      timelineGridlines.innerHTML = "";
    }
    if (range <= 0) return;

    const step = computeTickStep(range);
    if (!step) return;

    const firstTick = alignToStep(timelineState.viewStartMs, step);
    for (let tick = firstTick; tick <= timelineState.viewEndMs + 1; tick += step) {
      const position = ((tick - timelineState.viewStartMs) / range) * 100;
      if (position < -2 || position > 102) continue;
      
      // Create axis tick
      const tickEl = document.createElement("div");
      tickEl.className = "timeline__axis-tick";
      tickEl.style.left = `${position}%`;
      tickEl.textContent = formatClock(new Date(tick));
      timelineAxis.appendChild(tickEl);
      
      // Create gridline
      if (timelineGridlines) {
        const gridlineEl = document.createElement("div");
        gridlineEl.className = "timeline__gridline";
        gridlineEl.style.left = `${position}%`;
        timelineGridlines.appendChild(gridlineEl);
      }
    }
  }

  function computeTickStep(rangeMs) {
    const hour = 60 * 60 * 1000;
    const halfHour = 30 * 60 * 1000;
    const quarterHour = 15 * 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;
    const minute = 60 * 1000;
    const halfMinute = 30 * 1000;

    if (rangeMs > 12 * hour) return 2 * hour;
    if (rangeMs > 6 * hour) return hour;
    if (rangeMs > 3 * hour) return halfHour;
    if (rangeMs > 90 * 60 * 1000) return quarterHour;
    if (rangeMs > 45 * 60 * 1000) return fiveMinutes;
    if (rangeMs > 15 * 60 * 1000) return minute;
    return halfMinute;
  }

  function alignToStep(startMs, stepMs) {
    return Math.ceil(startMs / stepMs) * stepMs;
  }

  function updateTimelineGradients() {
    if (!timelineState.initialized) return;
    if (timelineGradient) {
      // Create gradient spanning the entire timeline range
      timelineGradient.style.backgroundImage = createDayNightGradient(
        timelineState.minMs,
        timelineState.maxMs
      );
      
      // Update gradient position based on current view
      updateTimelineGradientPosition();
    }
    if (timelineMinimapGradient) {
      timelineMinimapGradient.style.backgroundImage = createDayNightGradient(
        timelineState.minMs,
        timelineState.maxMs
      );
    }
  }

  function updateTimelineGradientPosition() {
    if (!timelineGradient || !timelineState.initialized) return;
    
    const totalRange = timelineState.maxMs - timelineState.minMs;
    const viewRange = timelineState.viewEndMs - timelineState.viewStartMs;
    
    if (totalRange <= 0 || viewRange <= 0) return;
    
    // Calculate how much of the total timeline we're viewing
    const viewRatio = viewRange / totalRange;
    // Calculate where we are in the total timeline
    const offsetRatio = (timelineState.viewStartMs - timelineState.minMs) / totalRange;
    
    // Scale the background to cover the full timeline, then position it
    const backgroundSize = (100 / viewRatio);
    const backgroundPosition = -(offsetRatio * backgroundSize);
    
    timelineGradient.style.backgroundSize = `${backgroundSize}% 100%`;
    timelineGradient.style.backgroundPosition = `${backgroundPosition}% 0`;
  }

  function updateTimelineCursor(absoluteMs) {
    if (!timelineCursor || !timelineState.initialized) return;
    timelineState.currentCursorMs = absoluteMs;

    const range = timelineState.viewEndMs - timelineState.viewStartMs;
    if (
      typeof absoluteMs !== "number" ||
      !Number.isFinite(absoluteMs) ||
      range <= 0 ||
      absoluteMs < timelineState.viewStartMs ||
      absoluteMs > timelineState.viewEndMs
    ) {
      timelineCursor.classList.remove("timeline__cursor--visible");
      return;
    }

    const position = ((absoluteMs - timelineState.viewStartMs) / range) * 100;
    timelineCursor.style.left = `${position}%`;
    timelineCursor.classList.add("timeline__cursor--visible");
    
    // Update gradient position to animate with playback
    updateTimelineGradientPosition();
  }

  function updateTimelineSeeker(absoluteMs) {
    if (!timelineSeeker || !timelineState.initialized) return;

    const range = timelineState.viewEndMs - timelineState.viewStartMs;
    if (
      typeof absoluteMs !== "number" ||
      !Number.isFinite(absoluteMs) ||
      range <= 0 ||
      absoluteMs < timelineState.viewStartMs ||
      absoluteMs > timelineState.viewEndMs
    ) {
      timelineSeeker.classList.remove("timeline__seeker--visible");
      return;
    }

    const position = ((absoluteMs - timelineState.viewStartMs) / range) * 100;
    timelineSeeker.style.left = `${position}%`;
    timelineSeeker.classList.add("timeline__seeker--visible");
  }

  function hideTimelineSeeker() {
    if (!timelineSeeker) return;
    timelineSeeker.classList.remove("timeline__seeker--visible");
  }

  function updateTimelineActiveStates(highlightTimeMs) {
    timelineState.highlightTimeMs =
      typeof highlightTimeMs === "number" && Number.isFinite(highlightTimeMs)
        ? highlightTimeMs
        : null;

    if (!timelineState.initialized) return;

    timelineState.trackRanges.forEach((range) => {
      const { track } = range;
      const mainEl = track.timelineMainEl;
      const miniEl = track.timelineMiniEl;
      const isActive = mediaData?.activeTrackIndex === range.index;
      const isHighlighted =
        timelineState.highlightTimeMs !== null &&
        timelineState.highlightTimeMs >= range.startMs &&
        timelineState.highlightTimeMs <= range.endMs;
      const hasOverlap = (range.overlapMs && range.overlapMs > 0) || (range.overlapAheadMs && range.overlapAheadMs > 0);

      if (mainEl) {
        mainEl.classList.toggle("timeline-track--active", !!isActive);
        mainEl.classList.toggle("timeline-track--highlighted", !!isHighlighted);
        mainEl.classList.toggle("timeline-track--overlap", !!hasOverlap);
      }
      if (miniEl) {
        miniEl.classList.toggle("timeline-track--active", !!isActive);
        miniEl.classList.toggle("timeline-track--highlighted", !!isHighlighted);
        miniEl.classList.toggle("timeline-track--overlap", !!hasOverlap);
      }
    });
  }

  function updateTimelineNotices() {
    if (!timelineNotices) return;
    const messages = timelineState.anomalyMessages || [];
    if (!messages.length) {
      timelineNotices.innerHTML = "";
      timelineNotices.classList.add("hidden");
      return;
    }

    timelineNotices.innerHTML = messages
      .map((message) => `<div>${message}</div>`)
      .join("");
    timelineNotices.classList.remove("hidden");
  }

  function highlightTimelineImages(images) {
    if (!timelineState.initialized) return;
    const activeIds = new Set((images || []).map((img) => img && img.index));

    timelineState.imageEntries.forEach((entry) => {
      const { image } = entry;
      const isActive = activeIds.has(image.index);
      if (image.timelineMainEl) {
        image.timelineMainEl.classList.toggle("timeline-image--active", isActive);
      }
    });
  }

  function timelineSetActiveTrack(index) {
    if (!timelineState.initialized) return;
    if (typeof index !== "number" || Number.isNaN(index)) return;
    updateTimelineActiveStates(timelineState.highlightTimeMs);
  }

  function createDayNightGradient(startMs, endMs) {
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return "linear-gradient(to right, rgba(18, 31, 56, 0.45), rgba(23, 36, 58, 0.45))";
    }

    const total = endMs - startMs;
    const segments = [];
    let cursor = startMs;

    while (cursor < endMs) {
      const currentDate = new Date(cursor);
      const hour = currentDate.getHours();
      const isDay = hour >= 6 && hour < 18;
      const boundary = new Date(currentDate);

      if (isDay) {
        boundary.setHours(18, 0, 0, 0);
      } else if (hour < 6) {
        boundary.setHours(6, 0, 0, 0);
      } else {
        boundary.setDate(boundary.getDate() + 1);
        boundary.setHours(6, 0, 0, 0);
      }

      const boundaryMs = Math.min(boundary.getTime(), endMs);
      const startPct = ((cursor - startMs) / total) * 100;
      const endPct = ((boundaryMs - startMs) / total) * 100;
      const color = isDay
        ? "rgba(255, 214, 102, 0.16)"
        : "rgba(22, 32, 64, 0.42)";
      segments.push(`${color} ${startPct}% ${endPct}%`);

      if (boundaryMs === cursor) {
        cursor += 60 * 60 * 1000;
      } else {
        cursor = boundaryMs;
      }
    }

    return `linear-gradient(to right, ${segments.join(", ")})`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function releaseMediaResources(data) {
    if (!data) return;
    if (Array.isArray(data.audioTracks)) {
      data.audioTracks.forEach((track) => {
        if (track && track.url) {
          URL.revokeObjectURL(track.url);
        }
      });
    } else if (data.audioUrl) {
      URL.revokeObjectURL(data.audioUrl);
    }
    if (Array.isArray(data.images)) {
      data.images.forEach((image) => {
        if (image.url) URL.revokeObjectURL(image.url);
      });
    }
  }

  // ============================================================================
  // Final Cut Pro XML Export
  // ============================================================================
  // This export simulates the composition logic to generate accurate clips with:
  // - Proper durations based on actual visibility (not just MIN_IMAGE_DISPLAY_DURATION)
  // - Correct track assignments matching the slot system
  // - Markers with layout info (scale/position for multi-image layouts)
  // - Timeline structure compatible with Premiere Pro, DaVinci Resolve, and FCP
  //
  // NOTE: Motion effects are exported as MARKERS instead of effects because
  // Premiere Pro has difficulty translating FCP XML motion effects. The markers
  // contain all layout information (scale, position) for manual application.

  function exportFinalCutProXML() {
    const frameRate = 30;
    const timebase = 30;
    const width = 3840; // 4K
    const height = 2160; // 4K

    // Calculate timeline boundaries
    const timelineStart = mediaData.images[0]?.originalTimestamp?.getTime() || 0;
    const lastImage = mediaData.images[mediaData.images.length - 1];
    const timelineEnd = lastImage 
      ? lastImage.originalTimestamp.getTime() + MIN_IMAGE_DISPLAY_DURATION_MS
      : 0;
    const timelineDuration = timelineEnd - timelineStart;
    const timelineDurationFrames = msToFrames(timelineDuration, frameRate);

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence id="sequence-1">
    <name>Diapaudio Slideshow</name>
    <duration>${timelineDurationFrames}</duration>
    <rate>
      <timebase>${timebase}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <timecode>
      <rate>
        <timebase>${timebase}</timebase>
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
              <timebase>${timebase}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <width>${width}</width>
            <height>${height}</height>
            <pixelaspectratio>Square</pixelaspectratio>
          </samplecharacteristics>
        </format>`;

    // Generate image clips with proper layering
    const imageClips = generateImageClips(timelineStart, frameRate);
    const trackGroups = groupClipsByTrack(imageClips);

    // Add video tracks
    Object.keys(trackGroups).sort((a, b) => Number(a) - Number(b)).forEach(trackNum => {
      const clips = trackGroups[trackNum];
      xml += `
        <track>`;
      
      clips.forEach(clip => {
        const relativePath = getRelativePath(clip.filepath);
        xml += `
          <clipitem id="${clip.id}">
            <name>${escapeXml(clip.name)}</name>
            <duration>${clip.duration}</duration>
            <rate>
              <timebase>${timebase}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${clip.start}</start>
            <end>${clip.end}</end>
            <in>0</in>
            <out>${clip.duration}</out>
            <file id="${clip.fileId}">
              <name>${escapeXml(clip.filename)}</name>
              <pathurl>${relativePath}</pathurl>
              <rate>
                <timebase>${timebase}</timebase>
              </rate>
              <duration>${clip.duration}</duration>
              <media>
                <video>
                  <duration>${clip.duration}</duration>
                  <samplecharacteristics>
                    <width>${width}</width>
                    <height>${height}</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>${generateLayoutMarker(clip.trackNum, clip.totalTracks)}
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

    // Add audio tracks
    mediaData.audioTracks.forEach((track, index) => {
      const audioStartMs = track.adjustedStartTime?.getTime() || 0;
      const audioStartFrames = Math.max(0, msToFrames(audioStartMs - timelineStart, frameRate));
      const audioDurationFrames = msToFrames(track.duration * 1000, frameRate);
      const audioEndFrames = audioStartFrames + audioDurationFrames;
      const relativePath = getRelativePath(track.originalName);
      
      // Only add track if it's within timeline bounds
      if (audioStartFrames < timelineDurationFrames && audioEndFrames > 0) {
        xml += `
        <track>
          <clipitem id="audio-${index}">
            <name>${escapeXml(track.originalName)}</name>
            <duration>${audioDurationFrames}</duration>
            <rate>
              <timebase>${timebase}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${audioStartFrames}</start>
            <end>${audioEndFrames}</end>
            <in>0</in>
            <out>${audioDurationFrames}</out>
            <file id="audio-file-${index}">
              <name>${escapeXml(track.originalName)}</name>
              <pathurl>${relativePath}</pathurl>
              <rate>
                <timebase>${timebase}</timebase>
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
      }
    });

    xml += `
      </audio>
    </media>
  </sequence>
</xmeml>`;

    // Download XML file
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diapaudio-timeline.xml";
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateImageClips(timelineStart, frameRate) {
    const clips = [];
    let clipId = 1;
    
    // Simulate the composition over time to get accurate clip timings and layouts
    const timeStep = 100; // Check every 100ms for composition changes
    const timelineEnd = mediaData.images[mediaData.images.length - 1].originalTimestamp.getTime() + MIN_IMAGE_DISPLAY_DURATION_MS;
    const totalDuration = timelineEnd - timelineStart;
    
    // Track active clips: Map<imageIndex, { trackNum, startMs, layoutSize }>
    const activeClips = new Map();
    let nextTrackNum = 1;
    
    for (let currentMs = 0; currentMs <= totalDuration; currentMs += timeStep) {
      const absoluteMs = timelineStart + currentMs;
      
      // Get images that should be visible at this time using the actual composition logic
      const visibleImages = getImagesForAbsoluteTime(absoluteMs);
      const visibleIndices = new Set(
        visibleImages.map(img => mediaData.images.indexOf(img))
      );
      
      const currentLayoutSize = visibleImages.length;
      
      // End clips that are no longer visible
      const toRemove = [];
      activeClips.forEach((clipData, imageIndex) => {
        if (!visibleIndices.has(imageIndex)) {
          // Image is no longer visible - finalize the clip
          const durationMs = currentMs - clipData.startMs;
          const durationFrames = msToFrames(durationMs, frameRate);
          const startFrames = msToFrames(clipData.startMs, frameRate);
          
          if (durationFrames > 0) {
            const image = mediaData.images[imageIndex];
            clips.push({
              id: `clip-${clipId++}`,
              fileId: `file-${imageIndex}`,
              name: image.name,
              filename: image.name,
              filepath: image.name,
              trackNum: clipData.trackNum,
              totalTracks: clipData.layoutSize,
              start: startFrames,
              end: startFrames + durationFrames,
              duration: durationFrames
            });
          }
          
          toRemove.push(imageIndex);
        } else {
          // Update layout size if changed
          clipData.layoutSize = currentLayoutSize;
        }
      });
      
      // Remove finished clips
      toRemove.forEach(idx => activeClips.delete(idx));
      
      // Start new clips for newly visible images
      visibleImages.forEach((image, slotIndex) => {
        const imageIndex = mediaData.images.indexOf(image);
        if (!activeClips.has(imageIndex)) {
          // Assign track number based on slot position
          activeClips.set(imageIndex, {
            trackNum: slotIndex + 1,
            startMs: currentMs,
            layoutSize: currentLayoutSize
          });
        }
      });
    }
    
    // Finalize any remaining active clips at timeline end
    activeClips.forEach((clipData, imageIndex) => {
      const durationMs = totalDuration - clipData.startMs;
      const durationFrames = msToFrames(durationMs, frameRate);
      const startFrames = msToFrames(clipData.startMs, frameRate);
      
      if (durationFrames > 0) {
        const image = mediaData.images[imageIndex];
        clips.push({
          id: `clip-${clipId++}`,
          fileId: `file-${imageIndex}`,
          name: image.name,
          filename: image.name,
          filepath: image.name,
          trackNum: clipData.trackNum,
          totalTracks: clipData.layoutSize,
          start: startFrames,
          end: startFrames + durationFrames,
          duration: durationFrames
        });
      }
    });
    
    return clips;
  }

  function groupClipsByTrack(clips) {
    const tracks = {};
    clips.forEach(clip => {
      if (!tracks[clip.trackNum]) {
        tracks[clip.trackNum] = [];
      }
      tracks[clip.trackNum].push(clip);
    });
    return tracks;
  }

  function generateLayoutMarker(trackNum, totalTracks) {
    if (totalTracks === 1) return "";
    
    // Calculate layout info for the marker
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
    } else if (totalTracks >= 4) {
      scaleValue = 25;
      positionDesc = `column ${trackNum}`;
      layoutDesc = `Layout: 4-column split, ${positionDesc}, scale ${scaleValue}%`;
    }
    
    // Add a marker at the start of the clip
    return `
            <marker>
              <name>${escapeXml(layoutDesc)}</name>
              <comment>Track ${trackNum} of ${totalTracks} | Scale: ${scaleValue}% | Position: ${positionDesc}</comment>
              <in>0</in>
              <out>-1</out>
            </marker>`;
  }

  function msToFrames(ms, frameRate) {
    return Math.round((ms / 1000) * frameRate);
  }

  function getRelativePath(filename) {
    // Extract just the filename from any path
    const name = filename.split(/[/\\]/).pop();
    return name;
  }

  function escapeXml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
})();
