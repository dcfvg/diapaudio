import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SPEED, DEFAULT_SKIP_SILENCE } from "../constants/playback.js";
import {
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
  MIN_IMAGE_DISPLAY_MIN_MS,
  DEFAULT_IMAGE_HOLD_MS,
  IMAGE_HOLD_MIN_MS,
  IMAGE_HOLD_MAX_MS,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
} from "../media/constants.js";

/**
 * Persistent settings store - the ONLY store that persists across page reloads.
 * All other stores (media, playback, UI) are reset on page load.
 */
export const useSettingsStore = create(
  persist(
    (set) => ({
      // Playback settings
      speed: DEFAULT_SPEED,
      skipSilence: DEFAULT_SKIP_SILENCE,
  autoSkipVoids: false,
      // Timeline/Image scheduling
      snapToGrid: true,
      snapGridSeconds: 2,
      imageDisplaySeconds: Math.round(MIN_IMAGE_DISPLAY_DEFAULT_MS / 1000),
      imageHoldSeconds: Math.round(DEFAULT_IMAGE_HOLD_MS / 1000),
      compositionIntervalSeconds: Math.round(MAX_COMPOSITION_CHANGE_INTERVAL_MS / 1000),
      // Display options
      showClock: true,
      clockMode: 'digital', // 'analog' or 'digital'

      // Actions
      setSpeed: (speed) => set({ speed }),
      setSkipSilence: (skipSilence) => set({ skipSilence }),
  setAutoSkipVoids: (enabled) => set({ autoSkipVoids: Boolean(enabled) }),
      setSnapToGrid: (enabled) => set({ snapToGrid: Boolean(enabled) }),
      setSnapGridSeconds: (seconds) => {
        const numeric = Math.round(Number(seconds));
        if (!Number.isFinite(numeric)) return;
        const clamped = Math.max(1, numeric);
        set({ snapGridSeconds: clamped });
      },
      setImageDisplaySeconds: (seconds) => {
        const numeric = Number(seconds);
        if (!Number.isFinite(numeric)) {
          return;
        }
        const ms = numeric * 1000;
        const clampedMs = Math.max(ms, MIN_IMAGE_DISPLAY_MIN_MS);
        const clamped = Math.round(clampedMs / 1000);
        set({ imageDisplaySeconds: clamped });
      },
      setImageHoldSeconds: (seconds) => {
        const numeric = Number(seconds);
        if (!Number.isFinite(numeric)) {
          return;
        }
        const ms = numeric * 1000;
        const clampedMs = Math.min(
          Math.max(ms, IMAGE_HOLD_MIN_MS),
          IMAGE_HOLD_MAX_MS
        );
        const clamped = Math.round(clampedMs / 1000);
        set({ imageHoldSeconds: clamped });
      },
      setCompositionIntervalSeconds: (seconds) => {
        const numeric = Number(seconds);
        if (!Number.isFinite(numeric)) {
          return;
        }
        // Keep only a minimum bound; allow very large values (practically unlimited)
        const ms = Math.max(numeric * 1000, MIN_COMPOSITION_CHANGE_INTERVAL_MS);
        const outSeconds = Math.round(ms / 1000);
        set({ compositionIntervalSeconds: outSeconds });
      },
      setShowClock: (enabled) => set({ showClock: Boolean(enabled) }),
      setClockMode: (mode) => set({ clockMode: mode === 'digital' ? 'digital' : 'analog' }),
    }),
    {
      name: "diapaudio-settings",
      version: 7,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState || {}),
      }),
    }
  )
);
