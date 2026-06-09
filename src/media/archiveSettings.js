import { DEFAULT_SPEED } from "../constants/playback.js";
import {
  DEFAULT_IMAGE_HOLD_MS,
  IMAGE_HOLD_MAX_MS,
  IMAGE_HOLD_MIN_MS,
  MAX_COMPOSITION_CHANGE_INTERVAL_MS,
  MIN_COMPOSITION_CHANGE_INTERVAL_MS,
  MIN_IMAGE_DISPLAY_DEFAULT_MS,
  MIN_IMAGE_DISPLAY_MIN_MS,
} from "./constants.js";

export const ARCHIVE_SETTINGS_FILE_NAME = "_settings.yml";
export const ARCHIVE_SETTINGS_ALTERNATE_FILE_NAME = "_settings.yaml";
export const ARCHIVE_SETTINGS_VERSION = 1;

const YAML_KEY_BY_SETTING = {
  speed: "speed",
  autoSkipVoids: "skip_blanks",
  snapToGrid: "align_photos",
  snapGridSeconds: "grid_step_seconds",
  imageDisplaySeconds: "minimum_photo_time_seconds",
  imageHoldSeconds: "keep_last_photo_seconds",
  compositionIntervalSeconds: "composition_change_seconds",
  showClock: "show_clock",
  clockMode: "clock_mode",
  timelinePinned: "timeline_pinned",
};

const SETTING_KEY_BY_YAML_KEY = Object.freeze({
  vitesse: "speed",
  speed: "speed",
  skip_blanks: "autoSkipVoids",
  sauter_passages_sans_media: "autoSkipVoids",
  autoSkipVoids: "autoSkipVoids",
  ignorer_les_blancs: "autoSkipVoids",
  align_photos: "snapToGrid",
  aligner_photos: "snapToGrid",
  snapToGrid: "snapToGrid",
  grid_step_seconds: "snapGridSeconds",
  pas_grille_secondes: "snapGridSeconds",
  snapGridSeconds: "snapGridSeconds",
  minimum_photo_time_seconds: "imageDisplaySeconds",
  temps_minimum_photo_secondes: "imageDisplaySeconds",
  imageDisplaySeconds: "imageDisplaySeconds",
  keep_last_photo_seconds: "imageHoldSeconds",
  garder_derniere_photo_secondes: "imageHoldSeconds",
  imageHoldSeconds: "imageHoldSeconds",
  composition_change_seconds: "compositionIntervalSeconds",
  changement_composition_secondes: "compositionIntervalSeconds",
  compositionIntervalSeconds: "compositionIntervalSeconds",
  show_clock: "showClock",
  afficher_horloge: "showClock",
  showClock: "showClock",
  clock_mode: "clockMode",
  mode_horloge: "clockMode",
  clockMode: "clockMode",
  timeline_pinned: "timelinePinned",
  timeline_epinglee: "timelinePinned",
  timelinePinned: "timelinePinned",
});

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function clampRoundedSeconds(value, minMs, maxMs = Number.POSITIVE_INFINITY) {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return null;
  }
  const clampedMs = Math.min(Math.max(numeric * 1000, minMs), maxMs);
  return Math.round(clampedMs / 1000);
}

export function isArchiveSettingsFileName(fileName) {
  const normalized = String(fileName || "").toLowerCase();
  return (
    normalized === ARCHIVE_SETTINGS_FILE_NAME ||
    normalized === ARCHIVE_SETTINGS_ALTERNATE_FILE_NAME
  );
}

export function normalizeArchiveSettings(input) {
  const source = input?.settings && typeof input.settings === "object" ? input.settings : input;
  if (!source || typeof source !== "object") {
    return null;
  }

  const settings = {};

  const speed = toFiniteNumber(source.speed);
  if (speed != null && speed > 0) {
    settings.speed = speed;
  }

  const autoSkipVoids = toBoolean(source.autoSkipVoids);
  if (autoSkipVoids != null) {
    settings.autoSkipVoids = autoSkipVoids;
  }

  const snapToGrid = toBoolean(source.snapToGrid);
  if (snapToGrid != null) {
    settings.snapToGrid = snapToGrid;
  }

  const snapGridSeconds = clampRoundedSeconds(source.snapGridSeconds, 1000);
  if (snapGridSeconds != null) {
    settings.snapGridSeconds = snapGridSeconds;
  }

  const imageDisplaySeconds = clampRoundedSeconds(
    source.imageDisplaySeconds,
    MIN_IMAGE_DISPLAY_MIN_MS
  );
  if (imageDisplaySeconds != null) {
    settings.imageDisplaySeconds = imageDisplaySeconds;
  }

  const imageHoldSeconds = clampRoundedSeconds(
    source.imageHoldSeconds,
    IMAGE_HOLD_MIN_MS,
    IMAGE_HOLD_MAX_MS
  );
  if (imageHoldSeconds != null) {
    settings.imageHoldSeconds = imageHoldSeconds;
  }

  const compositionIntervalSeconds = clampRoundedSeconds(
    source.compositionIntervalSeconds,
    MIN_COMPOSITION_CHANGE_INTERVAL_MS
  );
  if (compositionIntervalSeconds != null) {
    settings.compositionIntervalSeconds = compositionIntervalSeconds;
  }

  const showClock = toBoolean(source.showClock);
  if (showClock != null) {
    settings.showClock = showClock;
  }

  if (source.clockMode === "analog" || source.clockMode === "digital") {
    settings.clockMode = source.clockMode;
  }

  const timelinePinned = toBoolean(source.timelinePinned);
  if (timelinePinned != null) {
    settings.timelinePinned = timelinePinned;
  }

  return Object.keys(settings).length ? settings : null;
}

export function getDefaultArchiveSettings() {
  return {
    speed: DEFAULT_SPEED,
    autoSkipVoids: false,
    snapToGrid: true,
    snapGridSeconds: 2,
    imageDisplaySeconds: Math.round(MIN_IMAGE_DISPLAY_DEFAULT_MS / 1000),
    imageHoldSeconds: Math.round(DEFAULT_IMAGE_HOLD_MS / 1000),
    compositionIntervalSeconds: Math.round(MAX_COMPOSITION_CHANGE_INTERVAL_MS / 1000),
    showClock: true,
    clockMode: "digital",
    timelinePinned: false,
  };
}

export function createArchiveSettingsDocument(settings) {
  return normalizeArchiveSettings(settings) || getDefaultArchiveSettings();
}

export function serializeArchiveSettings(settings) {
  const document = createArchiveSettingsDocument(settings);
  const lines = [
    "# Diapaudio settings",
    "# Simple format: one key: value per line.",
    "# Keep _delay.txt for the audio/photo offset.",
    `version: ${ARCHIVE_SETTINGS_VERSION}`,
  ];

  Object.entries(YAML_KEY_BY_SETTING).forEach(([settingKey, yamlKey]) => {
    if (Object.prototype.hasOwnProperty.call(document, settingKey)) {
      lines.push(`${yamlKey}: ${document[settingKey]}`);
    }
  });

  return `${lines.join("\n")}\n`;
}

function stripInlineComment(value) {
  const hashIndex = value.indexOf("#");
  return hashIndex >= 0 ? value.slice(0, hashIndex).trim() : value.trim();
}

function parseScalar(value) {
  const unquoted = stripInlineComment(value).replace(/^['"]|['"]$/g, "").trim();
  const lower = unquoted.toLowerCase();
  if (["true", "yes", "oui", "on"].includes(lower)) {
    return true;
  }
  if (["false", "no", "non", "off"].includes(lower)) {
    return false;
  }
  const numeric = Number(unquoted);
  if (Number.isFinite(numeric) && unquoted !== "") {
    return numeric;
  }
  return unquoted;
}

export function parseArchiveSettings(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  const rawSettings = {};
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0) {
      return;
    }
    const rawKey = trimmed.slice(0, separatorIndex).trim();
    const settingKey = SETTING_KEY_BY_YAML_KEY[rawKey];
    if (!settingKey || settingKey === "version") {
      return;
    }
    rawSettings[settingKey] = parseScalar(trimmed.slice(separatorIndex + 1));
  });

  return normalizeArchiveSettings(rawSettings);
}

export function parseArchiveSettingsFileNameAndText(fileName, text) {
  if (!isArchiveSettingsFileName(fileName)) {
    return null;
  }
  return parseArchiveSettings(text);
}
