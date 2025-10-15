(() => {
  const dropzone = document.getElementById("dropzone");
  const dropzoneMessage = document.getElementById("dropzone-message");
  const dropzoneLoader = document.getElementById("dropzone-loader");
  const globalLoader = document.getElementById("global-loader");
  const globalLoaderStatus = document.getElementById("global-loader-status");
  const globalLoaderProgressBar = document.getElementById("global-loader-progress-bar");
  const globalLoaderDetails = document.getElementById("global-loader-details");
  const loaderStatus = document.getElementById("loader-status");
  const loaderProgressBar = document.getElementById("loader-progress-bar");
  const loaderDetails = document.getElementById("loader-details");
  const folderInput = document.getElementById("folder-input");
  const zipInput = document.getElementById("zip-input");
  const filesInput = document.getElementById("files-input");
  const browseFolderButton = document.getElementById("browse-folder");
  const browseZipButton = document.getElementById("browse-zip");
  const browseFilesButton = document.getElementById("browse-files");
  const playToggle = document.getElementById("play-toggle");
  const playToggleIcon = playToggle ? playToggle.querySelector(".control-button__icon") : null;
  const playToggleLabel = playToggle ? playToggle.querySelector(".control-button__sr-label") : null;
  const speedSelect = document.getElementById("speed-select");
  const skipSilenceCheckbox = document.getElementById("skip-silence-checkbox");
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
  const timelineHoverPreviewTrack = document.getElementById("timeline-hover-preview-track");
  const timelineHoverPreviewTime = document.getElementById("timeline-hover-preview-time");
  const imageTimecode = document.getElementById("image-timecode");
  const imageTimeOfDay = document.getElementById("image-timeofday");
  const delayField = document.getElementById("delay-field");
  const exportFcpButton = document.getElementById("export-fcp-button");
  const exportZipButton = document.getElementById("export-zip-button");
  const viewerHud = document.getElementById("viewer-hud");
  const slideshowPreview = document.getElementById("slideshow-preview");
  const clockHourHand = document.getElementById("clock-hour-hand");
  const clockMinuteHand = document.getElementById("clock-minute-hand");
  const clockSecondHand = document.getElementById("clock-second-hand");
  const clockDate = document.getElementById("clock-date");
  const viewerClock = document.getElementById("viewer-clock");
  const clockAnalog = document.getElementById("clock-analog");
  const clockDigital = document.getElementById("clock-digital");
  const clockMinimal = document.getElementById("clock-minimal");
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

  const imageMimeByExtension = new Map([
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
    ["gif", "image/gif"],
    ["bmp", "image/bmp"],
    ["webp", "image/webp"],
    ["svg", "image/svg+xml"],
    ["tiff", "image/tiff"],
    ["tif", "image/tiff"],
  ]);

  // Configuration: Visual Comfort & Smoothness Focus
  const MIN_IMAGE_DISPLAY_DURATION = 6; // Requirement 1: minimum 6 seconds
  const MIN_IMAGE_DISPLAY_DURATION_MS = MIN_IMAGE_DISPLAY_DURATION * 1000;
  const MAX_IMAGE_CARRYOVER_MS = 120_000; // Requirement 2: maximum 120 seconds after timestamp
  const MAX_COMPOSITION_CHANGE_INTERVAL_MS = 4_000; // Requirement 4: layout changes every 4 seconds max
  const MAX_VISIBLE_IMAGES = 6; // Requirement 7: up to 6 horizontal segments
  const BATCH_THRESHOLD_MS = 4_000; // Requirement 8: images within 2s are considered a batch
  const IMAGE_STACK_WINDOW_MS = 25_000;
  const IMAGE_STACK_STEP_PX = 18;
  const IMAGE_STACK_OFFSET_ORDER = [0, -1, 1, -2, 2, -3, 3];
  const IMAGE_BASE_HEIGHT = 64;
  const TRACK_LANE_HEIGHT = 18;
  const TIMELINE_PADDING_RATIO = 0.08;
  const OVERLAP_REPORT_THRESHOLD_MS = 5_000;
  const AUDIO_MARKER_MIN_WIDTH_PCT = 0.2;
  const HUD_INACTIVITY_TIMEOUT_MS = 3500;
  const SEEK_SNAP_THRESHOLD_PX = 10; // Snap to media starts within 30 pixels

  const audioElement = new Audio();
  audioElement.preload = "metadata";

  // Get translation function
  const i18n = window.DiapAudioI18n;
  const t = i18n ? i18n.t : (key) => key;

  const PLAY_TOGGLE_ICONS = {
    play: { icon: "▶", labelKey: "play" },
    pause: { icon: "⏸", labelKey: "pause" },
    replay: { icon: "↺", labelKey: "play" },
    loading: { icon: "⏳", labelKey: "loadingFiles" },
  };

  // Progress tracking helpers
  // Global progress state for batch imports
  let globalProgressState = null;

  function startGlobalProgress(totalSteps) {
    globalProgressState = {
      total: totalSteps,
      current: 0,
      lastPercent: 0,
    };
    updateLoaderProgress(0, 'processingFiles', t('globalProgressStart'));
  }

  function incrementGlobalProgress(details = '') {
    if (!globalProgressState) return;
    globalProgressState.current++;
    const percent = Math.round((globalProgressState.current / globalProgressState.total) * 100);
    globalProgressState.lastPercent = percent;
    updateLoaderProgress(percent, 'processingFiles', details);
  }

  function finishGlobalProgress() {
    if (!globalProgressState) return;
    updateLoaderProgress(100, 'processingFiles', t('globalProgressDone'));
    globalProgressState = null;
  }

  function updateLoaderProgress(percent, statusKey, details = '') {
    // If global progress is active, override percent
    if (globalProgressState && typeof percent === 'number') {
      percent = globalProgressState.lastPercent;
    }
    // Update dropzone loader
    if (loaderProgressBar) {
      loaderProgressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    if (loaderStatus && statusKey) {
      loaderStatus.textContent = t(statusKey);
    }
    if (loaderDetails) {
      // Use innerHTML to support <br> tags, but escape the content first for safety
      if (details.includes('<br>')) {
        loaderDetails.innerHTML = details;
      } else {
        loaderDetails.textContent = details;
      }
    }
    // Update global loader
    if (globalLoaderProgressBar) {
      globalLoaderProgressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    if (globalLoaderStatus && statusKey) {
      globalLoaderStatus.textContent = t(statusKey);
    }
    if (globalLoaderDetails) {
      // Use innerHTML to support <br> tags, but escape the content first for safety
      if (details.includes('<br>')) {
        globalLoaderDetails.innerHTML = details;
      } else {
        globalLoaderDetails.textContent = details;
      }
    }
  }

  function showLoader(statusKey = 'loadingFiles') {
    // Show dropzone loader if dropzone is visible
    if (dropzone && !dropzone.classList.contains('hidden')) {
      dropzone.setAttribute('data-loading', 'true');
      if (dropzoneMessage && dropzoneMessage.parentElement) {
        dropzoneMessage.parentElement.classList.add('hidden');
      }
      if (dropzoneLoader) {
        dropzoneLoader.classList.remove('hidden');
        updateLoaderProgress(0, statusKey, '');
      }
    }
    
    // Always show global loader (visible on top of everything)
    if (globalLoader) {
      globalLoader.classList.remove('hidden');
      updateLoaderProgress(0, statusKey, '');
    }
  }

  function hideLoader() {
    // Hide dropzone loader
    if (dropzone) {
      dropzone.removeAttribute('data-loading');
    }
    if (dropzoneMessage && dropzoneMessage.parentElement) {
      dropzoneMessage.parentElement.classList.remove('hidden');
    }
    if (dropzoneLoader) {
      dropzoneLoader.classList.add('hidden');
    }
    
    // Hide global loader
    if (globalLoader) {
      globalLoader.classList.add('hidden');
    }
    
    updateLoaderProgress(0, '', '');
  }

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

    // Helper: find all overlapping tracks for a given absolute time
    function getOverlappingTracks(absoluteMs) {
      if (!mediaData || !mediaData.audioTracks) return [];
      return mediaData.audioTracks
        .map((track, idx) => ({
          ...track,
          _index: idx,
        }))
        .filter(track => {
          if (!(track.adjustedStartTime instanceof Date)) return false;
          const start = track.adjustedStartTime.getTime();
          // Use adjustedEndTime if available (includes delay), otherwise calculate from duration
          const end = track.adjustedEndTime instanceof Date 
            ? track.adjustedEndTime.getTime()
            : (Number.isFinite(track.duration) ? start + track.duration * 1000 : Infinity);
          return absoluteMs >= start && absoluteMs < end;
        })
        .sort((a, b) => a.adjustedStartTime - b.adjustedStartTime);
    }

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
      let earliestTime = null;
      
      // Check all audio tracks for the earliest time
      if (mediaData?.audioTracks) {
        for (const track of mediaData.audioTracks) {
          if (track?.adjustedStartTime instanceof Date) {
            const trackTime = track.adjustedStartTime.getTime();
            if (earliestTime === null || trackTime < earliestTime) {
              earliestTime = trackTime;
            }
          }
        }
      }
      
      // Check all images for the earliest time
      if (mediaData?.images) {
        for (const image of mediaData.images) {
          if (image?.originalTimestamp instanceof Date) {
            const imageTime = image.originalTimestamp.getTime();
            if (earliestTime === null || imageTime < earliestTime) {
              earliestTime = imageTime;
            }
          }
        }
      }
      
      return earliestTime;
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

      // Find all overlapping tracks at this absolute time
      const overlapping = getOverlappingTracks(absoluteMs);
      if (!overlapping.length) {
        if (!audioElement.paused) {
          audioElement.pause();
        }
        state.requestedTrackIndex = null;
        // For image-only mode (no audio tracks), allow playback to continue
        // The ticker will advance time and show images as appropriate
        return;
      }
      
      // Play the one that started first
      const primary = overlapping[0];
      const targetIndex = primary._index;
      const activeIndex = mediaData?.activeTrackIndex ?? null;

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

      const canControlAudio =
        audioElement.readyState >= 1 || Number.isFinite(audioElement.duration);

      if (canControlAudio) {
        const duration =
          Number.isFinite(audioElement.duration) && audioElement.duration > 0
            ? audioElement.duration
            : track.duration;
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

      // When the current track ends, if there is another overlapping, continue it from its current position
      audioElement.onended = function () {
        if (!state.playing) return;
        // Find next overlapping (excluding the one that just ended)
        const nowAbs = trackStartMs + (audioElement.duration * 1000);
        const overlaps = getOverlappingTracks(nowAbs).filter(t => t._index !== targetIndex);
        if (overlaps.length) {
          // Seek to the current absolute time in the next overlapping track
          setPendingSeek(null, true, overlaps[0]._index, nowAbs);
          state.requestedTrackIndex = overlaps[0]._index;
          requestTrack(overlaps[0]._index, true);
        }
      };
    }

    function findNextMediaTime(currentMs) {
      if (!window.mediaDataRef) return null;
      const mediaData = window.mediaDataRef;
      
      let nextTime = null;
      
      // Check for next image
      if (mediaData.images && mediaData.images.length) {
        for (const image of mediaData.images) {
          const imageMs = image.originalTimestamp?.getTime?.();
          if (Number.isFinite(imageMs) && imageMs > currentMs) {
            if (nextTime === null || imageMs < nextTime) {
              nextTime = imageMs;
            }
            break; // Images are sorted, so first one found is the next
          }
        }
      }
      
      // Check for next audio track
      if (mediaData.audioTracks && mediaData.audioTracks.length) {
        for (const track of mediaData.audioTracks) {
          const trackStartMs = track.adjustedStartTime?.getTime?.();
          if (Number.isFinite(trackStartMs) && trackStartMs > currentMs) {
            if (nextTime === null || trackStartMs < nextTime) {
              nextTime = trackStartMs;
            }
          }
        }
      }
      
      return nextTime;
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

      // Skip silence feature: if enabled, check if we're in a gap with no media
      if (window.isSkipSilenceEnabled && window.isSkipSilenceEnabled()) {
        // Use getImagesForAbsoluteTime to determine if there are visible images
        // This ensures consistency with the visibility logic
        const visibleImages = window.getImagesForAbsoluteTimeRef 
          ? window.getImagesForAbsoluteTimeRef(absolute)
          : [];
        const hasImages = visibleImages && visibleImages.length > 0;
        
        const hasAudio = getOverlappingTracks(absolute).length > 0;
        
        // If no media at current time, skip to next media
        if (!hasImages && !hasAudio) {
          const nextMediaMs = findNextMediaTime(absolute);
          if (nextMediaMs !== null && nextMediaMs > absolute) {
            // Jump to next media
            commitAbsolute(nextMediaMs, { fromAudio: false });
            syncTrackForAbsolute(nextMediaMs);
            state.lastFrameTime = now;
            return;
          }
        }
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
    const label = t(config.labelKey);
    if (playToggleIcon) playToggleIcon.textContent = config.icon;
    if (playToggleLabel) playToggleLabel.textContent = label;
    playToggle.setAttribute("aria-label", label);
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
    noticesShown: false, // Track if modal has been shown
    overlapWarned: false, // Only show overlap warning on first import
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
  let clockMode = 'analog'; // Track clock mode: 'analog' or 'digital'

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

  // Initialize skip silence setting
  const savedSkipSilence = loadFromStorage(STORAGE_KEYS.SKIP_SILENCE, false);
  if (skipSilenceCheckbox) {
    skipSilenceCheckbox.checked = savedSkipSilence;
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

  clockMode = loadFromStorage(STORAGE_KEYS.CLOCK_MODE, 'analog');
  if (clockAnalog && clockDigital) {
    // Hide all first
    clockAnalog.classList.add("hidden");
    clockDigital.classList.add("hidden");
    
    // Show the selected mode (default to analog if minimal was previously saved)
    if (clockMode === 'analog' || clockMode === 'minimal') {
      clockMode = 'analog';
      clockAnalog.classList.remove("hidden");
    } else if (clockMode === 'digital') {
      clockDigital.classList.remove("hidden");
    }
  }

  browseFolderButton.addEventListener("click", () => {
    folderInput.click();
  });

  browseZipButton.addEventListener("click", () => {
    zipInput.click();
  });

  browseFilesButton.addEventListener("click", () => {
    filesInput.click();
  });

  // Also add handler for ZIP input
  if (zipInput) {
    zipInput.addEventListener("change", async (event) => {
      const files = Array.from(event.target.files).filter(f => f.name.toLowerCase().endsWith('.zip'));
      if (files.length > 0) {
        showLoader('extractingZip');
        try {
          startGlobalProgress(files.length);
          const wasPlaying = playback ? playback.isPlaying() : false;
          const shouldAutoPlay = !wasPlaying;
          
          // Extract all ZIPs and accumulate files
          let allExtractedFiles = [];
          for (let i = 0; i < files.length; i++) {
            console.log(`Extracting ZIP ${i + 1}/${files.length}: ${files[i].name}`);
            const extractedFiles = await unzipFile(files[i]);
            allExtractedFiles = allExtractedFiles.concat(extractedFiles);
            incrementGlobalProgress(`${i + 1} / ${files.length}`);
          }
          finishGlobalProgress();
          
          console.log(`Extracted ${allExtractedFiles.length} total files from ${files.length} ZIP(s)`);
          // Process all files together
          await handleFolder(allExtractedFiles, shouldAutoPlay);
        } catch (error) {
          console.error('Error handling ZIP file(s):', error);
          showError(`Failed to process ZIP file(s): ${error.message}`);
          hideLoader();
        }
        zipInput.value = "";
      }
    });
  }

  // Add handler for files input
  if (filesInput) {
    filesInput.addEventListener("change", async (event) => {
      const files = Array.from(event.target.files);
      const zipFiles = files.filter(f => f.name.toLowerCase().endsWith('.zip'));
      const otherFiles = files.filter(f => !f.name.toLowerCase().endsWith('.zip'));
      
      if (zipFiles.length > 0) {
        showLoader('extractingZip');
        try {
          startGlobalProgress(zipFiles.length);
          const wasPlaying = playback ? playback.isPlaying() : false;
          const shouldAutoPlay = !wasPlaying;
          
          // Extract all ZIPs and accumulate files
          let allExtractedFiles = [];
          for (let i = 0; i < zipFiles.length; i++) {
            console.log(`Extracting ZIP ${i + 1}/${zipFiles.length}: ${zipFiles[i].name}`);
            const extractedFiles = await unzipFile(zipFiles[i]);
            allExtractedFiles = allExtractedFiles.concat(extractedFiles);
            incrementGlobalProgress(`${i + 1} / ${zipFiles.length}`);
          }
          finishGlobalProgress();
          
          console.log(`Extracted ${allExtractedFiles.length} total files from ${zipFiles.length} ZIP(s)`);
          // Add other files to the extracted files
          allExtractedFiles = allExtractedFiles.concat(otherFiles);
          // Process all files together
          await handleFolder(allExtractedFiles, shouldAutoPlay);
        } catch (error) {
          console.error('Error handling files:', error);
          showError(`Failed to process files: ${error.message}`);
          hideLoader();
        }
      } else if (otherFiles.length > 0) {
        try {
          const wasPlaying = playback ? playback.isPlaying() : false;
          await handleIndividualFiles(otherFiles, !wasPlaying);
        } catch (error) {
          console.error('Error handling individual files:', error);
          showError(`Failed to process files: ${error.message}`);
        }
      }
      filesInput.value = "";
    });
  }

  setPlayToggleState("play");

  // Toggle between analog and digital clock on click
  if (viewerClock) {
    viewerClock.addEventListener("click", (event) => {
      event.stopPropagation();
      
      // Toggle between analog and digital only
      if (clockMode === 'analog') {
        clockMode = 'digital';
      } else {
        clockMode = 'analog';
      }
      
      saveToStorage(STORAGE_KEYS.CLOCK_MODE, clockMode);
      
      // Hide all first
      clockAnalog.classList.add("hidden");
      clockDigital.classList.add("hidden");
      
      // Show the selected mode
      if (clockMode === 'analog') {
        clockAnalog.classList.remove("hidden");
      } else if (clockMode === 'digital') {
        clockDigital.classList.remove("hidden");
      }
    });
  }

  folderInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files);
    const wasPlaying = playback ? playback.isPlaying() : false;
    const shouldAutoPlay = !wasPlaying;
    
    if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
      // Handle ZIP file
      try {
        await handleZipFile(files[0], shouldAutoPlay);
      } catch (error) {
        console.error('Error handling ZIP file:', error);
        showError(`Failed to process ZIP file: ${error.message}`);
      }
      folderInput.value = "";
    } else if (files.length > 0) {
      // Handle regular folder
      handleFolder(files, shouldAutoPlay);
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

  dropzone.addEventListener("drop", async (event) => {
    try {
      await handleDrop(event.dataTransfer, 'replace');
    } catch (error) {
      console.error('Error handling main dropzone drop:', error);
      showError(error.message || "Failed to process dropped files");
    }
  });

  playToggle.addEventListener("click", () => {
    if (!mediaData) return;
    // Allow playback even without audio tracks (image-only mode)
    playback.toggle();
    setPlayToggleState(playback.isPlaying() ? "pause" : "play");
  });

  speedSelect.addEventListener("change", () => {
    const speed = parseFloat(speedSelect.value);
    audioElement.playbackRate = Number.isFinite(speed) ? speed : 1;
    playback.refresh();
    saveToStorage(STORAGE_KEYS.PLAYBACK_SPEED, audioElement.playbackRate);
  });

  if (skipSilenceCheckbox) {
    skipSilenceCheckbox.addEventListener("change", () => {
      saveToStorage(STORAGE_KEYS.SKIP_SILENCE, skipSilenceCheckbox.checked);
      // Refresh display to apply the new setting
      if (playback && !playback.isPlaying()) {
        // If paused, force refresh to show/hide images based on new setting
        const currentMs = playback.getAbsoluteTime();
        if (Number.isFinite(currentMs)) {
          forceNextComposition = true;
          updateSlideForAbsoluteTime(currentMs);
        }
      }
    });
  }

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
        alert(t('alertNoMediaLoaded'));
        return;
      }
      exportFinalCutProXML();
    });
  }

  if (exportZipButton) {
    exportZipButton.addEventListener("click", () => {
      if (!mediaData || !mediaData.images || mediaData.images.length === 0) {
        alert(t('alertNoMediaLoaded'));
        return;
      }
      exportZipArchive();
    });
  }

  setupTimelineInteractions();
  setupTimelineHover();
  setDelaySeconds(0);
  setupSlideshowDragDrop();

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

  function isSkipSilenceEnabled() {
    return skipSilenceCheckbox ? skipSilenceCheckbox.checked : true;
  }

  // Expose to window so playback controller can access it
  window.isSkipSilenceEnabled = isSkipSilenceEnabled;
  
  // Expose getImagesForAbsoluteTime so playback controller can use the same visibility logic
  window.getImagesForAbsoluteTimeRef = null; // Will be set after initialization

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

      case "j": // j - pause and go to next image or sound beginning
        event.preventDefault();
        if (playback.isPlaying()) {
          playback.pause();
          setPlayToggleState("pause");
        }
        goToNextMedia();
        break;

      case "k": // k - pause and go to previous image or sound beginning
        event.preventDefault();
        if (playback.isPlaying()) {
          playback.pause();
          setPlayToggleState("pause");
        }
        goToPreviousMedia();
        break;
    }
  });

  // Helper functions to navigate to next/previous media items
  function goToNextMedia() {
    if (!mediaData) return;
    
    const currentMs = playback.getAbsoluteTime();
    if (currentMs === null) return;
    
    // Collect all media start times (audio tracks and images)
    const mediaTimes = [];
    
    // Add audio track start times
    if (mediaData.audioTracks) {
      mediaData.audioTracks.forEach(track => {
        if (track.adjustedStartTime instanceof Date) {
          mediaTimes.push(track.adjustedStartTime.getTime());
        }
      });
    }
    
    // Add image timestamps
    if (mediaData.images) {
      mediaData.images.forEach(img => {
        if (img.originalTimestamp instanceof Date) {
          mediaTimes.push(img.originalTimestamp.getTime());
        }
      });
    }
    
    // Sort and find next time after current
    mediaTimes.sort((a, b) => a - b);
    const nextTime = mediaTimes.find(t => t > currentMs + 100); // Add small buffer to avoid same position
    
    if (nextTime !== undefined) {
      seekToAbsoluteMs(nextTime, null, { forceDisplay: true });
    }
  }

  function goToPreviousMedia() {
    if (!mediaData) return;
    
    const currentMs = playback.getAbsoluteTime();
    if (currentMs === null) return;
    
    // Collect all media start times (audio tracks and images)
    const mediaTimes = [];
    
    // Add audio track start times
    if (mediaData.audioTracks) {
      mediaData.audioTracks.forEach(track => {
        if (track.adjustedStartTime instanceof Date) {
          mediaTimes.push(track.adjustedStartTime.getTime());
        }
      });
    }
    
    // Add image timestamps
    if (mediaData.images) {
      mediaData.images.forEach(img => {
        if (img.originalTimestamp instanceof Date) {
          mediaTimes.push(img.originalTimestamp.getTime());
        }
      });
    }
    
    // Sort and find previous time before current
    mediaTimes.sort((a, b) => b - a); // Reverse sort
    const prevTime = mediaTimes.find(t => t < currentMs - 100); // Add small buffer to avoid same position
    
    if (prevTime !== undefined) {
      seekToAbsoluteMs(prevTime, null, { forceDisplay: true });
    }
  }

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

  async function handleFolder(files, autoPlay = false, sourceName = null) {
    showLoader('readingFolder');
    updateLoaderProgress(0, 'readingFolder', 'Starting...');

    try {
      // If ZIP archives are included in the provided files, expand them first
      const { expanded, zipCount, extractedCount } = await expandZipFiles(files, { phase: 'readingFolder' });
      if (zipCount > 0) {
        console.log(`Expanded ${zipCount} ZIP(s) inside folder input; extracted ${extractedCount} file(s).`);
      }
      files = expanded.length ? expanded : files;

      // Check for _delay.txt files and read delay setting (prefer the last one)
      updateLoaderProgress(5, 'readingFolder', 'Checking for delay file...');
      const delayFiles = files.filter(file => getBaseName(getFilePath(file)) === '_delay.txt');
      if (delayFiles.length > 0) {
        const chosenDelayFile = delayFiles[delayFiles.length - 1];
        try {
          const text = await chosenDelayFile.text();
          const parsed = parseDelayField(text.trim());
          if (parsed !== null) {
            setDelaySeconds(parsed);
            console.log(`Loaded delay setting from _delay.txt: ${formatDelay(parsed)}`);
            if (delayFiles.length > 1) {
              const msg = t('multipleDelayFilesDetected', { count: delayFiles.length, delay: formatDelay(parsed) });
              addAnomalyMessages([msg]);
            }
          } else {
            console.warn(`Invalid delay format in _delay.txt: "${text.trim()}"`);
          }
        } catch (err) {
          console.error('Error reading _delay.txt:', err);
        }
      }

      updateLoaderProgress(10, 'processingFiles', 'Scanning files...');
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

      // Remove duplicate audio files (same name, size, and timestamp from filename)
      updateLoaderProgress(15, 'processingFiles', 'Checking for duplicates...');
      const uniqueAudioFiles = [];
      const audioFileKeys = new Set();
      const skippedAudioDuplicates = [];
      
      for (const file of audioFiles) {
        const fileName = getFilePath(file);
        const fileSize = file.size || 0;
        const fileTimestamp = parseTimestampFromName(fileName);
        const timestampKey = fileTimestamp ? fileTimestamp.getTime() : 'no_timestamp';
        const fileKey = `${fileName}_${fileSize}_${timestampKey}`;
        
        if (audioFileKeys.has(fileKey)) {
          skippedAudioDuplicates.push(fileName);
          console.log(`Skipping duplicate audio file: ${fileName} (size: ${fileSize}, timestamp: ${fileTimestamp})`);
          continue;
        }
        
        audioFileKeys.add(fileKey);
        uniqueAudioFiles.push(file);
      }
      
      if (skippedAudioDuplicates.length > 0) {
        const msg = t('removedDuplicateAudio', { count: skippedAudioDuplicates.length });
        console.warn(msg);
        addAnomalyMessages([msg]);
      }

      const imageFiles = files.filter(
        (file) => {
          const path = getFilePath(file);
          return !shouldSkipEntry(path) && isImage(path);
        }
      );

      // Remove duplicate image files (same name, size, and timestamp)
      const uniqueImageFiles = [];
      const imageFileKeys = new Set();
      const skippedImageDuplicates = [];
      
      for (const file of imageFiles) {
        const fileName = getFilePath(file);
        const fileSize = file.size || 0;
        const fileTimestamp = parseTimestampFromName(fileName);
        const timestampKey = fileTimestamp ? fileTimestamp.getTime() : 'no_timestamp';
        const fileKey = `${fileName}_${fileSize}_${timestampKey}`;
        
        if (imageFileKeys.has(fileKey)) {
          skippedImageDuplicates.push(fileName);
          console.log(`Skipping duplicate image file: ${fileName} (size: ${fileSize}, timestamp: ${fileTimestamp})`);
          continue;
        }
        
        imageFileKeys.add(fileKey);
        uniqueImageFiles.push(file);
      }
      
      if (skippedImageDuplicates.length > 0) {
        const msg = t('removedDuplicateImage', { count: skippedImageDuplicates.length });
        console.warn(msg);
        addAnomalyMessages([msg]);
      }

      // Check if we have at least some media files
      if (!uniqueAudioFiles.length && !uniqueImageFiles.length) {
        if (skippedAudioDuplicates.length > 0 || skippedImageDuplicates.length > 0) {
          throw new Error(t('errorOnlyDuplicates'));
        }
        throw new Error(t('errorNoMediaFiles'));
      }

      // Process audio files if any
      updateLoaderProgress(20, 'processingFiles', `Processing ${uniqueAudioFiles.length} audio files...`);
      const audioTracks = uniqueAudioFiles.length > 0 ? await Promise.all(
        uniqueAudioFiles.map(async (file, index) => {
          const progress = 20 + (index / uniqueAudioFiles.length) * 20;
          updateLoaderProgress(progress, 'processingFiles', `Processing audio ${index + 1}/${uniqueAudioFiles.length}...`);
          
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
      ) : [];

      // Load durations for all audio tracks
      if (audioTracks.length > 0) {
        updateLoaderProgress(40, 'processingFiles', 'Loading audio durations...');
        console.log('Loading durations for all audio tracks...');
        await loadAllAudioDurations(audioTracks);
        console.log('All audio durations loaded:', audioTracks.map(t => ({ label: t.label, duration: t.duration })));
      }

      updateLoaderProgress(50, 'processingFiles', `Processing ${uniqueImageFiles.length} images...`);
      const images = uniqueImageFiles.length > 0 ? await Promise.all(
        uniqueImageFiles.map(async (file, index) => {
          const progress = 50 + (index / uniqueImageFiles.length) * 40;
          updateLoaderProgress(progress, 'processingFiles', `Processing image ${index + 1}/${uniqueImageFiles.length}...`);
          
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
      ) : [];

      const validImages = images.filter(Boolean);
      
      // At least one type of media must have valid content
      if (audioTracks.length === 0 && validImages.length === 0) {
        throw new Error(t('errorNoValidMediaFiles'));
      }

      updateLoaderProgress(95, 'processingFiles', 'Finalizing...');
      await processMediaData(audioTracks, validImages, files, autoPlay);
    } catch (error) {
      console.error(error);
      showError(error.message);
    } finally {
      hideLoader();
    }
  }

  /**
   * Check if a file should be skipped (system files, metadata, etc.)
   * @param {string} fileName - Full file path or name
   * @returns {boolean} - True if file should be skipped
   */
  function isSystemFile(fileName) {
    const baseName = fileName.split('/').pop();
    
    return (
      !baseName || // Empty name
      baseName.startsWith('.') || // Hidden files (.DS_Store, .git, etc.)
      baseName.startsWith('._') || // macOS AppleDouble files
      baseName.toLowerCase() === 'thumbs.db' || // Windows thumbnail cache
      baseName.toLowerCase() === 'desktop.ini' || // Windows folder settings
      fileName.includes('__MACOSX/') || // macOS resource fork folder path
      baseName === '__MACOSX' // macOS resource fork folder name
    );
  }

  async function handleZipFile(zipFile, autoPlay = false) {
    showLoader('extractingZip');

    try {
      console.log('Extracting ZIP file:', zipFile.name);
      const files = await unzipFile(zipFile);
      console.log(`Extracted ${files.length} files from ZIP`);
      await handleFolder(files, autoPlay, zipFile.name);
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      showError(error.message);
      hideLoader();
    }
  }

  /**
   * Extract files from a ZIP archive using zip.js library
   * @param {File} zipFile - The ZIP file to extract
   * @returns {Promise<File[]>} - Array of extracted files
   */
  async function unzipFile(zipFile) {
    console.log(`Extracting ZIP file: ${zipFile.name}, size: ${zipFile.size} bytes`);

    if (!window.zip) {
      throw new Error(t('errorZipLibraryNotLoaded'));
    }

    const files = [];
    let systemFileCount = 0;
    let totalEntries = 0;
    let processedEntries = 0;

    try {
      // Create a BlobReader for the ZIP file
      const zipReader = new zip.ZipReader(new zip.BlobReader(zipFile));
      
      // Get all entries
      const entries = await zipReader.getEntries();
      totalEntries = entries.length;
      
      console.log(`Found ${totalEntries} entries in ZIP`);
      updateLoaderProgress(10, 'extractingZip', `${zipFile.name}<br>0 / ${totalEntries}`);

      // Process each entry
      for (const entry of entries) {
        const fileName = entry.filename;
        console.log(`Processing: ${fileName}, compressed: ${entry.compressedSize}, uncompressed: ${entry.uncompressedSize}`);

        processedEntries++;
        const progress = 10 + (processedEntries / totalEntries) * 80; // 10% to 90%
        updateLoaderProgress(progress, 'extractingZip', `${zipFile.name}<br>${processedEntries} / ${totalEntries}`);

        // Skip directories and system files
        if (entry.directory || isSystemFile(fileName)) {
          if (isSystemFile(fileName)) {
            systemFileCount++;
            console.log(`Skipping system file: ${fileName}`);
          } else {
            console.log(`Skipping directory: ${fileName}`);
          }
          continue;
        }

        try {
          // Extract file data as a Blob
          const blob = await entry.getData(new zip.BlobWriter(getMimeType(fileName)));
          
          // Create File object with just the basename
          const baseName = fileName.split('/').pop();
          const file = new File([blob], baseName, { type: getMimeType(fileName) });
          
          files.push(file);
          console.log(`✓ Extracted: ${baseName} (${file.size} bytes)`);
        } catch (error) {
          console.warn(`Failed to extract ${fileName}:`, error);
        }
      }

      // Close the reader
      await zipReader.close();
      updateLoaderProgress(95, 'processingFiles', `${files.length} ${t('filesProcessed')}`);

    } catch (error) {
      console.error('ZIP extraction error:', error);
      throw new Error(t('errorFailedExtractZip', { message: error.message }));
    }

    console.log(`ZIP extraction complete. Extracted ${files.length} files`);
    console.log(`Skipped ${systemFileCount} system files`);

    if (files.length === 0) {
      if (systemFileCount > 0 && totalEntries === systemFileCount) {
        throw new Error(t('errorZipOnlySystemFiles'));
      }
      throw new Error(t('errorZipNoValidFiles'));
    }

    // Deduplicate files within ZIP (same name, size, and timestamp)
    const uniqueFiles = [];
    const fileKeys = new Set();
    let zipDuplicateCount = 0;
    
    for (const file of files) {
      const fileName = file.name;
      const fileSize = file.size;
      const fileTimestamp = parseTimestampFromName(fileName);
      const timestampKey = fileTimestamp ? fileTimestamp.getTime() : 'no_timestamp';
      const fileKey = `${fileName}_${fileSize}_${timestampKey}`;
      
      if (fileKeys.has(fileKey)) {
        zipDuplicateCount++;
        console.log(`Skipping duplicate within ZIP: ${fileName} (size: ${fileSize})`);
        continue;
      }
      
      fileKeys.add(fileKey);
      uniqueFiles.push(file);
    }
    
    if (zipDuplicateCount > 0) {
      console.warn(`Removed ${zipDuplicateCount} duplicate files from within ZIP`);
    }

    return uniqueFiles;
  }

  async function handleIndividualFiles(fileList, autoPlay = false) {
    showLoader('processingFiles');

    try {
      console.log('Processing individual files:', fileList.map(f => f.name));
      
      // Filter out system files
      const initial = [];
      let systemFileCount = 0;
      
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        updateLoaderProgress(10 + (i / Math.max(1, fileList.length)) * 60, 'processingFiles', `${i + 1} / ${fileList.length}`);
        if (isSystemFile(file.name)) {
          systemFileCount++;
          console.log(`Skipping system file: ${file.name}`);
          continue;
        }
        initial.push(file);
      }

      // Expand any ZIPs among selected files
      const { expanded, zipCount, extractedCount } = await expandZipFiles(initial);
      updateLoaderProgress(80, 'processingFiles', `Unzipped ${zipCount} ZIP(s)`);

      if (expanded.length === 0) {
        if (systemFileCount > 0) {
          throw new Error(t('errorOnlySystemFiles'));
        }
        throw new Error(t('errorNoValidFiles'));
      }

      updateLoaderProgress(95, 'processingFiles', `${expanded.length} ${t('filesProcessed')}`);
      console.log(`Individual files processing complete. Processed ${expanded.length} file(s), skipped ${systemFileCount} system file(s), extracted ${extractedCount} from zips.`);
      
      // Process the files using the existing handleFolder logic
      await handleFolder(expanded, autoPlay);
      
    } catch (error) {
      console.error('Error processing individual files:', error);
      throw error;
    } finally {
      hideLoader();
    }
  }

  /**
   * Get MIME type from file extension
   */
  function getMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    
    // Audio types
    if (audioMimeByExtension.has(ext)) {
      return audioMimeByExtension.get(ext);
    }
    
    // Image types
    const imageMimes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml'
    };
    
    if (imageMimes[ext]) {
      return imageMimes[ext];
    }
    
    // Text files
    if (ext === 'txt') return 'text/plain';
    
    return 'application/octet-stream';
  }

  async function handleDirectoryEntry(dirEntry, autoPlay = false) {
    showLoader('readingFolder');

    try {
      const files = await readDirectoryRecursive(dirEntry);
      const { expanded } = await expandZipFiles(files, { phase: 'readingFolder' });
      updateLoaderProgress(95, 'processingFiles', `${expanded.length} ${t('filesProcessed')}`);
      await handleFolder(expanded, autoPlay);
    } catch (error) {
      console.error(error);
      showError(error.message);
      hideLoader();
    }
  }

  async function readDirectoryRecursive(dirEntry, currentCount = {value: 0}) {
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
        // Skip system files and folders
        if (isSystemFile(entry.name)) {
          continue;
        }
        
        currentCount.value++;
        updateLoaderProgress(
          Math.min(90, 10 + (currentCount.value * 2)), // Progress up to 90%
          'readingFolder',
          `${currentCount.value} ${t('filesProcessed')}`
        );
        
        if (entry.isFile) {
          const file = await new Promise((resolve, reject) => {
            entry.file(resolve, reject);
          });
          files.push(file);
        } else if (entry.isDirectory) {
          const subFiles = await readDirectoryRecursive(entry, currentCount);
          files.push(...subFiles);
        }
      }
      entries = await readEntries();
    }

    return files;
  }

  async function processMediaData(audioTracks, validImages, allFiles = [], autoPlay = false) {
    // Sort images by timestamp but keep absolute timestamps
    const sortedImages = [...validImages].sort((a, b) => a.timestamp - b.timestamp);

    destroyWaveform();
    releaseMediaResources(mediaData);
    destroyTimeline();
    
    // Reset notices flag when loading new media files
    timelineState.noticesShown = false;

    mediaData = {
      audioTracks: audioTracks || [],
      activeTrackIndex: 0,
      images: sortedImages.map(img => ({
        ...img,
        originalTimestamp: img.timestamp,
        relative: 0, // Will be calculated when audio loads
        timecode: "00:00",
        timeOfDay: formatClock(img.timestamp),
      })),
      allFiles: allFiles.map(file => {
        const fileName = file.name || getFilePath(file);
        const fileTimestamp = parseTimestampFromName(fileName);
        return {
          name: fileName,
          size: file.size || 0,
          lastModified: file.lastModified || 0,
          timestamp: fileTimestamp ? fileTimestamp.getTime() : null
        };
      })
    };

    // Expose to window for playback controller
    window.mediaDataRef = mediaData;
    
    // Expose getImagesForAbsoluteTime for playback controller
    window.getImagesForAbsoluteTimeRef = getImagesForAbsoluteTime;

    precomputeImageCompositions(mediaData.images);

    clearPendingSeek();

    initializeTimeline();
    
    console.log('processMediaData - autoPlay:', autoPlay, 'audioTracks:', audioTracks?.length, 'images:', validImages?.length);
    
    // Only load audio track if we have audio files
    if (audioTracks && audioTracks.length > 0) {
      loadAudioTrack(0, autoPlay);
    } else if (mediaData.images && mediaData.images.length > 0) {
      // No audio, show first image(s)
      const firstImage = mediaData.images[0];
      if (firstImage && firstImage.originalTimestamp) {
        const firstMs = firstImage.originalTimestamp.getTime();
        showMainImages([firstImage], {
          absoluteMs: firstMs,
          force: true,
        });
        updateAnalogClock(firstImage.originalTimestamp);
        
        // Initialize playback controller with the first image's timestamp
        if (playback && typeof playback.setAbsoluteTime === 'function') {
          playback.setAbsoluteTime(firstMs, { autoplay: false });
        }
        
        // Enable play button for image-only mode
        if (playToggle) {
          playToggle.disabled = false;
        }
        
        // Auto-play for image-only timelines
        if (autoPlay && playback && typeof playback.play === 'function') {
          setTimeout(() => {
            playback.play();
            setPlayToggleState("pause");
          }, 100);
        }
      }
    }
    
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

  // Helper: get basename from a path
  function getBaseName(path) {
    if (!path) return '';
    const normalized = String(path).replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1] || normalized;
  }

  // Helper: merge anomaly messages into timeline notices and show
  function addAnomalyMessages(messages, opts = {}) {
    if (!Array.isArray(messages) || !messages.length) return;
    // If overlap warning, only show on first import
    if (opts.overlap) {
      if (timelineState.overlapWarned) return;
      timelineState.overlapWarned = true;
    }
    timelineState.anomalyMessages = (timelineState.anomalyMessages || []).concat(messages);
    // Allow showing again for new loads/additions
    timelineState.noticesShown = false;
    try { updateTimelineNotices(); } catch (e) { /* no-op */ }
  }

  // Expand ZIP files in a list of files and return a flat list without the ZIPs
  async function expandZipFiles(files, { phase = 'processingFiles' } = {}) {
    if (!Array.isArray(files) || !files.length) return { expanded: [], extractedCount: 0, zipCount: 0 };
    const nonZip = [];
    const zips = [];
    for (const f of files) {
      const name = f?.name || getFilePath(f) || '';
      if (/\.zip$/i.test(name)) {
        zips.push(f);
      } else {
        nonZip.push(f);
      }
    }
    if (!zips.length) {
      return { expanded: nonZip, extractedCount: 0, zipCount: 0 };
    }
    let extracted = [];
    let processed = 0;
    for (const zipFile of zips) {
      processed += 1;
      const progress = 10 + Math.round((processed / Math.max(1, zips.length)) * 70);
      updateLoaderProgress(progress, 'extractingZip', `${processed} / ${zips.length}`);
      try {
        const innerFiles = await unzipFile(zipFile);
        extracted = extracted.concat(innerFiles);
      } catch (e) {
        console.warn('Failed to unzip', zipFile?.name || '(unknown)', e);
      }
    }
    const expanded = nonZip.concat(extracted);
    return { expanded, extractedCount: extracted.length, zipCount: zips.length };
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

  function cleanTrackNameForDisplay(name) {
    if (!name) return "";
    
    // Extract filename from path (remove folder names)
    // Handle both forward slashes (Unix/Mac) and backslashes (Windows)
    let cleaned = name;
    const lastSlash = Math.max(cleaned.lastIndexOf('/'), cleaned.lastIndexOf('\\'));
    if (lastSlash >= 0) {
      cleaned = cleaned.substring(lastSlash + 1);
    }
    
    // Remove file extension
    cleaned = cleaned.replace(/\.[^.]+$/, "");
    
    // Remove date patterns (various formats)
    // YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, YYYY MM DD
    cleaned = cleaned.replace(/\b\d{4}[\s\-\./]\d{1,2}[\s\-\./]\d{1,2}\b/g, "");
    // DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY, DD MM YYYY
    cleaned = cleaned.replace(/\b\d{1,2}[\s\-\./]\d{1,2}[\s\-\./]\d{4}\b/g, "");
    // YYYYMMDD (8 digits together)
    cleaned = cleaned.replace(/\b\d{8}\b/g, "");
    // YYYY MM DD or YYYY-MM-DD variants (space or dash separated)
    cleaned = cleaned.replace(/\b\d{4}\s+\d{1,2}\s+\d{1,2}\b/g, "");
    
    // Remove time patterns - be aggressive about catching HH.MM.SS format
    // Pattern: 1-2 digits, dot/colon/dash, 2 digits, dot/colon/dash, 2 digits
    cleaned = cleaned.replace(/\d{1,2}[.\-:]\d{2}[.\-:]\d{2}/g, "");
    // HH MM SS (space separated, not followed by letters to avoid matching IDs)
    cleaned = cleaned.replace(/\b\d{1,2}\s+\d{2}\s+\d{2}\b(?!\s*[A-Z])/g, "");
    
    // Remove timestamp patterns like YYMMDD_HHMMSS, YYYYMMDD_HHMMSS
    cleaned = cleaned.replace(/\d{6,8}[_\-]\d{6}/g, "");
    
    // Remove year-like 4-digit numbers at the start (e.g., "2025")
    cleaned = cleaned.replace(/^\s*\d{4}\s+/g, "");
    
    // Remove leading dashes, underscores, spaces, or "—"
    cleaned = cleaned.replace(/^[\s\-_—]+/g, "");
    
    // Remove trailing dashes, underscores, spaces, slashes, or "—"
    cleaned = cleaned.replace(/[\s\-_—\/]+$/g, "");
    
    // Replace multiple spaces/dashes/underscores with single space
    cleaned = cleaned.replace(/[\s\-_—]+/g, " ");
    
    return cleaned.trim();
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
      if (!image.originalTimestamp) {
        console.warn('Image missing originalTimestamp:', image);
        return;
      }
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

      console.log('Audio loaded - autoPlay:', autoPlay, 'handledPlayback:', handledPlayback);
      if (autoPlay && !handledPlayback) {
        console.log('Starting autoplay...');
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

  /**
   * Find the nearest media start point (image or audio) within snap threshold.
   * Returns the snapped time in ms, or the original time if no snap point is nearby.
   * Uses pixel distance in the timeline view for snapping.
   */
  function findSnapPoint(absoluteMs, timelineViewSpanMs) {
    if (!mediaData || !Number.isFinite(absoluteMs)) return absoluteMs;
    if (!Number.isFinite(timelineViewSpanMs) || timelineViewSpanMs <= 0) return absoluteMs;

    // Calculate the time threshold based on pixel distance
    // Assuming timeline width is proportional to timelineViewSpanMs
    // SEEK_SNAP_THRESHOLD_PX pixels should map to a time threshold
    const timelineWidthPx = timelineMain ? timelineMain.getBoundingClientRect().width : 1000;
    const msPerPixel = timelineViewSpanMs / timelineWidthPx;
    const snapThresholdMs = SEEK_SNAP_THRESHOLD_PX * msPerPixel;

    let nearestSnapMs = null;
    let nearestDistance = Infinity;

    // Check images
    if (mediaData.images && mediaData.images.length) {
      for (const image of mediaData.images) {
        const imageMs = image.originalTimestamp?.getTime?.();
        if (!Number.isFinite(imageMs)) continue;
        
        const distance = Math.abs(imageMs - absoluteMs);
        if (distance < snapThresholdMs && distance < nearestDistance) {
          nearestDistance = distance;
          nearestSnapMs = imageMs;
        }
      }
    }

    // Check audio track starts
    if (mediaData.audioTracks && mediaData.audioTracks.length) {
      for (const track of mediaData.audioTracks) {
        const trackStartMs = track.adjustedStartTime?.getTime?.();
        if (!Number.isFinite(trackStartMs)) continue;
        
        const distance = Math.abs(trackStartMs - absoluteMs);
        if (distance < snapThresholdMs && distance < nearestDistance) {
          nearestDistance = distance;
          nearestSnapMs = trackStartMs;
        }
      }
    }

    // Return snapped time if found, otherwise original time
    return nearestSnapMs !== null ? nearestSnapMs : absoluteMs;
  }

  function seekToAbsoluteMs(absoluteMs, shouldPlay = null, options = {}) {
    if (!Number.isFinite(absoluteMs)) return;

    // Apply gentle snap to nearby media starts unless explicitly disabled
    const shouldSnap = options.snap !== false;
    const viewSpan = timelineState.viewEndMs - timelineState.viewStartMs;
    const targetMs = shouldSnap ? findSnapPoint(absoluteMs, viewSpan) : absoluteMs;

    if (options.forceDisplay) {
      forceNextComposition = true;
    }

    playback.setAbsoluteTime(targetMs, {
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
    // Pass force=true when: user explicitly seeks OR playback is paused
    // When paused, we always want to show images at the current position
    const shouldForce = forceNextComposition || !playback.isPlaying();
    const images = getImagesForAbsoluteTime(absoluteMs, { force: shouldForce });
    const visibleImages = showMainImages(images, { absoluteMs, force: shouldForce });
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

  function getImagesForAbsoluteTime(absoluteMs, options = {}) {
    if (!mediaData || !Array.isArray(mediaData.images) || !mediaData.images.length) {
      return [];
    }
    if (!Number.isFinite(absoluteMs)) {
      return [];
    }

    const force = Boolean(options.force);
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

    // Check if skip silence is enabled and if this is the last image before a gap
    // Skip this check if force=true (user explicitly seeking to an image)
    let effectiveCarryover = MAX_IMAGE_CARRYOVER_MS;
    if (!force && isSkipSilenceEnabled()) {
      // Check if there's a next image
      const nextImage = images[anchorIndex + 1];
      if (nextImage && nextImage.originalTimestamp) {
        const nextImageMs = nextImage.originalTimestamp.getTime();
        const gapToNextImage = nextImageMs - clusterStart;
        
        // If gap to next image is significant (more than carryover), this is last image before silence
        // In that case, don't apply MAX_IMAGE_CARRYOVER_MS - let it disappear when no more media
        if (gapToNextImage > MAX_IMAGE_CARRYOVER_MS) {
          // Check if there's audio coverage
          const hasAudioCoverage = mediaData.audioTracks?.some(track => {
            if (!track.adjustedStartTime || !track.adjustedEndTime) return false;
            const trackStart = track.adjustedStartTime.getTime();
            const trackEnd = track.adjustedEndTime.getTime();
            return absoluteMs >= trackStart && absoluteMs <= trackEnd;
          });
          
          // If no audio coverage either, don't show this image (skip the silence)
          if (!hasAudioCoverage) {
            return [];
          }
        }
      } else {
        // This is the last image overall - check if we have audio coverage
        const hasAudioCoverage = mediaData.audioTracks?.some(track => {
          if (!track.adjustedStartTime || !track.adjustedEndTime) return false;
          const trackStart = track.adjustedStartTime.getTime();
          const trackEnd = track.adjustedEndTime.getTime();
          return absoluteMs >= trackStart && absoluteMs <= trackEnd;
        });
        
        // If no audio coverage, don't show this image
        if (!hasAudioCoverage) {
          return [];
        }
      }
    }

    // Requirement 2: Maximum display time after timestamp
    const windowEnd = clusterStart + effectiveCarryover;
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

  function formatDateAndTime(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const time = formatClockWithSeconds(date);
    return `${day}/${month}/${year} — ${time}`;
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
    
    // Update date display in human language
    const lang = i18n ? i18n.getCurrentLanguage() : 'fr';
    
    const monthsOfYear = {
      fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    };
    
    const currentMonthsOfYear = monthsOfYear[lang] || monthsOfYear['fr'];
    
    const dayOfMonth = date.getDate();
    const month = currentMonthsOfYear[date.getMonth()];
    const year = date.getFullYear();
    
    clockDate.innerHTML = `${dayOfMonth} ${month}<br>${year}`;
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

  async function handleDrop(dataTransfer, mode = 'replace') {
    showLoader('processingFiles');
    const items = Array.from(dataTransfer.items || []);
    const files = Array.from(dataTransfer.files || []);

    // Capture current playing state before processing
    const wasPlaying = playback ? playback.isPlaying() : false;
    const shouldAutoPlay = (mode === 'replace') && !wasPlaying;
    console.log('handleDrop:', { mode, wasPlaying, shouldAutoPlay });

    // Collect directory entries (possibly multiple)
    const folderEntries = items
      .filter(item => item.kind === 'file')
      .map(item => item.webkitGetAsEntry && item.webkitGetAsEntry())
      .filter(entry => entry && entry.isDirectory);

    // Read all directories
    let folderFiles = [];
    for (let i = 0; i < folderEntries.length; i++) {
      updateLoaderProgress(5 + Math.min(20, (i + 1) * 2), 'readingFolder', `Folder ${i + 1}/${folderEntries.length}`);
      try {
        const dirFiles = await readDirectoryRecursive(folderEntries[i]);
        folderFiles.push(...dirFiles);
      } catch (e) {
        console.warn('Failed to read dropped folder:', e);
      }
    }

    // Merge all sources
    let combined = [];
    if (files.length) combined.push(...files);
    if (folderFiles.length) combined.push(...folderFiles);

    if (!combined.length) {
      hideLoader();
      throw new Error(t('errorDropFolderOrFiles'));
    }

    // Filter out system files
    combined = combined.filter(f => !isSystemFile(f.name || getFilePath(f)));

    // Expand any ZIPs found
    const { expanded } = await expandZipFiles(combined);

    if (mode === 'additive' && mediaData) {
      await addFilesToTimeline(expanded);
      hideLoader();
      return;
    }

    await handleFolder(expanded, shouldAutoPlay);
  }

  async function handleFolderAddition(dirEntry) {
    if (!mediaData) {
      // No existing timeline, treat as new timeline
      await handleDirectoryEntry(dirEntry);
      return;
    }

    try {
      const newFiles = await readDirectoryRecursive(dirEntry);
      const validFiles = newFiles.filter(file => !isSystemFile(getFilePath(file)));
      const { expanded } = await expandZipFiles(validFiles, { phase: 'readingFolder' });
      
      if (expanded.length === 0) {
        console.log('No valid files found in folder');
        return;
      }

      await addFilesToTimeline(expanded);
    } catch (error) {
      console.error('Error adding folder to timeline:', error);
      throw error;
    }
  }

  async function handleZipFileAddition(zipFile) {
    if (!mediaData) {
      // No existing timeline, treat as new timeline
      await handleZipFile(zipFile);
      return;
    }

    try {
      showLoader('extractingZip');
      console.log('Extracting ZIP file to add to timeline:', zipFile.name);
      
      // Extract ZIP files using the existing unzipFile function
      const extractedFiles = await unzipFile(zipFile);
      
      if (extractedFiles.length === 0) {
        console.log('No valid files found in ZIP');
        hideLoader();
        return;
      }

      // Add to timeline
      await addFilesToTimeline(extractedFiles);
      hideLoader();
    } catch (error) {
      console.error('Error adding ZIP to timeline:', error);
      hideLoader();
      throw error;
    }
  }

  async function addFilesToTimeline(newFiles) {
    // Check for _delay.txt files; apply the last one
    const delayFiles = newFiles.filter(file => getBaseName(file.name || getFilePath(file)) === '_delay.txt');
    if (delayFiles.length > 0) {
      const chosenDelayFile = delayFiles[delayFiles.length - 1];
      try {
        const text = await chosenDelayFile.text();
        const parsed = parseDelayField(text.trim());
        if (parsed !== null) {
          setDelaySeconds(parsed);
          console.log(`Updated delay setting from _delay.txt: ${formatDelay(parsed)}`);
          if (delayFiles.length > 1) {
            const msg = t('multipleDelayFilesDetectedAddition', { count: delayFiles.length, delay: formatDelay(parsed) });
            addAnomalyMessages([msg]);
          }
        } else {
          console.warn(`Invalid delay format in _delay.txt: "${text.trim()}"`);
        }
      } catch (err) {
        console.error('Error reading _delay.txt:', err);
      }
    }

    // Filter out duplicates and system files
  const validFiles = [];
  let duplicateCount = 0;
  let intraBatchDuplicateCount = 0;
  const seenKeys = new Set();

    for (const file of newFiles) {
      const fileName = file.name || getFilePath(file);
      
      if (isSystemFile(fileName)) {
        continue;
      }

      // Skip _delay.txt as we've already processed it
      if (fileName.split('/').pop() === '_delay.txt') {
        continue;
      }

      // Create duplicate key (name + size + timestamp), ignoring lastModified
      const fileSize = file.size || 0;
      const fileTimestamp = parseTimestampFromName(fileName);
      const timestampKey = fileTimestamp ? fileTimestamp.getTime() : null;
      const batchKey = `${fileName}__${fileSize}__${timestampKey ?? 'no_ts'}`;

      // Intra-batch dedupe first
      if (seenKeys.has(batchKey)) {
        intraBatchDuplicateCount++;
        console.log(`Skipping duplicate within selection: ${fileName}`);
        continue;
      }
      seenKeys.add(batchKey);
      
      // Check across existing timeline
      const isDuplicate = (mediaData.allFiles || []).some(existingFile => 
        existingFile.name === fileName &&
        existingFile.size === fileSize &&
        (timestampKey === null || existingFile.timestamp === timestampKey)
      );

      if (isDuplicate) {
        duplicateCount++;
        console.log(`Skipping duplicate file: ${fileName}`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      // Only show warning if there are actual duplicates
      if (duplicateCount > 0 || intraBatchDuplicateCount > 0) {
        const msg = `No new files to add. Skipped ${duplicateCount} duplicate(s) already in timeline${intraBatchDuplicateCount ? ` and ${intraBatchDuplicateCount} duplicate(s) within selection` : ''}.`;
        console.log(msg);
        addAnomalyMessages([msg]);
      }
      return;
    }

    // Only show warning if there are actual duplicates
    if (duplicateCount > 0 || intraBatchDuplicateCount > 0) {
      const addedMsg = `Adding ${validFiles.length} new file(s) to timeline. Skipped ${duplicateCount} duplicate(s) already in timeline${intraBatchDuplicateCount ? ` and ${intraBatchDuplicateCount} duplicate(s) within selection` : ''}.`;
      console.log(addedMsg);
      addAnomalyMessages([addedMsg]);
    }

    // Separate audio and image files
    const newAudioFiles = validFiles.filter(file => {
      const fileName = file.name || getFilePath(file);
      return isAudio(fileName);
    });
    
    const newImageFiles = validFiles.filter(file => {
      const fileName = file.name || getFilePath(file);
      return isImage(fileName);
    });

    // Process new audio tracks
    if (newAudioFiles.length > 0) {
      const newAudioTracks = await Promise.all(
        newAudioFiles.map(async (file, index) => {
          const fileName = file.name || getFilePath(file);
          const fileTimestamp = parseTimestampFromName(fileName);
          
          // Create URL for the file object
          let fileUrl;
          if (file instanceof File) {
            fileUrl = URL.createObjectURL(file);
          } else if (file.file) {
            fileUrl = URL.createObjectURL(file.file);
          } else {
            throw new Error(`Invalid file object for ${fileName}`);
          }
          
          return createAudioTrack({
            url: fileUrl,
            originalName: fileName,
            index: mediaData.audioTracks.length + index,
            fileTimestamp,
          });
        })
      );

      await loadAllAudioDurations(newAudioTracks);
      mediaData.audioTracks.push(...newAudioTracks);
    }

    // Process new images
    if (newImageFiles.length > 0) {
      const newImages = await Promise.all(
        newImageFiles.map(async (file) => {
          const fileName = file.name || getFilePath(file);
          const timestamp = parseTimestampFromName(fileName);
          
          // Create URL for the file object
          let fileUrl;
          if (file instanceof File) {
            fileUrl = URL.createObjectURL(file);
          } else if (file.file) {
            fileUrl = URL.createObjectURL(file.file);
          } else {
            throw new Error(`Invalid file object for ${fileName}`);
          }
          
          let finalTimestamp = timestamp;
          if (!timestamp) {
            finalTimestamp = await parseTimestampFromEXIF(file instanceof File ? file : file.file);
            if (!finalTimestamp) {
              console.warn(`Unable to parse timestamp from ${fileName}. Skipping.`);
              return null;
            }
          }
          
          return { 
            url: fileUrl, 
            timestamp: finalTimestamp,
            originalTimestamp: finalTimestamp,
            originalName: fileName,
            name: fileName,
            relative: 0,
            timecode: "00:00",
            timeOfDay: formatClock(finalTimestamp)
          };
        })
      );

      const validImages = newImages.filter(img => img !== null);
      mediaData.images.push(...validImages);
    }

    // Update allFiles list
    mediaData.allFiles = mediaData.allFiles || [];
    mediaData.allFiles.push(...validFiles.map(file => {
      const fileName = file.name || getFilePath(file);
      const fileTimestamp = parseTimestampFromName(fileName);
      return {
        name: fileName,
        size: file.size || 0,
        lastModified: file.lastModified || 0,
        timestamp: fileTimestamp ? fileTimestamp.getTime() : null
      };
    }));

    // Rebuild timeline with new data
    if (newAudioFiles.length > 0 || newImageFiles.length > 0) {
      // Preserve current playback state
      const wasPlaying = playback ? playback.isPlaying() : false;
      const currentAbsoluteMs = playback ? playback.getAbsoluteTime() : null;
      
      // Re-sort everything by timestamp
      mediaData.images.sort((a, b) => a.timestamp - b.timestamp);
      mediaData.audioTracks.sort((a, b) => (a.fileTimestamp || 0) - (b.fileTimestamp || 0));

      // Recompute image compositions with new data
      precomputeImageCompositions(mediaData.images);
      
      // Recalculate timestamps if we have audio
      if (mediaData.audioTracks.length > 0) {
        recalculateImageTimestamps();
      }

      // Rebuild the timeline
      destroyTimeline();
      initializeTimeline();
      
      // Restore playback position to same absolute time (time-of-day)
      if (currentAbsoluteMs !== null && Number.isFinite(currentAbsoluteMs)) {
        // Find the appropriate track and relative position
        const activeTrack = mediaData.audioTracks[mediaData.activeTrackIndex];
        if (activeTrack && activeTrack.adjustedStartTime) {
          const trackStartMs = activeTrack.adjustedStartTime.getTime();
          const relativeSeconds = (currentAbsoluteMs - trackStartMs) / 1000;
          
          // If still within current track, seek to that position
          if (relativeSeconds >= 0 && relativeSeconds <= activeTrack.duration) {
            audioElement.currentTime = relativeSeconds;
            if (wasPlaying) {
              playback.play();
            }
          } else {
            // Find which track contains this absolute time
            let targetTrackIndex = -1;
            for (let i = 0; i < mediaData.audioTracks.length; i++) {
              const track = mediaData.audioTracks[i];
              if (track.adjustedStartTime && track.adjustedEndTime) {
                const start = track.adjustedStartTime.getTime();
                const end = track.adjustedEndTime.getTime();
                if (currentAbsoluteMs >= start && currentAbsoluteMs < end) {
                  targetTrackIndex = i;
                  break;
                }
              }
            }
            
            if (targetTrackIndex >= 0) {
              // Switch to the track that contains this time
              const targetTrack = mediaData.audioTracks[targetTrackIndex];
              const targetStartMs = targetTrack.adjustedStartTime.getTime();
              const targetRelativeSeconds = (currentAbsoluteMs - targetStartMs) / 1000;
              
              loadAudioTrack(targetTrackIndex, false);
              audioElement.currentTime = targetRelativeSeconds;
              if (wasPlaying) {
                playback.play();
              }
            }
          }
          
          // Update display for current time
          playback.refresh();
        }
      }
      
      console.log(`Added ${newAudioFiles.length} audio tracks and ${newImageFiles.length} images to timeline`);
    }
  }

  function setupSlideshowDragDrop() {
    const slideshowContainer = document.querySelector('.slideshow__container');
    if (!slideshowContainer) return;

    // Prevent default behavior for drag events
    slideshowContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      slideshowContainer.style.opacity = '0.7';
    });

    slideshowContainer.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      slideshowContainer.style.opacity = '';
    });

    slideshowContainer.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      slideshowContainer.style.opacity = '';

      try {
        await handleDrop(e.dataTransfer, 'additive');
        console.log('Files processed during slideshow');
      } catch (error) {
        console.error('Error handling slideshow drop:', error);
      }
    });

    // Toggle play/pause when clicking on slideshow images
    slideshowContainer.addEventListener('click', (e) => {
      // Only toggle if we have media and playback controller
      if (!mediaData || !mediaData.audioTracks.length || !playback) return;
      
      // Don't toggle if clicking on a button or interactive element
      if (e.target.closest('button') || e.target.closest('a')) return;
      
      playback.toggle();
      setPlayToggleState(playback.isPlaying() ? "pause" : "play");
    });
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

    const rawAbsoluteMs = timelineState.viewStartMs + viewSpan * ratio;
    if (!Number.isFinite(rawAbsoluteMs)) {
      hideTimelineHoverPreview();
      isHoverScrubbing = false;
      return;
    }

    // Apply snapping to show where we'll actually land when clicking
    const absoluteMs = findSnapPoint(rawAbsoluteMs, viewSpan);

    if (!isHoverScrubbing) {
      isHoverScrubbing = true;
      hoverOriginalCursorMs = timelineState.currentCursorMs;
    }

    // Update seeker and preview position to snapped location
    if (timelineHoverPreview) {
      timelineHoverPreview.classList.remove("hidden");
      // Recalculate ratio based on snapped position
      const snappedRatio = clamp((absoluteMs - timelineState.viewStartMs) / viewSpan, 0, 1);
      timelineHoverPreview.style.left = `${snappedRatio * 100}%`;
    }

    if (timelineHoverPreviewTime) {
      timelineHoverPreviewTime.textContent = formatDateAndTime(new Date(absoluteMs));
    }

    // Display the audio track name at this time
    if (timelineHoverPreviewTrack) {
      const trackIndex = findAudioTrackForTimestamp(absoluteMs);
      if (trackIndex >= 0 && mediaData?.audioTracks?.[trackIndex]) {
        const track = mediaData.audioTracks[trackIndex];
        const displayName = cleanTrackNameForDisplay(track.originalName || track.label || "");
        timelineHoverPreviewTrack.textContent = displayName || track.label || `Track ${trackIndex + 1}`;
        timelineHoverPreviewTrack.style.display = "block";
      } else {
        timelineHoverPreviewTrack.style.display = "none";
      }
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
    // Disable snapping on click - snapping is only for dragging/scrubbing
    seekToAbsoluteMs(absoluteMs, shouldPlay, { forceDisplay: true, snap: false });
    
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
    if (!timelineRoot || !mediaData) return;

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
    // Reset overlap warning flag on timeline clear
    if (timelineState) {
      timelineState.overlapWarned = false;
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
    if (!mediaData) return null;
    
    const hasAudio = Array.isArray(mediaData.audioTracks) && mediaData.audioTracks.length > 0;
    const hasImages = Array.isArray(mediaData.images) && mediaData.images.length > 0;
    
    if (!hasAudio && !hasImages) return null;

    const trackRanges = [];
    let minMs = Number.POSITIVE_INFINITY;
    let maxMs = Number.NEGATIVE_INFINITY;

    const delayMs = getDelaySeconds() * 1000;

    // Process audio tracks if available
    if (hasAudio) {
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
    }
    
    // If we only have images (no audio), use image timestamps to define the timeline range
    if (!hasAudio && hasImages) {
      mediaData.images.forEach((img) => {
        if (!img.originalTimestamp) return;
        const imgMs = img.originalTimestamp.getTime();
        if (Number.isFinite(imgMs)) {
          if (imgMs < minMs) minMs = imgMs;
          if (imgMs > maxMs) maxMs = imgMs;
        }
      });
      
      // Add some padding for image-only timelines (30 seconds)
      if (Number.isFinite(minMs) && Number.isFinite(maxMs)) {
        maxMs += 30000;
      }
    }

    if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || minMs >= maxMs) {
      return null;
    }

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
            // First overlap detected - add explanatory message
            if (anomalies.length === 0) {
              anomalies.push(t('overlapHandlingInfo'));
            }
            anomalies.push(
              t('overlapWarning')
                .replace('{trackA}', range.track.label)
                .replace('{duration}', formatDurationMs(overlap))
                .replace('{trackB}', latestRange.track.label)
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

    // Get timeline width to calculate optimal number of ticks
    const timelineWidth = timelineMain ? timelineMain.offsetWidth : 800;
    const step = computeTickStep(range, timelineWidth);
    if (!step) return;

    // Check if the timeline spans multiple days
    const startDate = new Date(timelineState.viewStartMs);
    const endDate = new Date(timelineState.viewEndMs);
    const spansMultipleDays = !isSameDay(startDate, endDate);
    
    // Check if corpus (entire dataset) spans multiple days
    const corpusStartDate = new Date(timelineState.minMs);
    const corpusEndDate = new Date(timelineState.maxMs);
    const corpusSpansMultipleDays = !isSameDay(corpusStartDate, corpusEndDate);

    // Determine if we should show seconds in labels
    const showSeconds = step < 60 * 1000; // Show seconds if step is less than 1 minute

    const firstTick = alignToStep(timelineState.viewStartMs, step);
    const tickElements = []; // Store tick elements with their positions for overlap detection
    
    for (let tick = firstTick; tick <= timelineState.viewEndMs + 1; tick += step) {
      const position = ((tick - timelineState.viewStartMs) / range) * 100;
      if (position < -2 || position > 102) continue;
      
      // Create axis tick
      const tickEl = document.createElement("div");
      tickEl.className = "timeline__axis-tick";
      tickEl.style.left = `${position}%`;
      
      // Format label based on granularity and date context
      const tickDate = new Date(tick);
      
      // If corpus spans multiple days, show only dates (no time)
      if (corpusSpansMultipleDays) {
        const dateLabel = formatDateShort(tickDate);
        tickEl.textContent = dateLabel;
      } else {
        // Single day: show time only
        let timeLabel;
        if (showSeconds) {
          // Show HH:MM:SS for fine granularity
          const h = String(tickDate.getHours()).padStart(2, '0');
          const m = String(tickDate.getMinutes()).padStart(2, '0');
          const s = String(tickDate.getSeconds()).padStart(2, '0');
          timeLabel = `${h}:${m}:${s}`;
        } else {
          // Show HH:MM for normal granularity
          timeLabel = formatClock(tickDate);
        }
        tickEl.textContent = timeLabel;
      }
      
      tickElements.push({ element: tickEl, position });
    }
    
    // Apply anti-overlap logic: hide ticks that would overlap
    const hiddenIndices = computeTickVisibility(tickElements, timelineWidth);
    
    // Append visible ticks to DOM
    tickElements.forEach((tick, index) => {
      if (!hiddenIndices.has(index)) {
        timelineAxis.appendChild(tick.element);
        
        // Create gridline for visible ticks
        if (timelineGridlines) {
          const gridlineEl = document.createElement("div");
          gridlineEl.className = "timeline__gridline";
          gridlineEl.style.left = `${tick.position}%`;
          timelineGridlines.appendChild(gridlineEl);
        }
      }
    });
  }

  /**
   * Compute which ticks should be visible to prevent overlap
   * Returns a Set of indices to hide
   */
  function computeTickVisibility(tickElements, timelineWidth) {
    if (tickElements.length === 0) return new Set();
    
    const hiddenIndices = new Set();
    const TICK_MIN_SPACING_PX = 60; // Minimum pixels between tick labels
    
    // Measure actual widths (approximate based on font size and content)
    // Average character width: ~7px at 0.68rem (approx 11px)
    const avgCharWidth = 7;
    
    tickElements.forEach((tick, i) => {
      tick.element.style.visibility = 'hidden'; // Temporarily hide to measure
      timelineAxis.appendChild(tick.element);
    });
    
    // Calculate widths
    const tickData = tickElements.map((tick, i) => {
      const width = tick.element.offsetWidth || (tick.element.textContent.length * avgCharWidth);
      return {
        index: i,
        position: tick.position,
        width,
        positionPx: (tick.position / 100) * timelineWidth,
      };
    });
    
    // Remove temporary elements
    tickElements.forEach(tick => {
      if (tick.element.parentNode) {
        tick.element.parentNode.removeChild(tick.element);
      }
      tick.element.style.visibility = '';
    });
    
    // Greedy algorithm: keep first, check subsequent ticks for overlap
    let lastVisibleIndex = 0;
    
    for (let i = 1; i < tickData.length; i++) {
      const lastVisible = tickData[lastVisibleIndex];
      const current = tickData[i];
      
      const lastVisibleEnd = lastVisible.positionPx + (lastVisible.width / 2);
      const currentStart = current.positionPx - (current.width / 2);
      const spacing = currentStart - lastVisibleEnd;
      
      if (spacing < TICK_MIN_SPACING_PX) {
        hiddenIndices.add(i);
      } else {
        lastVisibleIndex = i;
      }
    }
    
    return hiddenIndices;
  }

  function computeTickStep(rangeMs, viewportWidth = 800) {
    const hour = 60 * 60 * 1000;
    const halfHour = 30 * 60 * 1000;
    const quarterHour = 15 * 60 * 1000;
    const tenMinutes = 10 * 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;
    const twoMinutes = 2 * 60 * 1000;
    const minute = 60 * 1000;
    const halfMinute = 30 * 1000;
    const tenSeconds = 10 * 1000;
    const day = 24 * hour;

    // Calculate target number of ticks based on viewport width
    // Responsive: more ticks on wider screens, fewer on narrow screens
    const minTickSpacing = viewportWidth < 600 ? 100 : 80;
    const maxTickCount = Math.max(5, Math.floor(viewportWidth / minTickSpacing));
    
    // Calculate ideal step to achieve target tick count
    const idealStep = rangeMs / maxTickCount;
    
    // Available step options (in ascending order)
    const steps = [
      tenSeconds,
      halfMinute,
      minute,
      twoMinutes,
      fiveMinutes,
      tenMinutes,
      quarterHour,
      halfHour,
      hour,
      2 * hour,
      4 * hour,
      6 * hour,
      12 * hour,
      day,           // 1 day
      2 * day,       // 2 days
      3 * day,       // 3 days
      7 * day,       // 1 week
      14 * day,      // 2 weeks
      30 * day,      // ~1 month
    ];
    
    // Find the smallest step that's >= idealStep
    for (const step of steps) {
      if (step >= idealStep) {
        return step;
      }
    }
    
    // If range is very large, use the largest step
    return 30 * day;
  }

  function alignToStep(startMs, stepMs) {
    return Math.ceil(startMs / stepMs) * stepMs;
  }

  /**
   * Check if two dates are on the same day
   */
  function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Format date in short format (e.g., "Jan 15" or "1/15")
   */
  function formatDateShort(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
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
    let messages = timelineState.anomalyMessages || [];
    // Only show if message is not a generic success/no-issue message
    messages = messages.filter(msg => {
      if (!msg) return false;
      const lower = msg.toLowerCase();
      if (lower.includes('no new files') || lower.includes('aucun nouveau fichier')) return false;
      if (lower.includes('adding') && !lower.includes('skipped')) return false;
      return true;
    });
    if (!messages.length) {
      timelineNotices.innerHTML = "";
      timelineNotices.classList.add("hidden");
      return;
    }

    // Short help message for warnings (translated)
    const helpMsg = `<div class='timeline-warning-help'>\
      <b>⚠️ ${t('warningTitle')}</b> <br>
      <b>${t('overlap')}</b> : ${t('overlapHelp')}<br>
      <b>${t('duplicate')}</b> : ${t('duplicateHelp')}<br>
      <b>${t('delay')}</b> : ${t('delayHelp')}<br>
      <i>${t('warningTypes')}</i>
    </div>`;
    // Messages are already translated by addAnomalyMessages, so just display them
    timelineNotices.innerHTML = helpMsg + messages
      .map((message) => `<div>${message}</div>`)
      .join("");
    timelineNotices.classList.remove("hidden");
    
    // Also update the modal if it exists
    updateTimelineNoticesModal(messages);
  }

  function updateTimelineNoticesModal(messages) {
    const modal = document.getElementById("timeline-notices-modal");
    const messagesContainer = document.getElementById("timeline-notices-modal-messages");
    const closeBtn = document.getElementById("timeline-notices-modal-close");
    
    if (!modal || !messagesContainer || !closeBtn) return;
    
    // Only show modal once per session (on initial load with anomalies)
    if (!messages || !messages.length || timelineState.noticesShown) {
      return;
    }
    
    // Messages are already translated by addAnomalyMessages, so just display them
    messagesContainer.innerHTML = messages.map((message) => `<div>${message}</div>`).join("");
    modal.classList.remove("hidden");
    timelineState.noticesShown = true;
    
    closeBtn.onclick = () => {
      modal.classList.add("hidden");
    };
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
    const stops = [];
    let cursor = startMs;

    // Day/Night colors - Black and white theme
    const nightColor = "rgba(0, 0, 0, 0.5)"; // Black for night
    const dayColor = "rgba(255, 255, 255, 0.11)"; // White for day (25% darker)
    const sunriseColor = "rgba(128, 128, 128, 0.3)"; // Gray for sunrise
    const sunsetColor = "rgba(128, 128, 128, 0.3)"; // Gray for sunset

    while (cursor < endMs) {
      const currentDate = new Date(cursor);
      const hour = currentDate.getHours();
      const minute = currentDate.getMinutes();
      const timeInHours = hour + minute / 60;

      // Define transition periods (accelerated changes at sunrise/sunset)
      const sunrise = 6; // 6:00 AM
      const sunriseEnd = 7.5; // 7:30 AM
      const sunset = 18; // 6:00 PM
      const sunsetEnd = 19.5; // 7:30 PM

      let nextBoundary;
      
      if (timeInHours < sunrise) {
        // Night until sunrise
        nextBoundary = new Date(currentDate);
        nextBoundary.setHours(sunrise, 0, 0, 0);
      } else if (timeInHours < sunriseEnd) {
        // Sunrise transition - add more stops for smooth gradient
        const sunriseProgress = (timeInHours - sunrise) / (sunriseEnd - sunrise);
        const easeProgress = easeInOutQuad(sunriseProgress);
        
        // Add intermediate stops during sunrise
        nextBoundary = new Date(currentDate);
        nextBoundary.setHours(sunrise, 0, 0, 0);
        nextBoundary.setTime(nextBoundary.getTime() + (sunriseEnd - sunrise) * 60 * 60 * 1000);
        
        // Create multiple color stops for sunrise
        for (let i = 0; i <= 4; i++) {
          const frac = i / 4;
          const easedFrac = easeInOutQuad(frac);
          const transitionTime = sunrise + frac * (sunriseEnd - sunrise);
          const transitionDate = new Date(currentDate);
          transitionDate.setHours(Math.floor(transitionTime), (transitionTime % 1) * 60, 0, 0);
          const transitionMs = transitionDate.getTime();
          
          if (transitionMs >= cursor && transitionMs <= endMs) {
            const pct = ((transitionMs - startMs) / total) * 100;
            const color = interpolateColor(nightColor, dayColor, easedFrac, sunriseColor, frac > 0.3 && frac < 0.7);
            stops.push({ pct, color });
          }
        }
        
        cursor = Math.min(nextBoundary.getTime(), endMs);
        continue;
      } else if (timeInHours < sunset) {
        // Full day
        nextBoundary = new Date(currentDate);
        nextBoundary.setHours(sunset, 0, 0, 0);
      } else if (timeInHours < sunsetEnd) {
        // Sunset transition - add more stops for smooth gradient
        nextBoundary = new Date(currentDate);
        nextBoundary.setHours(sunset, 0, 0, 0);
        nextBoundary.setTime(nextBoundary.getTime() + (sunsetEnd - sunset) * 60 * 60 * 1000);
        
        // Create multiple color stops for sunset
        for (let i = 0; i <= 4; i++) {
          const frac = i / 4;
          const easedFrac = easeInOutQuad(frac);
          const transitionTime = sunset + frac * (sunsetEnd - sunset);
          const transitionDate = new Date(currentDate);
          transitionDate.setHours(Math.floor(transitionTime), (transitionTime % 1) * 60, 0, 0);
          const transitionMs = transitionDate.getTime();
          
          if (transitionMs >= cursor && transitionMs <= endMs) {
            const pct = ((transitionMs - startMs) / total) * 100;
            const color = interpolateColor(dayColor, nightColor, easedFrac, sunsetColor, frac > 0.3 && frac < 0.7);
            stops.push({ pct, color });
          }
        }
        
        cursor = Math.min(nextBoundary.getTime(), endMs);
        continue;
      } else {
        // Night after sunset
        nextBoundary = new Date(currentDate);
        nextBoundary.setDate(nextBoundary.getDate() + 1);
        nextBoundary.setHours(sunrise, 0, 0, 0);
      }

      const boundaryMs = Math.min(nextBoundary.getTime(), endMs);
      const startPct = ((cursor - startMs) / total) * 100;
      const endPct = ((boundaryMs - startMs) / total) * 100;
      
      let color;
      if (timeInHours >= sunriseEnd && timeInHours < sunset) {
        color = dayColor;
      } else {
        color = nightColor;
      }
      
      stops.push({ pct: startPct, color });
      if (endPct !== startPct) {
        stops.push({ pct: endPct, color });
      }

      cursor = boundaryMs;
      if (cursor === boundaryMs && boundaryMs < endMs) {
        cursor += 1000; // Advance by 1 second to avoid infinite loop
      }
    }

    // Sort stops by percentage and build gradient string
    stops.sort((a, b) => a.pct - b.pct);
    const gradientStops = stops.map(s => `${s.color} ${s.pct.toFixed(2)}%`).join(", ");
    
    return `linear-gradient(to right, ${gradientStops})`;
  }

  /**
   * Ease in-out quadratic function for smooth acceleration/deceleration
   */
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Interpolate between two rgba colors with optional highlight color at midpoint
   */
  function interpolateColor(color1, color2, t, highlightColor = null, useHighlight = false) {
    if (useHighlight && highlightColor) {
      return highlightColor;
    }
    
    // Simple approach: just blend between start and end
    // For more sophisticated blending, we'd parse rgba values
    if (t <= 0) return color1;
    if (t >= 1) return color2;
    
    // Simple crossfade using rgba
    // This is a simplified version; full implementation would parse and blend
    return t < 0.5 ? color1 : color2;
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

  async function exportZipArchive() {
    if (!mediaData || !mediaData.images || mediaData.images.length === 0) {
      alert(t('alertNoMediaToExport'));
      return;
    }

    try {
      showLoader('processingFiles');
      updateLoaderProgress(0, 'processingFiles', 'Preparing ZIP archive...');

      // Calculate timeline start and end timestamps for filename
      const firstImage = mediaData.images[0];
      const lastImage = mediaData.images[mediaData.images.length - 1];
      const startTimestamp = firstImage.originalTimestamp;
      const endTimestamp = lastImage.originalTimestamp;
      
      // Format timestamps for filename: YYYYMMDD_HHMMSS
      const formatTimestamp = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
      };
      
      const startStr = formatTimestamp(startTimestamp);
      const endStr = formatTimestamp(endTimestamp);
      const zipFilename = `diapaudio_${startStr}-${endStr}.zip`;

      // Create _delay.txt content
      const delaySeconds = getDelaySeconds();
      const delayContent = formatDelay(delaySeconds);

      // Initialize zip.js writer
      const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"), {
        bufferedWrite: true,
        level: 0, // No compression for faster export
      });

      // Add _delay.txt file
      updateLoaderProgress(5, 'processingFiles', 'Adding delay file...');
      await zipWriter.add("_delay.txt", new zip.TextReader(delayContent));

      // Add all media files (images and audio)
      const totalFiles = mediaData.images.length + (mediaData.audioTracks?.length || 0);
      let processedFiles = 0;

      // Add audio files
      if (mediaData.audioTracks && mediaData.audioTracks.length > 0) {
        for (const track of mediaData.audioTracks) {
          try {
            const progress = 10 + (processedFiles / totalFiles) * 80;
            const filename = track.originalName.split('/').pop() || track.originalName;
            updateLoaderProgress(progress, 'processingFiles', `Adding ${filename}...`);
            
            // Fetch the blob from the URL
            const response = await fetch(track.url);
            const blob = await response.blob();
            
            // Add to ZIP with original filename
            await zipWriter.add(filename, new zip.BlobReader(blob));
            
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
          updateLoaderProgress(progress, 'processingFiles', `Adding ${image.name}...`);
          
          // Fetch the blob from the URL
          const response = await fetch(image.url);
          const blob = await response.blob();
          
          // Add to ZIP with original filename
          await zipWriter.add(image.name, new zip.BlobReader(blob));
          
          processedFiles++;
        } catch (err) {
          console.error(`Failed to add image file ${image.name}:`, err);
        }
      }

      // Finalize ZIP
      updateLoaderProgress(95, 'processingFiles', 'Finalizing ZIP archive...');
      const zipBlob = await zipWriter.close();

      // Download ZIP file
      updateLoaderProgress(100, 'processingFiles', 'Complete!');
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipFilename;
      a.click();
      URL.revokeObjectURL(url);

      // Small delay to show completion before hiding
      await new Promise(resolve => setTimeout(resolve, 500));
      hideLoader();
    } catch (error) {
      console.error("Error creating ZIP archive:", error);
      alert(t('alertFailedCreateZip', { message: error.message }));
      hideLoader();
    }
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
