import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils.jsx";
import TimelineSettingsPanel from "../TimelineSettingsPanel.jsx";

const DEFAULT_WIDTH = window.innerWidth;
const DEFAULT_HEIGHT = window.innerHeight;

function setViewport(width, height) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height,
  });
}

function makeProps(overrides = {}) {
  return {
    open: true,
    anchorRef: {
      current: {
        getBoundingClientRect: () => ({ top: 600, right: 360 }),
      },
    },
    delayDraft: "0:00",
    onDelayChange: vi.fn(),
    onCommitDelay: vi.fn(),
    onDelayKeyDown: vi.fn(),
    imageDisplaySeconds: "6",
    onImageDisplayChange: vi.fn(),
    imageHoldSeconds: "45",
    onImageHoldChange: vi.fn(),
    snapToGrid: true,
    onToggleSnapToGrid: vi.fn(),
    snapGridSeconds: 1,
    onSnapGridSecondsChange: vi.fn(),
    autoSkipVoids: false,
    onToggleAutoSkipVoids: vi.fn(),
    showClock: true,
    onToggleShowClock: vi.fn(),
    onExportXml: vi.fn(),
    onExportPremiere: vi.fn(),
    onExportZip: vi.fn(),
    disabled: false,
    onClose: vi.fn(),
    onShowKeyboardHelp: vi.fn(),
    t: (key) => key,
    ...overrides,
  };
}

afterEach(() => {
  setViewport(DEFAULT_WIDTH, DEFAULT_HEIGHT);
});

describe("TimelineSettingsPanel responsive positioning", () => {
  it("uses a fixed bottom-sheet position on narrow viewports", async () => {
    setViewport(390, 844);

    renderWithProviders(<TimelineSettingsPanel {...makeProps()} />);

    await waitFor(() => {
      const panel = document.body.querySelector(".timeline-settings-modal");
      expect(panel).toBeInTheDocument();
      expect(panel.style.position).toBe("fixed");
      expect(panel.style.left).toBe("8px");
      expect(panel.style.right).toBe("8px");
      expect(panel.style.bottom).toBe("8px");
      expect(panel.style.transform).toBe("none");
      expect(panel.style.maxWidth).toBe("none");
    });
  });

  it("keeps anchor-relative positioning on roomy viewports", async () => {
    setViewport(1280, 720);

    renderWithProviders(<TimelineSettingsPanel {...makeProps()} />);

    await waitFor(() => {
      const panel = document.body.querySelector(".timeline-settings-modal");
      expect(panel).toBeInTheDocument();
      expect(panel.style.position).toBe("absolute");
      expect(panel.style.top).toBe("588px");
      expect(panel.style.right).toBe("904px");
      expect(panel.style.transform).toBe("translateY(-100%)");
    });
  });
});
