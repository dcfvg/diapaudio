import { useSettingsStore } from "../state/useSettingsStore.js";
import { DEFAULT_IMAGE_HOLD_MS, IMAGE_HOLD_MIN_MS, IMAGE_HOLD_MAX_MS } from "./constants.js";

export function getImageHoldMs() {
  const state = typeof useSettingsStore.getState === "function" ? useSettingsStore.getState() : null;
  const seconds = Number(state?.imageHoldSeconds);
  if (Number.isFinite(seconds) && seconds > 0) {
    const ms = seconds * 1000;
    return Math.min(IMAGE_HOLD_MAX_MS, Math.max(IMAGE_HOLD_MIN_MS, ms));
  }
  return DEFAULT_IMAGE_HOLD_MS;
}

export function getImageHoldSeconds() {
  return Math.round(getImageHoldMs() / 1000);
}
