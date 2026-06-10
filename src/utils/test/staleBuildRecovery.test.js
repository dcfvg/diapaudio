import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isStaleBuildImportError,
  recoverFromStaleBuildImport,
} from "../staleBuildRecovery.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

describe("staleBuildRecovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects stale dynamic import failures", () => {
    expect(
      isStaleBuildImportError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://dcfvg.github.io/diapaudio/assets/zip-Cnz5aW5f.js"
        )
      )
    ).toBe(true);
  });

  it("ignores ordinary errors", () => {
    expect(isStaleBuildImportError(new Error("No audio or image files detected."))).toBe(false);
  });

  it("attempts recovery only once per session unless forced", () => {
    const storage = createStorage();
    const reload = vi.fn();
    const error = new Error("Error loading dynamically imported module");

    expect(recoverFromStaleBuildImport(error, { storage, reload })).toBe(true);
    expect(recoverFromStaleBuildImport(error, { storage, reload })).toBe(false);
    expect(recoverFromStaleBuildImport(error, { storage, reload, force: true })).toBe(true);
  });
});
