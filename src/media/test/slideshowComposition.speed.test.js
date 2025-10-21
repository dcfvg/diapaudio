import { createCompositionState, updateCompositionState } from "../slideshowComposition.js";
import { MIN_IMAGE_DISPLAY_DURATION_MS } from "../constants.js";
import { useSettingsStore } from "../../state/useSettingsStore.js";

function makeImageAt(ms, name) {
  return { name, timestamp: new Date(ms), url: name };
}

describe("slideshowComposition honors speed-scaled minimum display", () => {
  beforeEach(() => {
    useSettingsStore.setState({ speed: 2 });
  });

  it("does not swap before scaled minimum", () => {
    const state = createCompositionState();
    const base = MIN_IMAGE_DISPLAY_DURATION_MS; // default min display
    const scaledMin = Math.round(base * 2); // speed=2
    // compositionInterval is tested implicitly in the timing logic
    const A = makeImageAt(1_000, "A");
    const B = makeImageAt(2_000, "B");

    // Start with A visible at t=1000
    let result = updateCompositionState(state, [A], 1_000, { force: true });
    expect(result.slots.filter(Boolean).length).toBeGreaterThan(0);

    // Try to replace with B before scaled minimum (but after composition interval)
    const tooEarlyForMin = 1_000 + scaledMin - 10; // just before min
    result = updateCompositionState(state, [B], tooEarlyForMin);

    // A should still be visible (minimum display time not met)
    const stillHasA = result.slots.some((s) => s?.image === A);
    expect(stillHasA).toBe(true);

    // After scaled minimum, switch allowed
    const safeTime = 1_000 + scaledMin + 10;
    result = updateCompositionState(state, [B], safeTime);
    const hasB = result.slots.some((s) => s?.image === B);
    expect(hasB).toBe(true);
  });
});
