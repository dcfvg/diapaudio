import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sampleDir = path.join(root, "sample");

function findSampleZip() {
  const configured = process.env.DIAPAUDIO_SAMPLE_ZIP;
  if (configured) {
    return path.resolve(root, configured);
  }

  if (!existsSync(sampleDir)) {
    return null;
  }

  const candidates = readdirSync(sampleDir)
    .filter((name) => name.toLowerCase().endsWith(".zip"))
    .map((name) => path.join(sampleDir, name))
    .filter((filePath) => statSync(filePath).isFile())
    .sort((a, b) => a.localeCompare(b));

  return candidates[0] || null;
}

const sampleZip = findSampleZip();

if (!sampleZip || !existsSync(sampleZip)) {
  console.error("No sample ZIP found. Put one .zip file in ./sample or set DIAPAUDIO_SAMPLE_ZIP.");
  process.exit(1);
}

const child = spawn("vite", ["--host", "127.0.0.1"], {
  env: {
    ...process.env,
    DIAPAUDIO_SAMPLE_ZIP: sampleZip,
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
