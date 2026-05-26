import { describe, expect, it } from "vitest";
import {
  buildMediaTimelineIndex,
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
