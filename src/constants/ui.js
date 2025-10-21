/**
 * UI-related constants
 */

// HUD auto-hide timeout (ms)
// HUD inactivity timeout (milliseconds)
export const HUD_INACTIVITY_TIMEOUT_MS = 3000;

// Image transition/fade duration (milliseconds)
export const IMAGE_TRANSITION_FADE_MS = 750;

// Timeline auto-scroll delay after user interaction (milliseconds)
export const TIMELINE_AUTO_SCROLL_DELAY_MS = 3000;

// Minimum timeline view window (milliseconds)
export const TIMELINE_MIN_VIEW_WINDOW_MS = 500;

// Hour threshold for displaying seconds in timeline (milliseconds)
export const TIMELINE_HOUR_THRESHOLD_MS = 60 * 60 * 1000;

// Animation durations
export const ANIMATION_DURATIONS = {
  FADE: 200,
  SLIDE: 300,
  QUICK: 150,
};

// Z-index layers
export const Z_INDEX = {
  DROPZONE: 1000,
  HUD: 100,
  MODAL: 2000,
  LOADER: 3000,
};
