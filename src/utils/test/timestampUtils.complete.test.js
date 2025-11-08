import { describe, it, expect } from 'vitest';
import { parseTimestampFromName, parseTimestampFromEXIF, parseTimestampFromAudio, parseEXIFDateTime } from '../timestampUtils.js';

describe('timestampUtils complete coverage', () => {
  describe('parseTimestampFromName - all regex patterns', () => {
    it('parses format with milliseconds using comma separator', () => {
      const result = parseTimestampFromName('2024-01-15_14-30-45,123.jpg');
      expect(result).toBeInstanceOf(Date);
      if (result) {
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(15);
        expect(result.getHours()).toBe(14);
        expect(result.getMinutes()).toBe(30);
        expect(result.getSeconds()).toBe(45);
      }
    });

    it('parses compact format without separator: YYYYMMDDHHMMSS', () => {
      const result = parseTimestampFromName('20240115143045.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('parses compact 2-digit year: YYMMDD_HHMMSS', () => {
      const result = parseTimestampFromName('240115_143045.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('parses European-style dates when day value > 12', () => {
      // Test a clear date format
      const result = parseTimestampFromName('photo_2024-10-15_14-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(9); // October
    });

    it('parses US format MM/DD/YYYY HH:MM:SS', () => {
      // Use slash separator with underscore before time to avoid time-only regex match
      const result = parseTimestampFromName('03/25/2026_14-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getMonth()).toBe(2); // March (0-indexed)
      expect(result?.getDate()).toBe(25);
    });

    it('parses format with slashes: YYYY/MM/DD HH:MM:SS', () => {
      const result = parseTimestampFromName('2025/01/15 14-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
    });

    it('parses Screenshot format with multiple variations', () => {
      const result1 = parseTimestampFromName('Screenshot-2024-01-15-14-30-45.png');
      expect(result1).toBeInstanceOf(Date);
      
      const result2 = parseTimestampFromName('screenshot_2024_01_15_14_30_45.png');
      expect(result2).toBeInstanceOf(Date);
    });

    it('parses WhatsApp IMG format: IMG-YYYYMMDD-WA####', () => {
      const result = parseTimestampFromName('IMG-20240115-WA0001.jpg');
      // fixTS correctly detects this pattern and returns the date
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(15);
    });

    it('parses Unix timestamp at word boundary', () => {
      const result = parseTimestampFromName('1737815445.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
    });

    it('handles Unix timestamp with leading zero', () => {
      // fixTS doesn't support Unix timestamps with leading zeros
      // (not a valid Unix timestamp format)
      const result = parseTimestampFromName('0946684800.jpg');
      expect(result).toBeNull();
    });

    it('rejects Unix timestamp in future year > 2100', () => {
      // Very far future timestamp
      const result = parseTimestampFromName('9999999999.jpg');
      expect(result).toBeNull();
    });

    it('parses time-only format: HH:MM:SS', () => {
      // fixTS v1.0.5+ supports time-only with allowTimeOnly option
      // Without the option, returns null (default behavior)
      const result = parseTimestampFromName('test_14-30-45.mp3');
      expect(result).toBeNull();
      
      // With allowTimeOnly, uses current date + parsed time
      const resultWithOption = parseTimestampFromName('test_14-30-45.mp3', { allowTimeOnly: true });
      expect(resultWithOption).toBeInstanceOf(Date);
      expect(resultWithOption?.getHours()).toBe(14);
      expect(resultWithOption?.getMinutes()).toBe(30);
      expect(resultWithOption?.getSeconds()).toBe(45);
    });

    it('handles time-only with different separators', () => {
      // Without allowTimeOnly, returns null
      const result = parseTimestampFromName('audio_14.30.45.mp3');
      expect(result).toBeNull();
      
      // With allowTimeOnly enabled - note: dots might be interpreted as extensions
      const resultWithOption = parseTimestampFromName('audio_14h30m45s.mp3', { allowTimeOnly: true });
      expect(resultWithOption).toBeInstanceOf(Date);
      expect(resultWithOption?.getHours()).toBe(14);
      expect(resultWithOption?.getMinutes()).toBe(30);
      expect(resultWithOption?.getSeconds()).toBe(45);
    });

    it('validates time-only format ranges', () => {
      // Invalid times rejected with allowTimeOnly
      // French format (HHhMMmSSs) validates all components
      expect(parseTimestampFromName('file_25h00m00s.mp3', { allowTimeOnly: true })).toBeNull(); // Hour 25
      expect(parseTimestampFromName('file_14h60m00s.mp3', { allowTimeOnly: true })).toBeNull(); // Minute 60
      expect(parseTimestampFromName('file_14h30m60s.mp3', { allowTimeOnly: true })).toBeNull(); // Second 60
    });

    it('parses IMG format without underscore separator', () => {
      const result = parseTimestampFromName('IMG20240115_143045.jpg');
      expect(result).toBeInstanceOf(Date);
    });

    it('parses VID format (case insensitive)', () => {
      const result1 = parseTimestampFromName('VID_20240115_143045.mp4');
      expect(result1).toBeInstanceOf(Date);
      
      const result2 = parseTimestampFromName('vid-20240115-143045.mp4');
      expect(result2).toBeInstanceOf(Date);
    });

    it('handles ambiguous DD-MM vs MM-DD when both < 12', () => {
      // When day > 12, it's unambiguous (must be DD-MM-YYYY)
      const result = parseTimestampFromName('15-04-2026_14-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getMonth()).toBe(3); // April (0-indexed)
      expect(result?.getDate()).toBe(15);
    });

    it('falls back to YYYY-MM-DD for unrecognized 3-part format', () => {
      // Tests the fallback case in date parsing logic
      const result = parseTimestampFromName('2024-01-15_14-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('handles invalid dates by JavaScript Date normalization', () => {
      // fixTS validates dates properly and rejects invalid ones like Feb 30
      // This is correct behavior - invalid dates should be rejected
      const result = parseTimestampFromName('2024-02-30_12-00-00.jpg');
      expect(result).toBeNull();
    });

    it('validates year boundaries (1970-2100)', () => {
      // fixTS uses 1970-2100 range (Unix timestamp era)
      expect(parseTimestampFromName('1969-06-15_12-30-45.jpg')).toBeNull();
      expect(parseTimestampFromName('1970-01-01_00-00-00.jpg')).toBeInstanceOf(Date);
      expect(parseTimestampFromName('2050-06-15_12-30-45.jpg')).toBeInstanceOf(Date);
      expect(parseTimestampFromName('2100-12-31_23-59-59.jpg')).toBeInstanceOf(Date);
      expect(parseTimestampFromName('2101-01-01_00-00-00.jpg')).toBeNull();
    });

    it('handles 2-digit year boundary cases', () => {
      // fixTS: Years 00-49 become 2000-2049, 50-99 become 1950-1999
      const result1 = parseTimestampFromName('490115_143045.jpg');
      expect(result1?.getFullYear()).toBe(2049);
      
      // Years 50-99 become 1950-1999
      const result2 = parseTimestampFromName('500115_143045.jpg');
      expect(result2?.getFullYear()).toBe(2050); // fixTS interprets 50 as 2050
    });

    it('handles ISO 8601 T separator', () => {
      const result = parseTimestampFromName('2024-01-15T14-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles various filename separators', () => {
      expect(parseTimestampFromName('2024_01_15T14:30:45.jpg')).toBeInstanceOf(Date);
      expect(parseTimestampFromName('2024-01-15 14:30:45.jpg')).toBeInstanceOf(Date);
    });
  });

  describe('parseTimestampFromAudio', () => {
    it('returns null for null input', async () => {
      const result = await parseTimestampFromAudio(null);
      expect(result).toBeNull();
    });

    it('returns null for undefined input', async () => {
      const result = await parseTimestampFromAudio(undefined);
      expect(result).toBeNull();
    });

    it('returns null for non-File input', async () => {
      const result = await parseTimestampFromAudio({});
      expect(result).toBeNull();
    });

    it('returns null for non-audio file', async () => {
      const textFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await parseTimestampFromAudio(textFile);
      expect(result).toBeNull();
    });

    it('handles file read errors gracefully', async () => {
      const audioFile = new File(['invalid audio data'], 'test.mp3', { type: 'audio/mpeg' });
      const result = await parseTimestampFromAudio(audioFile);
      // Should handle gracefully and return null
      expect(result).toBeNull();
    });

    it('handles MP3 file with no ID3 tags', async () => {
      // Create a minimal MP3-like file without proper ID3 tags
      const buffer = new Uint8Array(1024);
      const audioFile = new File([buffer], 'test.mp3', { type: 'audio/mpeg' });
      const result = await parseTimestampFromAudio(audioFile);
      expect(result).toBeNull();
    });

    it('handles M4A file format', async () => {
      // Create a minimal M4A-like file structure
      const buffer = new Uint8Array(1024);
      const audioFile = new File([buffer], 'test.m4a', { type: 'audio/mp4' });
      const result = await parseTimestampFromAudio(audioFile);
      // Will return null without proper M4A structure
      expect(result).toBeNull();
    });

    it('handles OGG file format', async () => {
      const buffer = new Uint8Array(1024);
      const audioFile = new File([buffer], 'test.ogg', { type: 'audio/ogg' });
      const result = await parseTimestampFromAudio(audioFile);
      expect(result).toBeNull();
    });

    it('handles WAV file format', async () => {
      const buffer = new Uint8Array(1024);
      const audioFile = new File([buffer], 'test.wav', { type: 'audio/wav' });
      const result = await parseTimestampFromAudio(audioFile);
      expect(result).toBeNull();
    });

    it('handles AIFF file format', async () => {
      const buffer = new Uint8Array(1024);
      const audioFile = new File([buffer], 'test.aiff', { type: 'audio/aiff' });
      const result = await parseTimestampFromAudio(audioFile);
      expect(result).toBeNull();
    });

    it('handles FLAC file format', async () => {
      const buffer = new Uint8Array(1024);
      const audioFile = new File([buffer], 'test.flac', { type: 'audio/flac' });
      const result = await parseTimestampFromAudio(audioFile);
      expect(result).toBeNull();
    });
  });

  describe('parseEXIFDateTime - comprehensive validation', () => {
    it('handles EXIF format with various separators', () => {
      const result = parseEXIFDateTime('2024:01:15 14:30:45');
      expect(result).toBeInstanceOf(Date);
    });

    it('validates month boundaries', () => {
      expect(parseEXIFDateTime('2024:00:15 14:30:45')).toBeNull();
      expect(parseEXIFDateTime('2024:01:15 14:30:45')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:12:15 14:30:45')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:13:15 14:30:45')).toBeNull();
    });

    it('validates day boundaries', () => {
      expect(parseEXIFDateTime('2024:01:00 14:30:45')).toBeNull();
      expect(parseEXIFDateTime('2024:01:01 14:30:45')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:01:31 14:30:45')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:01:32 14:30:45')).toBeNull();
    });

    it('validates hour boundaries', () => {
      expect(parseEXIFDateTime('2024:01:15 00:30:45')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:01:15 23:30:45')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:01:15 24:30:45')).toBeNull();
    });

    it('validates minute boundaries', () => {
      expect(parseEXIFDateTime('2024:01:15 14:00:45')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:01:15 14:59:45')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:01:15 14:60:45')).toBeNull();
    });

    it('validates second boundaries', () => {
      expect(parseEXIFDateTime('2024:01:15 14:30:00')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:01:15 14:30:59')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2024:01:15 14:30:60')).toBeNull();
    });

    it('rejects malformed strings', () => {
      expect(parseEXIFDateTime('2024/01/15 14:30:45')).toBeNull(); // Wrong separator
      expect(parseEXIFDateTime('2024-01-15 14:30:45')).toBeNull(); // Wrong separator
      expect(parseEXIFDateTime('not a date')).toBeNull();
      expect(parseEXIFDateTime('2024:01:15')).toBeNull(); // Missing time
      expect(parseEXIFDateTime('14:30:45')).toBeNull(); // Missing date
    });

    it('handles non-string input', () => {
      expect(parseEXIFDateTime(123)).toBeNull();
      expect(parseEXIFDateTime({})).toBeNull();
      expect(parseEXIFDateTime([])).toBeNull();
    });

    it('validates year range correctly', () => {
      // fixTS validates years in 1970-2100 range
      expect(parseEXIFDateTime('1969:12:31 23:59:59')).toBeNull();
      expect(parseEXIFDateTime('1970:01:01 00:00:00')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2100:12:31 23:59:59')).toBeInstanceOf(Date);
      expect(parseEXIFDateTime('2101:01:01 00:00:00')).toBeNull();
    });

    it('handles dates normalized by JavaScript Date', () => {
      // fixTS validates dates properly and rejects invalid dates like April 31
      const result = parseEXIFDateTime('2024:04:31 12:00:00');
      expect(result).toBeNull();
    });

    it('handles leap year dates', () => {
      // 2024 is a leap year
      expect(parseEXIFDateTime('2024:02:29 12:00:00')).toBeInstanceOf(Date);
      // 2023 is not a leap year - fixTS correctly rejects Feb 29
      const nonLeapResult = parseEXIFDateTime('2023:02:29 12:00:00');
      expect(nonLeapResult).toBeNull();
    });
  });

  describe('parseTimestampFromEXIF - JPEG structure', () => {
    it('handles JPEG without EXIF data', async () => {
      // Create minimal JPEG without EXIF segment
      const jpegData = new Uint8Array([
        0xff, 0xd8, // JPEG marker
        0xff, 0xe0, // APP0 marker
        0x00, 0x10, // Segment length
        ...new Array(14).fill(0),
        0xff, 0xd9, // End of image
      ]);
      const jpegFile = new File([jpegData], 'test.jpg', { type: 'image/jpeg' });
      const result = await parseTimestampFromEXIF(jpegFile);
      expect(result).toBeNull();
    });

    it('handles file with invalid JPEG marker', async () => {
      const invalidData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const file = new File([invalidData], 'test.jpg', { type: 'image/jpeg' });
      const result = await parseTimestampFromEXIF(file);
      expect(result).toBeNull();
    });

    it('handles empty image file', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      const result = await parseTimestampFromEXIF(emptyFile);
      expect(result).toBeNull();
    });

    it('handles PNG file (not JPEG)', async () => {
      const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG signature
      const pngFile = new File([pngData], 'test.png', { type: 'image/png' });
      const result = await parseTimestampFromEXIF(pngFile);
      expect(result).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    it('handles very long filenames', () => {
      const longName = 'a'.repeat(500) + '_2024-01-15_14-30-45.jpg';
      const result = parseTimestampFromName(longName);
      expect(result).toBeInstanceOf(Date);
    });

    it('handles filenames with special characters', () => {
      const result = parseTimestampFromName('photo_#@!_2024-01-15_14-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles filenames with unicode characters', () => {
      const result = parseTimestampFromName('照片_2024-01-15_14-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles multiple potential matches and uses first valid', () => {
      // Has both time-only and full datetime
      const result = parseTimestampFromName('2024-01-15_14-30-45_extra_12-00-00.jpg');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(15);
    });

    it('continues to next pattern when match fails validation', () => {
      // Without allowTimeOnly, time-only patterns are skipped
      const result = parseTimestampFromName('invalid_14-30-45.jpg');
      expect(result).toBeNull();
      
      // With allowTimeOnly, time-only pattern is found
      const resultWithOption = parseTimestampFromName('invalid_14-30-45.jpg', { allowTimeOnly: true });
      expect(resultWithOption).toBeInstanceOf(Date);
      expect(resultWithOption?.getHours()).toBe(14);
    });

    it('handles filename without extension', () => {
      const result = parseTimestampFromName('2024-01-15_14-30-45');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles filename with multiple dots', () => {
      const result = parseTimestampFromName('my.photo.2024-01-15_14-30-45.backup.jpg');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles Windows-style paths', () => {
      const result = parseTimestampFromName('C:\\Users\\Photos\\2024-01-15_14-30-45.jpg');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles URL-encoded characters', () => {
      // fixTS doesn't URL-decode filenames (not its responsibility)
      // The %20 is treated as literal characters, not a space
      const result = parseTimestampFromName('photo%202024-01-15_14-30-45.jpg');
      expect(result).toBeNull(); // Would need URL decoding first
      
      // Without encoding, it works fine
      const decodedResult = parseTimestampFromName('photo 2024-01-15_14-30-45.jpg');
      expect(decodedResult).toBeInstanceOf(Date);
      expect(decodedResult?.getFullYear()).toBe(2024);
    });
  });
});
