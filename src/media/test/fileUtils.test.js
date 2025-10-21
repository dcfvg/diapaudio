import { describe, it, expect } from 'vitest';
import {
  getFilePath,
  getBaseName,
  isAudioExtension,
  isImageExtension,
  isAudioFileName,
  isImageFileName,
  getMimeType,
  shouldSkipEntry,
  isSystemFile,
  formatTrackLabel,
  cleanTrackNameForDisplay,
  isZipFileName,
} from '../fileUtils.js';

describe('fileUtils', () => {
  describe('getFilePath', () => {
    it('returns webkitRelativePath if available', () => {
      const file = { webkitRelativePath: 'folder/file.jpg', name: 'file.jpg' };
      expect(getFilePath(file)).toBe('folder/file.jpg');
    });

    it('returns path if webkitRelativePath not available', () => {
      const file = { path: '/some/path/file.jpg', name: 'file.jpg' };
      expect(getFilePath(file)).toBe('/some/path/file.jpg');
    });

    it('returns name if neither webkitRelativePath nor path available', () => {
      const file = { name: 'file.jpg' };
      expect(getFilePath(file)).toBe('file.jpg');
    });

    it('returns empty string for null/undefined', () => {
      expect(getFilePath(null)).toBe('');
      expect(getFilePath(undefined)).toBe('');
      expect(getFilePath({})).toBe('');
    });
  });

  describe('getBaseName', () => {
    it('extracts filename from path with forward slashes', () => {
      expect(getBaseName('folder/subfolder/file.jpg')).toBe('file.jpg');
    });

    it('extracts filename from path with backslashes', () => {
      expect(getBaseName('folder\\subfolder\\file.jpg')).toBe('file.jpg');
    });

    it('returns filename when no path', () => {
      expect(getBaseName('file.jpg')).toBe('file.jpg');
    });

    it('returns empty string for empty input', () => {
      expect(getBaseName('')).toBe('');
      expect(getBaseName(null)).toBe('');
    });
  });

  describe('isAudioExtension', () => {
    it('recognizes common audio extensions', () => {
      expect(isAudioExtension('mp3')).toBe(true);
      expect(isAudioExtension('m4a')).toBe(true);
      expect(isAudioExtension('wav')).toBe(true);
      expect(isAudioExtension('ogg')).toBe(true);
      expect(isAudioExtension('flac')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(isAudioExtension('MP3')).toBe(true);
      expect(isAudioExtension('M4A')).toBe(true);
      expect(isAudioExtension('WaV')).toBe(true);
    });

    it('returns false for non-audio extensions', () => {
      expect(isAudioExtension('jpg')).toBe(false);
      expect(isAudioExtension('txt')).toBe(false);
      expect(isAudioExtension('mp4')).toBe(false);
    });
  });

  describe('isImageExtension', () => {
    it('recognizes common image extensions', () => {
      expect(isImageExtension('jpg')).toBe(true);
      expect(isImageExtension('jpeg')).toBe(true);
      expect(isImageExtension('png')).toBe(true);
      expect(isImageExtension('gif')).toBe(true);
      expect(isImageExtension('webp')).toBe(true);
      expect(isImageExtension('bmp')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(isImageExtension('JPG')).toBe(true);
      expect(isImageExtension('PNG')).toBe(true);
      expect(isImageExtension('WebP')).toBe(true);
    });

    it('returns false for non-image extensions', () => {
      expect(isImageExtension('mp3')).toBe(false);
      expect(isImageExtension('txt')).toBe(false);
      expect(isImageExtension('pdf')).toBe(false);
    });
  });

  describe('isAudioFileName', () => {
    it('identifies audio files by extension', () => {
      expect(isAudioFileName('song.mp3')).toBe(true);
      expect(isAudioFileName('audio.m4a')).toBe(true);
      expect(isAudioFileName('/path/to/track.wav')).toBe(true);
    });

    it('returns false for non-audio files', () => {
      expect(isAudioFileName('photo.jpg')).toBe(false);
      expect(isAudioFileName('document.pdf')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(isAudioFileName('no-extension')).toBe(false);
      expect(isAudioFileName('')).toBe(false);
      expect(isAudioFileName(null)).toBe(false);
    });
  });

  describe('isImageFileName', () => {
    it('identifies image files by extension', () => {
      expect(isImageFileName('photo.jpg')).toBe(true);
      expect(isImageFileName('image.png')).toBe(true);
      expect(isImageFileName('/path/to/pic.gif')).toBe(true);
    });

    it('returns false for non-image files', () => {
      expect(isImageFileName('song.mp3')).toBe(false);
      expect(isImageFileName('document.pdf')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(isImageFileName('no-extension')).toBe(false);
      expect(isImageFileName('')).toBe(false);
      expect(isImageFileName(null)).toBe(false);
    });
  });

  describe('getMimeType', () => {
    it('returns correct MIME type for audio files', () => {
      expect(getMimeType('song.mp3')).toBe('audio/mpeg');
      expect(getMimeType('audio.m4a')).toBe('audio/mp4');
      expect(getMimeType('track.wav')).toBe('audio/wav');
    });

    it('returns correct MIME type for image files', () => {
      expect(getMimeType('photo.jpg')).toBe('image/jpeg');
      expect(getMimeType('image.png')).toBe('image/png');
      expect(getMimeType('pic.webp')).toBe('image/webp');
    });

    it('returns text/plain for txt files', () => {
      expect(getMimeType('file.txt')).toBe('text/plain');
    });

    it('returns application/octet-stream for unknown extensions', () => {
      expect(getMimeType('file.xyz')).toBe('application/octet-stream');
      expect(getMimeType('no-extension')).toBe('application/octet-stream');
    });

    it('is case insensitive', () => {
      expect(getMimeType('SONG.MP3')).toBe('audio/mpeg');
      expect(getMimeType('PHOTO.JPG')).toBe('image/jpeg');
    });
  });

  describe('shouldSkipEntry', () => {
    it('skips __MACOSX entries', () => {
      expect(shouldSkipEntry('__MACOSX/file.jpg')).toBe(true);
      expect(shouldSkipEntry('folder/__MACOSX/file.jpg')).toBe(true);
    });

    it('skips dot files', () => {
      expect(shouldSkipEntry('.DS_Store')).toBe(true);
      expect(shouldSkipEntry('._file.jpg')).toBe(true);
    });

    it('skips system files', () => {
      expect(shouldSkipEntry('Thumbs.db')).toBe(true);
      expect(shouldSkipEntry('desktop.ini')).toBe(true);
    });

    it('skips thumbnail directories', () => {
      expect(shouldSkipEntry('folder/thumbnails/image.jpg')).toBe(true);
      expect(shouldSkipEntry('folder/Thumbnails/image.jpg')).toBe(true);
    });

    it('does not skip regular files', () => {
      expect(shouldSkipEntry('photo.jpg')).toBe(false);
      expect(shouldSkipEntry('folder/subfolder/file.mp3')).toBe(false);
    });

    it('handles empty/null input', () => {
      expect(shouldSkipEntry('')).toBe(true);
      expect(shouldSkipEntry(null)).toBe(true);
    });
  });

  describe('isSystemFile', () => {
    it('identifies system files', () => {
      expect(isSystemFile('Thumbs.db')).toBe(true);
      expect(isSystemFile('Desktop.ini')).toBe(true);
      expect(isSystemFile('.hidden')).toBe(true);
      expect(isSystemFile('._resource')).toBe(true);
    });

    it('identifies __MACOSX files', () => {
      expect(isSystemFile('__MACOSX/file.jpg')).toBe(true);
      expect(isSystemFile('folder/__MACOSX/file.jpg')).toBe(true);
    });

    it('does not flag regular files', () => {
      expect(isSystemFile('photo.jpg')).toBe(false);
      expect(isSystemFile('song.mp3')).toBe(false);
      expect(isSystemFile('folder/file.txt')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(isSystemFile('')).toBe(true);
      expect(isSystemFile(null)).toBe(true);
    });
  });

  describe('formatTrackLabel', () => {
    it('removes file extension', () => {
      expect(formatTrackLabel('audio.mp3', 0)).toBe('audio');
      expect(formatTrackLabel('track.m4a', 0)).toBe('track');
    });

    it('removes path from filename', () => {
      expect(formatTrackLabel('folder/audio.mp3', 0)).toBe('audio');
      expect(formatTrackLabel('path\\to\\track.mp3', 0)).toBe('track');
    });

    it('replaces underscores and hyphens with spaces', () => {
      expect(formatTrackLabel('my_audio_file.mp3', 0)).toBe('my audio file');
      expect(formatTrackLabel('my-audio-file.mp3', 0)).toBe('my audio file');
    });

    it('falls back to Track N for empty names', () => {
      expect(formatTrackLabel('.mp3', 0)).toBe('Track 1');
      expect(formatTrackLabel('', 5)).toBe('Track 6');
    });

    it('trims whitespace', () => {
      expect(formatTrackLabel('  audio  .mp3', 0)).toBe('audio');
    });
  });

  describe('cleanTrackNameForDisplay', () => {
    it('removes file extension', () => {
      expect(cleanTrackNameForDisplay('audio.mp3')).toBe('audio');
    });

    it('removes path', () => {
      expect(cleanTrackNameForDisplay('/path/to/audio.mp3')).toBe('audio');
      expect(cleanTrackNameForDisplay('folder\\audio.mp3')).toBe('audio');
    });

    it('removes date patterns (YYYY-MM-DD)', () => {
      expect(cleanTrackNameForDisplay('2025-01-15 audio.mp3')).toBe('audio');
      expect(cleanTrackNameForDisplay('audio 2025-01-15.mp3')).toBe('audio');
    });

    it('removes time patterns (HH:MM:SS)', () => {
      expect(cleanTrackNameForDisplay('audio 14:30:45.mp3')).toBe('audio');
      expect(cleanTrackNameForDisplay('14.30.45 audio.mp3')).toBe('audio');
    });

    it('removes compact date patterns (YYYYMMDD)', () => {
      expect(cleanTrackNameForDisplay('20250115 audio.mp3')).toBe('audio');
    });

    it('normalizes separators to spaces', () => {
      expect(cleanTrackNameForDisplay('my_audio_file.mp3')).toBe('my audio file');
      expect(cleanTrackNameForDisplay('my-audio-file.mp3')).toBe('my audio file');
    });

    it('removes leading/trailing whitespace and separators', () => {
      expect(cleanTrackNameForDisplay('  - audio - .mp3')).toBe('audio');
    });

    it('handles empty input', () => {
      expect(cleanTrackNameForDisplay('')).toBe('');
      expect(cleanTrackNameForDisplay(null)).toBe('');
    });
  });

  describe('isZipFileName', () => {
    it('identifies ZIP files', () => {
      expect(isZipFileName('archive.zip')).toBe(true);
      expect(isZipFileName('data.ZIP')).toBe(true);
      expect(isZipFileName('/path/to/file.zip')).toBe(true);
    });

    it('returns false for non-ZIP files', () => {
      expect(isZipFileName('file.txt')).toBe(false);
      expect(isZipFileName('image.jpg')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(isZipFileName('')).toBe(false);
      expect(isZipFileName(null)).toBe(false);
    });
  });
});
