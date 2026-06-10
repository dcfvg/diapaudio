import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/test-utils.jsx";
import TimelineSettingsPanel from "../TimelineSettingsPanel.jsx";

function makeProps(overrides = {}) {
  return {
    open: true,
    delayDraft: "0:00",
    onDelayFocus: vi.fn(),
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

  it("keeps focus in the delay input across rerenders while already open", async () => {
    const { rerender } = renderWithProviders(<TimelineSettingsPanel {...makeProps()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "closeButton" })).toHaveFocus());

    const delayInput = screen.getByLabelText("delayControl");
    delayInput.focus();
    expect(delayInput).toHaveFocus();

    rerender(<TimelineSettingsPanel {...makeProps({ onClose: vi.fn() })} />);

    await waitFor(() => expect(delayInput).toHaveFocus());
  });

  it("reports delay input focus before editing", () => {
    const onDelayFocus = vi.fn();

    renderWithProviders(<TimelineSettingsPanel {...makeProps({ onDelayFocus })} />);

    fireEvent.focus(screen.getByLabelText("delayControl"));

    expect(onDelayFocus).toHaveBeenCalledTimes(1);
  });

  it("keeps delay input keyboard events inside the settings panel", () => {
    const onDelayKeyDown = vi.fn();
    const onParentKeyDown = vi.fn();

    renderWithProviders(
      <div onKeyDown={onParentKeyDown}>
        <TimelineSettingsPanel {...makeProps({ onDelayKeyDown })} />
      </div>
    );

    fireEvent.keyDown(screen.getByLabelText("delayControl"), { key: " " });

    expect(onDelayKeyDown).toHaveBeenCalledTimes(1);
    expect(onParentKeyDown).not.toHaveBeenCalled();
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
    expect(screen.getByLabelText("tooltipAutoSkipCheckbox")).toHaveAttribute(
      "aria-describedby",
      "timeline-auto-skip-hint"
    );
  });

  it("includes a language selector in the settings panel", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TimelineSettingsPanel {...makeProps()} />);

    const select = screen.getByRole("combobox", { name: "Language" });

    expect(select).toHaveAttribute("id", "timeline-settings-language-select");
    expect(select).toHaveValue("en");

    await user.selectOptions(select, "fr");

    expect(select).toHaveValue("fr");

    await user.selectOptions(select, "en");
  });

  it("does not render while closed", () => {
    renderWithProviders(<TimelineSettingsPanel {...makeProps({ open: false })} />);

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
