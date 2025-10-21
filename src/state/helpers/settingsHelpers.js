/**
 * Helper functions for resolving and computing settings values with proper
 * speed scaling, clamping, and defaults.
 */

import {
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
  MIN_IMAGE_DISPLAY_MIN_MS,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
} from "../../media/constants.js";
import { getImageHoldMs } from "../../media/imageSettings.js";

/**
 * Compute the minimum visible duration for images in milliseconds.
 * Applies speed scaling to maintain consistent on-screen time.
 * 
 * @param {number} imageDisplaySeconds - User's image display setting
 * @param {number} speed - Playback speed multiplier
 * @returns {number} Minimum visible duration in milliseconds
 */
export function computeMinVisibleMs(imageDisplaySeconds, speed = 1) {
  const defaultSeconds = MIN_IMAGE_DISPLAY_DEFAULT_MS / 1000;
  const displaySec = Number(imageDisplaySeconds);
  const seconds = Number.isFinite(displaySec) && displaySec > 0
    ? displaySec
    : defaultSeconds;
  
  const speedMultiplier = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const scaled = Math.round(seconds * 1000 * speedMultiplier);
  
  return Math.max(MIN_IMAGE_DISPLAY_MIN_MS, scaled);
}

/**
 * Compute the hold duration for images in milliseconds with speed scaling.
 * Uses the shared getImageHoldMs helper and applies speed scaling.
 * 
 * @param {number} imageHoldSeconds - User's image hold setting
 * @param {number} speed - Playback speed multiplier
 * @returns {number} Hold duration in milliseconds
 */
export function computeScaledHoldMs(imageHoldSeconds, speed = 1) {
  const holdMs = getImageHoldMs({ imageHoldSeconds });
  const speedMultiplier = Number.isFinite(speed) && speed > 0 ? speed : 1;
  
  return Math.round(holdMs * speedMultiplier);
}

/**
 * Compute the composition change interval in milliseconds.
 * 
 * @param {number} compositionIntervalSeconds - User's composition interval setting
 * @returns {number} Composition interval in milliseconds
 */
export function computeCompositionIntervalMs(compositionIntervalSeconds) {
  const seconds = Number(compositionIntervalSeconds);
  
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return MAX_COMPOSITION_CHANGE_INTERVAL_MS;
  }
  
  const ms = seconds * 1000;
  return Math.max(ms, MIN_COMPOSITION_CHANGE_INTERVAL_MS);
}

/**
 * Compute the snap grid interval in milliseconds.
 * 
 * @param {number} snapGridSeconds - User's snap grid setting
 * @returns {number|null} Snap grid in milliseconds, or null if not enabled
 */
export function computeSnapGridMs(snapGridSeconds) {
  const sec = Number(snapGridSeconds);
  return Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : null;
}

/**
 * Resolve all image schedule settings from user settings.
 * Provides a convenient way to get all computed values at once.
 * 
 * @param {Object} settings - Settings object from useSettingsStore
 * @returns {Object} Computed settings for image scheduling
 */
export function resolveImageScheduleSettings(settings) {
  const speed = Number(settings?.speed);
  const speedMultiplier = Number.isFinite(speed) && speed > 0 ? speed : 1;
  
  return {
    minVisibleMs: computeMinVisibleMs(settings?.imageDisplaySeconds, speedMultiplier),
    holdMs: computeScaledHoldMs(settings?.imageHoldSeconds, speedMultiplier),
    compositionIntervalMs: computeCompositionIntervalMs(settings?.compositionIntervalSeconds),
    snapToGrid: Boolean(settings?.snapToGrid),
    snapGridMs: computeSnapGridMs(settings?.snapGridSeconds),
  };
}
