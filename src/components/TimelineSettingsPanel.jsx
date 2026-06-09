import { useCallback, useEffect, useId, useRef } from "react";
import {
  DEFAULT_IMAGE_HOLD_MS,
  IMAGE_HOLD_MAX_MS,
  IMAGE_HOLD_MIN_MS,
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
  MIN_IMAGE_DISPLAY_MIN_MS,
} from "../media/constants.js";
import Icon from "./Icon.jsx";
import "./TimelineSettingsPanel.css";

export default function TimelineSettingsPanel({
  open,
  delayDraft,
  onDelayFocus,
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
  onExportPremiere,
  onExportZip,
  disabled,
  onClose,
  onShowKeyboardHelp,
  triggerRef,
  t,
}) {
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const delayHintId = "timeline-delay-hint";
  const imageDisplayHintId = "timeline-image-display-hint";
  const imageHoldHintId = "timeline-image-hold-hint";
  const snapGridHintId = "timeline-grid-step-hint";
  const snapGridLabelId = "timeline-grid-step-label";
  const autoSkipHintId = "timeline-auto-skip-hint";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const stopInteractiveEvent = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleDelayInputKeyDown = useCallback(
    (event) => {
      event.stopPropagation();
      onDelayKeyDown?.(event);
    },
    [onDelayKeyDown]
  );

  const handleDelayInputFocus = useCallback(
    (event) => {
      event.stopPropagation();
      onDelayFocus?.(event);
    },
    [onDelayFocus]
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const requestFrame =
      typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
    const cancelFrame =
      typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout;
    const restoreFocusTarget = triggerRef?.current;

    const focusFrame = requestFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      onCloseRef.current?.();
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      cancelFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (restoreFocusTarget && typeof restoreFocusTarget.focus === "function") {
        requestFrame(() => {
          restoreFocusTarget.focus({ preventScroll: true });
        });
      }
    };
  }, [open, triggerRef]);

  if (!open) {
    return null;
  }

  return (
    <aside
      id="timeline-settings-panel"
      className="timeline-settings-panel"
      aria-labelledby={titleId}
      role="complementary"
      onClick={stopInteractiveEvent}
      onKeyDown={stopInteractiveEvent}
      onPointerDown={stopInteractiveEvent}
    >
      <header className="timeline-settings-panel__header">
        <div className="timeline-settings-panel__title-group">
          <h2 className="timeline-settings-panel__title" id={titleId}>
            {t("timelineSettingsTitle")}
          </h2>
          <p className="timeline-settings-panel__subtitle">{t("timelineSettingsSubtitle")}</p>
        </div>
        <button
          type="button"
          className="timeline-settings-panel__close"
          ref={closeButtonRef}
          aria-label={t("closeButton")}
          onClick={onClose}
        >
          <Icon name="close" size={20} />
        </button>
      </header>
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
            aria-describedby={delayHintId}
            onFocus={handleDelayInputFocus}
            onChange={onDelayChange}
            onBlur={onCommitDelay}
            onKeyDown={handleDelayInputKeyDown}
          />
          <span className="timeline-settings__hint" id={delayHintId}>
            {t("timelineSettingsDelayHint")}
          </span>
        </div>

        <div className="timeline-settings__compact-grid">
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
                aria-describedby={imageDisplayHintId}
                onChange={(event) => onImageDisplayChange(event.target.value)}
              />
              <span className="timeline-settings__unit">s</span>
            </div>
            <span className="timeline-settings__hint" id={imageDisplayHintId}>
              {t("timelineSettingsImageDisplayHint", {
                min: Math.round(MIN_IMAGE_DISPLAY_MIN_MS / 1000),
                default: Math.round(MIN_IMAGE_DISPLAY_DEFAULT_MS / 1000),
              })}
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
                aria-describedby={imageHoldHintId}
                onChange={(event) => onImageHoldChange(event.target.value)}
              />
              <span className="timeline-settings__unit">s</span>
            </div>
            <span className="timeline-settings__hint" id={imageHoldHintId}>
              {t("timelineSettingsImageHoldHint", {
                min: Math.round(IMAGE_HOLD_MIN_MS / 1000),
                max: Math.round(IMAGE_HOLD_MAX_MS / 1000),
                default: Math.round(DEFAULT_IMAGE_HOLD_MS / 1000),
              })}
            </span>
          </div>
        </div>

        <div className="timeline-settings__group">
          <div className="timeline-settings__snap-row">
            <label
              className="timeline-settings__toggle"
              title={t("timelineSettingsSnapToGridHint")}
            >
              <input
                type="checkbox"
                checked={!!snapToGrid}
                onChange={(e) => onToggleSnapToGrid?.(e.target.checked)}
              />
              <span>{t("timelineSettingsSnapToGrid")}</span>
            </label>
            <label
              className="visually-hidden"
              htmlFor="timeline-grid-step-input"
              id={snapGridLabelId}
            >
              {t("timelineSettingsSnapGridStep")}
            </label>
            <input
              id="timeline-grid-step-input"
              className="timeline-settings__step-input"
              type="number"
              min="1"
              step="1"
              value={String(snapGridSeconds ?? "1")}
              aria-labelledby={snapGridLabelId}
              aria-describedby={snapGridHintId}
              onChange={(e) => onSnapGridSecondsChange?.(e.target.value)}
              disabled={!snapToGrid}
            />
          </div>
          <span className="timeline-settings__hint" id={snapGridHintId}>
            {t("timelineSettingsSnapToGridHint")}
          </span>
        </div>

        <div className="timeline-settings__toggle-grid">
          <label className="timeline-settings__toggle" title={t("tooltipAutoSkip")}>
            <input
              type="checkbox"
              checked={autoSkipVoids}
              aria-describedby={autoSkipHintId}
              onChange={(event) => onToggleAutoSkipVoids(event.target.checked)}
            />
            <span>{t("tooltipAutoSkipCheckbox")}</span>
          </label>

          <label className="timeline-settings__toggle" title={t("tooltipShowClock")}>
            <input
              type="checkbox"
              checked={showClock}
              onChange={(event) => onToggleShowClock(event.target.checked)}
            />
            <span>{t("showClockLabel")}</span>
          </label>
          <span className="timeline-settings__hint timeline-settings__toggle-hint" id={autoSkipHintId}>
            {t("timelineSettingsAutoSkipHint")}
          </span>
        </div>

        <div className="timeline-settings__group timeline-settings__exports">
          <button
            type="button"
            className="timeline-settings__action"
            onClick={onExportPremiere}
            disabled={disabled}
          >
            <Icon name="archive" size={17} />
            <span>{t("timelineSettingsExportPremiere")}</span>
          </button>
          <button
            type="button"
            className="timeline-settings__action"
            onClick={onExportXml}
            disabled={disabled}
          >
            <Icon name="document" size={17} />
            <span>{t("timelineSettingsExportXmlOnly")}</span>
          </button>
          <button
            type="button"
            className="timeline-settings__action"
            onClick={onExportZip}
            disabled={disabled}
          >
            <Icon name="archive" size={17} />
            <span>{t("timelineSettingsExportZip")}</span>
          </button>
          <span className="timeline-settings__hint timeline-settings__export-hint">
            {t("timelineSettingsPremiereRelinkHint")}
          </span>
        </div>

        <div className="timeline-settings__group timeline-settings__group--footer">
          <button type="button" className="timeline-settings__link" onClick={onShowKeyboardHelp}>
            <Icon name="keyboard" size={18} className="timeline-settings__link-icon" />
            {t("timelineSettingsKeyboardHelp")}
          </button>
        </div>
      </div>
    </aside>
  );
}
