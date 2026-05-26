import { describe, expect, it, vi } from "vitest";
import {
  fetchSampleFile,
  fetchSampleManifest,
  SAMPLE_ENDPOINT,
  shouldAutoloadSample,
} from "../sampleLoader.js";

describe("sampleLoader", () => {
  it("detects the local sample query parameter", () => {
    expect(shouldAutoloadSample("http://127.0.0.1:5959/?sample=local")).toBe(true);
    expect(shouldAutoloadSample("http://127.0.0.1:5959/?sample=remote")).toBe(false);
  });

  it("returns null when no manifest endpoint is available", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
    });

    await expect(fetchSampleManifest({ fetchImpl })).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledWith(`${SAMPLE_ENDPOINT}/manifest.json`, {
      cache: "no-store",
    });
  });

  it("loads a sample manifest", async () => {
    const manifest = {
      available: true,
      fileName: "fixture.zip",
      sampleUrl: `${SAMPLE_ENDPOINT}/sample.zip`,
    };
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => manifest,
    });

    await expect(fetchSampleManifest({ fetchImpl })).resolves.toEqual(manifest);
  });

  it("converts the sample ZIP response into a File", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(["zip"], { type: "application/zip" }),
    });

    const file = await fetchSampleFile(
      {
        fileName: "fixture.zip",
        contentType: "application/zip",
        lastModifiedMs: 1234,
        sampleUrl: `${SAMPLE_ENDPOINT}/sample.zip`,
      },
      { fetchImpl }
    );

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("fixture.zip");
    expect(file.type).toBe("application/zip");
    expect(file.lastModified).toBe(1234);
  });
});
