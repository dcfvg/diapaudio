import { AUDIO_MIME_BY_EXTENSION, IMAGE_MIME_BY_EXTENSION } from "./constants.js";

const SYSTEM_FILE_PATTERN = /(^|\/)(?:\._[^/]*|__MACOSX\/|\.ds_store$|thumbs\.db$|desktop\.ini$)/i;

export function getFilePath(file) {
  return file?.webkitRelativePath || file?.path || file?.name || "";
}

export function getBaseName(path) {
  if (!path) return "";
  const normalized = String(path).replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || normalized;
}

export function isAudioExtension(ext) {
  return AUDIO_MIME_BY_EXTENSION.has(String(ext).toLowerCase());
}

export function isImageExtension(ext) {
  return IMAGE_MIME_BY_EXTENSION.has(String(ext).toLowerCase());
}

export function isAudioFileName(name) {
  const match = /\.(\w+)$/.exec(name || "");
  if (!match) return false;
  return isAudioExtension(match[1]);
}

export function isImageFileName(name) {
  const match = /\.(\w+)$/.exec(name || "");
  if (!match) return false;
  return isImageExtension(match[1]);
}

export function getMimeType(fileName) {
  const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";
  if (AUDIO_MIME_BY_EXTENSION.has(ext)) {
    return AUDIO_MIME_BY_EXTENSION.get(ext);
  }
  if (IMAGE_MIME_BY_EXTENSION.has(ext)) {
    return IMAGE_MIME_BY_EXTENSION.get(ext);
  }
  if (ext === "txt") {
    return "text/plain";
  }
  return "application/octet-stream";
}

export function shouldSkipEntry(name) {
  if (!name) {
    return true;
  }
  const normalized = String(name).replace(/\\/g, "/");
  if (normalized.startsWith("__MACOSX/") || normalized.includes("/__MACOSX/")) {
    return true;
  }
  if (SYSTEM_FILE_PATTERN.test(normalized)) {
    return true;
  }
  return normalized.toLowerCase().includes("/thumbnails/");
}

export function isSystemFile(fileName) {
  if (!fileName) return true;
  const baseName = fileName.split("/").pop() || "";
  if (!baseName) return true;
  if (baseName.startsWith(".")) return true;
  if (baseName.startsWith("._")) return true;
  const lower = baseName.toLowerCase();
  if (lower === "thumbs.db" || lower === "desktop.ini") return true;
  return fileName.includes("__MACOSX/");
}

export function formatTrackLabel(name, index) {
  const basename = (name.split(/[/\\]/).pop() || "").replace(/\.[^.]+$/, "");
  const cleaned = basename.replace(/[_-]+/g, " ").trim();
  return cleaned || `Track ${index + 1}`;
}

export function cleanTrackNameForDisplay(name) {
  if (!name) return "";
  let cleaned = name;
  const lastSlash = Math.max(cleaned.lastIndexOf("/"), cleaned.lastIndexOf("\\"));
  if (lastSlash >= 0) {
    cleaned = cleaned.substring(lastSlash + 1);
  }
  cleaned = cleaned.replace(/\.[^.]+$/, "");

  cleaned = cleaned.replace(/\b\d{4}[\s\-./]\d{1,2}[\s\-./]\d{1,2}\b/g, "");
  cleaned = cleaned.replace(/\b\d{1,2}[\s\-./]\d{1,2}[\s\-./]\d{4}\b/g, "");
  cleaned = cleaned.replace(/\b\d{8}\b/g, "");
  cleaned = cleaned.replace(/\b\d{4}\s+\d{1,2}\s+\d{1,2}\b/g, "");
  cleaned = cleaned.replace(/\d{1,2}[.-:]\d{2}[.-:]\d{2}/g, "");
  cleaned = cleaned.replace(/\b\d{1,2}\s+\d{2}\s+\d{2}\b(?!\s*[A-Z])/g, "");
  cleaned = cleaned.replace(/\d{6,8}[_-]\d{6}/g, "");
  cleaned = cleaned.replace(/^\s*\d{4}\s+/g, "");
  cleaned = cleaned.replace(/^[\s\-_—]+/g, "");
  cleaned = cleaned.replace(/[\s\-_—/]+$/g, "");
  cleaned = cleaned.replace(/[\s\-_—]+/g, " ");

  return cleaned.trim();
}

export function isZipFileName(name) {
  return /\.zip$/i.test(name || "");
}
