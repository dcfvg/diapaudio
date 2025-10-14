# diapaudio

Playback photos synced with recordings of that day.

## Live Demo

**[Try it here](https://dcfvg.github.io/diapaudio/)**

## What is it?

diapaudio is a web-based tool that synchronizes your photos with audio recordings based on timestamps. Simply drop a folder or ZIP file containing your images and an audio file, and the app will automatically align them chronologically.

## How to use

1. **Collect your files** - Place your audio recording and matching photos in one folder
2. **Add a timing reference** - Include a text file (e.g., `_delay.txt`) with the time offset between your audio start and first photo
3. **Drop the folder or ZIP** - Drag and drop the entire folder or a ZIP archive into the browser window

The app will generate a synchronized slideshow you can play, navigate, and export.

**Note:** ZIP files with any compression method are fully supported thanks to [zip.js](https://gildas-lormeau.github.io/zip.js/).

### Timestamp Detection

diapaudio extracts timestamps from your media files using multiple methods:

#### Images

1. **Filename parsing** (primary) - Recognizes various timestamp formats in filenames:
   - ISO 8601: `2025-01-15_14-30-45.jpg` or `2025-01-15T14:30:45.jpg`
   - Compact: `20250115_143045.jpg` or `20250115143045.jpg`
   - With milliseconds: `2025-01-15_14-30-45.123.jpg`
   - European format: `15-01-2025_14-30-45.jpg`
   - US format: `01-15-2025_14-30-45.jpg`
   - Camera style: `IMG_20250115_143045.jpg`
   - Screenshot: `Screenshot_2025-01-15-14-30-45.png`
   - WhatsApp: `IMG-20250115-WA0001.jpg`
   - Unix timestamp: `1737815445.jpg`
   - Time only: `14-30-45.jpg` (uses current date)

2. **EXIF metadata** (fallback) - If no timestamp in filename, reads the actual capture time from JPEG images:
   - `DateTimeOriginal` (0x9003) - When the photo was taken (preferred)
   - `DateTimeDigitized` (0x9004) - When the image was digitized
   - `DateTime` (0x0132) - File modification time
   
   This ensures you get the **actual capture time**, not the file creation date, which is critical for accurate synchronization.

#### Audio Files

1. **Filename parsing** (primary) - Uses the same filename patterns as images

2. **Audio metadata** (fallback) - If no timestamp in filename, reads recording time from audio file tags:
   - **MP3 (ID3v2)**: `TDRC` (recording time), `TDOR` (original release), `TYER` (year)
   - **M4A/AAC**: `©day` atom (creation date)
   - **OGG Vorbis**: `DATE` or `CREATION_TIME` comment tags
   - **WAV**: Broadcast Wave Format `bext` chunk (originationDate/Time), or RIFF INFO chunks (`ICRD`, `IDIT`)
   - **AIFF/AIFC**: `NAME`, `AUTH`, `ANNO`, or copyright chunks with date information
   
   This allows audio files to be automatically synchronized even without timestamp filenames.

This prioritization (filename first, metadata second) ensures fast processing while still providing fallback timestamp extraction.

### About `_delay.txt`

The `_delay.txt` file is used to fix time setting differences between devices. Since your camera and audio recorder may have different clock settings, this file corrects the offset.

It should contain a single timestamp in the format `HH:MM:SS` (e.g., `14:23:45`) that represents the time difference between your devices.

**Example:** If your audio recording shows it started at 2:00:00 PM but your camera's first photo timestamp is 2:23:45 PM (due to different clock settings), your `_delay.txt` file should contain:
```
14:23:45
```

This tells diapaudio to account for the 23 minutes and 45 seconds offset between the two devices' clocks when syncing.

## Supported Formats

### Audio Formats
- **MP3** (.mp3) - MPEG Audio Layer III
- **M4A/AAC** (.m4a, .aac) - Advanced Audio Coding
- **OGG** (.ogg, .oga) - Ogg Vorbis
- **WAV** (.wav) - Waveform Audio File Format
- **AIFF/AIFC** (.aif, .aiff, .aifc) - Audio Interchange File Format
- **FLAC** (.flac) - Free Lossless Audio Codec

### Image Formats
- **JPEG** (.jpg, .jpeg) - With EXIF metadata support
- **PNG** (.png)
- **GIF** (.gif)
- **WebP** (.webp)
- Other formats supported by your browser

## Features

- Automatic timestamp-based synchronization
- Intelligent timestamp extraction from filenames and EXIF/audio metadata
- **ZIP file support** - Drop ZIP archives instead of folders for easier sharing
- Audio playback with visual timeline
- Keyboard shortcuts for navigation
- Real-time preview
- XML export for video editing software
- No server required - runs entirely in your browser

## Export to Video Editing Software

diapaudio can export your synchronized slideshow as an XML file that can be imported into professional video editing software like:

- **Final Cut Pro** (FCPXML format)
- **Adobe Premiere Pro**
- **DaVinci Resolve**
- Other NLE software that supports XML timelines

The exported XML file includes:
- All your images with precise timing
- The audio track
- Proper synchronization based on timestamps

Simply click the **Export** button after loading your files, and import the generated XML file into your video editor to continue working on your project.

