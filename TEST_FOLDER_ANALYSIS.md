# Test Folder Analysis: mero

## Data Structure

### Audio Files (9 WAV files)
All audio files follow the format: `YYYY-MM-DD HH.MM.SS_XXXXX_MX.WAV`

| # | Filename | Timestamp (END) | Duration | Calculated Start Time |
|---|----------|----------------|----------|----------------------|
| 1 | 2025-10-08 08.41.10_00066_M1.WAV | 08:41:10 | 876s (14.6 min) | **08:26:34** |
| 2 | 2025-10-08 09.51.14_00087_M2.WAV | 09:51:14 | 1173s (19.6 min) | **09:31:38** |
| 3 | 2025-10-08 10.10.50_00088_M2.WAV | 10:10:50 | 1379s (23.0 min) | **09:47:51** |
| 4 | 2025-10-08 10.37.22_00089_M2.WAV | 10:37:22 | 896s (14.9 min) | **10:22:26** ⚠️ |
| 5 | 2025-10-08 10.52.22_00090_M2.WAV | 10:52:22 | 175s (2.9 min) | **10:49:27** |
| 6 | 2025-10-08 10.55.26_00091_M2.WAV | 10:55:26 | 1221s (20.4 min) | **10:35:05** |
| 7 | 2025-10-08 11.18.00_00092_M2.WAV | 11:18:00 | 267s (4.5 min) | **11:13:33** |
| 8 | 2025-10-08 11.22.26_00093_M2.WAV | 11:22:26 | 3600s (60.0 min) | **10:22:26** ⚠️ |
| 9 | 2025-10-08 12.22.28_00094_M2.WAV | 12:22:28 | 36s (0.6 min) | **12:21:52** |

### Image Files (247 JPG files)
All images follow the format: `YYYY-MM-DD HH.MM.SS.jpg`

**Time Range:** 10:03:23 to 11:17:43 (with 1 outlier at 14:40:28)

**Distribution:**
- **10:03 - 10:59**: ~200 images (bulk of the images)
- **11:04 - 11:17**: ~45 images
- **14:40**: 1 image (outlier - no matching audio)

---

## Critical Issues Found

### ⚠️ Issue #1: Overlapping Audio Tracks

**Track 4** and **Track 8** have **IDENTICAL start times** but vastly different durations:

- **Track 4**: 10:22:26 → 10:37:22 (15 minutes)
- **Track 8**: 10:22:26 → 11:22:26 (60 minutes) ← **OVERLAPS TRACK 4**

**Impact:**
- Images between 10:22:26 and 10:37:22 match BOTH tracks
- Without preference logic, the first matching track (Track 4) would always be selected
- Track 8 is the longer, more complete recording and should be preferred

**Solution Applied:**
Modified `findAudioTrackForTimestamp()` to:
1. Check ALL tracks for matches
2. When multiple tracks match, select the **longest duration** track
3. This ensures the most complete recording is used

---

### ⚠️ Issue #2: Timestamp Parsing

**Format in test data:** `2025-10-08 HH.MM.SS` (space between date and time, dots in time)

**Regex that matches:**
```javascript
/(\d{4})[-_]?(\d{2})[-_]?(\d{2})[ _-](\d{2})[.\-_:](\d{2})[.\-_:](\d{2})/
```

**Status:** ✅ Parsing works correctly

---

### ⚠️ Issue #3: Default Checkbox State

**User's Equipment:** Audio recorders write timestamp when recording **ENDS**, not when it starts.

**Problem:** Checkbox "Audio timestamp at end" was **unchecked by default**.

**Solution Applied:**
- Changed default state to **checked**
- This matches the behavior of the user's recording equipment

---

### ⚠️ Issue #4: Date Object Math

**Problem:** Code was doing math operations directly on Date objects:
```javascript
// WRONG
audioStartTime = track.fileTimestamp - track.duration * 1000

// CORRECT
audioStartTime = track.fileTimestamp.getTime() - (track.duration * 1000)
```

**Solution Applied:**
- Added `.getTime()` conversions in 3 locations:
  1. `findAudioTrackForTimestamp()`
  2. `renderAudioTimeline()`
  3. `recalculateImageTimestamps()` (already correct)

---

## Expected Behavior with Test Data

### Image to Track Mapping (with fixes applied)

When "Audio timestamp at end" is **checked** and **longest track preferred**:

| Image Time Range | Should Match | Reason |
|-----------------|--------------|---------|
| 10:03:23 - 10:10:50 | Track 3 | 09:47:51 - 10:10:50 |
| 10:10:51 - 10:22:25 | *No match* | Gap between Track 3 and Track 4/8 |
| 10:22:26 - 10:37:22 | **Track 8** | Overlaps with Track 4, but Track 8 is longer (60 min vs 15 min) |
| 10:37:23 - 10:49:26 | **Track 8** | Continues Track 8 |
| 10:49:27 - 10:52:22 | Track 5 or 8 | Both match, but Track 8 is longer |
| 10:52:23 - 10:55:26 | Track 6 or 8 | Both match, but Track 8 is longer |
| 10:55:27 - 11:13:32 | **Track 8** | Track 8 continues |
| 11:13:33 - 11:17:43 | Track 7 or 8 | Both match, but Track 8 is longer |
| 14:40:28 | *No match* | No audio track covers this time |

**Practical Result:** Most images from 10:22:26 onward should map to **Track 8** (the 1-hour recording), not the shorter overlapping tracks.

---

## Fixes Applied

### 1. ✅ Updated `findAudioTrackForTimestamp()`
- Now checks all tracks and selects the longest matching one
- Handles overlapping recordings correctly
- Added comprehensive debug logging

### 2. ✅ Fixed Date Object Comparisons
- Converted all Date objects to milliseconds before math operations
- Applied in `findAudioTrackForTimestamp()` and `renderAudioTimeline()`

### 3. ✅ Set Default Checkbox State
- Changed "Audio timestamp at end" to **checked by default**
- Matches user's recording equipment behavior

### 4. ✅ Removed Obsolete Code
- Removed `wave.drawBuffer()` call (doesn't exist in WaveSurfer v7)

---

## Testing Recommendations

### Test Case 1: Basic Image Navigation
1. Drop the `test-folder/mero` folder into the app
2. Verify checkbox "Audio timestamp at end" is **checked**
3. Click thumbnail for image `2025-10-08 10.03.23.jpg`
   - Should load **Track 3** (09:51:14_00087)
   - Should seek to near the beginning

### Test Case 2: Overlapping Track Selection
1. Click thumbnail for image `2025-10-08 10.25.00.jpg` (during overlap period)
   - **Check console logs** to see which tracks match
   - Should select **Track 8** (11:22:26_00093) - the 60-minute recording
   - Should NOT select Track 4, 5, or 6 despite them also matching

### Test Case 3: Timeline Markers
1. Observe the audio timeline for all tracks
2. **Track 8** should have the most markers (covers longest time period)
3. Markers should appear only on tracks whose time range includes the image
4. Hover over markers to see tooltip with time-of-day and timecode

### Test Case 4: Checkbox Toggle
1. **Uncheck** "Audio timestamp at end"
2. All time ranges shift forward by the audio duration
3. Most images will show "doesn't match any audio track"
4. **Re-check** the checkbox
5. Images should match again

### Test Case 5: Outlier Image
1. Scroll to bottom of thumbnails
2. Click image `2025-10-08 14.40.28.jpg`
3. Should see console warning: "timestamp doesn't match any audio track"
4. Image displays but audio doesn't seek

---

## Debug Console Output

When clicking a thumbnail, you should see output like:

```
Track 0: 2025-10-08 08.41.10_00066_M1.WAV
  Track time: 10/8/2025, 8:41:10 AM
  Start: 10/8/2025, 8:26:34 AM, End: 10/8/2025, 8:41:10 AM
  Duration: 876.1s
  Image time: 10/8/2025, 10:25:00 AM
  Match: false
...
Track 7: 2025-10-08 11.22.26_00093_M2.WAV
  Track time: 10/8/2025, 11:22:26 AM
  Start: 10/8/2025, 10:22:26 AM, End: 10/8/2025, 11:22:26 AM
  Duration: 3600.2s
  Image time: 10/8/2025, 10:25:00 AM
  Match: true
  -> New best match! (longest so far)
...
✓ Selected Track 7: 2025-10-08 11.22.26_00093_M2.WAV
```

This confirms:
1. Timestamp parsing works
2. Time range calculations are correct
3. Longest track is selected when multiple match
4. Image maps to the correct audio track

---

## Summary

The test folder revealed **critical real-world scenarios**:
- Overlapping recordings (common when recorder is left running)
- Need for "longest track" preference logic
- Importance of correct "timestamp at end" default
- Date object math errors that prevented matching

All issues have been identified and fixed. The app should now correctly handle the complex `mero` test dataset.
