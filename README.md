# diapodio

Line up your photos with the sounds of the day in just a few seconds.

## Live Demo

**[Try it here](https://dcfvg.github.io/diapaudio/)**

## What is it?

diapodio is a web-based tool that synchronizes your photos with audio recordings based on timestamps. Simply drop a folder containing your images and an audio file, and the app will automatically align them chronologically.

## How to use

1. **Collect your files** - Place your audio recording and matching photos in one folder
2. **Add a timing reference** - Include a text file (e.g., `_delay.txt`) with the time offset between your audio start and first photo
3. **Drop the folder** - Drag and drop the entire folder into the browser window

The app will generate a synchronized slideshow you can play, navigate, and export.

### About `_delay.txt`

The `_delay.txt` file is used to fix time setting differences between devices. Since your camera and audio recorder may have different clock settings, this file corrects the offset.

It should contain a single timestamp in the format `HH:MM:SS` (e.g., `14:23:45`) that represents the time difference between your devices.

**Example:** If your audio recording shows it started at 2:00:00 PM but your camera's first photo timestamp is 2:23:45 PM (due to different clock settings), your `_delay.txt` file should contain:
```
14:23:45
```

This tells diapodio to account for the 23 minutes and 45 seconds offset between the two devices' clocks when syncing.

## Features

- Automatic timestamp-based synchronization
- Audio playback with visual timeline
- Keyboard shortcuts for navigation
- Real-time preview
- No server required - runs entirely in your browser

