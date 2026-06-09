import { describe, expect, it } from "vitest";
import {
  normalizeArchiveFileName,
  normalizeArchivePath,
  uniqueArchiveFileName,
  uniqueArchivePath,
} from "../archivePaths.js";

describe("archive path helpers", () => {
  it("keeps relative source directories when they are available", () => {
    expect(normalizeArchivePath("camera-a/IMG_20250115_143025.jpg")).toBe(
      "camera-a/IMG_20250115_143025.jpg"
    );
  });

  it("can flatten relative source paths to a root archive file name", () => {
    expect(normalizeArchiveFileName("camera-a/IMG_20250115_143025.jpg")).toBe(
      "IMG_20250115_143025.jpg"
    );
  });

  it("strips absolute paths and unsafe path segments", () => {
    expect(normalizeArchivePath("/Users/me/photos/IMG_20250115_143025.jpg")).toBe(
      "IMG_20250115_143025.jpg"
    );
    expect(normalizeArchivePath("../photos/./bad:name?.jpg")).toBe("photos/bad_name_.jpg");
  });

  it("normalizes decomposed unicode names for zip compatibility", () => {
    const decomposed = "2025-10-08 - Boissellerie Me\u0301rove\u0301e/IMG.jpg";

    const normalized = normalizeArchivePath(decomposed);

    expect(normalized).toBe("2025-10-08 - Boissellerie Mérovée/IMG.jpg");
    expect(normalized).not.toContain("\u0301");
  });

  it("suffixes duplicate archive paths case-insensitively", () => {
    const used = new Set();

    expect(uniqueArchivePath("same.jpg", "fallback.jpg", used)).toBe("same.jpg");
    expect(uniqueArchivePath("SAME.jpg", "fallback.jpg", used)).toBe("SAME-2.jpg");
  });

  it("suffixes duplicate flattened archive file names", () => {
    const used = new Set();

    expect(uniqueArchiveFileName("camera-a/same.jpg", "fallback.jpg", used)).toBe("same.jpg");
    expect(uniqueArchiveFileName("camera-b/same.jpg", "fallback.jpg", used)).toBe("same-2.jpg");
  });
});
