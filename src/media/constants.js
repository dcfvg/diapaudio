// Maps common audio file extensions to MIME types (for file validation and typing)
export const AUDIO_MIME_BY_EXTENSION = new Map([
  ["mp3", "audio/mpeg"],
  ["wav", "audio/wav"],
  ["ogg", "audio/ogg"],
  ["m4a", "audio/mp4"],
  ["aac", "audio/aac"],
  ["flac", "audio/flac"],
  ["aifc", "audio/aiff"],
  ["aiff", "audio/aiff"],
]);

// Maps common image file extensions to MIME types (for file validation and typing)
export const IMAGE_MIME_BY_EXTENSION = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["gif", "image/gif"],
  ["bmp", "image/bmp"],
  ["webp", "image/webp"],
  ["svg", "image/svg+xml"],
  ["tiff", "image/tiff"],
  ["tif", "image/tiff"],
]);

// Default visible duration for a single image (milliseconds)
export const MIN_IMAGE_DISPLAY_DEFAULT_MS = 6_000;
// Minimum allowed visible duration for a single image (milliseconds)
export const MIN_IMAGE_DISPLAY_MIN_MS = 1_000;
// Backwards-compatible alias used by legacy codepaths (equals default duration)
export const MIN_IMAGE_DISPLAY_DURATION_MS = MIN_IMAGE_DISPLAY_DEFAULT_MS;
// Default image hold extension when no next image (milliseconds)
export const DEFAULT_IMAGE_HOLD_MS = 45_000;
// Minimum user-configurable image hold extension (milliseconds)
export const IMAGE_HOLD_MIN_MS = 0;
// Upper bound for how long an image can be carried over into gaps between images (milliseconds)
export const MAX_IMAGE_CARRYOVER_MS = DEFAULT_IMAGE_HOLD_MS;
// Upper bound for user-configurable image hold extension (milliseconds)
export const IMAGE_HOLD_MAX_MS = 180_000;
// Minimum interval allowed between composition changes (milliseconds)
export const MIN_COMPOSITION_CHANGE_INTERVAL_MS = 500;
// Debounce-like guard for how often composition (visible set/layout) can change (milliseconds)
export const MAX_COMPOSITION_CHANGE_INTERVAL_MS = 2_000;
// Absolute cap for concurrent visible images (layout split size)
export const MAX_VISIBLE_IMAGES = 6;
// Time window on either side of an anchor point for batching image selection (milliseconds)
export const BATCH_THRESHOLD_MS = 4_000;
// Time window in which timeline thumbnails are considered part of the same "stack" group (milliseconds)
export const IMAGE_STACK_WINDOW_MS = 25_000;
export const IMAGE_STACK_OFFSET_ORDER = [0, -1, 1, -2, 2, -3, 3];
// Ratio of extra padding added on both ends of the timeline view range
export const TIMELINE_PADDING_RATIO = 0.08;
// Minimum overlap duration for reporting overlaps between tracks (milliseconds)
export const OVERLAP_REPORT_THRESHOLD_MS = 5_000;
// Pixel threshold for snapping the timeline seek to nearby media
export const SEEK_SNAP_THRESHOLD_PX = 10;
