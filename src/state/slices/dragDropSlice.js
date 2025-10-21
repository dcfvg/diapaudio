import { readDirectoryRecursive } from "../../media/directory.js";
import { t as translate } from "../../i18n/index.js";

export const createDragDropSlice = (set, get) => ({
  // Could add flags like isDragging if needed later
  loadFromDataTransfer: async (dataTransfer, { mode = "replace" } = {}) => {
    if (!dataTransfer) return;

    const { loadFromFiles, appendFromFiles, _progressManager } = get();
    const items = Array.from(dataTransfer.items || []);
    const fileBuffer = [];
    const directoryEntries = [];

    if (items.length) {
      items.forEach((item) => {
        if (item.kind !== "file") return;
        const entry = item.webkitGetAsEntry?.();
        if (entry && entry.isDirectory) {
          directoryEntries.push(entry);
          return;
        }
        const file = item.getAsFile?.();
        if (file) fileBuffer.push(file);
      });
    } else {
      fileBuffer.push(...Array.from(dataTransfer.files || []));
    }

    if (directoryEntries.length) {
      set({ loading: true, error: null, progress: { percent: 0, statusKey: "loadingFiles", details: "" } });
      _progressManager.reset();
      const results = await Promise.all(
        directoryEntries.map((entry) =>
          readDirectoryRecursive(entry, { progress: _progressManager, t: translate, counter: { value: 0 } })
        )
      );
      fileBuffer.push(...results.flat());
    }

    if (!fileBuffer.length) {
      const fallbackFiles = Array.from(dataTransfer.files || []);
      if (!fallbackFiles.length) return;
      if (mode === "append") {
        await appendFromFiles(fallbackFiles);
      } else {
        await loadFromFiles(fallbackFiles);
      }
      return;
    }

    if (mode === "append") {
      await appendFromFiles(fileBuffer);
    } else {
      await loadFromFiles(fileBuffer);
    }
  },
});

export default createDragDropSlice;
