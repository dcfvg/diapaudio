import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../useSettingsStore.js';
import { DEFAULT_SPEED, DEFAULT_SKIP_SILENCE } from '../../constants/playback.js';
import {
  DEFAULT_IMAGE_HOLD_MS,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
} from '../../media/constants.js';

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    // Reset store to defaults (don't use replace flag to preserve methods)
    useSettingsStore.setState({
      speed: DEFAULT_SPEED,
      skipSilence: DEFAULT_SKIP_SILENCE,
      imageHoldSeconds: Math.round(DEFAULT_IMAGE_HOLD_MS / 1000),
      compositionIntervalSeconds: Math.round(MAX_COMPOSITION_CHANGE_INTERVAL_MS / 1000),
    });
  });

  it('initializes with default values', () => {
    const state = useSettingsStore.getState();
    expect(state.speed).toBe(DEFAULT_SPEED);
    expect(state.skipSilence).toBe(DEFAULT_SKIP_SILENCE);
    expect(state.imageHoldSeconds).toBe(Math.round(DEFAULT_IMAGE_HOLD_MS / 1000));
    expect(state.compositionIntervalSeconds).toBe(
      Math.round(MAX_COMPOSITION_CHANGE_INTERVAL_MS / 1000)
    );
  });

  it('updates speed', () => {
    useSettingsStore.getState().setSpeed(1.5);
    expect(useSettingsStore.getState().speed).toBe(1.5);
  });

  it('updates skipSilence', () => {
    useSettingsStore.getState().setSkipSilence(true);
    expect(useSettingsStore.getState().skipSilence).toBe(true);
  });

  it('updates imageHoldSeconds', () => {
    useSettingsStore.getState().setImageHoldSeconds(60);
    expect(useSettingsStore.getState().imageHoldSeconds).toBe(60);
  });

  it('clamps imageHoldSeconds to minimum', () => {
    useSettingsStore.getState().setImageHoldSeconds(0.5); // Below minimum
    // Should clamp to IMAGE_HOLD_MIN_MS / 1000 = 1
    expect(useSettingsStore.getState().imageHoldSeconds).toBe(1);
  });

  it('clamps imageHoldSeconds to maximum', () => {
    useSettingsStore.getState().setImageHoldSeconds(300); // Above maximum (180s)
    // Should clamp to IMAGE_HOLD_MAX_MS / 1000 = 180
    expect(useSettingsStore.getState().imageHoldSeconds).toBe(180);
  });

  it('ignores invalid imageHoldSeconds', () => {
    const before = useSettingsStore.getState().imageHoldSeconds;
    useSettingsStore.getState().setImageHoldSeconds(NaN);
    expect(useSettingsStore.getState().imageHoldSeconds).toBe(before);
  });

  it('updates compositionIntervalSeconds', () => {
    // Set to a value within valid range (0.5s to 4s)
    useSettingsStore.getState().setCompositionIntervalSeconds(2);
    expect(useSettingsStore.getState().compositionIntervalSeconds).toBe(2);
  });

  it('clamps compositionIntervalSeconds to minimum only (no upper cap)', () => {
    useSettingsStore.getState().setCompositionIntervalSeconds(0.1);
    expect(useSettingsStore.getState().compositionIntervalSeconds).toBe(
      Math.round(MIN_COMPOSITION_CHANGE_INTERVAL_MS / 1000)
    );
    useSettingsStore.getState().setCompositionIntervalSeconds(999);
    expect(useSettingsStore.getState().compositionIntervalSeconds).toBe(999);
  });

  it('persists settings to localStorage', () => {
    useSettingsStore.getState().setSpeed(2);

    // Check that localStorage was updated
    const stored = window.localStorage.getItem('diapaudio-settings');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed.state.speed).toBe(2);
  });
});
