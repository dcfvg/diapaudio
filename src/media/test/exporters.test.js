import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const zipMocks = vi.hoisted(() => ({
  add: vi.fn(),
  close: vi.fn(),
  ZipWriter: vi.fn(),
  BlobWriter: vi.fn(),
  BlobReader: vi.fn(),
  TextReader: vi.fn(),
}));

vi.mock("@zip.js/zip.js", () => ({
  ZipWriter: zipMocks.ZipWriter,
  BlobWriter: zipMocks.BlobWriter,
  BlobReader: zipMocks.BlobReader,
  TextReader: zipMocks.TextReader,
}));

describe("exporters", () => {
  const originalFetch = globalThis.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let anchorClickSpy;

  beforeEach(() => {
    zipMocks.add.mockReset();
    zipMocks.close.mockReset();
    zipMocks.ZipWriter.mockReset();
    zipMocks.BlobWriter.mockReset();
    zipMocks.BlobReader.mockReset();
    zipMocks.TextReader.mockReset();

    zipMocks.ZipWriter.mockImplementation(function createMockZipWriter() {
      return {
      add: zipMocks.add,
      close: zipMocks.close,
      };
    });
    zipMocks.close.mockResolvedValue(new Blob(["zip"], { type: "application/zip" }));
    zipMocks.TextReader.mockImplementation(function createMockTextReader(text) {
      this.text = text;
    });
    zipMocks.BlobReader.mockImplementation(function createMockBlobReader(blob) {
      this.blob = blob;
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["image"], { type: "image/jpeg" })),
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test/export.zip"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    anchorClickSpy = vi
      .spyOn(globalThis.HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy?.mockRestore();
    globalThis.fetch = originalFetch;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  });

  it("includes delay and flat YAML settings in media ZIP exports", async () => {
    const { exportZipArchive } = await import("../exporters.js");

    await exportZipArchive({
      mediaData: {
        images: [
          {
            name: "IMG_20250115_143025.jpg",
            url: "blob:test/image.jpg",
            originalTimestamp: new Date("2025-01-15T14:30:25Z"),
          },
        ],
        audioTracks: [],
      },
      delaySeconds: 30,
      settings: {
        speed: 2,
        autoSkipVoids: true,
        imageDisplaySeconds: 4,
        imageHoldSeconds: 12,
      },
    });

    expect(zipMocks.add).toHaveBeenCalledWith(
      "_delay.txt",
      expect.objectContaining({ text: "0:30" })
    );
    expect(zipMocks.add).toHaveBeenCalledWith(
      "_settings.yml",
      expect.objectContaining({
        text: expect.stringContaining("skip_blanks: true"),
      })
    );
    const settingsCall = zipMocks.add.mock.calls.find(([name]) => name === "_settings.yml");
    expect(settingsCall[1].text).toContain("speed: 2");
    expect(settingsCall[1].text).toContain("minimum_photo_time_seconds: 4");
    expect(settingsCall[1].text).not.toContain("{");
  });
});
