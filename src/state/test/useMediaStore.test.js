import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaStore } from "../useMediaStore.js";
import { useSettingsStore } from "../useSettingsStore.js";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function imageFile(name) {
  return new File(["image"], name, {
    type: "image/jpeg",
    lastModified: new Date("2025-01-15T14:30:25Z").getTime(),
  });
}

function imageFileWithPath(name, path) {
  const file = imageFile(name);
  Object.defineProperty(file, "path", {
    configurable: true,
    value: path,
  });
  return file;
}

function emptyDirectoryTransfer() {
  const reader = {
    readEntries: vi.fn((resolve) => resolve([])),
  };
  const entry = {
    isDirectory: true,
    createReader: () => reader,
    name: "empty",
  };
  return {
    items: [
      {
        kind: "file",
        webkitGetAsEntry: () => entry,
      },
    ],
    files: [],
  };
}

beforeEach(() => {
  window.localStorage.clear();
  useSettingsStore.setState({
    delaySeconds: 0,
    delayUserOverride: false,
  });
  useMediaStore.setState({
    mediaData: null,
    delaySeconds: 0,
    anomalies: [],
    duplicates: { audio: 0, images: 0 },
    loading: false,
    error: null,
    progress: { percent: 0, statusKey: "", details: "" },
    objectUrls: [],
    timelineView: null,
    mediaLoadId: 0,
    mediaLoadMode: null,
  });

  let counter = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((file) => {
      counter += 1;
      return `blob:test/${counter}-${file.name}`;
    }),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });
  } else {
    delete URL.createObjectURL;
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  } else {
    delete URL.revokeObjectURL;
  }
});

describe("useMediaStore", () => {
  it("keeps current media URLs when a replacement load fails", async () => {
    const store = useMediaStore.getState();
    await store.loadFromFiles([imageFile("IMG_20250115_143025.jpg")]);

    const loadedState = useMediaStore.getState();
    const previousMedia = loadedState.mediaData;
    const previousUrls = loadedState.objectUrls;
    URL.revokeObjectURL.mockClear();

    await useMediaStore.getState().loadFromFiles([new File(["notes"], "notes.txt")]);

    const failedState = useMediaStore.getState();
    expect(failedState.mediaData).toBe(previousMedia);
    expect(failedState.objectUrls).toEqual(previousUrls);
    expect(failedState.error).toBeInstanceOf(Error);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(previousUrls[0]);
  });

  it("revokes previous URLs only after a replacement load succeeds", async () => {
    await useMediaStore
      .getState()
      .loadFromFiles([imageFile("IMG_20250115_143025.jpg")]);
    const previousUrl = useMediaStore.getState().objectUrls[0];
    URL.revokeObjectURL.mockClear();

    await useMediaStore
      .getState()
      .loadFromFiles([imageFile("IMG_20250115_143125.jpg")]);

    const state = useMediaStore.getState();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(previousUrl);
    expect(state.mediaData.images[0].name).toBe("IMG_20250115_143125.jpg");
    expect(state.mediaLoadId).toBe(2);
    expect(state.mediaLoadMode).toBe("replace");
  });

  it("does not mark a delay recalculation as a media load", async () => {
    await useMediaStore
      .getState()
      .loadFromFiles([imageFile("IMG_20250115_143025.jpg")]);
    const loadId = useMediaStore.getState().mediaLoadId;

    const changed = useMediaStore.getState().setDelayFromInput("0:30");

    expect(changed).toBe(true);
    expect(useMediaStore.getState().delaySeconds).toBe(30);
    expect(useMediaStore.getState().mediaLoadId).toBe(loadId);
  });

  it("resets delay to zero on a replacement load without a delay file", async () => {
    await useMediaStore
      .getState()
      .loadFromFiles([imageFile("IMG_20250115_143025.jpg")]);
    useMediaStore.getState().setDelayFromInput("0:30");

    await useMediaStore
      .getState()
      .loadFromFiles([imageFile("IMG_20250115_143125.jpg")]);

    expect(useMediaStore.getState().delaySeconds).toBe(0);
    expect(useSettingsStore.getState().delaySeconds).toBe(0);
    expect(useSettingsStore.getState().delayUserOverride).toBe(false);
  });

  it("keeps the current delay when appending files without a delay file", async () => {
    await useMediaStore
      .getState()
      .loadFromFiles([imageFile("IMG_20250115_143025.jpg")]);
    useMediaStore.getState().setDelayFromInput("0:30");

    await useMediaStore
      .getState()
      .appendFromFiles([imageFile("IMG_20250115_143125.jpg")]);

    expect(useMediaStore.getState().delaySeconds).toBe(30);
    expect(useMediaStore.getState().mediaLoadMode).toBe("append");
  });

  it("keeps images with the same basename when their source paths differ", async () => {
    await useMediaStore.getState().loadFromFiles([
      imageFileWithPath("IMG_20250115_143025.jpg", "camera-a/IMG_20250115_143025.jpg"),
      imageFileWithPath("IMG_20250115_143025.jpg", "camera-b/IMG_20250115_143025.jpg"),
    ]);

    const images = useMediaStore.getState().mediaData.images;
    expect(images).toHaveLength(2);
    expect(images.map((image) => image.originalName)).toEqual([
      "camera-a/IMG_20250115_143025.jpg",
      "camera-b/IMG_20250115_143025.jpg",
    ]);
  });

  it("clears loading and reports an error for an empty dropped directory", async () => {
    await useMediaStore.getState().loadFromDataTransfer(emptyDirectoryTransfer());

    const state = useMediaStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error.message).toBe(
      "No audio or image files detected. Please add media files with timestamps."
    );
  });

  it("keeps existing media when appending an empty dropped directory", async () => {
    await useMediaStore
      .getState()
      .loadFromFiles([imageFile("IMG_20250115_143025.jpg")]);
    const previousMedia = useMediaStore.getState().mediaData;
    const previousLoadId = useMediaStore.getState().mediaLoadId;

    await useMediaStore
      .getState()
      .loadFromDataTransfer(emptyDirectoryTransfer(), { mode: "append" });

    const state = useMediaStore.getState();
    expect(state.loading).toBe(false);
    expect(state.mediaData).toBe(previousMedia);
    expect(state.mediaLoadId).toBe(previousLoadId);
  });
});
