import { describe, expect, it } from "vitest";
import {
  buildMediaTimelineIndex,
  buildTimelineProjection,
  findAutoSkipTarget,
  findNextEventTime,
  findNextImageTime,
  findPrevEventTime,
  getImageTimeMs,
  getTrackEndMs,
  hasAudioCoverage,
} from "../timelineEvents.js";

describe("timeline event index", () => {
  it("uses the same image timestamp precedence as playback", () => {
    const adjustedTimestamp = new Date("2025-01-01T10:00:03.000Z");
    const originalTimestamp = new Date("2025-01-01T10:00:02.000Z");
    const timestamp = new Date("2025-01-01T10:00:01.000Z");

    expect(
      getImageTimeMs({
        adjustedTimestamp,
        originalTimestamp,
        timestamp,
        timeMs: 123,
      })
    ).toBe(adjustedTimestamp.getTime());

    expect(getImageTimeMs({ originalTimestamp, timestamp, timeMs: 123 })).toBe(
      originalTimestamp.getTime()
    );
    expect(getImageTimeMs({ timestamp, timeMs: 123 })).toBe(timestamp.getTime());
    expect(getImageTimeMs({ timeMs: 123 })).toBe(123);
    expect(getImageTimeMs({})).toBeNull();
  });

  it("falls back to duration when an adjusted audio end is missing", () => {
    const adjustedStartTime = new Date("2025-01-01T10:00:00.000Z");

    expect(getTrackEndMs({ adjustedStartTime, duration: 12.5 })).toBe(
      adjustedStartTime.getTime() + 12_500
    );
  });

  it("builds sorted unique media event times", () => {
    const base = new Date("2025-01-01T10:00:00.000Z").getTime();
    const index = buildMediaTimelineIndex({
      images: [
        { timeMs: base + 3_000 },
        { timeMs: base + 1_000 },
        { timeMs: base + 1_000 },
        { timeMs: NaN },
      ],
      audioTracks: [
        {
          adjustedStartTime: new Date(base + 2_000),
          adjustedEndTime: new Date(base + 12_000),
        },
        {
          adjustedStartTime: new Date(base + 1_000),
          adjustedEndTime: new Date(base + 6_000),
        },
      ],
    });

    expect(index.imageTimes).toEqual([base + 1_000, base + 3_000]);
    expect(index.audioStartTimes).toEqual([base + 1_000, base + 2_000]);
    expect(index.eventTimes).toEqual([base + 1_000, base + 2_000, base + 3_000]);
  });

  it("finds next and previous media events with the same threshold semantics", () => {
    const events = [1_000, 2_000, 2_100, 3_000];

    expect(findNextEventTime(events, 1_900)).toBe(2_100);
    expect(findNextEventTime(events, 2_000)).toBe(3_000);
    expect(findNextEventTime(events, 2_000, 0)).toBe(2_100);
    expect(findPrevEventTime(events, 2_200)).toBe(2_000);
    expect(findPrevEventTime(events, 2_100)).toBe(1_000);
    expect(findNextEventTime(events, 3_000)).toBeNull();
    expect(findPrevEventTime(events, 900)).toBeNull();
  });

  it("finds the next image at or after a timestamp", () => {
    expect(findNextImageTime([1_000, 2_000, 3_000], 2_000)).toBe(2_000);
    expect(findNextImageTime([1_000, 2_000, 3_000], 2_001)).toBe(3_000);
    expect(findNextImageTime([1_000], 1_001)).toBeNull();
  });

  it("checks audio coverage in overlapping ranges without scanning every track", () => {
    const index = buildMediaTimelineIndex({
      images: [],
      audioTracks: [
        {
          adjustedStartTime: new Date(1_000),
          adjustedEndTime: new Date(20_000),
        },
        {
          adjustedStartTime: new Date(5_000),
          adjustedEndTime: new Date(6_000),
        },
      ],
    });

    expect(hasAudioCoverage(index.audioRanges, 999)).toBe(false);
    expect(hasAudioCoverage(index.audioRanges, 5_500)).toBe(true);
    expect(hasAudioCoverage(index.audioRanges, 19_000)).toBe(true);
    expect(hasAudioCoverage(index.audioRanges, 20_001)).toBe(false);
  });
});

describe("compressed timeline projection", () => {
  function buildGapIndex() {
    return buildMediaTimelineIndex({
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
    });
  }

  it("keeps an identity projection when disabled", () => {
    const projection = buildTimelineProjection({
      startMs: 0,
      endMs: 40_000,
      mediaTimelineIndex: buildGapIndex(),
      enabled: false,
    });

    expect(projection.enabled).toBe(false);
    expect(projection.timeToPercent(20_000)).toBe(50);
    expect(projection.percentToTime(75)).toBe(30_000);
  });

  it("compresses an audio gap and maps the cut to the next media event", () => {
    const projection = buildTimelineProjection({
      startMs: 0,
      endMs: 40_000,
      mediaTimelineIndex: buildGapIndex(),
      enabled: true,
    });

    expect(projection.enabled).toBe(true);
    expect(projection.voids).toHaveLength(1);
    expect(projection.voids[0]).toMatchObject({ startMs: 10_000, endMs: 30_000 });
    expect(projection.projectedDurationMs).toBe(21_000);
    expect(projection.timeToProjectedMs(30_000)).toBe(11_000);
    expect(projection.projectedToTimeMs(10_500)).toBe(30_000);
  });

  it("does not compress blanks of 10 seconds or less", () => {
    const projection = buildTimelineProjection({
      startMs: 0,
      endMs: 30_000,
      mediaTimelineIndex: buildMediaTimelineIndex({
        images: [],
        audioTracks: [
          {
            adjustedStartTime: new Date(0),
            adjustedEndTime: new Date(10_000),
          },
          {
            adjustedStartTime: new Date(19_900),
            adjustedEndTime: new Date(30_000),
          },
        ],
      }),
      enabled: true,
    });

    expect(projection.enabled).toBe(false);
    expect(projection.voids).toHaveLength(0);
  });

  it("compresses blanks strictly longer than 10 seconds", () => {
    const index = buildMediaTimelineIndex({
      images: [],
      audioTracks: [
        {
          adjustedStartTime: new Date(0),
          adjustedEndTime: new Date(10_000),
        },
        {
          adjustedStartTime: new Date(20_100),
          adjustedEndTime: new Date(30_100),
        },
      ],
    });
    const projection = buildTimelineProjection({
      startMs: 0,
      endMs: 30_100,
      mediaTimelineIndex: index,
      enabled: true,
    });

    expect(projection.enabled).toBe(true);
    expect(projection.voids).toHaveLength(1);
    expect(projection.voids[0]).toMatchObject({ startMs: 10_000, endMs: 20_100 });
    expect(findAutoSkipTarget(index, 11_000)).toBe(20_100);
  });

  it("preserves displayed photo segments before starting a skipped blank", () => {
    const mediaCoverageRanges = [{ startMs: 12_000, endMs: 30_000 }];
    const index = buildMediaTimelineIndex({
      images: [{ timeMs: 12_000 }],
      audioTracks: [
        {
          adjustedStartTime: new Date(0),
          adjustedEndTime: new Date(10_000),
        },
        {
          adjustedStartTime: new Date(42_000),
          adjustedEndTime: new Date(52_000),
        },
      ],
    });
    const projection = buildTimelineProjection({
      startMs: 0,
      endMs: 52_000,
      mediaTimelineIndex: index,
      mediaCoverageRanges,
      enabled: true,
    });

    expect(projection.voids).toHaveLength(1);
    expect(projection.voids[0]).toMatchObject({ startMs: 30_000, endMs: 42_000 });
    expect(projection.timeToProjectedMs(42_000)).toBe(31_000);
    expect(projection.projectedToTimeMs(30_500)).toBe(42_000);
    expect(findAutoSkipTarget(index, 20_000, { mediaCoverageRanges })).toBeUndefined();
    expect(findAutoSkipTarget(index, 31_000, { mediaCoverageRanges })).toBe(42_000);
  });

  it("keeps a zoomed view inside a long blank compressed to the next media event", () => {
    const projection = buildTimelineProjection({
      startMs: 31_000,
      endMs: 40_000,
      mediaTimelineIndex: buildMediaTimelineIndex({
        images: [],
        audioTracks: [
          {
            adjustedStartTime: new Date(0),
            adjustedEndTime: new Date(30_000),
          },
          {
            adjustedStartTime: new Date(42_000),
            adjustedEndTime: new Date(52_000),
          },
        ],
      }),
      enabled: true,
    });

    expect(projection.enabled).toBe(true);
    expect(projection.voids).toHaveLength(1);
    expect(projection.voids[0]).toMatchObject({ startMs: 31_000, endMs: 40_000 });
    expect(projection.percentToTime(50)).toBe(42_000);
  });

  it("keeps time to projected position monotone and clamps bounds", () => {
    const projection = buildTimelineProjection({
      startMs: 0,
      endMs: 40_000,
      mediaTimelineIndex: buildGapIndex(),
      enabled: true,
    });

    const positions = [0, 5_000, 10_000, 20_000, 30_000, 40_000].map((timeMs) =>
      projection.timeToProjectedMs(timeMs)
    );

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(projection.timeToPercent(-100)).toBe(0);
    expect(projection.timeToPercent(50_000)).toBe(100);
    expect(projection.percentToTime(-10)).toBe(0);
    expect(projection.percentToTime(110)).toBe(40_000);
  });

  it("uses the same skip decision for playback and projection semantics", () => {
    const index = buildGapIndex();

    expect(findAutoSkipTarget(index, 5_000)).toBeUndefined();
    expect(findAutoSkipTarget(index, 20_000)).toBe(30_000);
    expect(findAutoSkipTarget(index, 45_000)).toBeNull();
  });
});
