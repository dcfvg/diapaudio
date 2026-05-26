import { describe, expect, it } from "vitest";
import { computeImageSchedule } from "../imageSchedule.js";
import {
  aggregateEntriesByPixel,
  buildCompositionFromSegment,
  createScheduleIndex,
  findScheduleSegmentAt,
  findSurroundingImages,
} from "../scheduleIndex.js";

function imageAt(seconds, name) {
  return {
    name,
    originalTimestamp: new Date(Date.parse("2025-10-08T12:00:00Z") + seconds * 1000),
  };
}

describe("scheduleIndex", () => {
  it("exposes the same schedule segments used by slideshow planning", () => {
    const images = [imageAt(0, "a.jpg"), imageAt(3, "b.jpg"), imageAt(6, "c.jpg")];
    const options = {
      minVisibleMs: 5_000,
      holdMs: 4_000,
      maxSlots: 2,
      compositionIntervalMs: 2_000,
    };

    const schedule = computeImageSchedule(images, options);
    const index = createScheduleIndex(images, options);

    expect(index.segments).toEqual(schedule.segments);
    expect(index.metadata).toEqual(schedule.metadata);
    expect(index.entries.map((entry) => entry.image.name)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });

  it("finds active segments with binary search and builds matching compositions", () => {
    const images = [imageAt(0, "a.jpg"), imageAt(5, "b.jpg")];
    const baseMs = images[0].originalTimestamp.getTime();
    const segments = [
      { startMs: baseMs, endMs: baseMs + 5_000, layoutSize: 1, slots: [0] },
      { startMs: baseMs + 5_000, endMs: baseMs + 10_000, layoutSize: 2, slots: [0, 1] },
    ];

    expect(findScheduleSegmentAt(segments, baseMs - 1)).toBeNull();
    expect(findScheduleSegmentAt(segments, baseMs + 4_999)).toBe(segments[0]);
    expect(findScheduleSegmentAt(segments, baseMs + 5_000)).toBe(segments[1]);
    expect(findScheduleSegmentAt(segments, baseMs + 10_000)).toBeNull();

    const composition = buildCompositionFromSegment(segments[1], images);
    expect(composition.layoutSize).toBe(2);
    expect(composition.images.map((image) => image.name)).toEqual(["a.jpg", "b.jpg"]);
  });

  it("returns surrounding images for empty preview zones", () => {
    const images = [imageAt(0, "a.jpg"), imageAt(20, "b.jpg")];
    const index = createScheduleIndex(images, {
      minVisibleMs: 2_000,
      holdMs: 0,
      maxSlots: 1,
      compositionIntervalMs: 2_000,
    });

    const surrounding = findSurroundingImages(
      index,
      images[0].originalTimestamp.getTime() + 10_000
    );
    expect(surrounding.previous?.name).toBe("a.jpg");
    expect(surrounding.next?.name).toBe("b.jpg");
  });

  it("aggregates dense image entries by rendered pixel while preserving active images", () => {
    const entries = [
      {
        image: { name: "a.jpg" },
        index: 0,
        startMs: 0,
        endMs: 100,
        slotIndex: 0,
        maxConcurrency: 1,
      },
      {
        image: { name: "b.jpg" },
        index: 1,
        startMs: 10,
        endMs: 110,
        slotIndex: 0,
        maxConcurrency: 1,
      },
      {
        image: { name: "c.jpg" },
        index: 2,
        startMs: 600,
        endMs: 700,
        slotIndex: 0,
        maxConcurrency: 1,
      },
    ];

    const result = aggregateEntriesByPixel(entries, 0, 1_000, 2);

    expect(result).toHaveLength(2);
    expect(result[0].aggregatedCount).toBe(2);
    expect(result[0].images.map((image) => image.name)).toEqual(["a.jpg", "b.jpg"]);
    expect(result[1].image.name).toBe("c.jpg");
  });
});
