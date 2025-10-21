import { useEffect, useState, useCallback } from "react";
import Modal from "./Modal.jsx";
import { DEFAULT_IMAGE_HOLD_MS, MIN_IMAGE_DISPLAY_DEFAULT_MS } from "../media/constants.js";
import Icon from "./Icon.jsx";
import "./TimelineSettingsPanel.css";

export default function TimelineSettingsPanel({
  open,
  anchorRef,
  delayDraft,
  onDelayChange,
  onCommitDelay,
  onDelayKeyDown,
  imageDisplaySeconds,
  onImageDisplayChange,
  imageHoldSeconds,
  onImageHoldChange,
  snapToGrid,
  onToggleSnapToGrid,
  snapGridSeconds,
  onSnapGridSecondsChange,
  autoSkipVoids,
  onToggleAutoSkipVoids,
  showClock,
  onToggleShowClock,
  onExportXml,
  onExportZip,
  disabled,
  onClose,
  onShowKeyboardHelp,
  t,
}) {
  const [positionStyle, setPositionStyle] = useState(null);

  const updatePosition = useCallback(() => {
    if (!anchorRef?.current) {
      setPositionStyle(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    const gap = 12;
    const top = Math.max(rect.top - gap, 16);
    const right = Math.max(window.innerWidth - rect.right - 16, 16);
    setPositionStyle({
      position: "absolute",
      top: `${top}px`,
      right: `${right}px`,
      transform: "translateY(-100%)",
    });
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return undefined;

    // Initial position update - synchronizing position with DOM layout
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("timelineSettingsTitle")}
      subtitle={t("timelineSettingsSubtitle")}
      icon={<Icon name="document" size={20} />}
      size="sm"
      variant="panel"
      style={positionStyle}
    >
      <div className="timeline-settings">
        <div className="timeline-settings__group">
          <label className="timeline-settings__label" htmlFor="timeline-delay-input">
            {t("delayControl")}
          </label>
          <input
            id="timeline-delay-input"
            type="text"
            value={delayDraft}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0:00"
            onChange={onDelayChange}
            onBlur={onCommitDelay}
            onKeyDown={onDelayKeyDown}
          />
          <span className="timeline-settings__hint">{t("timelineSettingsDelayHint")}</span>
        </div>

        <div className="timeline-settings__group">
          <label className="timeline-settings__label" htmlFor="timeline-image-display-input">
            {t("timelineSettingsImageDisplay")}
          </label>
          <div className="timeline-settings__input-with-unit">
            <input
              id="timeline-image-display-input"
              type="number"
              min="1"
              step="1"
              value={imageDisplaySeconds}
              onChange={(event) => onImageDisplayChange(event.target.value)}
            />
            <span className="timeline-settings__unit">s</span>
          </div>
          <span className="timeline-settings__hint">
            {t("timelineSettingsImageDisplayHint")} · Default: {Math.round(MIN_IMAGE_DISPLAY_DEFAULT_MS / 1000)}s
          </span>
        </div>

        <div className="timeline-settings__group">
          <label className="timeline-settings__label" htmlFor="timeline-image-hold-input">
            {t("timelineSettingsImageHold")}
          </label>
          <div className="timeline-settings__input-with-unit">
            <input
              id="timeline-image-hold-input"
              type="number"
              min="0"
              max="180"
              step="1"
              value={imageHoldSeconds}
              onChange={(event) => onImageHoldChange(event.target.value)}
            />
            <span className="timeline-settings__unit">s</span>
          </div>
          <span className="timeline-settings__hint">
            {t("timelineSettingsImageHoldHint")} · Default: {Math.round(DEFAULT_IMAGE_HOLD_MS / 1000)}s
          </span>
        </div>

        <div className="timeline-settings__group">
          <label className="timeline-settings__toggle" title="Snap images to time grid">
            <input
              type="checkbox"
              checked={!!snapToGrid}
              onChange={(e) => onToggleSnapToGrid?.(e.target.checked)}
            />
            <span>Snap to grid</span>
          </label>
          <div className="timeline-settings__input-with-unit" style={{ marginTop: 6 }}>
            <input
              id="timeline-grid-step-input"
              type="number"
              min="1"
              step="1"
              value={String(snapGridSeconds ?? "1")}
              onChange={(e) => onSnapGridSecondsChange?.(e.target.value)}
              disabled={!snapToGrid}
            />
            <span className="timeline-settings__unit">s</span>
          </div>
          <span className="timeline-settings__hint">Align image times to nearest grid line for tighter sync.</span>
        </div>

        <div className="timeline-settings__group">
          <label className="timeline-settings__toggle" title={t("tooltipAutoSkip")}>
            <input
              type="checkbox"
              checked={autoSkipVoids}
              onChange={(event) => onToggleAutoSkipVoids(event.target.checked)}
            />
            <span>{t("tooltipAutoSkipCheckbox")}</span>
          </label>
        </div>

        <div className="timeline-settings__group">
          <label className="timeline-settings__toggle" title={t("tooltipShowClock")}>
            <input
              type="checkbox"
              checked={showClock}
              onChange={(event) => onToggleShowClock(event.target.checked)}
            />
            <span>{t("showClockLabel")}</span>
          </label>
        </div>

        <div className="timeline-settings__group timeline-settings__exports">
          <button
            type="button"
            className="timeline-settings__action"
            onClick={onExportXml}
            disabled={disabled}
          >
            <span aria-hidden="true">📋</span>
            <span>{t("timelineSettingsExportXml")}</span>
          </button>
          <button
            type="button"
            className="timeline-settings__action"
            onClick={onExportZip}
            disabled={disabled}
          >
            <span aria-hidden="true">📦</span>
            <span>{t("timelineSettingsExportZip")}</span>
          </button>
        </div>

        <div className="timeline-settings__group timeline-settings__group--footer">
          <button type="button" className="timeline-settings__link" onClick={onShowKeyboardHelp}>
            <Icon name="keyboard" size={18} className="timeline-settings__link-icon" />
            {t("timelineSettingsKeyboardHelp")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
