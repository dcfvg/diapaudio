(() => {
  const dropzone = document.getElementById("dropzone");
  const dropzoneMessage = document.getElementById("dropzone-message");
  const fileInput = document.getElementById("file-input");
  const folderInput = document.getElementById("folder-input");
  const browseTrigger = document.getElementById("browse-trigger");
  const sidebar = document.getElementById("sidebar");
  const playToggle = document.getElementById("play-toggle");
  const waveformContainer = document.getElementById("waveform");
  const viewerContent = document.getElementById("viewer-content");
  const sidebarEmpty = document.getElementById("sidebar-empty");
  const thumbnailGrid = document.getElementById("thumbnail-grid");
  const thumbnailTemplate = document.getElementById("thumbnail-template");
  const slideshowContainer = document.getElementById("slideshow-container");
  const imageTimecode = document.getElementById("image-timecode");
  const imageTimeOfDay = document.getElementById("image-timeofday");
  const delayRange = document.getElementById("delay-range");
  const delayNumber = document.getElementById("delay-number");

  const audioMimeByExtension = new Map([
    ["mp3", "audio/mpeg"],
    ["wav", "audio/wav"],
    ["ogg", "audio/ogg"],
    ["m4a", "audio/mp4"],
    ["aac", "audio/aac"],
    ["flac", "audio/flac"],
  ]);

  let wave = null;
  let mediaData = null;
  let currentThumbnail = null;
  let updateTimer = null;
  let currentDisplayedImages = [];

  browseTrigger.addEventListener("click", () => {
    // Show a choice menu
    const useFolder = confirm("Choose folder? (Cancel for zip file)");
    if (useFolder) {
      folderInput.click();
    } else {
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) {
      handleZip(file);
      fileInput.value = "";
    }
  });

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
    const files = event.dataTransfer.files;
    
    // Try to handle as folder first
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
    
    // Fall back to single file (zip)
    if (files && files.length) {
      handleZip(files[0]);
    }
  });

  playToggle.addEventListener("click", () => {
    if (!wave) return;
    wave.playPause();
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

  async function handleZip(file) {
    if (!file.name.endsWith(".zip")) {
      showError("Please provide a .zip file");
      return;
    }

    showLoadingState(true);

    try {
      const zip = await JSZip.loadAsync(file);
      const audioEntry = findAudioEntry(zip);
      if (!audioEntry) {
        throw new Error("No audio file detected in the archive.");
      }

      const imageEntries = Object.values(zip.files).filter(
        (entry) => !entry.dir && !shouldSkipEntry(entry.name) && isImage(entry.name)
      );
      if (!imageEntries.length) {
        throw new Error("No images with timestamps found in the archive.");
      }

      const audioUrl = await extractAudioURL(audioEntry);
      const images = await Promise.all(
        imageEntries.map(async (entry) => {
          const url = await extractImageURL(entry);
          const timestamp = parseTimestampFromName(entry.name);
          if (!timestamp) {
            console.warn(`Unable to parse timestamp from ${entry.name}. Skipping.`);
            return null;
          }
          return {
            name: entry.name,
            url,
            timestamp,
          };
        })
      );

      const validImages = images.filter(Boolean);
      if (!validImages.length) {
        throw new Error("Images are missing recognizable timestamps.");
      }

      await processMediaData(audioUrl, validImages);
    } catch (error) {
      console.error(error);
      showError(error.message);
    } finally {
      showLoadingState(false);
    }
  }

  async function handleFolder(files) {
    showLoadingState(true);

    try {
      const audioFile = files.find((file) => {
        const match = file.name.match(/\.([a-z0-9]+)$/i);
        if (!match) return false;
        const ext = match[1].toLowerCase();
        return audioMimeByExtension.has(ext);
      });

      if (!audioFile) {
        throw new Error("No audio file detected in the folder.");
      }

      const imageFiles = files.filter(
        (file) => !shouldSkipEntry(file.name) && isImage(file.name)
      );

      if (!imageFiles.length) {
        throw new Error("No images with timestamps found in the folder.");
      }

      const audioUrl = URL.createObjectURL(audioFile);
      const images = await Promise.all(
        imageFiles.map(async (file) => {
          const url = URL.createObjectURL(file);
          const timestamp = parseTimestampFromName(file.name);
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

      await processMediaData(audioUrl, validImages);
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

  async function processMediaData(audioUrl, validImages) {
    const normalized = normalizeImageTimeline(validImages);

    destroyWaveform();
    releaseMediaResources(mediaData);

    mediaData = {
      audioUrl,
      images: normalized,
    };

    setupWaveform(audioUrl);
    populateThumbnails(normalized);
    showMainImages([normalized[0]]);
    highlightThumbnail(normalized[0]);
    viewerContent.classList.remove("hidden");
    dropzone.classList.add("hidden");
  }

  function showLoadingState(isLoading) {
    dropzone.dataset.loading = isLoading ? "true" : "false";
    if (dropzoneMessage) {
      dropzoneMessage.textContent = isLoading ? "Loading archive…" : "Drop folder or zip file here or ";
    }
    if (browseTrigger) {
      browseTrigger.style.display = isLoading ? "none" : "inline";
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

  function findAudioEntry(zip) {
    return Object.values(zip.files).find((entry) => {
      if (entry.dir) return false;
      const match = entry.name.match(/\.([a-z0-9]+)$/i);
      if (!match) return false;
      const ext = match[1].toLowerCase();
      return audioMimeByExtension.has(ext);
    });
  }

  async function extractAudioURL(entry) {
    const match = entry.name.match(/\.([a-z0-9]+)$/i);
    const ext = match ? match[1].toLowerCase() : "mp3";
    const mime = audioMimeByExtension.get(ext) || "audio/mpeg";
    const arrayBuffer = await entry.async("arraybuffer");
    const blob = new Blob([arrayBuffer], { type: mime });
    return URL.createObjectURL(blob);
  }

  async function extractImageURL(entry) {
    const arrayBuffer = await entry.async("arraybuffer");
    const blob = new Blob([arrayBuffer]);
    return URL.createObjectURL(blob);
  }

  function parseTimestampFromName(name) {
    const basename = name.split("/").pop() || name;
    const clean = basename.replace(/\.[^.]+$/, "");
    const regexes = [
      /(\d{4})[-_]?(\d{2})[-_]?(\d{2})[ _-](\d{2})[.\-_:](\d{2})[.\-_:](\d{2})/,
      /(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/,
    ];

    for (const regex of regexes) {
      const match = clean.match(regex);
      if (match) {
        const [, year, month, day, hours, minutes, seconds] = match.map(Number);
        if (isNaN(year)) continue;
        const ts = new Date(year, month - 1, day, hours, minutes, seconds);
        if (!Number.isNaN(ts.getTime())) {
          return ts;
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
        relative,
        timecode: formatTime(relative),
        timeOfDay: formatClock(image.timestamp),
      };
    });
  }

  function setupWaveform(audioUrl) {
    destroyWaveform();

    wave = WaveSurfer.create({
      container: waveformContainer,
      waveColor: "rgba(79, 140, 255, 0.35)",
      progressColor: "#4f8cff",
      cursorColor: "#f4f4f8",
      height: 120,
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
      startUpdateLoop();
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

    wave.load(audioUrl);
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
    const images = [currentImage];
    
    // Calculate how long this image has been displayed
    const timeIntoImage = targetSeconds - currentImage.relative;
    
    // If we haven't reached 4 seconds yet, check for overlapping images
    if (timeIntoImage < 4) {
      const endTime = currentImage.relative + 4;
      
      // Find all images that fall within the 4-second window
      for (let i = currentImageIndex + 1; i < mediaData.images.length; i++) {
        const nextImage = mediaData.images[i];
        if (nextImage.relative < endTime) {
          images.push(nextImage);
        } else {
          break;
        }
      }
    }
    
    return images;
  }

  function showMainImages(images) {
    if (!images || images.length === 0) return;
    
    // Check if we need to update the display
    const isSame = currentDisplayedImages.length === images.length &&
                   currentDisplayedImages.every((img, i) => img === images[i]);
    
    if (isSame) return;
    
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
    if (data.audioUrl) {
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
