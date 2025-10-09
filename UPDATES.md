# DiapAudio Sync - Major Updates

## Summary of Changes

All requested features have been successfully implemented:

### 1. ✅ Speed Control Button
- Added playback speed dropdown with options: 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×
- Located in the controls section next to Play button and Delay control
- Works with WaveSurfer's `setPlaybackRate()` method
- Styled to match the existing UI design

### 2. ✅ Multiple Audio Files Support
- App now handles multiple audio files in a folder
- Audio files play successively (switch between tracks)
- **Joint Timeline** displays all audio tracks with:
  - **Blue markers (dots)** showing where images exist within each track
  - **Visual boundaries** between different audio files (separate track boxes)
  - Duration display for each track
  - Active track highlighting
  - Click to switch between tracks
- Timeline automatically updates with image positions when track duration is loaded

### 3. ✅ Removed Zip File Support
- Completely removed JSZip dependency
- Removed all zip-related code:
  - `handleZip()` function
  - `extractAudioURL()` and `extractImageURL()` zip extraction functions
  - File input for zip files
- Updated all UI messages to only mention folders
- Simplified browse button (no more choice dialog)
- Only accepts folders via drag-and-drop or folder selection

### 4. ✅ Loading Indicator
- Added animated spinner loader
- Shows immediately when folder is dropped
- Displays "Loading files..." message
- Automatically hides when processing complete
- CSS animation with smooth spinning effect
- Prevents interaction during loading

## Technical Implementation Details

### HTML Changes
- Removed JSZip script include
- Removed zip file input
- Added speed select dropdown
- Updated dropzone to include loader component
- Enhanced audio track template with timeline component
- Updated header text

### CSS Changes
- Added `.dropzone__loader` and `.loader-spinner` styles
- Implemented CSS `@keyframes spin` animation
- Added `.speed-control` and `.speed-control__select` styles
- Enhanced `.audio-track` with header and timeline sections
- Added `.audio-track__marker` for image position indicators
- Improved layout structure

### JavaScript Changes
- Removed entire `handleZip()` function
- Removed zip extraction helper functions
- Added `speedSelect` element reference
- Updated `showLoadingState()` to toggle loader visibility
- Enhanced `renderAudioTimeline()` to add image markers
- Updated drop handler to only accept folders
- Simplified browse handler to only open folder picker
- Added speed change event listener

## User Experience Improvements

### Multiple Audio Files
- Users can now drop folders with multiple audio files
- Each audio track is displayed as a separate button
- Visual timeline shows where images occur in each track
- Easy switching between tracks while maintaining playback state

### Speed Control
- Quick access to playback speed adjustment
- Standard speed options (0.5× to 2×)
- Useful for reviewing long recordings quickly
- Speed persists during track switching

### Folder-Only Workflow
- Simpler, more intuitive workflow
- No confusion between folders and zip files
- Faster processing (no zip extraction needed)
- Better performance with direct file access

### Loading Feedback
- Clear visual feedback during processing
- Professional-looking spinner animation
- Users know the app is working
- Prevents accidental re-drops during loading

## Browser Compatibility
- Speed control: All modern browsers (WaveSurfer API)
- Folder support: Chrome, Edge, Safari (webkitdirectory)
- CSS animations: All modern browsers
- FileSystem API: Webkit-based browsers for drag-and-drop

## Testing Recommendations
1. Test with folders containing multiple audio files
2. Verify image markers appear correctly on timeline
3. Test speed control at different rates
4. Verify loader shows/hides correctly
5. Test folder drag-and-drop
6. Test folder browse selection
7. Verify track switching preserves playback state
