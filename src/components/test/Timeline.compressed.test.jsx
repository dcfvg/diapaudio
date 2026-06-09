import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils.jsx";
import { useMediaStore } from "../../state/useMediaStore.js";
import { usePlaybackStore } from "../../state/usePlaybackStore.js";
import { useSettingsStore } from "../../state/useSettingsStore.js";
import Timeline from "../Timeline.jsx";

function makeTrack(index, startMs, endMs) {
  return {
    index,
    startMs,
    endMs,
    track: {
      label: `Track ${index + 1}`,
      originalName: `Track ${index + 1}.wav`,
      url: `blob:track-${index}`,
      adjustedStartTime: new Date(startMs),
      adjustedEndTime: new Date(endMs),
      duration: (endMs - startMs) / 1000,
    },
  };
}

function setupTimeline({
  autoSkipVoids = false,
  seekToAbsolute = vi.fn(),
  audioRanges = [
    [0, 10_000],
    [30_000, 40_000],
  ],
  images = [],
  settings = {},
  activeTrackIndex = 0,
  absoluteTime = 0,
  playing = false,
} = {}) {
  const trackRanges = audioRanges.map(([startMs, endMs], index) =>
    makeTrack(index, startMs, endMs)
  );
  const audioTracks = trackRanges.map((range) => range.track);
  const timelineStartMs = Math.min(0, ...audioRanges.map(([startMs]) => startMs));
  const timelineEndMs = Math.max(40_000, ...audioRanges.map(([, endMs]) => endMs));
  const mediaData = {
    images,
    audioTracks,
    timeline: {
      startMs: timelineStartMs,
      endMs: timelineEndMs,
      viewStartMs: timelineStartMs,
      viewEndMs: timelineEndMs,
      trackRanges,
    },
  };

  useSettingsStore.setState({ autoSkipVoids, ...settings });
  usePlaybackStore.setState({
    activeTrackIndex,
    absoluteTime,
    displayedImages: [],
    playing,
    seekToAbsolute,
  });
  useMediaStore.setState({
    mediaData,
    timelineView: { startMs: timelineStartMs, endMs: timelineEndMs },
  });

  return { mediaData, seekToAbsolute };
}

describe("Timeline compressed blanks", () => {
  it("highlights the track covering the absolute time when playback index is temporarily null", () => {
    setupTimeline({
      activeTrackIndex: null,
      absoluteTime: 35_000,
      playing: true,
    });

    const { container } = renderWithProviders(<Timeline />);
    const tracks = container.querySelectorAll(".timeline-track");

    expect(tracks[0]).not.toHaveClass("timeline-track--active");
    expect(tracks[1]).toHaveClass("timeline-track--active");
    expect(tracks[1]).not.toHaveClass("timeline-track--pending");
  });

  it("uses absolute time instead of a stale playback index for the active track", () => {
    setupTimeline({
      activeTrackIndex: 0,
      absoluteTime: 35_000,
      playing: true,
    });

    const { container } = renderWithProviders(<Timeline />);
    const tracks = container.querySelectorAll(".timeline-track");

    expect(tracks[0]).not.toHaveClass("timeline-track--active");
    expect(tracks[1]).toHaveClass("timeline-track--active");
  });

  it("does not highlight any audio track while the current time is in a media blank", () => {
    setupTimeline({
      activeTrackIndex: null,
      absoluteTime: 20_000,
      playing: true,
    });

    const { container } = renderWithProviders(<Timeline />);

    expect(container.querySelector(".timeline-track--active")).not.toBeInTheDocument();
  });

  it("uses the normal linear axis when blank skipping is disabled", () => {
    setupTimeline({ autoSkipVoids: false });

    const { container } = renderWithProviders(<Timeline />);
    const tracks = container.querySelectorAll(".timeline-track");

    expect(container.querySelector(".timeline__void-cut")).not.toBeInTheDocument();
    expect(parseFloat(tracks[1].style.left)).toBe(75);
  });

  it("renders a cut marker and moves later media earlier on the compressed axis", () => {
    setupTimeline({ autoSkipVoids: true });

    const { container } = renderWithProviders(<Timeline />);
    const tracks = container.querySelectorAll(".timeline-track");
    const cut = container.querySelector(".timeline__void-cut");
    const secondTrackLeft = parseFloat(tracks[1].style.left);

    expect(cut).toBeInTheDocument();
    expect(secondTrackLeft).toBeGreaterThan(50);
    expect(secondTrackLeft).toBeLessThan(55);
  });

  it("uses the minimum photo display time as the blank threshold", () => {
    setupTimeline({
      autoSkipVoids: true,
      audioRanges: [
        [0, 10_000],
        [17_000, 40_000],
      ],
      settings: {
        imageDisplaySeconds: 6,
        speed: 1,
      },
    });

    const { container } = renderWithProviders(<Timeline />);
    const cut = container.querySelector(".timeline__void-cut");

    expect(cut).toBeInTheDocument();
    expect(cut).toHaveAttribute("data-start-ms", "10000");
    expect(cut).toHaveAttribute("data-end-ms", "17000");
  });

  it("keeps blanks equal to the minimum photo display time linear", () => {
    setupTimeline({
      autoSkipVoids: true,
      audioRanges: [
        [0, 10_000],
        [16_000, 40_000],
      ],
      settings: {
        imageDisplaySeconds: 6,
        speed: 1,
      },
    });

    const { container } = renderWithProviders(<Timeline />);

    expect(container.querySelector(".timeline__void-cut")).not.toBeInTheDocument();
  });

  it("clicking a cut marker seeks to the next media event", () => {
    const seekToAbsolute = vi.fn();
    const { mediaData } = setupTimeline({ autoSkipVoids: true, seekToAbsolute });

    const { container } = renderWithProviders(<Timeline />);
    const cut = container.querySelector(".timeline__void-cut");

    fireEvent.pointerDown(cut, { button: 0, pointerId: 1 });

    expect(seekToAbsolute).toHaveBeenCalledWith(mediaData, 30_000, { autoplay: true });
  });

  it("keeps the resume time label hidden when the fixed marker has no room", async () => {
    const rectSpy = vi
      .spyOn(globalThis.HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(() => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 100,
        width: 1000,
        height: 100,
        toJSON: () => ({}),
      }));

    try {
      setupTimeline({
        autoSkipVoids: true,
        audioRanges: [
          [0, 10_000],
          [1_000_000, 1_010_000],
        ],
      });

      const { container } = renderWithProviders(<Timeline />);

      await waitFor(() => {
        expect(container.querySelector(".timeline__void-cut")).toBeInTheDocument();
      });
      expect(container.querySelector(".timeline__void-cut-label")).not.toBeInTheDocument();
    } finally {
      rectSpy.mockRestore();
    }
  });

  it("starts the cut marker after a held photo segment ends", () => {
    setupTimeline({
      autoSkipVoids: true,
      audioRanges: [
        [0, 10_000],
        [42_000, 52_000],
      ],
      images: [{ timeMs: 12_000, name: "Held photo" }],
      settings: {
        imageDisplaySeconds: 2,
        imageHoldSeconds: 18,
        compositionIntervalSeconds: 60,
        snapToGrid: false,
      },
    });

    const { container } = renderWithProviders(<Timeline />);
    const cuts = container.querySelectorAll(".timeline__void-cut");

    expect(cuts).toHaveLength(1);
    expect(cuts[0]).toHaveAttribute("data-start-ms", "32000");
    expect(cuts[0]).toHaveAttribute("data-end-ms", "42000");
  });

  it("keeps cut markers based on actual photo hold windows, not composition alignment", () => {
    setupTimeline({
      autoSkipVoids: true,
      audioRanges: [
        [0, 10_000],
        [140_000, 150_000],
      ],
      images: [
        { timeMs: 12_000, name: "First photo" },
        { timeMs: 80_000, name: "Second photo" },
      ],
      settings: {
        imageDisplaySeconds: 2,
        imageHoldSeconds: 18,
        compositionIntervalSeconds: 120,
        snapToGrid: false,
      },
    });

    const { container } = renderWithProviders(<Timeline />);
    const cuts = container.querySelectorAll(".timeline__void-cut");

    expect(cuts).toHaveLength(2);
    expect(cuts[0]).toHaveAttribute("data-start-ms", "32000");
    expect(cuts[0]).toHaveAttribute("data-end-ms", "80000");
    expect(cuts[1]).toHaveAttribute("data-start-ms", "100000");
    expect(cuts[1]).toHaveAttribute("data-end-ms", "140000");
  });
});
