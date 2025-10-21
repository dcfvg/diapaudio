import { computeImageSchedule } from "../imageSchedule.js";
import { MIN_IMAGE_DISPLAY_DEFAULT_MS } from "../constants.js";

describe("computeImageSchedule speed scaling", () => {
  function makeImageAt(ms, name = "img") {
    return { name, timestamp: new Date(ms) };
  }

  const base = MIN_IMAGE_DISPLAY_DEFAULT_MS; // baseline in ms
  const speeds = [0.5, 1, 2];

  it("scales end-start durations linearly with speed when minVisibleMs and holdMs are scaled", () => {
    const img = makeImageAt(10_000, "A");

    speeds.forEach((s) => {
      const scaledMin = Math.round(base * s);
      const scaledHold = Math.round(base * s);
      const schedule = computeImageSchedule([img], {
        minVisibleMs: scaledMin,
        holdMs: scaledHold,
      });

      const meta = schedule.metadata[0];
      expect(meta.visible).toBe(true);
      expect(meta.startMs).toBe(10_000);
      const duration = meta.endMs - meta.startMs;
      // With the new dual-parameter system:
      // - minVisibleMs sets the base display duration
      // - holdMs extends that duration when no next image
      // Since there's only one image (no next image), total = minVisibleMs + holdMs
      expect(duration).toBe(scaledMin + scaledHold);
    });
  });
});
