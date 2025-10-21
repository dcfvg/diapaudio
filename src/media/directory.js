import { isSystemFile } from "./fileUtils.js";
import { translate } from "../utils/i18nHelpers.js";

export async function readDirectoryRecursive(
  dirEntry,
  { progress, t, counter = { value: 0 } } = {}
) {
  if (!dirEntry || typeof dirEntry.createReader !== "function") {
    return [];
  }

  const files = [];
  const reader = dirEntry.createReader();

  async function readEntries() {
    return new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
  }

  let entries = await readEntries();
  while (entries.length > 0) {
    for (const entry of entries) {
      if (isSystemFile(entry.name)) {
        continue;
      }

      counter.value += 1;
      const percent = Math.min(90, 10 + counter.value * 2);
      progress?.update(
        percent,
        "readingFolder",
        `${counter.value} ${translate(t, "filesProcessed")}`
      );

      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });
        files.push(file);
      } else if (entry.isDirectory) {
        const subFiles = await readDirectoryRecursive(entry, { progress, t, counter });
        files.push(...subFiles);
      }
    }
    entries = await readEntries();
  }

  return files;
}

export default readDirectoryRecursive;
