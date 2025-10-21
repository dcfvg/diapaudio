/**
 * Timeline-related constants
 */

// Tick step values for timeline axis (in milliseconds)
export const TICK_STEPS_MS = [
  1_000, // 1 second
  5_000, // 5 seconds
  10_000, // 10 seconds
  30_000, // 30 seconds
  60_000, // 1 minute
  2 * 60_000, // 2 minutes
  5 * 60_000, // 5 minutes
  10 * 60_000, // 10 minutes
  30 * 60_000, // 30 minutes
  60 * 60_000, // 1 hour
  2 * 60 * 60_000, // 2 hours
  6 * 60 * 60_000, // 6 hours
  12 * 60 * 60_000, // 12 hours
  24 * 60 * 60_000, // 24 hours
];

// Snap distance threshold for timeline interactions (in pixels)
export const SNAP_DISTANCE_PX = 12;

// (Note) Seek snap threshold now defined in media/constants.js
// (Note) Image stacking step defined where used; keeping this file focused on timeline axis/zoom

// Timeline zoom constraints
export const MIN_ZOOM_DURATION_MS = 1_000;
export const ZOOM_DURATION_FACTOR = 0.01;
