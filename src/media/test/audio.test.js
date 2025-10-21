import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAudioTrack, loadAllAudioDurations } from '../audio.js';

describe('audio', () => {
  describe('createAudioTrack', () => {
    it('creates an audio track with basic properties', () => {
      const track = createAudioTrack({
        url: 'https://example.com/audio.mp3',
        originalName: 'song.mp3',
        index: 0,
      });

      expect(track).toEqual({
        url: 'https://example.com/audio.mp3',
        originalName: 'song.mp3',
        label: 'song',
        duration: null,
        fileTimestamp: null,
        adjustedStartTime: null,
      });
    });

    it('creates track with file timestamp', () => {
      const timestamp = new Date('2024-01-01');
      const track = createAudioTrack({
        url: 'blob:audio',
        originalName: 'track.wav',
        index: 1,
        fileTimestamp: timestamp,
      });

      expect(track.fileTimestamp).toBe(timestamp);
    });

    it('formats label correctly for indexed track', () => {
      const track = createAudioTrack({
        url: 'blob:audio',
        originalName: 'my-song.mp3',
        index: 5,
      });

      // formatTrackLabel formats the label - checking it's not the full filename
      expect(track.label).toBeTruthy();
      expect(track.label).not.toContain('.mp3');
    });

    it('handles track without extension', () => {
      const track = createAudioTrack({
        url: 'blob:audio',
        originalName: 'audiofile',
        index: 0,
      });

      expect(track.label).toBe('audiofile');
    });
  });

  describe('loadAllAudioDurations', () => {
    let audioInstances;
    let audioEventHandlers;

    beforeEach(() => {
      audioInstances = [];
      audioEventHandlers = [];

      // Mock Audio constructor
      global.Audio = vi.fn().mockImplementation(function() {
        const audio = {
          preload: null,
          src: null,
          duration: 0,
          addEventListener: vi.fn((event, handler) => {
            audioEventHandlers.push({ audio, event, handler });
          }),
          removeEventListener: vi.fn(),
        };
        audioInstances.push(audio);
        return audio;
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('returns early for empty array', async () => {
      await loadAllAudioDurations([]);
      expect(global.Audio).not.toHaveBeenCalled();
    });

    it('returns early for null/undefined', async () => {
      await loadAllAudioDurations(null);
      expect(global.Audio).not.toHaveBeenCalled();

      await loadAllAudioDurations(undefined);
      expect(global.Audio).not.toHaveBeenCalled();
    });

    it('creates Audio element for each track', async () => {
      const tracks = [
        { url: 'audio1.mp3', label: 'Track 1', duration: null },
        { url: 'audio2.mp3', label: 'Track 2', duration: null },
      ];

      const loadPromise = loadAllAudioDurations(tracks);

      // Simulate successful metadata loading
      audioEventHandlers.forEach(({ handler, event, audio }) => {
        if (event === 'loadedmetadata') {
          audio.duration = 120.5;
          handler();
        }
      });

      await loadPromise;

      expect(global.Audio).toHaveBeenCalledTimes(2);
      expect(audioInstances[0].preload).toBe('metadata');
      expect(audioInstances[1].preload).toBe('metadata');
    });

    it('sets track durations on successful load', async () => {
      const tracks = [
        { url: 'audio1.mp3', label: 'Track 1', duration: null },
        { url: 'audio2.mp3', label: 'Track 2', duration: null },
      ];

      const loadPromise = loadAllAudioDurations(tracks);

      // Simulate metadata loading with different durations
      audioEventHandlers.forEach(({ handler, event, audio }, i) => {
        if (event === 'loadedmetadata') {
          audio.duration = i === 0 ? 180.25 : 240.75;
          handler();
        }
      });

      await loadPromise;

      expect(tracks[0].duration).toBe(180.25);
      expect(tracks[1].duration).toBe(240.75);
    });

    it('handles load errors gracefully', async () => {
      const tracks = [
        { url: 'audio1.mp3', label: 'Track 1', duration: null },
        { url: 'invalid.mp3', label: 'Track 2', duration: null },
      ];

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Override the mock to handle both success and error cases
      let callCount = 0;
      global.Audio = vi.fn().mockImplementation(function() {
        const isFirstCall = callCount === 0;
        callCount++;
        
        const audio = {
          preload: null,
          src: null,
          duration: isFirstCall ? 180.25 : 0,
          addEventListener: vi.fn((event, handler) => {
            if (event === 'loadedmetadata' && isFirstCall) {
              // Simulate immediate success for first audio
              setTimeout(() => handler(), 0);
            } else if (event === 'error' && !isFirstCall) {
              // Simulate immediate error for second audio
              setTimeout(() => handler({ error: new Error('Failed to load') }), 0);
            }
          }),
          removeEventListener: vi.fn(),
        };
        return audio;
      });

      await loadAllAudioDurations(tracks);

      // First track should load, second should fail gracefully
      expect(tracks[0].duration).toBe(180.25);
      expect(tracks[1].duration).toBe(null);

      consoleErrorSpy.mockRestore();
    });

    it('sets src for each audio element', async () => {
      const tracks = [
        { url: 'https://example.com/audio1.mp3', label: 'Track 1', duration: null },
        { url: 'blob:audio2', label: 'Track 2', duration: null },
      ];

      const loadPromise = loadAllAudioDurations(tracks);

      // Complete loading
      audioEventHandlers.forEach(({ handler, event, audio }) => {
        if (event === 'loadedmetadata') {
          audio.duration = 100;
          handler();
        }
      });

      await loadPromise;

      expect(audioInstances[0].src).toBe('https://example.com/audio1.mp3');
      expect(audioInstances[1].src).toBe('blob:audio2');
    });

    it('removes event listeners after loading', async () => {
      const tracks = [{ url: 'audio.mp3', label: 'Track', duration: null }];

      const loadPromise = loadAllAudioDurations(tracks);

      // Trigger loadedmetadata
      audioEventHandlers.forEach(({ handler, event, audio }) => {
        if (event === 'loadedmetadata') {
          audio.duration = 100;
          handler();
        }
      });

      await loadPromise;

      // Check that removeEventListener was called
      expect(audioInstances[0].removeEventListener).toHaveBeenCalledWith(
        'loadedmetadata',
        expect.any(Function)
      );
      expect(audioInstances[0].removeEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
    });

    it('handles tracks with existing durations', async () => {
      const tracks = [
        { url: 'audio1.mp3', label: 'Track 1', duration: 150 },
        { url: 'audio2.mp3', label: 'Track 2', duration: null },
      ];

      const loadPromise = loadAllAudioDurations(tracks);

      // Simulate loading
      audioEventHandlers.forEach(({ handler, event, audio }) => {
        if (event === 'loadedmetadata') {
          audio.duration = 200;
          handler();
        }
      });

      await loadPromise;

      // Both tracks get new durations from metadata
      expect(tracks[0].duration).toBe(200);
      expect(tracks[1].duration).toBe(200);
    });
  });
});
