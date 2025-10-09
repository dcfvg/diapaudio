# Audio Timestamp at End Feature

## Overview
This feature allows you to handle audio files where the filename timestamp represents the **end of the recording** instead of the beginning. This is common with some recording devices that write the timestamp when the recording stops.

## How It Works

### Checkbox Control
- **Location**: In the controls section, to the right of the Delay control
- **Label**: "Audio timestamp at end"
- **Default**: Unchecked (timestamps represent start of recording)

### Behavior

#### When Unchecked (Default)
- Audio filename timestamps are treated as the **start time** of the recording
- Images are synchronized from the beginning of the audio file
- Standard behavior for most recording workflows

#### When Checked
- Audio filename timestamps are treated as the **end time** of the recording
- The app automatically calculates the actual start time by:
  ```
  Actual Start Time = File Timestamp - Audio Duration
  ```
- All image timestamps are recalculated relative to this adjusted start time
- Images correctly sync with the audio content

## Example

### Scenario
You have:
- Audio file: `10.37.22_recording.mp3` (duration: 5 minutes = 300 seconds)
- Images: `10.35.00_img1.jpg`, `10.36.00_img2.jpg`, `10.37.00_img3.jpg`

### With Checkbox Unchecked (Default)
- Audio starts at: **10:37:22**
- Images would appear at negative times (before audio started)
- ❌ Images won't sync properly

### With Checkbox Checked
- Audio file timestamp: 10:37:22
- Audio duration: 5:00 (300 seconds)
- **Calculated start time**: 10:37:22 - 5:00 = **10:32:22**
- Image 1 (10:35:00) appears at: 10:35:00 - 10:32:22 = **2:38** into audio
- Image 2 (10:36:00) appears at: 10:36:00 - 10:32:22 = **3:38** into audio
- Image 3 (10:37:00) appears at: 10:37:00 - 10:32:22 = **4:38** into audio
- ✅ Perfect synchronization!

## When to Use This Feature

### Use the Checkbox When:
1. Your recording device writes timestamps when recording **stops**
2. Images appear before the audio file's timestamp
3. You notice images aren't syncing correctly with audio
4. Your recorder documentation indicates "end timestamp" behavior

### Keep Unchecked When:
1. Your recording device writes timestamps when recording **starts**
2. Images sync correctly by default
3. Images appear after the audio file's timestamp
4. Standard recording workflow

## Technical Details

### Implementation
- Audio tracks store both the original file timestamp and the adjusted start time
- Image timestamps are recalculated when:
  - The checkbox is toggled
  - An audio track is loaded and ready
  - The audio duration becomes available
- Original timestamps are preserved for accurate calculations

### Requirements
- Audio files must have timestamps in their filenames
- Audio duration must be successfully loaded
- At least one audio track must be active

### Limitations
- Only affects the currently active audio track
- Requires valid timestamp parsing from audio filename
- Audio duration must be loaded before calculation

## Usage Tips

1. **Load your folder first**, then check the checkbox if needed
2. **Toggle the checkbox** to see if synchronization improves
3. **Check the timeline markers** - they should align with audio content
4. **Use the thumbnail preview** to verify synchronization
5. If unsure, try both settings and see which gives better results

## Troubleshooting

### Images still not syncing?
- Verify audio filename has a parseable timestamp
- Check that image timestamps are in the correct format
- Ensure all timestamps are from the same time period
- Try adjusting the Delay control for fine-tuning

### Checkbox doesn't seem to do anything?
- Make sure audio duration has loaded (wait for waveform)
- Check browser console for any timestamp parsing errors
- Verify the audio file has a valid timestamp in its name

## Supported Timestamp Formats
Audio files should have timestamps in these formats:
- `HH.MM.SS_name.mp3` (e.g., `10.37.22_recording.mp3`)
- `HH:MM:SS_name.mp3`
- `HH-MM-SS_name.mp3`
- `YYYY-MM-DD HH:MM:SS.mp3`
- And other formats (see TEST_TIMESTAMPS.md)
