/* eslint-env jest */

// Global test setup for Vitest + Testing Library
// - jsdom assertions
// - i18n initialization with deterministic language
// - reset Zustand stores between tests
// - minimal DOM and browser API polyfills when necessary

// IMPORTANT: Mock localStorage FIRST, before any imports that use it
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Set up localStorage on both global and window
if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
  }
}

import '@testing-library/jest-dom';

// Ensure i18n is initialized and forced to English for stable snapshots
import { setLanguage } from '../i18n/index.js';

// Some components import styles; Vitest with css: true handles this, no-op here

// Reset Zustand stores between tests to avoid state leakage
import { useMediaStore } from '../state/useMediaStore.js';
import { usePlaybackStore } from '../state/usePlaybackStore.js';
import { useUiStore } from '../state/useUiStore.js';
import { useSettingsStore } from '../state/useSettingsStore.js';
import { DEFAULT_IMAGE_HOLD_MS, MAX_COMPOSITION_CHANGE_INTERVAL_MS } from '../media/constants.js';

// Helper to fully reset stores
export function resetAllStores() {
  try {
    usePlaybackStore.getState().reset?.();
  } catch {
    // ignore reset errors
  }
  try {
    useMediaStore.getState().reset?.();
  } catch {
    // ignore reset errors
  }
  try {
    // Manually reset UI store fields - only update state properties, not actions
    useUiStore.setState({
      isDragging: false,
      noticesOpen: false,
      hudVisible: false,
      hudPinned: false,
      delayDraft: "",
    });
  } catch {
    // ignore reset errors
  }
  try {
    // Reset settings to defaults by clearing persistence
    const persistKey = 'diapaudio-settings';
    window.localStorage?.removeItem?.(persistKey);
    // Force default values (matches useSettingsStore defaults) - only update state, not actions
    useSettingsStore.setState({
      speed: 1,
      skipSilence: false,
      imageHoldSeconds: Math.round(DEFAULT_IMAGE_HOLD_MS / 1000),
      compositionIntervalSeconds: Math.round(MAX_COMPOSITION_CHANGE_INTERVAL_MS / 1000),
    });
  } catch {
    // ignore reset errors
  }
}

beforeAll(async () => {
  // Force English to stabilise text content
  try {
    await setLanguage('en');
  } catch {
    // ignore language initialisation errors
  }
});

beforeEach(() => {
  resetAllStores();
  // Silence noisy console output from tests that intentionally exercise error paths
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console after each test
  console.error.mockRestore?.();
  console.warn.mockRestore?.();
});
