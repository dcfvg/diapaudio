import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector.jsx";
import Icon from "./Icon.jsx";
import "../styles/loader.css";
import "./Dropzone.css";
import { sanitizeHtml } from "../utils/sanitizeHtml.js";
import { useDropzone } from "react-dropzone";

function formatSampleSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes)) {
    return null;
  }

  const megabytes = sizeBytes / 1024 / 1024;
  return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}

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
  sampleManifest,
  sampleLoading,
  onBrowseClick,
  onFileSelection,
  onLoadLocalSample,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
}) {
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);

  const openPreview = useCallback(() => {
    setPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  useEffect(() => {
    if (!previewOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closePreview();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePreview, previewOpen]);

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
  const sampleOptions = Array.isArray(sampleManifest?.samples) ? sampleManifest.samples : [];

  const accept = useMemo(
    () => ({
      "image/*": [".jpg", ".jpeg", ".png", ".gif"],
      "audio/*": [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"],
      "application/zip": [".zip"],
    }),
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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

  const importActionsClassName = useMemo(
    () => [dropzoneCtaClassName, "dropzone__primary-actions"].filter(Boolean).join(" "),
    [dropzoneCtaClassName]
  );

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
    [
      sanitizedStepTitle1,
      sanitizedStepTitle2,
      sanitizedStepTitle3,
      sanitizedStepText1,
      sanitizedStepText2,
    ]
  );

  const importActions = (
    <div className={importActionsClassName} role="group" aria-label={t("importActionsLabel")}>
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
      {sampleOptions.length ? (
        <div className="dropzone__sample">
          <span className="dropzone__sample-title">{t("localSamplesTitle")}</span>
          <div className="dropzone__sample-options">
            {sampleOptions.map((sample) => {
              const sampleSizeText = formatSampleSize(sample.sizeBytes);
              return (
                <button
                  key={sample.id || sample.sampleUrl || sample.fileName}
                  type="button"
                  className="dropzone__sample-button"
                  onClick={() => onLoadLocalSample(sample)}
                  disabled={isLoading || sampleLoading}
                  aria-label={t("loadNamedLocalSample", { name: sample.fileName })}
                >
                  <Icon name="archive" size={16} className="dropzone__sample-icon" />
                  <span className="dropzone__sample-name">{sample.fileName}</span>
                  {sampleSizeText ? (
                    <span className="dropzone__sample-meta">{sampleSizeText}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
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
        <div className="dropzone__intro">
          <div className="dropzone__intro-copy">
            <div className="dropzone__hero">
              <div className="dropzone__logo-wrap" aria-hidden="true">
                <img
                  src={`${import.meta.env.BASE_URL}logo.svg`}
                  alt=""
                  className="dropzone__logo dropzone__logo--large"
                />
              </div>
              <h1 className="dropzone__title">{t("appTitle")}</h1>
              <p className="dropzone__lead">{t("tagline")}</p>
            </div>

            {importActions}
          </div>
          <figure className="dropzone__preview">
            <button
              type="button"
              className="dropzone__preview-button"
              onClick={openPreview}
              aria-label={t("openProductPreview")}
            >
              <img
                src={`${import.meta.env.BASE_URL}screenshot.webp`}
                alt={t("productPreviewAlt")}
                className="dropzone__preview-image"
                width="3002"
                height="2104"
              />
            </button>
            <figcaption className="visually-hidden">{t("productPreviewCaption")}</figcaption>
          </figure>
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
      {previewOpen ? (
        <div
          className="dropzone__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("productPreviewCaption")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePreview();
            }
          }}
        >
          <button type="button" className="dropzone__lightbox-close" onClick={closePreview}>
            <span className="visually-hidden">{t("closeProductPreview")}</span>
            <Icon name="close" size={22} />
          </button>
          <img
            src={`${import.meta.env.BASE_URL}screenshot.webp`}
            alt={t("productPreviewAlt")}
            className="dropzone__lightbox-image"
            width="3002"
            height="2104"
            onClick={closePreview}
          />
        </div>
      ) : null}
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
