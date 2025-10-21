import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCompositionState,
  resetCompositionState,
  updateCompositionState,
} from '../slideshowComposition.js';
import {
  DEFAULT_IMAGE_HOLD_MS,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
} from '../constants.js';
import { useSettingsStore } from '../../state/useSettingsStore.js';

function makeImage(id, timestampMs) {
  return {
    url: `image-${id}.jpg`,
    name: `image-${id}.jpg`,
    timestamp: timestampMs,
  };
}

describe('slideshowComposition.updateCompositionState', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage?.clear) {
      window.localStorage.clear();
    }
    useSettingsStore.setState({
      imageHoldSeconds: Math.round(DEFAULT_IMAGE_HOLD_MS / 1000),
      compositionIntervalSeconds: Math.round(MAX_COMPOSITION_CHANGE_INTERVAL_MS / 1000),
    });
  });

  it('defers composition updates until the maximum change interval expires', () => {
    const state = createCompositionState();
    resetCompositionState(state);

    const imgA = makeImage('a', 0);
    const imgB = makeImage('b', MAX_COMPOSITION_CHANGE_INTERVAL_MS);

    let result = updateCompositionState(state, [imgA], 0);
    expect(result.changed).toBe(true);
    expect(result.orderedImages).toEqual([imgA]);

    // Attempt to switch composition before interval has elapsed
    const earlyMs = MAX_COMPOSITION_CHANGE_INTERVAL_MS - 500;
    result = updateCompositionState(state, [imgB], earlyMs);
    expect(result.changed).toBe(false);
    expect(result.orderedImages).toEqual([imgA]);
    expect(state.pendingChanges.length).toBe(1);

    // Once the interval passes AND minimum display time is met, the pending change should apply
    // Minimum display is 6500ms (MIN_IMAGE_DISPLAY_DURATION_MS * speed), so use 7000ms to be safe
    const afterBoth = 7000;
    result = updateCompositionState(state, [imgB], afterBoth);
    expect(result.changed).toBe(true);
    expect(result.orderedImages).toEqual([imgB]);
    expect(state.pendingChanges.length).toBe(0);
  });

  it('holds previous composition when no replacement images are available', () => {
    const state = createCompositionState();
    resetCompositionState(state);

    const baseMs = 1_000;
    const imgA = makeImage('hold', baseMs);

    let result = updateCompositionState(state, [imgA], baseMs);
    expect(result.changed).toBe(true);
    expect(result.orderedImages).toEqual([imgA]);

    // Request removal before hold duration elapses - should continue displaying imgA
    const beforeHoldExpires = baseMs + MAX_COMPOSITION_CHANGE_INTERVAL_MS + 500;
    result = updateCompositionState(state, [], beforeHoldExpires);
    expect(result.changed).toBe(false);
    expect(result.orderedImages).toEqual([imgA]);

    // After the hold duration, the composition should clear
    const afterHoldExpires = baseMs + DEFAULT_IMAGE_HOLD_MS + 500;
    result = updateCompositionState(state, [], afterHoldExpires);
    expect(result.changed).toBe(true);
    expect(result.orderedImages).toEqual([]);
  });
});
