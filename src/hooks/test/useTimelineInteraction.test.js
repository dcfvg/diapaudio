import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTimelineInteraction } from '../useTimelineInteraction.js';

function makeProps(overrides = {}) {
  const image = { name: 'Held photo', url: 'blob:held-photo' };
  return {
    containerRef: {
      current: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 1000,
          height: 100,
        }),
      },
    },
    interactionRef: { current: {} },
    viewStartMs: 0,
    viewDurationMs: 52_000,
    timeline: { trackRanges: [] },
    imageSegments: [
      {
        startMs: 12_000,
        endMs: 32_000,
        layoutSize: 1,
        slots: [0],
      },
    ],
    images: [image],
    seekToAbsolute: vi.fn(),
    playing: false,
    snapToMedia: (value) => value,
    findTrackAtTime: () => '',
    ...overrides,
  };
}

function clientXForMs(ms) {
  return (ms / 52_000) * 1000;
}

describe('useTimelineInteraction', () => {
  it('uses short preview image entries when provided', () => {
    const image = { name: 'Held photo', url: 'blob:held-photo' };
    const props = makeProps({
      images: [image],
      previewImageEntries: [
        {
          image,
          index: 0,
          startMs: 12_000,
          endMs: 14_000,
          slotIndex: 0,
          maxConcurrency: 1,
        },
      ],
    });
    const { result } = renderHook(() => useTimelineInteraction(props));

    let hoverAt13s;
    act(() => {
      hoverAt13s = result.current.updateHover(clientXForMs(13_000), { applySnap: false });
    });

    expect(hoverAt13s.images).toEqual([image]);
    expect(hoverAt13s.previewLayout.slots[0]?.image).toBe(image);

    let hoverAt20s;
    act(() => {
      hoverAt20s = result.current.updateHover(clientXForMs(20_000), { applySnap: false });
    });

    expect(hoverAt20s.images).toEqual([]);
    expect(hoverAt20s.previewLayout.slots).toEqual([]);
  });

  it('keeps held segment previews when short entries are not provided', () => {
    const props = makeProps();
    const { result } = renderHook(() => useTimelineInteraction(props));

    let hoverAt20s;
    act(() => {
      hoverAt20s = result.current.updateHover(clientXForMs(20_000), { applySnap: false });
    });

    expect(hoverAt20s.images).toEqual([props.images[0]]);
    expect(hoverAt20s.previewLayout.slots[0]?.image).toBe(props.images[0]);
  });
});
