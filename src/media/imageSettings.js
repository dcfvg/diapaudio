import { useSettingsStore } from "../state/useSettingsStore.js";
import { DEFAULT_IMAGE_HOLD_MS, IMAGE_HOLD_MIN_MS, IMAGE_HOLD_MAX_MS } from "./constants.js";
import { clamp } from "../utils/numberUtils.js";

/**
 * Get image hold duration in milliseconds from settings.
 * Applies clamping to keep value within valid range.
 * @param {Object} options - Optional overrides
 * @param {number} options.imageHoldSeconds - Override for imageHoldSeconds setting
 * @returns {number} Hold duration in milliseconds
 */
export function getImageHoldMs(options = {}) {
  const state = typeof useSettingsStore.getState === "function" ? useSettingsStore.getState() : null;
  const seconds = Number(options.imageHoldSeconds ?? state?.imageHoldSeconds);
  
  // Explicitly handle 0 to avoid falsy value issues
  if (seconds === 0) {
    return 0;
  }
  
  if (Number.isFinite(seconds) && seconds > 0) {
    const ms = seconds * 1000;
    return clamp(ms, IMAGE_HOLD_MIN_MS, IMAGE_HOLD_MAX_MS);
  }
  
  return DEFAULT_IMAGE_HOLD_MS;
}

export function getImageHoldSeconds() {
  return Math.round(getImageHoldMs() / 1000);
}
