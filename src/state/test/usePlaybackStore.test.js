import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlaybackStore } from '../usePlaybackStore.js';

describe('usePlaybackStore', () => {
  let audioMock;
  let addEventListenerSpy;
  let removeEventListenerSpy;

  beforeEach(() => {
    // Create a comprehensive audio mock
    addEventListenerSpy = vi.fn();
    removeEventListenerSpy = vi.fn();
    
    audioMock = {
      src: '',
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
      defaultPlaybackRate: 1,
      preload: 'auto',
      paused: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
    };

    global.Audio = vi.fn(() => audioMock);
    
    // Reset store state between tests
    usePlaybackStore.setState({
      playing: false,
      loadingTrack: false,
      activeTrackIndex: null,
      absoluteTime: null,
      displayedImages: [],
      _audioRef: null,
      _playPromiseRef: null,
      _rafRef: null,
      _lastTickRef: null,
      _initialAbsoluteRef: null,
      _seekingRef: false,
      _lastSeekTimeRef: 0,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const { result } = renderHook(() => usePlaybackStore());
      
      expect(result.current.playing).toBe(false);
      expect(result.current.loadingTrack).toBe(false);
      expect(result.current.activeTrackIndex).toBe(null);
      expect(result.current.absoluteTime).toBe(null);
      expect(result.current.displayedImages).toEqual([]);
    });
  });

  describe('initAudio', () => {
    it('creates and initializes audio element', () => {
      const { result } = renderHook(() => usePlaybackStore());
      
      act(() => {
        result.current.initAudio();
      });

      expect(global.Audio).toHaveBeenCalled();
      expect(result.current._audioRef).toBeTruthy();
      expect(result.current._audioRef.preload).toBe('auto');
    });

    it('returns the audio element', () => {
      const { result } = renderHook(() => usePlaybackStore());
      
      let audio;
      act(() => {
        audio = result.current.initAudio();
      });

      expect(audio).toBe(audioMock);
    });
  });

  describe('getAudioElement', () => {
    it('returns the audio element', () => {
      const { result } = renderHook(() => usePlaybackStore());
      
      act(() => {
        result.current.initAudio();
      });

      const audio = result.current.getAudioElement();
      expect(audio).toBe(audioMock);
    });

    it('returns null if audio not initialized', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const audio = result.current.getAudioElement();
      expect(audio).toBe(null);
    });
  });

  describe('getActiveTrack', () => {
    it('returns null when no audio tracks', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const mediaData = { audioTracks: [] };
      
      const track = result.current.getActiveTrack(mediaData);
      expect(track).toBe(null);
    });

    it('returns track at activeTrackIndex', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const track1 = { url: 'audio1.mp3', label: 'Track 1' };
      const track2 = { url: 'audio2.mp3', label: 'Track 2' };
      const mediaData = { audioTracks: [track1, track2] };

      act(() => {
        usePlaybackStore.setState({ activeTrackIndex: 1 });
      });

      const track = result.current.getActiveTrack(mediaData);
      expect(track).toBe(track2);
    });

    it('returns first track when activeTrackIndex is null', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const track1 = { url: 'audio1.mp3', label: 'Track 1' };
      const track2 = { url: 'audio2.mp3', label: 'Track 2' };
      const mediaData = { audioTracks: [track1, track2] };

      const track = result.current.getActiveTrack(mediaData);
      expect(track).toBe(track1);
    });

    it('uses mediaData.activeTrackIndex as fallback', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const track1 = { url: 'audio1.mp3', label: 'Track 1' };
      const track2 = { url: 'audio2.mp3', label: 'Track 2' };
      const mediaData = { audioTracks: [track1, track2], activeTrackIndex: 1 };

      const track = result.current.getActiveTrack(mediaData);
      expect(track).toBe(track2);
    });

    it('returns null for invalid index', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const track1 = { url: 'audio1.mp3', label: 'Track 1' };
      const mediaData = { audioTracks: [track1] };

      act(() => {
        usePlaybackStore.setState({ activeTrackIndex: 5 });
      });

      const track = result.current.getActiveTrack(mediaData);
      expect(track).toBe(null);
    });
  });

  describe('findTrackIndexForAbsolute', () => {
    it('returns -1 when no audio tracks', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const mediaData = { audioTracks: [] };
      
      const index = result.current.findTrackIndexForAbsolute(mediaData, 1000);
      expect(index).toBe(-1);
    });

    it('finds track that covers the absolute time', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
      
      const track1 = {
        adjustedStartTime: new Date(baseTime),
        adjustedEndTime: new Date(baseTime + 10000),
      };
      const track2 = {
        adjustedStartTime: new Date(baseTime + 10000),
        adjustedEndTime: new Date(baseTime + 20000),
      };
      
      const mediaData = { audioTracks: [track1, track2] };
      
      const index = result.current.findTrackIndexForAbsolute(mediaData, baseTime + 15000);
      expect(index).toBe(1);
    });

    it('returns -1 when time is before all tracks', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
      
      const track = {
        adjustedStartTime: new Date(baseTime + 10000),
        adjustedEndTime: new Date(baseTime + 20000),
      };
      
      const mediaData = { audioTracks: [track] };
      
      const index = result.current.findTrackIndexForAbsolute(mediaData, baseTime);
      expect(index).toBe(-1);
    });

    it('returns last track when time is after all tracks end', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
      
      const track = {
        adjustedStartTime: new Date(baseTime),
      };
      
      const mediaData = { audioTracks: [track] };
      
      const index = result.current.findTrackIndexForAbsolute(mediaData, baseTime + 100000);
      expect(index).toBe(0);
    });
  });

  describe('getAudioAbsoluteTime', () => {
    it('returns null when no active track', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const mediaData = { audioTracks: [] };
      
      const time = result.current.getAudioAbsoluteTime(mediaData);
      expect(time).toBe(null);
    });

    it('calculates absolute time from track start and audio position', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const startTime = new Date('2024-01-01T00:00:00Z');
      const track = {
        url: 'audio.mp3',
        adjustedStartTime: startTime,
      };
      
      const mediaData = { audioTracks: [track] };

      act(() => {
        result.current.initAudio();
        audioMock.currentTime = 5.5; // 5.5 seconds into the track
      });

      const time = result.current.getAudioAbsoluteTime(mediaData);
      expect(time).toBe(startTime.getTime() + 5500);
    });

    it('returns null when track has no adjustedStartTime', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const track = { url: 'audio.mp3' };
      const mediaData = { audioTracks: [track] };

      act(() => {
        result.current.initAudio();
      });

      const time = result.current.getAudioAbsoluteTime(mediaData);
      expect(time).toBe(null);
    });
  });

  describe('initializeFromMedia', () => {
    it('sets initial absolute time from earliest media', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const earliestTime = new Date('2024-01-01T00:00:00Z');
      
      const mediaData = {
        audioTracks: [
          { adjustedStartTime: new Date('2024-01-01T00:05:00Z') },
        ],
        images: [
          { originalTimestamp: earliestTime },
          { originalTimestamp: new Date('2024-01-01T00:10:00Z') },
        ],
      };

      act(() => {
        result.current.initializeFromMedia(mediaData);
      });

      expect(result.current.absoluteTime).toBe(earliestTime.getTime());
      expect(result.current._initialAbsoluteRef).toBe(earliestTime.getTime());
    });

    it('resets displayedImages', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        usePlaybackStore.setState({ displayedImages: ['img1', 'img2'] });
      });

      const mediaData = {
        audioTracks: [],
        images: [{ originalTimestamp: new Date() }],
      };

      act(() => {
        result.current.initializeFromMedia(mediaData);
      });

      expect(result.current.displayedImages).toEqual([]);
    });
  });

  describe('pause', () => {
    it('pauses audio and sets playing to false', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.initAudio();
        usePlaybackStore.setState({ playing: true });
        result.current.pause();
      });

      expect(audioMock.pause).toHaveBeenCalled();
      expect(result.current.playing).toBe(false);
    });

    it('handles pause when audio is not initialized', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        usePlaybackStore.setState({ playing: true });
        result.current.pause();
      });

      expect(result.current.playing).toBe(false);
    });

    it('clears play promise ref', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.initAudio();
        usePlaybackStore.setState({ 
          playing: true,
          _playPromiseRef: Promise.resolve(),
        });
        result.current.pause();
      });

      expect(result.current._playPromiseRef).toBe(null);
    });
  });

  describe('play', () => {
    it('sets playing to true immediately', async () => {
      const { result } = renderHook(() => usePlaybackStore());
      const mediaData = { audioTracks: [] };

      await act(async () => {
        await result.current.play(mediaData);
      });

      expect(result.current.playing).toBe(true);
    });

    it('handles play without audio tracks', async () => {
      const { result } = renderHook(() => usePlaybackStore());
      const mediaData = { audioTracks: [] };

      await act(async () => {
        result.current.initAudio();
        await result.current.play(mediaData);
      });

      expect(result.current.playing).toBe(true);
      expect(audioMock.play).not.toHaveBeenCalled();
    });
  });

  describe('togglePlayback', () => {
    it('calls pause when playing', async () => {
      const { result } = renderHook(() => usePlaybackStore());
      const mediaData = { audioTracks: [] };

      act(() => {
        usePlaybackStore.setState({ playing: true });
      });

      await act(async () => {
        await result.current.togglePlayback(mediaData);
      });

      expect(result.current.playing).toBe(false);
    });

    it('calls play when not playing', async () => {
      const { result } = renderHook(() => usePlaybackStore());
      const mediaData = { audioTracks: [] };

      act(() => {
        usePlaybackStore.setState({ playing: false });
      });

      await act(async () => {
        await result.current.togglePlayback(mediaData);
      });

      expect(result.current.playing).toBe(true);
    });
  });

  describe('displayedImages', () => {
    it('initializes as empty array', () => {
      const { result } = renderHook(() => usePlaybackStore());
      expect(result.current.displayedImages).toEqual([]);
    });

    it('can be updated', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const images = ['img1.jpg', 'img2.jpg'];

      act(() => {
        usePlaybackStore.setState({ displayedImages: images });
      });

      expect(result.current.displayedImages).toEqual(images);
    });
  });

  describe('loadingTrack', () => {
    it('initializes as false', () => {
      const { result } = renderHook(() => usePlaybackStore());
      expect(result.current.loadingTrack).toBe(false);
    });

    it('can be updated', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        usePlaybackStore.setState({ loadingTrack: true });
      });

      expect(result.current.loadingTrack).toBe(true);
    });
  });

  describe('activeTrackIndex', () => {
    it('initializes as null', () => {
      const { result } = renderHook(() => usePlaybackStore());
      expect(result.current.activeTrackIndex).toBe(null);
    });

    it('can be set to a number', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        usePlaybackStore.setState({ activeTrackIndex: 2 });
      });

      expect(result.current.activeTrackIndex).toBe(2);
    });
  });
});
