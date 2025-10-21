import React from "react";
import { render, act } from "@testing-library/react";
import { useMediaStore } from "../../state/useMediaStore.js";
import { useSettingsStore } from "../../state/useSettingsStore.js";
import Timeline from "../Timeline.jsx";

function setupMediaWithTwoImages() {
  const now = Date.now();
  const images = [
    { name: "A", timestamp: new Date(now) },
    { name: "B", timestamp: new Date(now + 60_000) },
  ];
  useMediaStore.setState({
    mediaData: {
      images,
      timeline: {
        startMs: now,
        endMs: now + 10 * 60_000,
        viewStartMs: now,
        viewEndMs: now + 10 * 60_000,
        trackRanges: [],
      },
    },
    timelineView: { startMs: now, endMs: now + 10 * 60_000 },
  });
}

describe("Timeline width reacts to speed changes", () => {
  beforeEach(() => {
    // reset stores
    useMediaStore.setState({ mediaData: null, timelineView: null });
    useSettingsStore.setState({ speed: 1, imageHoldSeconds: 6, compositionIntervalSeconds: 4 });
  });

  it("image blocks change width when speed changes", () => {
    setupMediaWithTwoImages();
    const { container, rerender } = render(<Timeline />);

    // collect widths at speed 1
    const blocks1 = container.querySelectorAll(".timeline-image");
    const widths1 = Array.from(blocks1).map((el) => parseFloat(el.style.width));

    // increase speed
    act(() => {
      useSettingsStore.setState({ speed: 2 });
    });
    rerender(<Timeline />);

    const blocks2 = container.querySelectorAll(".timeline-image");
    const widths2 = Array.from(blocks2).map((el) => parseFloat(el.style.width));

    // With higher speed, minVisibleMs and holdMs are scaled up, so durations grow,
    // which should increase width percentages (in same viewport).
    // We only assert a detectable change for at least one block.
    const anyChanged = widths1.some((w, i) => Math.abs((widths2[i] ?? w) - w) > 0.001);
    expect(anyChanged).toBe(true);
  });
});
