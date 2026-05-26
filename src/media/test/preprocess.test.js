import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareMediaFromFiles } from "../preprocess.js";

const originalCreateObjectURL = URL.createObjectURL;

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((file) => `blob:test/${file.name}`),
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
    expect(result.images[0].timestamp).toBeInstanceOf(Date);
    expect(URL.createObjectURL).toHaveBeenCalledWith(image);
  });
});
