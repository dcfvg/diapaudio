import { describe, expect, it } from "vitest";
import { resolveBrushDragRange } from "../useBrushControl.js";
import { buildMediaTimelineIndex, buildTimelineProjection } from "../../media/timelineEvents.js";

const DEFAULT_ARGS = {
  pointerStart: 500,
  trackLeft: 100,
  trackWidth: 1000,
  summaryStartMs: 0,
  summaryEndMs: 10_000,
  summaryDurationMs: 10_000,
  startMs: 0,
  endMs: 10_000,
  minDurationMs: 1000,
};

function dragRange(overrides) {
  return resolveBrushDragRange({
    ...DEFAULT_ARGS,
    ...overrides,
  });
}

function clientXForPercent(percent) {
  return DEFAULT_ARGS.trackLeft + DEFAULT_ARGS.trackWidth * percent;
}

describe("resolveBrushDragRange", () => {
  it("resizes the end handle independently from a full-width brush", () => {
    expect(
      dragRange({
        mode: "end",
        pointerClientX: clientXForPercent(0.9),
      })
    ).toEqual({ startMs: 0, endMs: 9000 });
  });

  it("resizes the start handle independently from a full-width brush", () => {
    expect(
      dragRange({
        mode: "start",
        pointerClientX: clientXForPercent(0.1),
      })
    ).toEqual({ startMs: 1000, endMs: 10_000 });
  });

  it("keeps the opposite edge fixed while dragging handles", () => {
    expect(
      dragRange({
        mode: "end",
        startMs: 2000,
        endMs: 8000,
        pointerClientX: clientXForPercent(0.9),
      })
    ).toEqual({ startMs: 2000, endMs: 9000 });

    expect(
      dragRange({
        mode: "start",
        startMs: 2000,
        endMs: 8000,
        pointerClientX: clientXForPercent(0.1),
      })
    ).toEqual({ startMs: 1000, endMs: 8000 });
  });

  it("enforces the minimum brush duration", () => {
    expect(
      dragRange({
        mode: "end",
        startMs: 2000,
        endMs: 8000,
        pointerClientX: clientXForPercent(0.25),
      })
    ).toEqual({ startMs: 2000, endMs: 3000 });

    expect(
      dragRange({
        mode: "start",
        startMs: 2000,
        endMs: 8000,
        pointerClientX: clientXForPercent(0.79),
      })
    ).toEqual({ startMs: 7000, endMs: 8000 });
  });

  it("clamps handle drags to the summary bounds", () => {
    expect(
      dragRange({
        mode: "start",
        startMs: 2000,
        endMs: 8000,
        pointerClientX: DEFAULT_ARGS.trackLeft - 100,
      })
    ).toEqual({ startMs: 0, endMs: 8000 });

    expect(
      dragRange({
        mode: "end",
        startMs: 2000,
        endMs: 8000,
        pointerClientX: DEFAULT_ARGS.trackLeft + DEFAULT_ARGS.trackWidth + 100,
      })
    ).toEqual({ startMs: 2000, endMs: 10_000 });
  });

  it("keeps a full-width brush fixed when dragging the whole window", () => {
    expect(
      dragRange({
        mode: "move",
        pointerStart: clientXForPercent(0.5),
        pointerClientX: clientXForPercent(0.6),
      })
    ).toEqual({ startMs: 0, endMs: 10_000 });
  });

  it("uses compressed-axis pointer mapping for handle drags", () => {
    const axisProjection = buildTimelineProjection({
      startMs: 0,
      endMs: 40_000,
      enabled: true,
      mediaTimelineIndex: buildMediaTimelineIndex({
        images: [],
        audioTracks: [
          {
            adjustedStartTime: new Date(0),
            adjustedEndTime: new Date(10_000),
          },
          {
            adjustedStartTime: new Date(30_000),
            adjustedEndTime: new Date(40_000),
          },
        ],
      }),
    });

    expect(
      resolveBrushDragRange({
        ...DEFAULT_ARGS,
        mode: "end",
        startMs: 0,
        endMs: 40_000,
        summaryEndMs: 40_000,
        summaryDurationMs: 40_000,
        pointerClientX: clientXForPercent(0.5),
        axisProjection,
      })
    ).toEqual({ startMs: 0, endMs: 30_000 });
  });
});
