# DiapAudio Sync - New Features

## Overview
This document summarizes the new features implemented in the DiapAudio Sync application.

## Features Implemented

### 1. Large Slideshow with 4K/Full HD Ratio (16:9)
- Replaced the small image display with a large slideshow area
- The slideshow maintains a 16:9 aspect ratio (homothetic to 4K/Full HD)
- Uses CSS `aspect-ratio: 16 / 9` for proper scaling
- Maximum height is calculated to fit within the viewport while preserving ratio

### 2. Folder Support (In Addition to Zip Files)
- Added support for dropping folders directly onto the dropzone
- Added a "browse" option that prompts users to choose between folder or zip
- Supports both:
  - **Zip files**: Original functionality maintained
  - **Folders**: New functionality using `webkitdirectory` and File System Access API
- Drag-and-drop automatically detects if the dropped item is a folder or file
- Recursively reads all files from folders and subfolders

### 3. Fixed Layout with Scrollable Thumbnails Only
- Waveform and slideshow remain fixed and always visible
- Only the thumbnail sidebar scrolls independently
- Layout uses CSS overflow properties to ensure proper behavior:
  - `.app__main`: `overflow: hidden` prevents unwanted scrolling
  - `.sidebar`: Flexible column with auto overflow
  - `.viewer`: Fixed with no scroll
  - `.viewer__content`: Overflow hidden to contain children

### 4. Auto-Scroll and Highlight Thumbnails
- Active thumbnail automatically scrolls into view as audio plays
- Highlighted thumbnail is always centered in the sidebar
- Smooth scrolling behavior with `scrollIntoView({ block: "center", behavior: "smooth" })`
- Updates in real-time synchronized with audio playback

### 5. 4-Second Minimum Display with Split Screen
- Each image is displayed for a minimum of 4 seconds
- When multiple images occur within a 4-second window, the screen splits to show them all simultaneously
- Split screen supports up to 4 images:
  - 1 image: Full width
  - 2 images: 50% width each
  - 3 images: 33.333% width each
  - 4 images: 25% width each
- Timecode badge shows "+N" indicator when multiple images are displayed
- Logic implemented in `findImagesForTime()` function

## Technical Implementation

### HTML Changes
- Replaced `img#main-image` with `div.slideshow__container`
- Added `input#folder-input` with `webkitdirectory` attribute
- Updated dropzone messages to reflect folder support

### CSS Changes
- New `.viewer__slideshow` with 16:9 aspect ratio
- New `.slideshow__container` with flex layout
- Split screen classes: `.split-2`, `.split-3`, `.split-4`
- Fixed layout with proper overflow handling

### JavaScript Changes
- New `handleFolder()` function for processing folders
- New `handleDirectoryEntry()` for drag-and-drop folder support
- New `readDirectoryRecursive()` for reading folder contents
- New `processMediaData()` to centralize media processing
- Updated `showMainImages()` (plural) to handle multiple images
- Updated `findImagesForTime()` to return array of images within 4-second window
- Enhanced `ensureThumbnailVisible()` for better scroll behavior

## Browser Compatibility Notes
- Folder drag-and-drop uses `webkitGetAsEntry()` (WebKit-based browsers)
- Folder selection uses `webkitdirectory` attribute (most modern browsers)
- Fallback to standard file input for browsers without folder support

## Usage
1. **Drag and drop**: Drop either a folder or zip file onto the dropzone
2. **Browse**: Click "browse" and choose between folder or zip file
3. **Playback**: Images automatically display with 4-second minimum duration
4. **Navigation**: Click thumbnails to jump to specific times
5. **Scroll**: Thumbnails scroll independently while slideshow stays visible
