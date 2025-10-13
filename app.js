(() => {
  const dropzone = document.getElementById("dropzone");
  const dropzoneMessage = document.getElementById("dropzone-message");
  const dropzoneLoader = document.getElementById("dropzone-loader");
  const folderInput = document.getElementById("folder-input");
  const browseTrigger = document.getElementById("browse-trigger");
  const playToggle = document.getElementById("play-toggle");
  const speedSelect = document.getElementById("speed-select");
  const viewerContent = document.getElementById("viewer-content");
  const slideshowContainer = document.getElementById("slideshow-container");
  const timelineRoot = document.getElementById("timeline");
  const timelineMain = timelineRoot ? timelineRoot.querySelector(".timeline__main") : null;
  const timelineGradient = document.getElementById("timeline-gradient");
  const timelineAxis = document.getElementById("timeline-axis");
  const timelineTracks = document.getElementById("timeline-tracks");
  const timelineImages = document.getElementById("timeline-images");
  const timelineCursor = document.getElementById("timeline-cursor");
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
  const delayDisplay = document.getElementById("delay-display");
  const viewerHud = document.getElementById("viewer-hud");
  const slideshowPreview = document.getElementById("slideshow-preview");
  const clockHourHand = document.getElementById("clock-hour-hand");
  const clockMinuteHand = document.getElementById("clock-minute-hand");
  const clockSecondHand = document.getElementById("clock-second-hand");
  const clockDate = document.getElementById("clock-date");

  const utils = typeof window !== "undefined" ? window.DiapAudioUtils : null;
  const parseTimestampFromName = utils ? utils.parseTimestampFromName : null;
  if (typeof parseTimestampFromName !== "function") {
    throw new Error("DiapAudio timestamp utilities not loaded");
  }

  const audioMimeByExtension = new Map([
    ["mp3", "audio/mpeg"],
    ["wav", "audio/wav"],
    ["ogg", "audio/ogg"],
    ["m4a", "audio/mp4"],
    ["aac", "audio/aac"],
    ["flac", "audio/flac"],
  ]);

  // Configuration: Minimum time (in seconds) an image should be displayed
  const MIN_IMAGE_DISPLAY_DURATION = 8;
  
  // Configuration: Maximum frequency (in seconds) for composition changes
  const MAX_COMPOSITION_CHANGE_INTERVAL = 4;
  const IMAGE_STACK_WINDOW_MS = 35_000;
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
  let mediaData = null;
  let updateTimer = null;
  let lastUpdateTime = 0;
  let currentDisplayedImages = [];
  let lastCompositionChangeTime = -Infinity;
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

  browseTrigger.addEventListener("click", () => folderInput.click());

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
    if (audioElement.paused) {
      audioElement.play().catch(() => {});
    } else {
      audioElement.pause();
    }
  });

  speedSelect.addEventListener("change", () => {
    const speed = parseFloat(speedSelect.value);
    audioElement.playbackRate = Number.isFinite(speed) ? speed : 1;
  });

  if (delayField) {
    const commitDelay = () => {
      const parsed = parseDelayField(delayField.value);
      if (parsed === null) {
        updateDelayField();
        updateDelayDisplay(delaySeconds);
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

  setupTimelineInteractions();
  setupTimelineHover();
  setDelaySeconds(0);

  audioElement.addEventListener("play", () => {
    playToggle.textContent = "Pause";
  });

  audioElement.addEventListener("pause", () => {
    const duration = Number.isFinite(audioElement.duration) ? audioElement.duration : 0;
    const shouldReplay = duration && Math.abs(audioElement.currentTime - duration) < 0.05;
    playToggle.textContent = shouldReplay ? "Replay" : "Play";
  });

  audioElement.addEventListener("ended", () => {
    playToggle.textContent = "Replay";
  });

  audioElement.addEventListener("timeupdate", updateSlideForCurrentTime);

  function getDelaySeconds() {
    return delaySeconds;
  }

  function setDelaySeconds(value) {
    if (!Number.isFinite(value)) return;
    delaySeconds = value;
    updateDelayField();
    updateDelayDisplay(delaySeconds);
    
    // Update timeline positions and cursor when delay changes
    if (timelineState.initialized) {
      updateSlideForCurrentTime();
    }
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

  function updateDelayDisplay(value = delaySeconds) {
    if (!delayDisplay) return;
    const formatted = formatDelay(value);
    const sign = value < 0 ? "-" : "";
    const unsigned = value < 0 ? formatted.slice(1) : formatted;
    const [minutesPart, secondsPart] = unsigned.split(":");
    const minutes = Number(minutesPart || 0);
    delayDisplay.textContent = `${sign}${minutes}m ${secondsPart || "00"}s`;
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

      const audioTracks = audioFiles.map((file, index) => {
        const filePath = getFilePath(file);
        const fileTimestamp = parseTimestampFromName(filePath);
        return createAudioTrack({
          url: URL.createObjectURL(file),
          originalName: filePath,
          index,
          fileTimestamp,
        });
      });

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
            console.warn(`No timestamp in filename for ${file.name}, checking EXIF metadata...`);
            finalTimestamp = await extractTimestampFromEXIF(file);
            if (finalTimestamp) {
              console.log(`Found EXIF timestamp for ${file.name}: ${finalTimestamp.toLocaleString()}`);
            } else {
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

    currentDisplayedImages = [];
    lastCompositionChangeTime = -Infinity;
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
    if (slideshowContainer) {
      slideshowContainer.innerHTML = "";
    }
    if (imageTimecode) {
      imageTimecode.textContent = "";
    }
    if (imageTimeOfDay) {
      imageTimeOfDay.textContent = "";
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
  async function extractTimestampFromEXIF(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const dataView = new DataView(arrayBuffer);
      
      // Check for JPEG signature
      if (dataView.getUint16(0) !== 0xFFD8) {
        return null; // Not a JPEG
      }
      
      // Find EXIF marker (0xFFE1)
      let offset = 2;
      while (offset < dataView.byteLength) {
        const marker = dataView.getUint16(offset);
        if (marker === 0xFFE1) {
          // Found EXIF marker
          const exifLength = dataView.getUint16(offset + 2);
          const exifData = new DataView(arrayBuffer, offset + 4, exifLength - 2);
          
          // Check for "Exif\0\0" header
          if (exifData.getUint32(0) !== 0x45786966 || exifData.getUint16(4) !== 0) {
            return null;
          }
          
          // Parse TIFF header
          const tiffOffset = 6;
          const byteOrder = exifData.getUint16(tiffOffset);
          const littleEndian = byteOrder === 0x4949; // "II" for little endian
          
          // Find IFD0 offset
          const ifd0Offset = tiffOffset + exifData.getUint32(tiffOffset + 4, littleEndian);
          
          // Read IFD0 entries
          const numEntries = exifData.getUint16(ifd0Offset, littleEndian);
          
          for (let i = 0; i < numEntries; i++) {
            const entryOffset = ifd0Offset + 2 + i * 12;
            const tag = exifData.getUint16(entryOffset, littleEndian);
            
            // Tag 0x0132 = DateTime, 0x9003 = DateTimeOriginal
            if (tag === 0x0132 || tag === 0x9003) {
              const valueOffset = tiffOffset + exifData.getUint32(entryOffset + 8, littleEndian);
              let dateString = '';
              
              for (let j = 0; j < 19; j++) {
                const charCode = exifData.getUint8(valueOffset + j);
                if (charCode === 0) break;
                dateString += String.fromCharCode(charCode);
              }
              
              // Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
              const match = dateString.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
              if (match) {
                const [, year, month, day, hour, minute, second] = match;
                return new Date(
                  parseInt(year),
                  parseInt(month) - 1,
                  parseInt(day),
                  parseInt(hour),
                  parseInt(minute),
                  parseInt(second)
                );
              }
            }
          }
          
          break;
        }
        
        // Move to next marker
        const segmentLength = dataView.getUint16(offset + 2);
        offset += 2 + segmentLength;
      }
    } catch (error) {
      console.error('Error reading EXIF data:', error);
    }
    
    return null;
  }

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

    mediaData.audioTracks.forEach((track) => {
      if (!track || !track.fileTimestamp || !track.duration) return;
      const referenceMs = track.fileTimestamp.getTime();
      const durationMs = track.duration * 1000;
      
      // Use normal timestamp (audio starts at timestamp)
      const startMs = referenceMs;
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

    const firstVisibleImage =
      mediaData.images.find((img) => img.relative >= 0) || mediaData.images[0];
    if (firstVisibleImage) {
      showMainImages([firstVisibleImage]);
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

    destroyWaveform();

    audioLoadToken += 1;
    const loadId = audioLoadToken;

    playToggle.disabled = true;
    playToggle.textContent = "Loading";

    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.playbackRate = parseFloat(speedSelect.value) || 1;

    const handleLoadedMetadata = () => {
      if (loadId !== audioLoadToken) return;
      audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.removeEventListener("error", handleAudioError);

      if (Number.isFinite(audioElement.duration)) {
        track.duration = audioElement.duration;
      }

      playToggle.disabled = false;
      playToggle.textContent = "Play";

      recalculateImageTimestamps();
      startUpdateLoop();

      let handledPlayback = false;
      const pendingRequest = consumePendingSeek(mediaData.activeTrackIndex);
      if (pendingRequest) {
        if (pendingRequest.image) {
          seekToImageInCurrentTrack(pendingRequest.image, pendingRequest.shouldPlay);
          handledPlayback = Boolean(pendingRequest.shouldPlay);
        } else if (typeof pendingRequest.timeMs === "number") {
          seekToAbsoluteMs(pendingRequest.timeMs, pendingRequest.shouldPlay);
          handledPlayback = Boolean(pendingRequest.shouldPlay);
        }
      } else {
        updateSlideForCurrentTime();
      }

      if (autoPlay && !handledPlayback) {
        audioElement.play().catch(() => {});
      }
    };

    const handleAudioError = (event) => {
      if (loadId !== audioLoadToken) return;
      console.error("Failed to load audio track", event);
      audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.removeEventListener("error", handleAudioError);
      playToggle.disabled = true;
      playToggle.textContent = "Play";
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
      console.warn('findAudioTrackForTimestamp: Missing data', {
        hasMediaData: !!mediaData,
        hasAudioTracks: !!(mediaData && mediaData.audioTracks),
        trackCount: mediaData?.audioTracks?.length,
        hasImageTimestamp: !!imageTimestamp
      });
      return -1;
    }

    const imageTime = imageTimestamp instanceof Date ? imageTimestamp.getTime() : imageTimestamp;

    console.log(`\n=== Finding track for image at ${new Date(imageTime).toLocaleString()} ===`);
    console.log(`Total tracks: ${mediaData.audioTracks.length}`);

    let bestMatch = -1;
    let longestDuration = 0;

    for (let i = 0; i < mediaData.audioTracks.length; i++) {
      const track = mediaData.audioTracks[i];
      if (!track.fileTimestamp || !track.duration) {
        console.log(`Track ${i}: ${track.label} - SKIPPED (no timestamp or duration)`);
        continue;
      }

      // Calculate the audio track's time range in milliseconds (normal timestamp - start time)
      const trackTime = track.fileTimestamp instanceof Date ? track.fileTimestamp.getTime() : track.fileTimestamp;
      const audioStartTime = trackTime;
      const audioEndTime = audioStartTime + (track.duration * 1000);

      // Debug logging
      console.log(`Track ${i}: ${track.label}`);
      console.log(`  Track time: ${new Date(trackTime).toLocaleString()}`);
      console.log(`  Start: ${new Date(audioStartTime).toLocaleString()}, End: ${new Date(audioEndTime).toLocaleString()}`);
      console.log(`  Duration: ${track.duration.toFixed(1)}s`);
      console.log(`  Image time: ${new Date(imageTime).toLocaleString()}`);
      console.log(`  Match: ${imageTime >= audioStartTime && imageTime <= audioEndTime}`);

      // Check if image timestamp falls within this track's time range
      if (imageTime >= audioStartTime && imageTime <= audioEndTime) {
        // If multiple tracks match, prefer the longest one (most complete recording)
        if (track.duration > longestDuration) {
          bestMatch = i;
          longestDuration = track.duration;
          console.log(`  -> New best match! (longest so far)`);
        } else {
          console.log(`  -> Matches but shorter than current best (${longestDuration.toFixed(1)}s)`);
        }
      }
    }

    if (bestMatch >= 0) {
      console.log(`✓ Selected Track ${bestMatch}: ${mediaData.audioTracks[bestMatch].label}`);
    } else {
      console.warn(`✗ No matching track found for image at ${new Date(imageTime).toLocaleString()}`);
    }

    return bestMatch;
  }

  /**
   * Seek to the position of the given image in the currently loaded audio track.
   */
  function seekToImageInCurrentTrack(image, shouldPlay) {
    if (!image) return;

    const delayAdjusted = Math.max(image.relative - getDelaySeconds(), 0);
    const duration = Number.isFinite(audioElement.duration) ? audioElement.duration : null;
    if (duration && duration > 0) {
      audioElement.currentTime = Math.min(delayAdjusted, duration);
    } else {
      audioElement.currentTime = Math.max(delayAdjusted, 0);
    }

    updateSlideForCurrentTime();

    if (shouldPlay) {
      audioElement.play().catch(() => {});
    }
  }

  function seekToAbsoluteMs(absoluteMs, shouldPlay = null) {
    if (!mediaData || !mediaData.audioTracks) return;
    if (!Number.isFinite(absoluteMs)) return;

    const targetTrackIndex = findAudioTrackForTimestamp(absoluteMs);
    if (targetTrackIndex === -1) {
      console.warn(`No audio track covers ${new Date(absoluteMs).toISOString()}`);
      return;
    }

    const shouldResume = typeof shouldPlay === "boolean" ? shouldPlay : !audioElement.paused;

    if (targetTrackIndex !== mediaData.activeTrackIndex) {
      setPendingSeek(null, shouldResume, targetTrackIndex, absoluteMs);
      loadAudioTrack(targetTrackIndex, shouldResume);
      return;
    }

    const activeTrack = mediaData.audioTracks[mediaData.activeTrackIndex];
    if (!activeTrack || !activeTrack.adjustedStartTime) return;

    const baseMs = activeTrack.adjustedStartTime.getTime();
    const relativeSeconds = (absoluteMs - baseMs) / 1000;
    const delayAdjusted = Math.max(relativeSeconds - getDelaySeconds(), 0);
    const duration = Number.isFinite(audioElement.duration) ? audioElement.duration : null;

    if (duration && duration > 0) {
      audioElement.currentTime = clamp(delayAdjusted, 0, duration);
    } else {
      audioElement.currentTime = Math.max(delayAdjusted, 0);
    }

    updateSlideForCurrentTime();

    if (shouldResume) {
      audioElement.play().catch(() => {});
    }
  }

  function destroyWaveform() {
    stopUpdateLoop();
    audioElement.pause();
    audioElement.currentTime = 0;
    playToggle.disabled = true;
    playToggle.textContent = "Play";
  }

  function getAudioCurrentTime() {
    return Number.isFinite(audioElement.currentTime) ? audioElement.currentTime : 0;
  }

  function startUpdateLoop() {
    stopUpdateLoop();
    
    function updateFrame(timestamp) {
      // Throttle to roughly 4 times per second (250ms)
      if (timestamp - lastUpdateTime >= 250) {
        lastUpdateTime = timestamp;
        updateSlideForCurrentTime();
      }
      
      updateTimer = requestAnimationFrame(updateFrame);
    }
    
    updateTimer = requestAnimationFrame(updateFrame);
  }

  function stopUpdateLoop() {
    if (updateTimer) {
      cancelAnimationFrame(updateTimer);
      updateTimer = null;
    }
  }

  function updateSlideForCurrentTime() {
    if (!mediaData || !mediaData.audioTracks || mediaData.activeTrackIndex == null) return;
    const activeTrack = mediaData.audioTracks[mediaData.activeTrackIndex];
    if (!activeTrack || !activeTrack.adjustedStartTime) return;

    const time = getAudioCurrentTime();
    const delay = getDelaySeconds();
    const adjusted = time + delay;
    const absoluteMs = activeTrack.adjustedStartTime.getTime() + adjusted * 1000;

    const images = findImagesForTime(adjusted);
    if (images && images.length > 0) {
      showMainImages(images);
      highlightTimelineImages(images);
    } else {
      highlightTimelineImages([]);
      if (Number.isFinite(absoluteMs)) {
        updateTimelineActiveStates(absoluteMs);
      }
    }
    if (Number.isFinite(absoluteMs)) {
      updateTimelineCursor(absoluteMs);
      // Update analog clock while playing
      if (!isHoverScrubbing) {
        updateAnalogClock(new Date(absoluteMs));
      }
    }
  }

  function findImagesForTime(targetSeconds) {
    if (!mediaData || !mediaData.images.length) return [];
    
    // Find the current image based on time
    let currentImageIndex = 0;
    for (let i = 0; i < mediaData.images.length; i++) {
      if (mediaData.images[i].relative <= targetSeconds) {
        currentImageIndex = i;
      } else {
        break;
      }
    }
    
    const currentImage = mediaData.images[currentImageIndex];
    
    // Calculate how long this image has been displayed
    const timeIntoImage = targetSeconds - currentImage.relative;
    
    // Determine if we should allow composition changes
    const timeSinceLastChange = targetSeconds - lastCompositionChangeTime;
    const canChangeComposition = timeSinceLastChange >= MAX_COMPOSITION_CHANGE_INTERVAL;
    
    // If we're still within the minimum display duration of the current image
    // AND we can change composition, look for overlapping images
    if (timeIntoImage < MIN_IMAGE_DISPLAY_DURATION && canChangeComposition) {
      const images = [currentImage];
      const endTime = currentImage.relative + MIN_IMAGE_DISPLAY_DURATION;
      
      // Find all images that fall within the minimum display duration window
      for (let i = currentImageIndex + 1; i < mediaData.images.length; i++) {
        const nextImage = mediaData.images[i];
        if (nextImage.relative < endTime) {
          images.push(nextImage);
        } else {
          break;
        }
      }
      
      return images;
    }
    
    // If we can't change composition yet, return the currently displayed images
    if (!canChangeComposition && currentDisplayedImages.length > 0) {
      // Check if the current image is still in the displayed set
      const currentStillDisplayed = currentDisplayedImages.some(img => img === currentImage);
      if (currentStillDisplayed) {
        return currentDisplayedImages;
      }
    }
    
    // Otherwise, just show the current image
    return [currentImage];
  }

  function getImagesForAbsoluteTime(absoluteMs) {
    if (!mediaData || !Array.isArray(mediaData.images) || !mediaData.images.length) {
      return [];
    }
    if (!Number.isFinite(absoluteMs)) {
      return [];
    }

    const images = mediaData.images;
    let anchorIndex = 0;
    for (let i = 0; i < images.length; i++) {
      const timestamp = images[i].originalTimestamp?.getTime?.() ?? null;
      if (!Number.isFinite(timestamp)) continue;
      if (timestamp <= absoluteMs) {
        anchorIndex = i;
      } else {
        break;
      }
    }

    const anchor = images[anchorIndex];
    if (!anchor) return [];

    const anchorMs = anchor.originalTimestamp.getTime();
    const windowEnd = anchorMs + MIN_IMAGE_DISPLAY_DURATION * 1000;
    const result = [anchor];

    for (let i = anchorIndex + 1; i < images.length; i++) {
      const next = images[i];
      const nextMs = next.originalTimestamp?.getTime?.();
      if (!Number.isFinite(nextMs)) continue;
      if (nextMs <= windowEnd) {
        result.push(next);
      } else {
        break;
      }
    }

    return result;
  }

  function showMainImages(images) {
    if (!images || images.length === 0) return;
    
    // Check if we need to update the display
    const isSame = currentDisplayedImages.length === images.length &&
                   currentDisplayedImages.every((img, i) => img === images[i]);
    
    if (isSame) return;
    
    // Update the last composition change time
    lastCompositionChangeTime = getAudioCurrentTime() + getDelaySeconds();
    
    currentDisplayedImages = images;
    
    // Clear the container
    slideshowContainer.innerHTML = "";
    
    // Update split class
    slideshowContainer.className = "slideshow__container";
    if (images.length > 1) {
      slideshowContainer.classList.add(`split-${Math.min(images.length, 4)}`);
    }
    
    // Add images
    images.forEach((image, index) => {
      const img = document.createElement("img");
      img.src = image.url;
      img.alt = image.name || `Capture ${index + 1}`;
      slideshowContainer.appendChild(img);
    });
    
    // Update metadata with the first image
    const firstImage = images[0];
    if (imageTimecode) {
      if (images.length > 1) {
        imageTimecode.textContent = `${firstImage.timecode} (+${images.length - 1})`;
      } else {
        imageTimecode.textContent = firstImage.timecode;
      }
    }
    if (imageTimeOfDay) {
      imageTimeOfDay.textContent = firstImage.timeOfDay;
    }
    
    // Update analog clock
    if (firstImage.originalTimestamp) {
      updateAnalogClock(firstImage.originalTimestamp);
    }

    highlightTimelineImages(images);
    const highlightMs = firstImage?.originalTimestamp
      ? firstImage.originalTimestamp.getTime()
      : null;
    updateTimelineActiveStates(highlightMs);
  }

  function jumpToImage(image, { thumbnailNode } = {}) {
    if (!image || !mediaData || !mediaData.audioTracks) return;

    const correctTrackIndex = findAudioTrackForTimestamp(image.originalTimestamp);

    if (correctTrackIndex === -1) {
      console.warn(
        `Image "${image.name}" timestamp doesn't match any audio track`
      );
      showMainImages([image]);
      highlightTimelineImages([image]);
      return;
    }

    const wasPlaying = !audioElement.paused;
    const duration = Number.isFinite(audioElement.duration) ? audioElement.duration : null;
    const audioReady = duration && duration > 0;

    if (correctTrackIndex !== mediaData.activeTrackIndex) {
      setPendingSeek(image, wasPlaying, correctTrackIndex);
      loadAudioTrack(correctTrackIndex, wasPlaying);
    } else if (audioReady) {
      seekToImageInCurrentTrack(image, wasPlaying);
    } else {
      setPendingSeek(image, wasPlaying, correctTrackIndex);
    }

    showMainImages([image]);
    highlightTimelineImages([image]);
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
    const secs = String(date.getSeconds()).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
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
    
    // Apply rotation to clock hands
    clockHourHand.setAttribute('transform', `rotate(${hourAngle} 50 50)`);
    clockMinuteHand.setAttribute('transform', `rotate(${minuteAngle} 50 50)`);
    
    if (clockSecondHand) {
      clockSecondHand.setAttribute('transform', `rotate(${secondAngle} 50 50)`);
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
      hidePreviewImages();
      isHoverScrubbing = false;
      return;
    }

    const absoluteMs = timelineState.viewStartMs + viewSpan * ratio;
    if (!Number.isFinite(absoluteMs)) {
      hideTimelineHoverPreview();
      hidePreviewImages();
      isHoverScrubbing = false;
      return;
    }

    if (!isHoverScrubbing) {
      isHoverScrubbing = true;
      hoverOriginalCursorMs = timelineState.currentCursorMs;
    }

    const images = getImagesForAbsoluteTime(absoluteMs);

    if (timelineHoverPreview) {
      timelineHoverPreview.classList.remove("hidden");
      timelineHoverPreview.style.left = `${ratio * 100}%`;
    }

    renderTimelineHoverImages(images);
    renderPreviewImages(images);

    if (timelineHoverPreviewTime) {
      timelineHoverPreviewTime.textContent = formatClock(new Date(absoluteMs));
    }
    
    // Update analog clock during hover
    updateAnalogClock(new Date(absoluteMs));

    highlightTimelineImages(images);
    // Don't update track highlight during hover - only during playback
    // updateTimelineActiveStates(absoluteMs);
    updateTimelineCursor(absoluteMs);
  }

  function handleTimelineHoverLeave() {
    hideTimelineHoverPreview();
    hidePreviewImages();
    if (isHoverScrubbing) {
      isHoverScrubbing = false;
      updateSlideForCurrentTime();
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
    const images = getImagesForAbsoluteTime(absoluteMs);

    hidePreviewImages();
    hideTimelineHoverPreview();
    isHoverScrubbing = false;

    if (images.length) {
      // Jump to the image and start playing
      const correctTrackIndex = findAudioTrackForTimestamp(images[0].originalTimestamp);
      
      if (correctTrackIndex === -1) {
        console.warn(`Image "${images[0].name}" timestamp doesn't match any audio track`);
        showMainImages([images[0]]);
        highlightTimelineImages([images[0]]);
        return;
      }

      if (correctTrackIndex !== mediaData.activeTrackIndex) {
        setPendingSeek(images[0], shouldPlay, correctTrackIndex);
        loadAudioTrack(correctTrackIndex, shouldPlay);
      } else {
        seekToImageInCurrentTrack(images[0], shouldPlay);
      }

      showMainImages([images[0]]);
      highlightTimelineImages([images[0]]);
    } else {
      seekToAbsoluteMs(absoluteMs, shouldPlay);
    }
    updateSlideForCurrentTime();
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
        timelineHoverPreviewImages.classList.add(`split-${Math.min(count, 4)}`);
      }
      images.slice(0, 4).forEach((image, index) => {
        const img = document.createElement("img");
        img.src = image.url;
        img.alt = image.name || `Preview ${index + 1}`;
        timelineHoverPreviewImages.appendChild(img);
      });
    }
  }

  function renderPreviewImages(images) {
    if (!slideshowPreview) return;
    if (!Array.isArray(images) || images.length === 0) {
      hidePreviewImages();
      return;
    }

    slideshowPreview.className = "slideshow__preview";
    slideshowPreview.innerHTML = "";
    const count = Math.min(images.length, 4);
    if (count > 1) {
      slideshowPreview.classList.add(`split-${Math.min(count, 4)}`);
    }

    images.slice(0, 4).forEach((image, index) => {
      const img = document.createElement("img");
      img.src = image.url;
      img.alt = image.name || `Preview ${index + 1}`;
      slideshowPreview.appendChild(img);
    });

    slideshowPreview.classList.remove("hidden");
    slideshowPreview.classList.add("active");
  }

  function hidePreviewImages() {
    if (!slideshowPreview) return;
    slideshowPreview.classList.remove("active");
    slideshowPreview.className = "slideshow__preview";
    slideshowPreview.innerHTML = "";
    if (!slideshowPreview.classList.contains("hidden")) {
      slideshowPreview.classList.add("hidden");
    }
  }

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
    highlightTimelineImages(currentDisplayedImages);
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

    mediaData.audioTracks.forEach((track, index) => {
      if (!track || !track.duration) return;
      let startMs = track.adjustedStartTime ? track.adjustedStartTime.getTime() : null;
      if (!Number.isFinite(startMs)) {
        if (!(track.fileTimestamp instanceof Date)) return;
        const referenceMs = track.fileTimestamp.getTime();
        const durationMs = track.duration * 1000;
        // Use normal timestamp (audio starts at timestamp)
        startMs = referenceMs;
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

      mainEl.addEventListener("click", (event) => {
        event.stopPropagation();
        jumpToImage(image);
      });

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
    if (range <= 0) return;

    const step = computeTickStep(range);
    if (!step) return;

    const firstTick = alignToStep(timelineState.viewStartMs, step);
    for (let tick = firstTick; tick <= timelineState.viewEndMs + 1; tick += step) {
      const position = ((tick - timelineState.viewStartMs) / range) * 100;
      if (position < -2 || position > 102) continue;
      const tickEl = document.createElement("div");
      tickEl.className = "timeline__axis-tick";
      tickEl.style.left = `${position}%`;
      tickEl.textContent = formatClock(new Date(tick));
      timelineAxis.appendChild(tickEl);
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
      timelineGradient.style.backgroundImage = createDayNightGradient(
        timelineState.viewStartMs,
        timelineState.viewEndMs
      );
    }
    if (timelineMinimapGradient) {
      timelineMinimapGradient.style.backgroundImage = createDayNightGradient(
        timelineState.minMs,
        timelineState.maxMs
      );
    }
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
})();
