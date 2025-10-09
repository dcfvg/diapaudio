# Time-of-Day Synchronization

## Overview
DiapAudio Sync now uses **absolute timestamp synchronization** to match audio and images based on the actual time of day they were recorded. This ensures that when you hear a speech or sound, you see the images from that exact moment in time.

## How It Works

### Absolute Time Synchronization
Instead of using relative timestamps from the first image, the app now:

1. **Extracts timestamps from audio filenames** (e.g., `14.30.45_recording.mp3`)
2. **Extracts timestamps from image filenames** (e.g., `14.32.15_photo.jpg`)
3. **Calculates the time difference** between audio start and each image
4. **Displays images** at the exact moment they occurred during the recording

### Example Scenario

#### Your Files:
- **Audio**: `14.30.00_interview.mp3` (10 minutes duration)
  - Starts at: 14:30:00
  - Ends at: 14:40:00
  
- **Images**:
  - `14.31.30_setup.jpg` → Shows at **1:30** into audio
  - `14.33.00_speaker.jpg` → Shows at **3:00** into audio
  - `14.35.45_audience.jpg` → Shows at **5:45** into audio
  - `14.38.20_conclusion.jpg` → Shows at **8:20** into audio

#### Result:
✅ When the audio plays at 3:00, you see the speaker photo  
✅ When the audio plays at 5:45, you see the audience photo  
✅ Perfect synchronization between what you hear and what you see!

## Key Benefits

### 1. True Scene Matching
- **Hear a speech** → See the speaker at that moment
- **Hear applause** → See the audience clapping
- **Hear background noise** → See the environment
- No manual adjustment needed - it just works!

### 2. Multi-Device Recording
Works perfectly when:
- Camera and audio recorder are separate devices
- Devices have synchronized clocks
- Recordings happen at the same time but with different devices

### 3. Long Recording Sessions
Handles:
- Hours of continuous recording
- Multiple scenes/locations
- Gaps between images
- Images captured at irregular intervals

## Requirements

### For Audio Files
Audio filenames must include timestamp:
```
✓ 14.30.45_recording.mp3
✓ 14:30:45_interview.wav
✓ 2024-10-09 14:30:45_session.m4a
✓ 20241009_143045_audio.mp3
```

### For Image Files
Image filenames must include timestamp:
```
✓ 14.32.15_photo.jpg
✓ 14:32:15_image.png
✓ 2024-10-09 14:32:15_capture.jpg
✓ 20241009_143215_img.jpg
```

### Clock Synchronization
⚠️ **Important**: Camera and audio recorder clocks should be synchronized
- Use same time zone
- Set correct date and time on both devices
- Consider syncing both to network time before recording

## Using the "Timestamp at End" Checkbox

Some recording devices write the filename timestamp when recording **stops** instead of when it starts.

### When to Check This Box:

#### Scenario:
- Audio file: `14.40.00_recording.mp3` (10 minutes long)
- Images: `14.31.00_a.jpg`, `14.33.00_b.jpg`, `14.35.00_c.jpg`

Without checkbox:
- Audio would be assumed to start at 14:40:00
- All images would have negative timestamps (before audio)
- ❌ Nothing syncs correctly

With checkbox checked:
- App calculates: Start = 14:40:00 - 10:00 = **14:30:00**
- Image at 14:31:00 appears at 1:00 into audio ✅
- Image at 14:33:00 appears at 3:00 into audio ✅
- Image at 14:35:00 appears at 5:00 into audio ✅

## Delay Control

Use the **Delay** slider to fine-tune synchronization:
- **Positive delay** (+): Images appear later (audio ahead of images)
- **Negative delay** (-): Images appear earlier (images ahead of audio)
- Useful for compensating small clock differences

## Troubleshooting

### Images Don't Appear
**Problem**: Images have timestamps outside the audio time range

**Solutions**:
1. Check if "Timestamp at End" should be enabled
2. Verify audio and image timestamps are from same recording session
3. Check that device clocks were synchronized
4. Use Delay control to shift image timeline

### Images Appear at Wrong Times
**Problem**: Synchronization is off by a constant amount

**Solutions**:
1. Check time zone settings on devices
2. Verify timestamp format in filenames is correct
3. Use Delay control to adjust (+/- seconds)
4. Consider if one device clock was fast/slow

### Some Images Never Show
**Problem**: Images are outside the audio duration

**Check**:
- Image timestamps before audio start → Will show negative times
- Image timestamps after audio end → Won't appear during playback
- Solution: Check "Timestamp at End" or adjust Delay

## Technical Details

### Timestamp Calculation
```javascript
// Audio start time (accounting for "timestamp at end")
audioStartTime = timestampAtEnd 
  ? fileTimestamp - duration 
  : fileTimestamp

// Image relative time
imageRelativeTime = (imageTimestamp - audioStartTime) / 1000
```

### Negative Timestamps
Images with timestamps before audio start will have negative relative times:
- Image at 14:29:00, Audio starts 14:30:00 → relative = -60 seconds
- These images won't display during normal playback
- But they're tracked and available if you adjust the Delay control

### Multiple Audio Tracks
When switching between audio tracks:
1. Each track's timestamp is extracted from its filename
2. Image relative times are recalculated for the new audio
3. Timeline markers update to show image positions in new track

## Best Practices

### 1. Before Recording
- Synchronize clocks on all devices
- Use network time/GPS time if available
- Document time zone used

### 2. File Naming
- Use consistent timestamp format
- Include full date-time for long sessions
- Document which device writes timestamp at end

### 3. Testing Synchronization
- Record a test session with visible clock
- Take a photo of the clock
- Verify photo appears when clock matches in audio
- Adjust workflow if needed

### 4. Post-Recording
- Keep original filenames (timestamps)
- Don't rename files without updating timestamps
- Organize by recording session/date

## Supported Timestamp Formats

### Time-Only (uses today's date)
- `HH.MM.SS` → 14.30.45
- `HH:MM:SS` → 14:30:45
- `HH-MM-SS` → 14-30-45

### Full Date-Time
- `YYYY-MM-DD HH:MM:SS` → 2024-10-09 14:30:45
- `YYYYMMDD_HHMMSS` → 20241009_143045
- `DD-MM-YYYY HH:MM:SS` → 09-10-2024 14:30:45

See `TEST_TIMESTAMPS.md` for complete list.

## Example Workflow

1. **Start Recording**
   - Camera: Photos saved as `HH.MM.SS_*.jpg`
   - Recorder: Audio saved as `HH.MM.SS_*.mp3`

2. **Drop Folder** into DiapAudio Sync
   - App reads all timestamps
   - Calculates time differences
   - Sets up synchronization

3. **Play Audio**
   - Images appear at correct times
   - Timeline shows image markers
   - Scene matches speech ✓

4. **Fine-tune** (if needed)
   - Adjust Delay control
   - Check "Timestamp at End" if applicable
   - Verify synchronization

## Success Criteria
✅ You can recognize the scene linked to the speech  
✅ Visual and audio events happen at the same time  
✅ No manual timeline adjustment needed  
✅ Works across different recording devices  
