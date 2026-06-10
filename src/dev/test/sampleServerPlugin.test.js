import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { cwd } from "node:process";
import {
  diapaudioSamplePlugin,
  resolveSampleFile,
  resolveSampleFiles,
} from "../../../scripts/vite-sample-plugin.mjs";

const rootPath = cwd();
const fixturePath = path.join(rootPath, "src/test/fixtures/local-sample-fixture.zip");

function createServer() {
  let middleware = null;
  const server = {
    config: {
      root: rootPath,
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
      },
    },
    middlewares: {
      use: vi.fn((handler) => {
        middleware = handler;
      }),
    },
  };

  return {
    server,
    getMiddleware: () => middleware,
  };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(payload = "") {
      this.body = payload;
    },
  };
}

describe("vite sample plugin helpers", () => {
  it("resolves a ZIP fixture inside the repository", () => {
    const sampleFile = resolveSampleFile(rootPath, fixturePath);

    expect(sampleFile.fileName).toBe("local-sample-fixture.zip");
    expect(sampleFile.sizeBytes).toBeGreaterThan(0);
  });

  it("returns null when no sample path is configured", () => {
    expect(resolveSampleFile(rootPath, "")).toBeNull();
  });

  it("lists ZIP samples from a directory", () => {
    const sampleFiles = resolveSampleFiles(rootPath, {
      sampleDirPath: "src/test/fixtures",
    });

    expect(sampleFiles.map((file) => file.fileName)).toEqual(["local-sample-fixture.zip"]);
  });

  it("disables the sample endpoint unless a sample source is configured", () => {
    const { server, getMiddleware } = createServer();
    const plugin = diapaudioSamplePlugin({ sampleZipPath: "", sampleDirPath: "" });

    plugin.configureServer(server);

    const response = createResponse();
    const next = vi.fn();
    getMiddleware()(
      { originalUrl: "/__diapaudio_sample__/manifest.json" },
      response,
      next
    );

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: "Local sample endpoint disabled." });
  });
});
