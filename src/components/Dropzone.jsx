import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector.jsx";
import Icon from "./Icon.jsx";
import "../styles/loader.css";
import "./Dropzone.css";
import { sanitizeHtml } from "../utils/sanitizeHtml.js";
import { useDropzone } from "react-dropzone";

function Dropzone({
  className,
  isLoading,
  dropzoneCtaClassName,
  dropzoneBodyClassName,
  dropzoneLoaderClassName,
  loaderBarStyle,
  loaderStatusText,
  loaderDetails,
  loaderDetailsIsHtml,
  progressPercent,
  folderInputRef,
  zipInputRef,
  filesInputRef,
  onBrowseClick,
  onFileSelection,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
}) {
  const { t } = useTranslation();

  // const sanitizedDropMessage = dropMessageIsHtml ? sanitizeHtml(dropMessage) : null;

  const sanitizedLoaderDetails = loaderDetailsIsHtml ? sanitizeHtml(loaderDetails) : null;
  const loaderDetailsProps = loaderDetailsIsHtml
    ? { dangerouslySetInnerHTML: { __html: sanitizedLoaderDetails } }
    : { children: loaderDetails };

  const sanitizedStepTitle1 = sanitizeHtml(t("step1Title"));
  const sanitizedStepTitle2 = sanitizeHtml(t("step2Title"));
  const sanitizedStepTitle3 = sanitizeHtml(t("step3Title"));
  const sanitizedStepText1 = sanitizeHtml(t("step1Text"));
  const sanitizedStepText2 = sanitizeHtml(t("step2Text"));
  const sanitizedNotePrivacy = sanitizeHtml(t("notePrivacy"));

  const progressValue = Number.isFinite(progressPercent)
    ? Math.max(0, Math.min(100, progressPercent))
    : undefined;

  const accept = useMemo(
    () => ({
      "image/*": [".jpg", ".jpeg", ".png", ".gif"],
      "audio/*": [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"],
      "application/zip": [".zip"],
    }),
    []
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    noClick: true,
    multiple: true,
    accept,
  });

  const rootProps = getRootProps({
    // Preserve loading state attribute and custom className externally
    // className is applied on outer div below to avoid overriding react-dropzone handlers
    onDragEnd: (event) => {
      try {
        onDragEnd?.(event);
      } catch {
        /* noop */
      }
    },
    onDrop: (event) => {
      // Ensure external tests and handlers see the native drop event regardless of react-dropzone internals
      try {
        onDrop?.(event);
      } catch {
        /* noop */
      }
    },
    onDragEnter: (event) => {
      try {
        onDragEnter?.(event);
      } catch {
        /* noop */
      }
    },
    onDragOver: (event) => {
      try {
        onDragOver?.(event);
      } catch {
        /* noop */
      }
    },
    onDragLeave: (event) => {
      try {
        onDragLeave?.(event);
      } catch {
        /* noop */
      }
    },
  });

  const effectiveClassName = useMemo(() => {
    // Keep existing className contract; also reflect react-dropzone's isDragActive
    if (typeof className === "string" && className.includes("hidden")) return className;
    if (isDragActive && className && !className.includes("dragover")) {
      return `${className} dragover`;
    }
    return className;
  }, [className, isDragActive]);

  const stepItems = useMemo(
    () => [
      {
        icon: "folder",
        html: `<strong>${sanitizedStepTitle1}</strong> ${sanitizedStepText1}`,
      },
      {
        icon: "timer",
        html: `<strong>${sanitizedStepTitle2}</strong> ${sanitizedStepText2}`,
      },
      {
        icon: "upload",
        html: `<strong>${sanitizedStepTitle3}</strong>`,
      },
    ],
    [sanitizedStepTitle1, sanitizedStepTitle2, sanitizedStepTitle3, sanitizedStepText1, sanitizedStepText2]
  );

  return (
    <div
      {...rootProps}
      className={effectiveClassName}
      id="dropzone"
      data-loading={isLoading ? "true" : undefined}
    >
      <div className="dropzone__content">
        <div className="dropzone__language-selector">
          <LanguageSelector />
        </div>
        <div className="dropzone__hero">
          <h1 className="dropzone__title">{t("appTitle")}</h1>
          <p className="dropzone__lead">{t("tagline")}</p>
        </div>

        <div className="dropzone__assist" aria-label={t("stepsTitle")}>
          <ol className="dropzone__steps">
            {stepItems.map((step, index) => (
              <li className="dropzone__step" key={`dropzone-step-${index}`}>
                <span className="dropzone__step-icon" aria-hidden="true">
                  <Icon name={step.icon} size={20} />
                </span>
                <p
                  className="dropzone__step-summary"
                  dangerouslySetInnerHTML={{ __html: step.html }}
                />
                {index === 2 && (
                  <div className={dropzoneCtaClassName} role="group" aria-label={t("dropMessage")}>
                    <div className="dropzone__buttons">
                      <button
                        type="button"
                        className="dropzone__browse"
                        id="browse-folder"
                        onClick={() => onBrowseClick(folderInputRef)}
                      >
                        <Icon name="folder" size={18} className="dropzone__browse-icon" />
                        {t("buttonFolder")}
                      </button>
                      <button
                        type="button"
                        className="dropzone__browse"
                        id="browse-zip"
                        onClick={() => onBrowseClick(zipInputRef)}
                      >
                        <Icon name="archive" size={18} className="dropzone__browse-icon" />
                        {t("buttonZip")}
                      </button>
                      <button
                        type="button"
                        className="dropzone__browse"
                        id="browse-files"
                        onClick={() => onBrowseClick(filesInputRef)}
                      >
                        <Icon name="document" size={18} className="dropzone__browse-icon" />
                        {t("buttonFiles")}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className={dropzoneBodyClassName}>
          <p
            className="dropzone__note"
            dangerouslySetInnerHTML={{ __html: sanitizedNotePrivacy }}
          />
        </div>

        <div className={dropzoneLoaderClassName} id="dropzone-loader">
          <div className="loader-spinner"></div>
          <p id="loader-status" role="status" aria-live="polite">
            {loaderStatusText}
          </p>
          <div className="loader-progress">
            <div
              className="loader-progress-bar"
              id="loader-progress-bar"
              style={loaderBarStyle}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressValue}
              aria-live="polite"
            ></div>
          </div>
          <p
            className="loader-details"
            id="loader-details"
            aria-live="polite"
            {...loaderDetailsProps}
          ></p>
        </div>
      </div>
      {/* Hidden input used by react-dropzone (noClick true prevents triggering on click) */}
      <input {...getInputProps()} hidden />
      <input
        type="file"
        webkitdirectory="true"
        /* eslint-disable-next-line react/no-unknown-property */
        directory="true"
        multiple
        id="folder-input"
        hidden
        ref={folderInputRef}
        onChange={onFileSelection}
      />
      <input
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        id="zip-input"
        multiple
        hidden
        ref={zipInputRef}
        onChange={onFileSelection}
      />
      <input
        type="file"
        accept="audio/*,image/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.jpg,.jpeg,.png,.gif,.zip,application/zip,application/x-zip-compressed"
        multiple
        id="files-input"
        hidden
        ref={filesInputRef}
        onChange={onFileSelection}
      />
    </div>
  );
}

export default memo(Dropzone);
