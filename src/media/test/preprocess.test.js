import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareMediaFromFiles } from "../preprocess.js";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((file) => `blob:test/${file.name}`),
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

describe("prepareMediaFromFiles", () => {
  it("awaits batch timestamp parsing before mapping results", async () => {
    const image = new File(["image"], "IMG_20250115_143025.jpg", {
      type: "image/jpeg",
      lastModified: new Date("2025-01-15T14:30:25Z").getTime(),
    });

    const result = await prepareMediaFromFiles([image]);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].name).toBe("IMG_20250115_143025.jpg");
    expect(result.images[0].originalName).toBe("IMG_20250115_143025.jpg");
    expect(result.images[0].timestamp).toBeInstanceOf(Date);
    expect(URL.createObjectURL).toHaveBeenCalledWith(image);
  });

  it("preserves image source paths when files provide one", async () => {
    const image = new File(["image"], "IMG_20250115_143025.jpg", {
      type: "image/jpeg",
      lastModified: new Date("2025-01-15T14:30:25Z").getTime(),
    });
    Object.defineProperty(image, "path", {
      configurable: true,
      value: "camera-a/IMG_20250115_143025.jpg",
    });

    const result = await prepareMediaFromFiles([image]);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].name).toBe("IMG_20250115_143025.jpg");
    expect(result.images[0].originalName).toBe("camera-a/IMG_20250115_143025.jpg");
  });

  it("parses image timestamps from basenames instead of dated source directories", async () => {
    const image = new File(["image"], "IMG_20250115_143025.jpg", {
      type: "image/jpeg",
      lastModified: new Date("2025-01-15T14:30:25Z").getTime(),
    });
    Object.defineProperty(image, "path", {
      configurable: true,
      value: "sample 2025-10-08/IMG_20250115_143025.jpg",
    });

    const result = await prepareMediaFromFiles([image]);
    const timestamp = result.images[0].timestamp;

    expect(result.images).toHaveLength(1);
    expect(result.images[0].originalName).toBe("sample 2025-10-08/IMG_20250115_143025.jpg");
    expect(timestamp.getFullYear()).toBe(2025);
    expect(timestamp.getMonth()).toBe(0);
    expect(timestamp.getDate()).toBe(15);
    expect(timestamp.getHours()).toBe(14);
    expect(timestamp.getMinutes()).toBe(30);
    expect(timestamp.getSeconds()).toBe(25);
  });

  it("revokes prepared object URLs when preprocessing fails after creating blobs", async () => {
    const firstImage = new File(["image"], "IMG_20250115_143025.jpg", {
      type: "image/jpeg",
      lastModified: new Date("2025-01-15T14:30:25Z").getTime(),
    });
    const secondImage = new File(["image"], "IMG_20250115_143125.jpg", {
      type: "image/jpeg",
      lastModified: new Date("2025-01-15T14:31:25Z").getTime(),
    });
    URL.createObjectURL.mockImplementation((file) => {
      if (file.name === secondImage.name) {
        throw new Error("blob creation failed");
      }
      return `blob:test/${file.name}`;
    });

    await expect(prepareMediaFromFiles([firstImage, secondImage])).rejects.toThrow(
      "blob creation failed"
    );

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/IMG_20250115_143025.jpg");
  });

  it("loads flat YAML archive settings from a dropped file", async () => {
    const settings = new File(
      [
        [
          "speed: 2",
          "skip_blanks: yes",
          "align_photos: no",
          "minimum_photo_time_seconds: 4",
          "keep_last_photo_seconds: 12",
        ].join("\n"),
      ],
      "_settings.yml",
      { type: "text/yaml" }
    );
    const image = new File(["image"], "IMG_20250115_143025.jpg", {
      type: "image/jpeg",
      lastModified: new Date("2025-01-15T14:30:25Z").getTime(),
    });

    const result = await prepareMediaFromFiles([settings, image]);

    expect(result.archiveSettings).toMatchObject({
      speed: 2,
      autoSkipVoids: true,
      snapToGrid: false,
      imageDisplaySeconds: 4,
      imageHoldSeconds: 12,
    });
    expect(result.images).toHaveLength(1);
  });
});
