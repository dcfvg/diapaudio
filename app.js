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
  const audioTimeline = document.getElementById("audio-timeline");
  const audioTrackTemplate = document.getElementById("audio-track-template");
  const imageTimecode = document.getElementById("image-timecode");
  const imageTimeOfDay = document.getElementById("image-timeofday");
  const delayRange = document.getElementById("delay-range");
  const delayNumber = document.getElementById("delay-number");
  const timestampAtEndCheckbox = document.getElementById("timestamp-at-end");

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

  let wave = null;
  let mediaData = null;
  let currentThumbnail = null;
  let updateTimer = null;
  let currentDisplayedImages = [];
  let lastCompositionChangeTime = -Infinity;

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
      renderAudioTimeline();
      updateSlideForCurrentTime();
    }
  });

  delayRange.addEventListener("input", () => syncDelayInputs(delayRange.value));
  delayNumber.addEventListener("input", () => syncDelayInputs(delayNumber.value));

  window.addEventListener("resize", () => {
    if (wave) wave.drawBuffer();
  });

  function syncDelayInputs(value) {
    delayRange.value = value;
    delayNumber.value = value;
  }

  function getDelaySeconds() {
    return parseFloat(delayNumber.value) || 0;
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
    const normalized = normalizeImageTimeline(validImages);

    destroyWaveform();
    releaseMediaResources(mediaData);

    mediaData = {
      audioTracks,
      activeTrackIndex: 0,
      images: normalized,
    };

    currentDisplayedImages = [];
    lastCompositionChangeTime = -Infinity;

    populateThumbnails(normalized);
    showMainImages([normalized[0]]);
    highlightThumbnail(normalized[0]);
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
    if (audioTimeline) {
      audioTimeline.innerHTML = "";
      audioTimeline.classList.add("hidden");
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

  function parseTimestampFromName(name) {
    const basename = name.split("/").pop() || name;
    const clean = basename.replace(/\.[^.]+$/, "");
    
    // Try various date-time formats
    const regexes = [
      // Full date-time formats: YYYY-MM-DD HH:MM:SS (various separators)
      /(\d{4})[-_]?(\d{2})[-_]?(\d{2})[ _-](\d{2})[.\-_:](\d{2})[.\-_:](\d{2})/,
      /(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/,
      
      // Date with time: DD-MM-YYYY HH:MM:SS
      /(\d{2})[-_]?(\d{2})[-_]?(\d{4})[ _-](\d{2})[.\-_:](\d{2})[.\-_:](\d{2})/,
      
      // Time-only formats: HH.MM.SS or HH:MM:SS or HH-MM-SS (at start of filename)
      /^(\d{2})[.\-_:](\d{2})[.\-_:](\d{2})/,
    ];

    for (const regex of regexes) {
      const match = clean.match(regex);
      if (match) {
        // Check if this is a time-only format (3 groups)
        if (match.length === 4) {
          const [, hours, minutes, seconds] = match.map(Number);
          // Use a reference date (today) with the extracted time
          const now = new Date();
          const ts = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
          if (!Number.isNaN(ts.getTime()) && hours < 24 && minutes < 60 && seconds < 60) {
            return ts;
          }
        }
        // Full date-time format (7 groups)
        else if (match.length === 7) {
          let [, p1, p2, p3, hours, minutes, seconds] = match.map(Number);
          let year, month, day;
          
          // Determine if it's YYYY-MM-DD or DD-MM-YYYY based on first value
          if (p1 > 1000) {
            // YYYY-MM-DD format
            year = p1;
            month = p2;
            day = p3;
          } else {
            // DD-MM-YYYY format
            day = p1;
            month = p2;
            year = p3;
          }
          
          // Validate and create date
          if (!isNaN(year) && year >= 1900 && year <= 2100 &&
              month >= 1 && month <= 12 &&
              day >= 1 && day <= 31 &&
              hours >= 0 && hours < 24 &&
              minutes >= 0 && minutes < 60 &&
              seconds >= 0 && seconds < 60) {
            const ts = new Date(year, month - 1, day, hours, minutes, seconds);
            if (!Number.isNaN(ts.getTime())) {
              return ts;
            }
          }
        }
      }
    }

    return null;
  }

  function normalizeImageTimeline(images) {
    const sorted = [...images].sort((a, b) => a.timestamp - b.timestamp);
    const base = sorted[0].timestamp.getTime();

    return sorted.map((image) => {
      const relative = (image.timestamp.getTime() - base) / 1000;
      return {
        ...image,
        originalTimestamp: image.timestamp,
        relative,
        timecode: formatTime(relative),
        timeOfDay: formatClock(image.timestamp),
      };
    });
  }

  function recalculateImageTimestamps() {
    if (!mediaData || !mediaData.images || !mediaData.audioTracks) return;

    const isTimestampAtEnd = timestampAtEndCheckbox.checked;
    
    // Find the active audio track and get its timestamp and duration
    const activeTrack = mediaData.audioTracks[mediaData.activeTrackIndex];
    if (!activeTrack || !activeTrack.fileTimestamp || !activeTrack.duration) return;

    // Calculate the adjusted start time for the audio
    let audioStartTime;
    if (isTimestampAtEnd) {
      // If timestamp is at end, subtract duration to get start time
      audioStartTime = new Date(activeTrack.fileTimestamp.getTime() - (activeTrack.duration * 1000));
    } else {
      // If timestamp is at beginning, use it directly
      audioStartTime = activeTrack.fileTimestamp;
    }

    // Store the adjusted start time
    activeTrack.adjustedStartTime = audioStartTime;

    // Recalculate all image relative times based on the adjusted audio start time
    const base = audioStartTime.getTime();
    mediaData.images.forEach((image) => {
      const relative = (image.originalTimestamp.getTime() - base) / 1000;
      image.relative = relative;
      image.timecode = formatTime(Math.max(0, relative));
    });

    // Re-sort images by relative time
    mediaData.images.sort((a, b) => a.relative - b.relative);
  }

  function loadAudioTrack(index, autoPlay = false) {
    if (!mediaData || !Array.isArray(mediaData.audioTracks) || !mediaData.audioTracks.length) return;
    if (index < 0 || index >= mediaData.audioTracks.length) return;

    mediaData.activeTrackIndex = index;
    renderAudioTimeline();
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
      
      // Recalculate image timestamps if checkbox is checked
      if (timestampAtEndCheckbox.checked) {
        recalculateImageTimestamps();
      }
      
      renderAudioTimeline();
      startUpdateLoop();
      if (autoPlay) {
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

  function renderAudioTimeline() {
    if (!audioTimeline || !audioTrackTemplate) return;
    if (!mediaData || !Array.isArray(mediaData.audioTracks) || !mediaData.audioTracks.length) {
      audioTimeline.innerHTML = "";
      audioTimeline.classList.add("hidden");
      return;
    }

    const previousScroll = audioTimeline.scrollLeft;
    audioTimeline.innerHTML = "";
    audioTimeline.classList.remove("hidden");

    mediaData.audioTracks.forEach((track, index) => {
      const node = document.importNode(audioTrackTemplate.content, true);
      const button = node.querySelector(".audio-track");
      const labelEl = node.querySelector(".audio-track__label");
      const durationEl = node.querySelector(".audio-track__duration");
      const timelineEl = node.querySelector(".audio-track__timeline");

      labelEl.textContent = track.label;
      durationEl.textContent = track.duration ? formatTime(Math.round(track.duration)) : "…";

      if (index === mediaData.activeTrackIndex) {
        button.classList.add("audio-track--active");
      }

      // Add image markers to the timeline
      if (track.duration && mediaData.images && mediaData.images.length > 0) {
        mediaData.images.forEach((image) => {
          if (image.relative <= track.duration) {
            const marker = document.createElement("div");
            marker.className = "audio-track__marker";
            const position = (image.relative / track.duration) * 100;
            marker.style.left = `${position}%`;
            marker.title = image.timecode;
            timelineEl.appendChild(marker);
          }
        });
      }

      button.addEventListener("click", () => {
        const wasPlaying = wave && wave.isPlaying();
        if (index !== mediaData.activeTrackIndex) {
          loadAudioTrack(index, wasPlaying);
        }
      });

      audioTimeline.appendChild(node);
    });

    audioTimeline.scrollLeft = previousScroll;
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
    updateTimer = setInterval(updateSlideForCurrentTime, 250);
  }

  function stopUpdateLoop() {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  }

  function updateSlideForCurrentTime() {
    if (!wave || !mediaData) return;
    const time = wave.getCurrentTime();
    const delay = getDelaySeconds();
    const adjusted = time + delay;
    const images = findImagesForTime(adjusted);
    if (images && images.length > 0) {
      showMainImages(images);
      highlightThumbnail(images[0]);
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
        if (!wave) return;
        const duration = wave.getDuration();
        if (duration > 0) {
          const target = Math.max(image.relative - getDelaySeconds(), 0);
          const seek = duration ? Math.min(target / duration, 1) : 0;
          wave.seekTo(seek);
        }
        showMainImages([image]);
        highlightThumbnail(image, root);
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
