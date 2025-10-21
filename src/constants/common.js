/**
 * Common shared constants used across the application
 */

// Frozen empty array to use as a safe default that prevents mutations
export const EMPTY_ARRAY = Object.freeze([]);

// Default slots for slideshow when no composition is available (single null slot)
export const DEFAULT_SLOTS = Object.freeze([null]);

// Frozen empty object for safe defaults
export const EMPTY_OBJECT = Object.freeze({});

export default {
  EMPTY_ARRAY,
  DEFAULT_SLOTS,
  EMPTY_OBJECT,
};
