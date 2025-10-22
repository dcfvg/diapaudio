# diapaudio

Playback photos synced with recordings of that day.

## Live Demo

**[Try it here](https://dcfvg.github.io/diapaudio/)**

## What is it?

diapaudio is a modern web-based tool built with React that synchronizes your photos with audio recordings based on timestamps. Simply drop a folder or ZIP file containing your images and an audio file, and the app will automatically align them chronologically.

## How to use

1. **Collect your files** - Place your audio recording and matching photos in one folder
2. **Add a timing reference** - Include a text file (e.g., `_delay.txt`) with the time offset between your audio start and first photo
3. **Drop the folder or ZIP** - Drag and drop the entire folder or a ZIP archive into the browser window

The app will generate a synchronized slideshow you can play, navigate, and export.

**Tip:** Keeping your recorder, camera, and phone on the same time makes syncing effortless.

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

### Core Features
- **Automatic timestamp-based synchronization** - Intelligent alignment of images with audio based on timestamps
- **Intelligent timestamp extraction** - Supports both filename parsing and EXIF/audio metadata extraction
- **ZIP file support** - Drop ZIP archives instead of folders for easier sharing
- **Multi-language support** - English, French, and Spanish interfaces via react-i18next
- **No server required** - Runs entirely in your browser with client-side processing

### Playback & Navigation
- **Audio playback with visual timeline** - Interactive waveform-style timeline
- **Comprehensive keyboard shortcuts** - YouTube-style controls (Space, K, J, L, arrows)
- **Variable playback speed** - Adjust audio speed on the fly
- **Auto-skip silent sections** - Optional automatic skipping of silence
- **Auto-skip voids** - Jump over gaps with no images
- **Real-time preview** - See images sync with audio as you play
- **Fullscreen mode** - Immersive viewing experience

### Timeline Controls
- **Snap to grid** - Align image times to grid lines for tighter sync (configurable grid interval)
- **Adjustable delay** - Fine-tune synchronization with HH:MM:SS offset
- **Minimum image display time** - Configure how long each image shows (default: variable, minimum 1s)
- **Image hold time** - Set how long images persist after their timestamp (default: 15s, 0-180s range)
- **Interactive timeline editing** - Drag and adjust timings directly on the timeline
- **Visual clock overlay** - Optional time-of-day display (analog or digital)

### Export Options
- **XML export for video editing** - FCPXML format compatible with Final Cut Pro, Premiere Pro, DaVinci Resolve
- **ZIP package export** - Export your complete project with images, audio, and settings for sharing

### Progressive Web App (PWA)
- **Install as native app** - Install on desktop and mobile for an app-like experience
- **Offline support** - Works fully offline after first visit with service worker caching
- **Auto-updates** - Service worker automatically updates on new deployments
- **Cross-platform installation**:
  - **Desktop** (Windows, macOS, Linux): Chrome/Edge - look for "Install" icon in address bar or browser menu > Install app
  - **Android** (Chrome, Edge, Samsung Internet): Menu ••• > Add to Home screen (or Install app)
  - **iOS/iPadOS** (Safari): Share icon > "Add to Home Screen" (Note: iOS requires PNG icons; this project ships SVG by default. For glossy Home Screen icons, add 192×192 and 512×512 PNG icons in `public/icons/` and reference in `manifest.webmanifest` and `index.html`)

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

## License

This project is licensed under the GNU General Public License v3.0. See `LICENSE` for the full terms.

## Development

### Technology Stack

- **React 18** - Modern component-based UI framework
- **Vite** - Lightning-fast build tool and dev server
- **Zustand** - Lightweight, flexible state management
- **react-i18next** - Internationalization support (English, French, Spanish)
- **react-hotkeys-hook** - Comprehensive keyboard shortcuts
- **react-dropzone** - Drag-and-drop file handling
- **date-fns** - Modern date/time manipulation
- **@zip.js/zip.js** - Robust ZIP file extraction
- **Vitest** - Fast unit testing with hot module replacement
- **Testing Library** - Best-practice React component testing

### Quick Start for Developers

#### Installation

Clone the repository and install dependencies:

```zsh
git clone https://github.com/dcfvg/diapaudio.git
cd diapaudio
npm install
```

#### Development Commands

```zsh
# Start development server with hot reload (default port: 5173)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build locally
npm run preview

# Run linter to check for code issues
npm run lint

# Run linter and auto-fix issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting without modifying files
npm run format:check

# Run all tests once
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Generate test coverage report (outputs to coverage/)
npm run test:coverage

# Run all checks (lint + test + build) - useful before committing
npm run check
```

#### PWA in development

- The install prompt typically appears only on a production build served over HTTP(S). The development server does not register the service worker.
- To test installability locally:
   - Build: `npm run build`
   - Preview: `npm run preview` (serves the production build)
- The service worker uses runtime caching. Libraries and lazy-loaded chunks are cached when first used, so subsequent sessions work offline. For deterministic pre-caching of all hashed chunks, consider `vite-plugin-pwa` or Workbox with a precache manifest.

#### Development Workflow

1. Start the dev server: `npm run dev`
2. Open your browser to the displayed URL (usually http://localhost:5173)
3. Make changes to files in `src/` - the page will hot-reload automatically
4. Run `npm run check` before committing to ensure everything passes

### Testing

This project uses Vitest and Testing Library for unit and component tests.

Install dependencies (first time):

```zsh
npm install
```

Run tests once:

```zsh
npm run test
```

Watch mode:

```zsh
npm run test:watch
```

Coverage report (text + HTML in coverage/):

```zsh
npm run test:coverage
```

Notes:

- JSDOM is configured via `vite.config.js` under `test.environment`.
- Global setup lives in `src/test/setupTests.js` (resets Zustand stores and sets i18n to English).
- Use helpers from `src/test/test-utils.js` for rendering React components.
- Place tests as `*.test.js|jsx` under `src/`.
