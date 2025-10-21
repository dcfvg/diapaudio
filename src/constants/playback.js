/**
 * Playback-related constants
 */

// Playback speed options
export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.8, 2, 2.5, 3];

// Default playback speed
export const DEFAULT_SPEED = 1;

// Default skip silence setting
export const DEFAULT_SKIP_SILENCE = false;

// LocalStorage keys for persisted settings
export const STORAGE_KEYS = {
  PLAYBACK_SPEED: "diapaudio_playback_speed",
  SKIP_SILENCE: "diapaudio_skip_silence",
};

// Seek debounce threshold (ms)
export const SEEK_DEBOUNCE_MS = 50;
