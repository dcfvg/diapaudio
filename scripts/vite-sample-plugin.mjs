import { createReadStream, realpathSync, statSync } from "node:fs";
import path from "node:path";

const SAMPLE_BASE_PATH = "/__diapaudio_sample__";

function isInsideRoot(filePath, rootPath) {
  const relative = path.relative(rootPath, filePath);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function resolveSampleFile(rootPath, sampleZipPath) {
  if (!sampleZipPath) {
    return null;
  }

  const rootRealPath = realpathSync(rootPath);
  const requestedPath = path.isAbsolute(sampleZipPath)
    ? sampleZipPath
    : path.resolve(rootRealPath, sampleZipPath);
  const sampleRealPath = realpathSync(requestedPath);

  if (!isInsideRoot(sampleRealPath, rootRealPath)) {
    throw new Error("DIAPAUDIO_SAMPLE_ZIP must point to a file inside this repository.");
  }

  const stats = statSync(sampleRealPath);
  if (!stats.isFile()) {
    throw new Error("DIAPAUDIO_SAMPLE_ZIP must point to a ZIP file.");
  }

  if (path.extname(sampleRealPath).toLowerCase() !== ".zip") {
    throw new Error("DIAPAUDIO_SAMPLE_ZIP must point to a .zip file.");
  }

  return {
    fileName: path.basename(sampleRealPath),
    path: sampleRealPath,
    sizeBytes: stats.size,
    lastModifiedMs: stats.mtimeMs,
  };
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

export function diapaudioSamplePlugin({ sampleZipPath = process.env.DIAPAUDIO_SAMPLE_ZIP } = {}) {
  return {
    name: "diapaudio-sample-server",
    apply: "serve",
    configureServer(server) {
      let sampleFile = null;

      try {
        sampleFile = resolveSampleFile(server.config.root, sampleZipPath);
      } catch (error) {
        server.config.logger.warn(`[diapaudio-sample] ${error.message}`);
        return;
      }

      if (!sampleFile) {
        return;
      }

      server.config.logger.info(`[diapaudio-sample] Serving ${sampleFile.fileName}`);

      server.middlewares.use((request, response, next) => {
        const requestUrl = request.originalUrl || request.url || "";
        const pathname = new URL(requestUrl, "http://127.0.0.1").pathname;

        if (!pathname.startsWith(SAMPLE_BASE_PATH)) {
          next();
          return;
        }

        if (pathname === `${SAMPLE_BASE_PATH}/manifest.json`) {
          sendJson(response, 200, {
            available: true,
            fileName: sampleFile.fileName,
            sizeBytes: sampleFile.sizeBytes,
            lastModifiedMs: sampleFile.lastModifiedMs,
            contentType: "application/zip",
            sampleUrl: `${SAMPLE_BASE_PATH}/sample.zip`,
          });
          return;
        }

        if (pathname === `${SAMPLE_BASE_PATH}/sample.zip`) {
          response.statusCode = 200;
          response.setHeader("content-type", "application/zip");
          response.setHeader("content-length", String(sampleFile.sizeBytes));
          response.setHeader("cache-control", "no-store");
          response.setHeader(
            "content-disposition",
            `inline; filename="${encodeURIComponent(sampleFile.fileName)}"`
          );
          createReadStream(sampleFile.path).pipe(response);
          return;
        }

        sendJson(response, 404, { error: "Sample endpoint not found." });
      });
    },
  };
}
