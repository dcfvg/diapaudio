# Thumbnail Click and Audio Track Marker Update

## Overview
Implemented intelligent thumbnail click behavior and corrected audio track marker positioning to fully support time-of-day synchronization across multiple audio files.

## Changes Made

### 1. New Helper Function: `findAudioTrackForTimestamp()`
**Location:** `app.js` (after `setupWaveformForTrack()`)

**Purpose:** Determines which audio track contains a given image's timestamp.

**Logic:**
- Iterates through all audio tracks
- For each track, calculates its time range:
  - If "timestamp at end" is checked: `startTime = fileTimestamp - duration * 1000`
  - Otherwise: `startTime = fileTimestamp`
  - `endTime = startTime + duration * 1000`
- Returns the track index if the image timestamp falls within the range
- Returns -1 if no match found

**Respects:** "Timestamp at end" checkbox setting

---

### 2. New Helper Function: `seekToImageInCurrentTrack()`
**Location:** `app.js` (after `findAudioTrackForTimestamp()`)

**Purpose:** Seeks to an image's position in the currently loaded audio track and optionally resumes playback.

**Parameters:**
- `image`: The image object with `relative` time
- `shouldPlay`: Boolean to resume playback after seeking

**Logic:**
- Uses `image.relative` (already calculated for current track)
- Applies delay compensation with `getDelaySeconds()`
- Seeks to position using `wave.seekTo()`
- Resumes playback if `shouldPlay` is true

---

### 3. Updated: Thumbnail Click Handler
**Location:** `app.js` in `populateThumbnails()` function

**Previous Behavior:**
- Clicked thumbnail would seek within the currently active audio track
- Did not verify if the image's timestamp matched the active track

**New Behavior:**
1. Calls `findAudioTrackForTimestamp(image.originalTimestamp)` to find the correct audio track
2. If no matching track found (-1):
   - Logs warning to console
   - Still shows the image and highlights thumbnail
   - Does not seek or play audio
3. If matching track found:
   - Checks if it's different from the currently active track
   - If different:
     - Calls `loadAudioTrack(correctTrackIndex, false)` to switch tracks
     - Waits 100ms for new track to load
     - Then calls `seekToImageInCurrentTrack()` with original playback state
   - If same track:
     - Directly calls `seekToImageInCurrentTrack()`
4. Updates UI (shows image, highlights thumbnail)

**Preserves:** Playback state (playing/paused) when switching tracks

---

### 4. Fixed: Audio Track Marker Positioning
**Location:** `app.js` in `renderAudioTimeline()` function

**Previous Issue:**
- Used `image.relative` for all tracks
- `image.relative` is only calculated for the **active** track
- Markers on non-active tracks appeared at incorrect positions

**New Implementation:**
For **each track independently**:
1. Checks if track has `fileTimestamp` and `duration`
2. Calculates the track's time range:
   ```javascript
   const audioStartTime = timestampAtEnd
     ? track.fileTimestamp - track.duration * 1000
     : track.fileTimestamp;
   const audioEndTime = audioStartTime + track.duration * 1000;
   ```
3. For each image:
   - Checks if `image.originalTimestamp` falls within this track's time range
   - If yes, calculates position relative to **this specific track**:
     ```javascript
     const imageRelativeSeconds = (image.originalTimestamp - audioStartTime) / 1000;
     const position = (imageRelativeSeconds / track.duration) * 100;
     ```
   - Creates marker at that position
4. Sets marker tooltip to show both time-of-day and timecode

**Result:** Each track now shows markers only for images that fall within its time range, positioned correctly according to absolute timestamps.

---

## Key Benefits

### ✅ True Time-of-Day Synchronization
- Clicking any thumbnail automatically finds and loads the audio track that was recording at that moment
- No manual track switching required by the user

### ✅ Accurate Visual Timeline
- Each audio track's timeline shows only the images that occurred during that recording
- Marker positions are calculated independently for each track using absolute timestamps
- Visual representation matches the actual temporal relationship between audio and images

### ✅ Respects "Timestamp at End" Checkbox
- Both thumbnail click and marker positioning adapt to the checkbox state
- Correctly handles audio files timestamped when recording stops vs. when it starts

### ✅ Smart Playback State Management
- Preserves whether audio was playing when thumbnail clicked
- Resumes playback automatically after switching tracks if it was playing before

---

## Testing Scenarios

### Scenario 1: Multiple Audio Files Recorded Throughout the Day
**Setup:**
- Audio 1: `08.30.00_morning.mp3` (10 minutes, recorded 8:30-8:40 AM)
- Audio 2: `12.15.00_afternoon.mp3` (15 minutes, recorded 12:15-12:30 PM)
- Images: Some from morning (8:30-8:40), some from afternoon (12:15-12:30)

**Expected Behavior:**
1. Audio track 1 timeline shows only morning image markers
2. Audio track 2 timeline shows only afternoon image markers
3. Clicking a morning image thumbnail loads Audio 1 and seeks to correct position
4. Clicking an afternoon image thumbnail loads Audio 2 and seeks to correct position

### Scenario 2: Timestamp at End Checkbox
**Setup:**
- Same as Scenario 1, but recorder writes timestamp when recording stops
- Enable "Timestamp at end" checkbox

**Expected Behavior:**
1. System calculates backward: `startTime = fileTimestamp - duration`
2. Markers still appear at correct positions
3. Thumbnail clicks still select correct track and position

### Scenario 3: Image Outside Any Audio Range
**Setup:**
- Image timestamp: `10.00.00_photo.jpg` (10:00 AM)
- Audio tracks: 8:30-8:40 and 12:15-12:30 (gap in between)

**Expected Behavior:**
1. Image marker does not appear on any timeline
2. Clicking thumbnail shows warning in console
3. Image still displays in slideshow
4. Audio does not seek or change tracks

---

## Code Structure Summary

```
findAudioTrackForTimestamp(imageTimestamp)
  ├─ Loop through mediaData.audioTracks
  ├─ For each track: calculate audioStartTime and audioEndTime
  ├─ Check if imageTimestamp falls within range
  └─ Return track index or -1

seekToImageInCurrentTrack(image, shouldPlay)
  ├─ Use image.relative (calculated for current track)
  ├─ Apply delay compensation
  ├─ Call wave.seekTo()
  └─ Resume playback if shouldPlay is true

Thumbnail Click Handler
  ├─ Call findAudioTrackForTimestamp(image.originalTimestamp)
  ├─ If -1: warn and show image only
  ├─ If different track: loadAudioTrack() → wait → seekToImageInCurrentTrack()
  ├─ If same track: seekToImageInCurrentTrack()
  └─ Update UI (showMainImages, highlightThumbnail)

renderAudioTimeline()
  ├─ For each audio track:
  │   ├─ Calculate track's time range
  │   ├─ For each image:
  │   │   ├─ Check if image.originalTimestamp in track's range
  │   │   ├─ Calculate imageRelativeSeconds for THIS track
  │   │   └─ Create marker at position
  │   └─ Append markers to track's timeline
  └─ Render all tracks
```

---

## Integration with Existing Time-of-Day System

This update completes the time-of-day synchronization system:

1. **Images store absolute timestamps** (`originalTimestamp`)
2. **Audio tracks store file timestamps** (`fileTimestamp`)
3. **Relative times calculated dynamically** (`recalculateImageTimestamps()`)
4. **Playback sync uses relative times** (`findImagesForTime()`, `updateSlideForCurrentTime()`)
5. **✨ NEW: Thumbnail clicks use absolute matching** (`findAudioTrackForTimestamp()`)
6. **✨ NEW: Timeline markers use absolute positioning** (updated `renderAudioTimeline()`)

All components now work together to provide seamless time-of-day synchronization across multiple audio files and images captured throughout the day.
