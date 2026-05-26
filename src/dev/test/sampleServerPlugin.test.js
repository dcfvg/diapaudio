import { describe, expect, it } from "vitest";
import path from "node:path";
import { cwd } from "node:process";
import { resolveSampleFile } from "../../../scripts/vite-sample-plugin.mjs";

const rootPath = cwd();
const fixturePath = path.join(rootPath, "src/test/fixtures/local-sample-fixture.zip");

describe("vite sample plugin helpers", () => {
  it("resolves a ZIP fixture inside the repository", () => {
    const sampleFile = resolveSampleFile(rootPath, fixturePath);

    expect(sampleFile.fileName).toBe("local-sample-fixture.zip");
    expect(sampleFile.sizeBytes).toBeGreaterThan(0);
  });

  it("returns null when no sample path is configured", () => {
    expect(resolveSampleFile(rootPath, "")).toBeNull();
  });
});
