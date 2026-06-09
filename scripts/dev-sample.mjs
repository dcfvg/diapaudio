import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sampleDir = path.resolve(root, process.env.DIAPAUDIO_SAMPLE_DIR || "sample");

function listSampleZips() {
  const configured = process.env.DIAPAUDIO_SAMPLE_ZIP;
  if (configured) {
    const sampleZip = path.resolve(root, configured);
    return existsSync(sampleZip) && statSync(sampleZip).isFile() ? [sampleZip] : [];
  }

  if (!existsSync(sampleDir) || !statSync(sampleDir).isDirectory()) {
    return [];
  }

  return readdirSync(sampleDir)
    .filter((name) => path.extname(name).toLowerCase() === ".zip")
    .map((name) => path.join(sampleDir, name))
    .filter((filePath) => statSync(filePath).isFile())
    .sort((a, b) => a.localeCompare(b));
}

const sampleZips = listSampleZips();

if (!sampleZips.length) {
  console.error("No sample ZIP found. Put one or more .zip files in ./sample.");
  process.exit(1);
}

const child = spawn("vite", ["--host", "127.0.0.1"], {
  env: {
    ...process.env,
    DIAPAUDIO_SAMPLE_DIR: sampleDir,
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
