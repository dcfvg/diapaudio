import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils.jsx";
import TimelineSettingsPanel from "../TimelineSettingsPanel.jsx";

function makeProps(overrides = {}) {
  return {
    open: true,
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

describe("TimelineSettingsPanel", () => {
  it("renders as a right-side panel without modal overlay behavior", () => {
    renderWithProviders(<TimelineSettingsPanel {...makeProps()} />);

    const panel = screen.getByRole("complementary", { name: "timelineSettingsTitle" });

    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass("timeline-settings-panel");
    expect(document.body.querySelector(".modal-overlay")).not.toBeInTheDocument();
    expect(document.body.querySelector(".timeline-settings-modal")).not.toBeInTheDocument();
  });

  it("keeps close action accessible from the panel header", () => {
    const onClose = vi.fn();

    renderWithProviders(<TimelineSettingsPanel {...makeProps({ onClose })} />);

    fireEvent.click(screen.getByRole("button", { name: "closeButton" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus to close on open and closes with Escape", async () => {
    const onClose = vi.fn();

    renderWithProviders(<TimelineSettingsPanel {...makeProps({ onClose })} />);

    const closeButton = screen.getByRole("button", { name: "closeButton" });
    await waitFor(() => expect(closeButton).toHaveFocus());

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the trigger when unmounted", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const triggerRef = { current: trigger };

    const { unmount } = renderWithProviders(
      <TimelineSettingsPanel {...makeProps({ triggerRef })} />
    );

    unmount();

    await waitFor(() => expect(trigger).toHaveFocus());
    trigger.remove();
  });

  it("labels numeric hints and the grid step input", () => {
    renderWithProviders(<TimelineSettingsPanel {...makeProps()} />);

    expect(screen.getByLabelText("timelineSettingsSnapGridStep")).toHaveAttribute(
      "aria-describedby",
      "timeline-grid-step-hint"
    );
    expect(screen.getByLabelText("timelineSettingsImageDisplay")).toHaveAttribute(
      "aria-describedby",
      "timeline-image-display-hint"
    );
    expect(screen.getByLabelText("timelineSettingsImageHold")).toHaveAttribute(
      "aria-describedby",
      "timeline-image-hold-hint"
    );
  });

  it("does not render while closed", () => {
    renderWithProviders(<TimelineSettingsPanel {...makeProps({ open: false })} />);

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
