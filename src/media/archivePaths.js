function sanitizePathSegment(segment) {
  const value = String(segment || "");
  const normalized = typeof value.normalize === "function" ? value.normalize("NFC") : value;
  return normalized
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPathParts(path) {
  return String(path || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
}

function isAbsolutePath(path) {
  const value = String(path || "").replace(/\\/g, "/");
  return value.startsWith("/") || /^[a-zA-Z]:\//.test(value) || /^file:\/\//i.test(value);
}

export function normalizeArchivePath(path, fallback = "media-file") {
  const source = path || fallback;
  const sourceParts = splitPathParts(source);
  const rawParts = isAbsolutePath(source) ? sourceParts.slice(-1) : sourceParts;
  const parts = rawParts
    .filter((part) => part !== "." && part !== "..")
    .map(sanitizePathSegment)
    .filter(Boolean);

  if (parts.length) {
    return parts.join("/");
  }

  const fallbackParts = splitPathParts(fallback)
    .filter((part) => part !== "." && part !== "..")
    .map(sanitizePathSegment)
    .filter(Boolean);

  return fallbackParts.length ? fallbackParts.join("/") : "media-file";
}

function splitName(path) {
  const normalized = normalizeArchivePath(path);
  const slashIndex = normalized.lastIndexOf("/");
  const directory = slashIndex >= 0 ? normalized.slice(0, slashIndex + 1) : "";
  const fileName = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return { directory, stem: fileName, extension: "" };
  }
  return {
    directory,
    stem: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex),
  };
}

export function normalizeArchiveFileName(path, fallback = "media-file") {
  const normalized = normalizeArchivePath(path, fallback);
  const slashIndex = normalized.lastIndexOf("/");
  return slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
}

export function uniqueArchivePath(path, fallback, usedPaths = new Set()) {
  const normalized = normalizeArchivePath(path, fallback);
  const used = usedPaths instanceof Set ? usedPaths : new Set();
  const { directory, stem, extension } = splitName(normalized);
  let candidate = normalized;
  let suffix = 2;

  while (used.has(candidate.toLowerCase())) {
    candidate = `${directory}${stem}-${suffix}${extension}`;
    suffix += 1;
  }

  used.add(candidate.toLowerCase());
  return candidate;
}

export function uniqueArchiveFileName(path, fallback, usedPaths = new Set()) {
  return uniqueArchivePath(normalizeArchiveFileName(path, fallback), fallback, usedPaths);
}

export default {
  normalizeArchiveFileName,
  normalizeArchivePath,
  uniqueArchiveFileName,
  uniqueArchivePath,
};
