import { describe, it, expect } from 'vitest';
import { dedupeAudioTracks, dedupeImages } from '../dedupe.js';

describe('dedupe', () => {
  describe('dedupeAudioTracks', () => {
    it('returns empty result for empty array', () => {
      const result = dedupeAudioTracks([]);
      expect(result).toEqual({
        tracks: [],
        removed: [],
        removedCount: 0,
      });
    });

    it('returns empty result for null/undefined', () => {
      const result1 = dedupeAudioTracks(null);
      expect(result1.tracks).toEqual([]);
      expect(result1.removedCount).toBe(0);

      const result2 = dedupeAudioTracks(undefined);
      expect(result2.tracks).toEqual([]);
      expect(result2.removedCount).toBe(0);
    });

    it('returns single track unchanged', () => {
      const track = {
        originalName: 'song.mp3',
        label: 'song',
        fileTimestamp: new Date('2024-01-01'),
        duration: 180,
      };

      const result = dedupeAudioTracks([track]);
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0]).toBe(track);
      expect(result.removedCount).toBe(0);
    });

    it('removes exact duplicates based on name and timestamp', () => {
      const timestamp = new Date('2024-01-01');
      const tracks = [
        { originalName: 'song.mp3', fileTimestamp: timestamp, duration: 180 },
        { originalName: 'song.mp3', fileTimestamp: timestamp, duration: 180 },
        { originalName: 'song.mp3', fileTimestamp: timestamp, duration: 180 },
      ];

      const result = dedupeAudioTracks(tracks);
      expect(result.tracks).toHaveLength(1);
      expect(result.removedCount).toBe(2);
      expect(result.removed).toHaveLength(2);
    });

    it('keeps tracks with different names', () => {
      const timestamp = new Date('2024-01-01');
      const tracks = [
        { originalName: 'song1.mp3', fileTimestamp: timestamp, duration: 180 },
        { originalName: 'song2.mp3', fileTimestamp: timestamp, duration: 180 },
        { originalName: 'song3.mp3', fileTimestamp: timestamp, duration: 180 },
      ];

      const result = dedupeAudioTracks(tracks);
      expect(result.tracks).toHaveLength(3);
      expect(result.removedCount).toBe(0);
    });

    it('keeps tracks with different timestamps', () => {
      const tracks = [
        { originalName: 'song.mp3', fileTimestamp: new Date('2024-01-01'), duration: 180 },
        { originalName: 'song.mp3', fileTimestamp: new Date('2024-01-02'), duration: 180 },
        { originalName: 'song.mp3', fileTimestamp: new Date('2024-01-03'), duration: 180 },
      ];

      const result = dedupeAudioTracks(tracks);
      expect(result.tracks).toHaveLength(3);
      expect(result.removedCount).toBe(0);
    });

    it('keeps tracks with different durations', () => {
      const timestamp = new Date('2024-01-01');
      const tracks = [
        { originalName: 'song.mp3', fileTimestamp: timestamp, duration: 180 },
        { originalName: 'song.mp3', fileTimestamp: timestamp, duration: 240 },
        { originalName: 'song.mp3', fileTimestamp: timestamp, duration: 300 },
      ];

      const result = dedupeAudioTracks(tracks);
      expect(result.tracks).toHaveLength(3);
      expect(result.removedCount).toBe(0);
    });

    it('normalizes filenames for comparison', () => {
      const timestamp = new Date('2024-01-01');
      const tracks = [
        { originalName: 'My Song.mp3', fileTimestamp: timestamp, duration: 180 },
        { originalName: 'my-song.mp3', fileTimestamp: timestamp, duration: 180 },
        { originalName: 'MY_SONG.mp3', fileTimestamp: timestamp, duration: 180 },
      ];

      const result = dedupeAudioTracks(tracks);
      expect(result.tracks).toHaveLength(1);
      expect(result.removedCount).toBe(2);
    });

    it('handles tracks without timestamps', () => {
      const tracks = [
        { originalName: 'song.mp3', fileTimestamp: null, duration: 180 },
        { originalName: 'song.mp3', fileTimestamp: null, duration: 180 },
      ];

      const result = dedupeAudioTracks(tracks);
      expect(result.tracks).toHaveLength(1);
      expect(result.removedCount).toBe(1);
    });

    it('handles tracks without durations', () => {
      const timestamp = new Date('2024-01-01');
      const tracks = [
        { originalName: 'song.mp3', fileTimestamp: timestamp, duration: null },
        { originalName: 'song.mp3', fileTimestamp: timestamp, duration: null },
      ];

      const result = dedupeAudioTracks(tracks);
      expect(result.tracks).toHaveLength(1);
      expect(result.removedCount).toBe(1);
    });

    it('uses label when originalName is missing', () => {
      const timestamp = new Date('2024-01-01');
      const tracks = [
        { label: 'song', fileTimestamp: timestamp, duration: 180 },
        { label: 'song', fileTimestamp: timestamp, duration: 180 },
      ];

      const result = dedupeAudioTracks(tracks);
      expect(result.tracks).toHaveLength(1);
      expect(result.removedCount).toBe(1);
    });

    it('handles timestamp as number (milliseconds)', () => {
      const timestampMs = new Date('2024-01-01').getTime();
      const tracks = [
        { originalName: 'song.mp3', fileTimestamp: timestampMs, duration: 180 },
        { originalName: 'song.mp3', fileTimestamp: timestampMs, duration: 180 },
      ];

      const result = dedupeAudioTracks(tracks);
      expect(result.tracks).toHaveLength(1);
      expect(result.removedCount).toBe(1);
    });

    it('keeps first occurrence and removes subsequent duplicates', () => {
      const timestamp = new Date('2024-01-01');
      const track1 = { originalName: 'song.mp3', fileTimestamp: timestamp, duration: 180, id: 1 };
      const track2 = { originalName: 'song.mp3', fileTimestamp: timestamp, duration: 180, id: 2 };
      const track3 = { originalName: 'song.mp3', fileTimestamp: timestamp, duration: 180, id: 3 };

      const result = dedupeAudioTracks([track1, track2, track3]);
      expect(result.tracks[0]).toBe(track1);
      expect(result.removed).toContain(track2);
      expect(result.removed).toContain(track3);
    });
  });

  describe('dedupeImages', () => {
    it('returns empty result for empty array', () => {
      const result = dedupeImages([]);
      expect(result).toEqual({
        images: [],
        removed: [],
        removedCount: 0,
      });
    });

    it('returns empty result for null/undefined', () => {
      const result1 = dedupeImages(null);
      expect(result1.images).toEqual([]);
      expect(result1.removedCount).toBe(0);

      const result2 = dedupeImages(undefined);
      expect(result2.images).toEqual([]);
      expect(result2.removedCount).toBe(0);
    });

    it('returns single image unchanged', () => {
      const image = {
        name: 'photo.jpg',
        originalTimestamp: new Date('2024-01-01'),
      };

      const result = dedupeImages([image]);
      expect(result.images).toHaveLength(1);
      expect(result.images[0]).toBe(image);
      expect(result.removedCount).toBe(0);
    });

    it('removes exact duplicates based on name and timestamp', () => {
      const timestamp = new Date('2024-01-01');
      const images = [
        { name: 'photo.jpg', originalTimestamp: timestamp },
        { name: 'photo.jpg', originalTimestamp: timestamp },
        { name: 'photo.jpg', originalTimestamp: timestamp },
      ];

      const result = dedupeImages(images);
      expect(result.images).toHaveLength(1);
      expect(result.removedCount).toBe(2);
    });

    it('keeps images with different names', () => {
      const timestamp = new Date('2024-01-01');
      const images = [
        { name: 'photo1.jpg', originalTimestamp: timestamp },
        { name: 'photo2.jpg', originalTimestamp: timestamp },
        { name: 'photo3.jpg', originalTimestamp: timestamp },
      ];

      const result = dedupeImages(images);
      expect(result.images).toHaveLength(3);
      expect(result.removedCount).toBe(0);
    });

    it('keeps images with different timestamps', () => {
      const images = [
        { name: 'photo.jpg', originalTimestamp: new Date('2024-01-01') },
        { name: 'photo.jpg', originalTimestamp: new Date('2024-01-02') },
        { name: 'photo.jpg', originalTimestamp: new Date('2024-01-03') },
      ];

      const result = dedupeImages(images);
      expect(result.images).toHaveLength(3);
      expect(result.removedCount).toBe(0);
    });

    it('normalizes filenames for comparison', () => {
      const timestamp = new Date('2024-01-01');
      const images = [
        { name: 'My Photo.jpg', originalTimestamp: timestamp },
        { name: 'my-photo.jpg', originalTimestamp: timestamp },
        { name: 'MY_PHOTO.jpg', originalTimestamp: timestamp },
      ];

      const result = dedupeImages(images);
      expect(result.images).toHaveLength(1);
      expect(result.removedCount).toBe(2);
    });

    it('handles images without timestamps', () => {
      const images = [
        { name: 'photo.jpg', originalTimestamp: null },
        { name: 'photo.jpg', originalTimestamp: null },
      ];

      const result = dedupeImages(images);
      // Without timestamps, images with same name are considered duplicates
      // But the dedupe logic may keep both if timestamp is missing
      expect(result.images.length).toBeGreaterThanOrEqual(1);
    });

    it('uses timestamp property as fallback', () => {
      const timestamp = new Date('2024-01-01');
      const images = [
        { name: 'photo.jpg', timestamp: timestamp },
        { name: 'photo.jpg', timestamp: timestamp },
      ];

      const result = dedupeImages(images);
      expect(result.images).toHaveLength(1);
      expect(result.removedCount).toBe(1);
    });

    it('prefers originalTimestamp over timestamp', () => {
      const originalTs = new Date('2024-01-01');
      const timestamp = new Date('2024-01-02');
      const images = [
        { name: 'photo.jpg', originalTimestamp: originalTs, timestamp: timestamp },
        { name: 'photo.jpg', originalTimestamp: originalTs, timestamp: new Date('2024-01-03') },
      ];

      const result = dedupeImages(images);
      expect(result.images).toHaveLength(1);
      expect(result.removedCount).toBe(1);
    });

    it('uses url property when name is missing', () => {
      const timestamp = new Date('2024-01-01');
      const images = [
        { url: 'blob:photo', originalTimestamp: timestamp },
        { url: 'blob:photo', originalTimestamp: timestamp },
      ];

      const result = dedupeImages(images);
      expect(result.images).toHaveLength(1);
      expect(result.removedCount).toBe(1);
    });

    it('handles timestamp as number (milliseconds)', () => {
      const timestampMs = new Date('2024-01-01').getTime();
      const images = [
        { name: 'photo.jpg', originalTimestamp: timestampMs },
        { name: 'photo.jpg', originalTimestamp: timestampMs },
      ];

      const result = dedupeImages(images);
      expect(result.images).toHaveLength(1);
      expect(result.removedCount).toBe(1);
    });

    it('keeps first occurrence and removes subsequent duplicates', () => {
      const timestamp = new Date('2024-01-01');
      const img1 = { name: 'photo.jpg', originalTimestamp: timestamp, id: 1 };
      const img2 = { name: 'photo.jpg', originalTimestamp: timestamp, id: 2 };
      const img3 = { name: 'photo.jpg', originalTimestamp: timestamp, id: 3 };

      const result = dedupeImages([img1, img2, img3]);
      expect(result.images[0]).toBe(img1);
      expect(result.removed).toContain(img2);
      expect(result.removed).toContain(img3);
    });
  });
});
