(() => {
  const dropzone = document.getElementById("dropzone");
  const dropzoneMessage = document.getElementById("dropzone-message");
  const dropzoneLoader = document.getElementById("dropzone-loader");
  const folderInput = document.getElementById("folder-input");
  const browseTrigger = document.getElementById("browse-trigger");
  const sidebar = document.getElementById("sidebar");
  const playToggle = document.getElementById("play-toggle");
  const speedSelect = document.getElementById("speed-select");
  const waveformContainer = document.getElementById("waveform");
  const viewerContent = document.getElementById("viewer-content");
  const sidebarEmpty = document.getElementById("sidebar-empty");
  const thumbnailGrid = document.getElementById("thumbnail-grid");
  const thumbnailTemplate = document.getElementById("thumbnail-template");
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
  const timelineBrush = document.getElementById("timeline-brush");
  const timelineBrushRegion = document.getElementById("timeline-brush-region");
  const timelineNotices = document.getElementById("timeline-notices");
  const imageTimecode = document.getElementById("image-timecode");
  const imageTimeOfDay = document.getElementById("image-timeofday");
  const delayRange = document.getElementById("delay-range");
  const delayNumber = document.getElementById("delay-number");
  const timestampAtEndCheckbox = document.getElementById("timestamp-at-end");

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
  const TRACK_LANE_HEIGHT = 36;
  const MIN_BRUSH_SPAN = 0.02;
  const TIMELINE_PADDING_RATIO = 0.08;
  const OVERLAP_REPORT_THRESHOLD_MS = 5_000;

  let wave = null;
  let mediaData = null;
  let currentThumbnail = null;
  let updateTimer = null;
  let lastUpdateTime = 0;
  let currentDisplayedImages = [];
  let lastCompositionChangeTime = -Infinity;
  let pendingSeek = null;
  let pendingSeekToken = 0;
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
    brushStart: 0,
    brushEnd: 1,
    currentCursorMs: null,
    highlightTimeMs: null,
    imageStackMagnitude: 0,
    anomalyMessages: [],
  };
  let timelineBrushDrag = null;
  let timelineInteractionsReady = false;
  let brushDragRafId = null;

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
    if (!wave) return;
    wave.playPause();
  });

  speedSelect.addEventListener("change", () => {
    if (!wave) return;
    const speed = parseFloat(speedSelect.value);
    wave.setPlaybackRate(speed);
  });

  timestampAtEndCheckbox.addEventListener("change", () => {
    if (mediaData && mediaData.images && mediaData.audioTracks) {
      recalculateImageTimestamps();
      updateSlideForCurrentTime();
    }
  });

  delayRange.addEventListener("input", () => syncDelayInputs(delayRange.value));
  delayNumber.addEventListener("input", () => syncDelayInputs(delayNumber.value));

  setupTimelineInteractions();

  function syncDelayInputs(value) {
    delayRange.value = value;
    delayNumber.value = value;
  }

  function getDelaySeconds() {
    return parseFloat(delayNumber.value) || 0;
  }

  // Remember the freshest seek request while a track is still loading.
  function setPendingSeek(image, shouldPlay, trackIndex) {
    pendingSeekToken += 1;
    pendingSeek = {
      id: pendingSeekToken,
      image,
      shouldPlay,
      trackIndex,
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
          if (!timestamp) {
            console.warn(`Unable to parse timestamp from ${file.name}. Skipping.`);
            return null;
          }
          return {
            name: file.name,
            url,
            timestamp,
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

    populateThumbnails(mediaData.images);
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
    sidebarEmpty.innerHTML = `<p>${message}</p>`;
    thumbnailGrid.innerHTML = "";
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

    const isTimestampAtEnd = timestampAtEndCheckbox.checked;

    mediaData.audioTracks.forEach((track) => {
      if (!track || !track.fileTimestamp || !track.duration) return;
      const referenceMs = track.fileTimestamp.getTime();
      const durationMs = track.duration * 1000;
      let startMs;

      if (isTimestampAtEnd) {
        startMs = referenceMs - durationMs;
      } else {
        startMs = referenceMs;
      }

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
      highlightThumbnail(firstVisibleImage);
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
    setupWaveformForTrack(mediaData.audioTracks[index], autoPlay);
  }

  function setupWaveformForTrack(track, autoPlay = false) {
    if (!track) return;

    destroyWaveform();

    wave = WaveSurfer.create({
      container: waveformContainer,
      waveColor: "rgba(79, 140, 255, 0.35)",
      progressColor: "#4f8cff",
      cursorColor: "#f4f4f8",
      height: 180,
      barWidth: 2,
      barRadius: 2,
      barGap: 1,
      responsive: true,
      normalize: true,
      mediaControls: false,
    });

    wave.on("ready", () => {
      playToggle.disabled = false;
      playToggle.textContent = "Play";
      sidebarEmpty.classList.add("hidden");
      track.duration = wave.getDuration();
      
      // Always recalculate image timestamps based on audio timestamp
      recalculateImageTimestamps();
      
      startUpdateLoop();

      let handledPlayback = false;
      const pendingRequest = consumePendingSeek(mediaData.activeTrackIndex);
      if (pendingRequest) {
        seekToImageInCurrentTrack(pendingRequest.image, pendingRequest.shouldPlay);
        handledPlayback = Boolean(pendingRequest.shouldPlay);
      }

      if (autoPlay && !handledPlayback) {
        wave.play();
      }
    });

    wave.on("play", () => {
      playToggle.textContent = "Pause";
    });

    wave.on("pause", () => {
      playToggle.textContent = "Play";
    });

    wave.on("finish", () => {
      playToggle.textContent = "Replay";
    });

    wave.on("timeupdate", updateSlideForCurrentTime);

    wave.load(track.url);
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

    const timestampAtEnd = timestampAtEndCheckbox && timestampAtEndCheckbox.checked;
    const imageTime = imageTimestamp instanceof Date ? imageTimestamp.getTime() : imageTimestamp;

    console.log(`\n=== Finding track for image at ${new Date(imageTime).toLocaleString()} ===`);
    console.log(`Total tracks: ${mediaData.audioTracks.length}, Timestamp at end: ${timestampAtEnd}`);

    let bestMatch = -1;
    let longestDuration = 0;

    for (let i = 0; i < mediaData.audioTracks.length; i++) {
      const track = mediaData.audioTracks[i];
      if (!track.fileTimestamp || !track.duration) {
        console.log(`Track ${i}: ${track.label} - SKIPPED (no timestamp or duration)`);
        continue;
      }

      // Calculate the audio track's time range in milliseconds
      const trackTime = track.fileTimestamp instanceof Date ? track.fileTimestamp.getTime() : track.fileTimestamp;
      const audioStartTime = timestampAtEnd
        ? trackTime - (track.duration * 1000)
        : trackTime;
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
    if (!wave || !image) return;
    
    const duration = wave.getDuration();
    if (duration > 0) {
      const target = Math.max(image.relative - getDelaySeconds(), 0);
      const seek = duration ? Math.min(target / duration, 1) : 0;
      wave.seekTo(seek);
      
      if (shouldPlay && !wave.isPlaying()) {
        wave.play();
      }
    }
  }

  function destroyWaveform() {
    stopUpdateLoop();
    if (wave) {
      wave.destroy();
      wave = null;
    }
    playToggle.disabled = true;
    playToggle.textContent = "Play";
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
    if (!wave || !mediaData) return;
    const time = wave.getCurrentTime();
    const delay = getDelaySeconds();
    const adjusted = time + delay;
    let absoluteMs = null;
    const activeTrack = mediaData.audioTracks[mediaData.activeTrackIndex];
    if (activeTrack && activeTrack.adjustedStartTime) {
      absoluteMs = activeTrack.adjustedStartTime.getTime() + adjusted * 1000;
    }
    const images = findImagesForTime(adjusted);
    if (images && images.length > 0) {
      showMainImages(images);
      highlightThumbnail(images[0]);
    } else {
      highlightTimelineImages([]);
      if (absoluteMs !== null) {
        updateTimelineActiveStates(absoluteMs);
      }
    }
    if (absoluteMs !== null) {
      updateTimelineCursor(absoluteMs);
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

  function showMainImages(images) {
    if (!images || images.length === 0) return;
    
    // Check if we need to update the display
    const isSame = currentDisplayedImages.length === images.length &&
                   currentDisplayedImages.every((img, i) => img === images[i]);
    
    if (isSame) return;
    
    // Update the last composition change time
    if (wave) {
      lastCompositionChangeTime = wave.getCurrentTime() + getDelaySeconds();
    }
    
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
      highlightThumbnail(image, thumbnailNode);
      return;
    }

    const wasPlaying = wave ? wave.isPlaying() : false;
    const waveReady = wave && wave.getDuration() > 0;

    if (correctTrackIndex !== mediaData.activeTrackIndex) {
      setPendingSeek(image, wasPlaying, correctTrackIndex);
      loadAudioTrack(correctTrackIndex, wasPlaying);
    } else if (waveReady) {
      seekToImageInCurrentTrack(image, wasPlaying);
    } else {
      setPendingSeek(image, wasPlaying, correctTrackIndex);
    }

    showMainImages([image]);
    highlightThumbnail(image, thumbnailNode);
  }

  function populateThumbnails(images) {
    thumbnailGrid.innerHTML = "";
    sidebarEmpty.classList.add("hidden");
    currentThumbnail = null;

    images.forEach((image, index) => {
      image.index = index;
      const node = document.importNode(thumbnailTemplate.content, true);
      const root = node.querySelector(".thumbnail");
      const img = node.querySelector(".thumbnail__image");
      const timecodeEl = node.querySelector(".thumbnail__code");
      const clockEl = node.querySelector(".thumbnail__clock");

      img.src = image.url;
      img.alt = image.name || `Capture ${index + 1}`;
      timecodeEl.textContent = image.timecode;
      clockEl.textContent = image.timeOfDay;

      root.addEventListener("click", () => {
        jumpToImage(image, { thumbnailNode: root });
      });

      root.dataset.index = index.toString();
      image.thumbnailEl = root;

      thumbnailGrid.appendChild(node);
    });
  }

  function highlightThumbnail(image, explicitNode) {
    if (!image) return;
    const node = explicitNode || image.thumbnailEl || thumbnailGrid.querySelector(`.thumbnail[data-index="${image.index}"]`);
    if (currentThumbnail === node) return;

    if (currentThumbnail) {
      currentThumbnail.classList.remove("active");
    }
    if (node) {
      node.classList.add("active");
      currentThumbnail = node;
      ensureThumbnailVisible(node);
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
    const secs = String(date.getSeconds()).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  }

  function formatDurationMs(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    return formatTime(seconds);
  }

  function setupTimelineInteractions() {
    if (timelineInteractionsReady) return;
    if (!timelineBrush || !timelineMinimap) return;

    timelineInteractionsReady = true;

    const leftHandle = timelineBrush.querySelector(".timeline__brush-handle--left");
    const rightHandle = timelineBrush.querySelector(".timeline__brush-handle--right");

    if (leftHandle) {
      leftHandle.addEventListener("pointerdown", (event) => startBrushDrag(event, "left"));
    }
    if (rightHandle) {
      rightHandle.addEventListener("pointerdown", (event) => startBrushDrag(event, "right"));
    }
    if (timelineBrushRegion) {
      timelineBrushRegion.addEventListener("pointerdown", (event) => startBrushDrag(event, "move"));
    }
    timelineMinimap.addEventListener("pointerdown", handleMinimapPointerDown);
  }

  function initializeTimeline(options = {}) {
    if (!timelineRoot || !mediaData || !mediaData.audioTracks) return;

    const data = buildTimelineData();
    if (!data) {
      destroyTimeline();
      timelineRoot.classList.add("hidden");
      return;
    }

    const preserve = options.preserveView && timelineState.initialized;
    const previousBrush = preserve
      ? { start: timelineState.brushStart, end: timelineState.brushEnd }
      : null;

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

    const brushStart = previousBrush ? clamp(previousBrush.start, 0, 1 - MIN_BRUSH_SPAN) : 0;
    const brushEnd = previousBrush ? clamp(previousBrush.end, brushStart + MIN_BRUSH_SPAN, 1) : 1;
    timelineState.brushStart = brushStart;
    timelineState.brushEnd = brushEnd;
    timelineState.viewStartMs = timelineState.minMs + timelineState.totalMs * timelineState.brushStart;
    timelineState.viewEndMs = timelineState.minMs + timelineState.totalMs * timelineState.brushEnd;

    createTimelineTrackElements();
    createTimelineImageElements();
    updateTimelineGeometry();
    updateTimelineBrushUI();
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
    timelineState.brushStart = 0;
    timelineState.brushEnd = 1;
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
    if (timelineBrush) {
      timelineBrush.style.left = "0%";
      timelineBrush.style.width = "100%";
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
        if (timestampAtEndCheckbox && timestampAtEndCheckbox.checked) {
          startMs = referenceMs - durationMs;
        } else {
          startMs = referenceMs;
        }
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

    if (anomalies.length && timestampAtEndCheckbox) {
      anomalies.push(
        'Tip: toggle “Audio timestamp at end” to test whether the recorder stamped the file start or end time.'
      );
    }

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

    const trackArea = Math.max(timelineState.trackLaneCount, 1) * TRACK_LANE_HEIGHT;
    const imageExtra = timelineState.imageStackMagnitude * IMAGE_STACK_STEP_PX * 2;
    const imageArea = IMAGE_BASE_HEIGHT + imageExtra;
    const totalHeight = 40 + trackArea + imageArea;

    if (timelineTracks) {
      timelineTracks.style.setProperty("--timeline-tracks-height", `${trackArea}px`);
    }
    if (timelineImages) {
      timelineImages.style.setProperty("--timeline-images-height", `${imageArea}px`);
    }
    if (timelineMain) {
      timelineMain.style.height = `${Math.max(150, totalHeight)}px`;
    }
  }

  function createTimelineTrackElements() {
    if (!timelineTracks || !timelineMinimapTracks) return;

    const mainFragment = document.createDocumentFragment();
    const miniFragment = document.createDocumentFragment();

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

      const waveEl = document.createElement("div");
      waveEl.className = "timeline-track__wave";
      mainEl.appendChild(waveEl);

      mainEl.addEventListener("click", () => {
        if (!mediaData) return;
        const wasPlaying = wave && wave.isPlaying();
        if (range.index !== mediaData.activeTrackIndex) {
          loadAudioTrack(range.index, wasPlaying);
        }
      });

      mainFragment.appendChild(mainEl);
      range.track.timelineMainEl = mainEl;

      const miniEl = document.createElement("div");
      miniEl.className = "timeline-track";
      miniEl.style.setProperty("--lane", range.lane);
      miniEl.title = title;
      const miniWave = document.createElement("div");
      miniWave.className = "timeline-track__wave";
      miniEl.appendChild(miniWave);

      miniFragment.appendChild(miniEl);
      range.track.timelineMiniEl = miniEl;
    });

    timelineTracks.innerHTML = "";
    timelineTracks.appendChild(mainFragment);
    timelineMinimapTracks.innerHTML = "";
    timelineMinimapTracks.appendChild(miniFragment);
  }

  function createTimelineImageElements() {
    if (!timelineImages || !timelineMinimapImages) return;

    const mainFragment = document.createDocumentFragment();
    const miniFragment = document.createDocumentFragment();

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

      const miniEl = document.createElement("div");
      miniEl.className = "timeline-image";
      miniEl.style.setProperty("--lane", 0);
      const miniImg = document.createElement("img");
      miniImg.src = image.url;
      miniImg.alt = "";
      miniEl.appendChild(miniImg);

      miniFragment.appendChild(miniEl);
      image.timelineMiniEl = miniEl;
    });

    timelineImages.innerHTML = "";
    timelineImages.appendChild(mainFragment);
    timelineMinimapImages.innerHTML = "";
    timelineMinimapImages.appendChild(miniFragment);
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
      const miniEl = track.timelineMiniEl;
      
      if (mainEl) {
        const inViewStart = clamp(range.startMs, timelineState.viewStartMs, timelineState.viewEndMs);
        const inViewEnd = clamp(range.endMs, timelineState.viewStartMs, timelineState.viewEndMs);
        const isVisible = !(inViewEnd <= timelineState.viewStartMs || inViewStart >= timelineState.viewEndMs);
        
        trackUpdates.push({
          mainEl,
          isVisible,
          leftPct: isVisible ? ((inViewStart - timelineState.viewStartMs) / viewRange) * 100 : 0,
          widthPct: isVisible ? Math.max(((inViewEnd - inViewStart) / viewRange) * 100, 0.4) : 0,
          lane: range.lane
        });
      }
      
      if (miniEl) {
        const leftPct = ((range.startMs - timelineState.minMs) / totalRange) * 100;
        const widthPct = Math.max(((range.endMs - range.startMs) / totalRange) * 100, 0.25);
        
        trackUpdates.push({
          miniEl,
          leftPct,
          widthPct,
          lane: range.lane
        });
      }
    });

    timelineState.imageEntries.forEach((entry) => {
      const { image, timeMs, lane } = entry;
      const mainEl = image.timelineMainEl;
      const miniEl = image.timelineMiniEl;
      const leftMain = ((timeMs - timelineState.viewStartMs) / viewRange) * 100;
      const leftMini = ((timeMs - timelineState.minMs) / totalRange) * 100;

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
      
      if (miniEl) {
        imageUpdates.push({
          miniEl,
          leftMini
        });
      }
    });

    // Second pass: Apply all DOM writes in batch
    trackUpdates.forEach(update => {
      if (update.mainEl) {
        update.mainEl.style.display = update.isVisible ? 'block' : 'none';
        if (update.isVisible) {
          update.mainEl.style.setProperty('--lane', update.lane);
          update.mainEl.style.left = `${update.leftPct}%`;
          update.mainEl.style.width = `${update.widthPct}%`;
        }
      } else if (update.miniEl) {
        update.miniEl.style.setProperty('--lane', update.lane);
        update.miniEl.style.left = `${update.leftPct}%`;
        update.miniEl.style.width = `${update.widthPct}%`;
      }
    });

    imageUpdates.forEach(update => {
      if (update.mainEl) {
        update.mainEl.style.display = update.isVisible ? 'block' : 'none';
        if (update.isVisible) {
          update.mainEl.style.setProperty('--lane', update.lane);
          update.mainEl.style.setProperty('--stack-offset', `${update.offsetIndex * IMAGE_STACK_STEP_PX}px`);
          update.mainEl.style.left = `${update.leftMain}%`;
        }
      } else if (update.miniEl) {
        update.miniEl.style.setProperty('--lane', 0);
        update.miniEl.style.left = `${update.leftMini}%`;
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

  function updateTimelineBrushUI() {
    if (!timelineBrush || !timelineState.initialized) return;
    const width = timelineState.brushEnd - timelineState.brushStart;
    timelineBrush.style.left = `${timelineState.brushStart * 100}%`;
    timelineBrush.style.width = `${width * 100}%`;
  }

  function setBrushRange(start, end, { emit = true, updateUIOnly = false } = {}) {
    if (!timelineState.initialized) return;

    const span = clamp(end - start, MIN_BRUSH_SPAN, 1);
    let clampedStart = clamp(start, 0, 1 - span);
    let clampedEnd = clampedStart + span;

    timelineState.brushStart = clampedStart;
    timelineState.brushEnd = clampedEnd;
    updateTimelineBrushUI();
    
    // During drag, only update UI. Full update happens on drag end.
    if (!updateUIOnly && emit) {
      updateTimelineViewFromBrush();
    }
  }

  function updateTimelineViewFromBrush() {
    if (!timelineState.initialized) return;
    timelineState.viewStartMs = timelineState.minMs + timelineState.totalMs * timelineState.brushStart;
    timelineState.viewEndMs = timelineState.minMs + timelineState.totalMs * timelineState.brushEnd;
    updateTimelineGradients();
    updateTimelineAxis();
    positionTimelineElements();
    updateTimelineCursor(timelineState.currentCursorMs);
    updateTimelineActiveStates(timelineState.highlightTimeMs);
  }

  function handleMinimapPointerDown(event) {
    if (!timelineState.initialized || !timelineMinimap) return;
    if (timelineBrush && timelineBrush.contains(event.target)) return;

    const rect = timelineMinimap.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const span = timelineState.brushEnd - timelineState.brushStart;
    const start = clamp(ratio - span / 2, 0, 1 - span);
    const end = start + span;
    setBrushRange(start, end, { emit: true });
    event.preventDefault();
  }

  function startBrushDrag(event, mode) {
    if (!timelineState.initialized || !timelineMinimap) return;
    const rect = timelineMinimap.getBoundingClientRect();
    if (!rect.width) return;

    event.preventDefault();
    const pointerRatio = (event.clientX - rect.left) / rect.width;
    timelineBrushDrag = {
      type: mode,
      pointerId: event.pointerId,
      rect,
      startStart: timelineState.brushStart,
      startEnd: timelineState.brushEnd,
      startPointerRatio: pointerRatio,
      captureTarget: event.target,
    };

    if (event.target.setPointerCapture) {
      try {
        event.target.setPointerCapture(event.pointerId);
      } catch (err) {
        // ignore if pointer capture fails
      }
    }

    window.addEventListener("pointermove", handleBrushPointerMove);
    window.addEventListener("pointerup", stopBrushDrag);
    window.addEventListener("pointercancel", stopBrushDrag);
  }

  function handleBrushPointerMove(event) {
    if (!timelineBrushDrag) return;
    
    event.preventDefault();
    
    // Cancel any pending RAF update
    if (brushDragRafId !== null) {
      cancelAnimationFrame(brushDragRafId);
    }
    
    // Schedule update on next animation frame
    brushDragRafId = requestAnimationFrame(() => {
      brushDragRafId = null;
      performBrushUpdate(event);
    });
  }

  function performBrushUpdate(event) {
    if (!timelineBrushDrag) return;
    const { rect, type, startStart, startEnd, startPointerRatio } = timelineBrushDrag;
    if (!rect.width) return;

    const ratio = (event.clientX - rect.left) / rect.width;
    const span = startEnd - startStart;
    let newStart = startStart;
    let newEnd = startEnd;

    if (type === "left") {
      newStart = clamp(ratio, 0, startEnd - MIN_BRUSH_SPAN);
      newEnd = startEnd;
    } else if (type === "right") {
      newStart = startStart;
      newEnd = clamp(ratio, startStart + MIN_BRUSH_SPAN, 1);
    } else {
      const delta = ratio - startPointerRatio;
      newStart = clamp(startStart + delta, 0, 1 - span);
      newEnd = newStart + span;
    }

    // Only update brush UI immediately, defer expensive operations
    setBrushRange(newStart, newEnd, { emit: false, updateUIOnly: true });
  }

  function stopBrushDrag(event) {
    if (!timelineBrushDrag) return;
    if (event.pointerId !== timelineBrushDrag.pointerId) return;

    // Cancel any pending RAF update
    if (brushDragRafId !== null) {
      cancelAnimationFrame(brushDragRafId);
      brushDragRafId = null;
    }

    if (timelineBrushDrag.captureTarget?.releasePointerCapture) {
      try {
        timelineBrushDrag.captureTarget.releasePointerCapture(event.pointerId);
      } catch (err) {
        // ignore capture release errors
      }
    }

    window.removeEventListener("pointermove", handleBrushPointerMove);
    window.removeEventListener("pointerup", stopBrushDrag);
    window.removeEventListener("pointercancel", stopBrushDrag);

    // Perform final full update after drag completes
    updateTimelineViewFromBrush();

    timelineBrushDrag = null;
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
        if (image.thumbnailEl) image.thumbnailEl = null;
      });
    }
  }

  function ensureThumbnailVisible(node) {
    if (!node) return;
    const container = thumbnailGrid.parentElement || sidebar;
    const containerRect = container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    if (nodeRect.top < containerRect.top || nodeRect.bottom > containerRect.bottom) {
      node.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }
})();
