import { createReadStream, existsSync, readdirSync, realpathSync, statSync } from "node:fs";
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

export function resolveSampleFiles(
  rootPath,
  { sampleZipPath = process.env.DIAPAUDIO_SAMPLE_ZIP, sampleDirPath = "sample" } = {}
) {
  if (sampleZipPath) {
    const sampleFile = resolveSampleFile(rootPath, sampleZipPath);
    return sampleFile ? [sampleFile] : [];
  }

  const rootRealPath = realpathSync(rootPath);
  const requestedDir = path.isAbsolute(sampleDirPath)
    ? sampleDirPath
    : path.resolve(rootRealPath, sampleDirPath);

  if (!existsSync(requestedDir)) {
    return [];
  }

  const sampleDirRealPath = realpathSync(requestedDir);
  if (!isInsideRoot(sampleDirRealPath, rootRealPath)) {
    throw new Error("DIAPAUDIO_SAMPLE_DIR must point to a directory inside this repository.");
  }

  const stats = statSync(sampleDirRealPath);
  if (!stats.isDirectory()) {
    throw new Error("DIAPAUDIO_SAMPLE_DIR must point to a directory.");
  }

  return readdirSync(sampleDirRealPath)
    .filter((name) => path.extname(name).toLowerCase() === ".zip")
    .map((name) => resolveSampleFile(rootRealPath, path.join(sampleDirRealPath, name)))
    .filter(Boolean)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function toManifestSample(sampleFile, index) {
  const id = String(index);
  return {
    id,
    fileName: sampleFile.fileName,
    sizeBytes: sampleFile.sizeBytes,
    lastModifiedMs: sampleFile.lastModifiedMs,
    contentType: "application/zip",
    sampleUrl: `${SAMPLE_BASE_PATH}/samples/${id}.zip`,
  };
}

export function diapaudioSamplePlugin({
  sampleZipPath = process.env.DIAPAUDIO_SAMPLE_ZIP,
  sampleDirPath = process.env.DIAPAUDIO_SAMPLE_DIR || "sample",
} = {}) {
  return {
    name: "diapaudio-sample-server",
    apply: "serve",
    configureServer(server) {
      const getSampleFiles = () => {
        try {
          return resolveSampleFiles(server.config.root, {
            sampleZipPath,
            sampleDirPath,
          });
        } catch (error) {
          server.config.logger.warn(`[diapaudio-sample] ${error.message}`);
          return [];
        }
      };

      const initialSampleFiles = getSampleFiles();
      server.config.logger.info(
        `[diapaudio-sample] Serving ${initialSampleFiles.length} sample ZIP(s)`
      );

      server.middlewares.use((request, response, next) => {
        const requestUrl = request.originalUrl || request.url || "";
        const pathname = new URL(requestUrl, "http://127.0.0.1").pathname;

        if (!pathname.startsWith(SAMPLE_BASE_PATH)) {
          next();
          return;
        }

        const sampleFiles = getSampleFiles();
        const manifestSamples = sampleFiles.map(toManifestSample);

        if (pathname === `${SAMPLE_BASE_PATH}/manifest.json`) {
          sendJson(response, 200, {
            available: manifestSamples.length > 0,
            samples: manifestSamples,
          });
          return;
        }

        const samplesPrefix = `${SAMPLE_BASE_PATH}/samples/`;
        const sampleId =
          pathname.startsWith(samplesPrefix) && pathname.endsWith(".zip")
            ? pathname.slice(samplesPrefix.length, -".zip".length)
            : null;
        const sampleIndex = sampleId == null ? -1 : Number(sampleId);
        const sampleFile = Number.isInteger(sampleIndex) ? sampleFiles[sampleIndex] : null;

        if (sampleFile) {
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
