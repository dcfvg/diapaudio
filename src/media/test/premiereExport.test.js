import { BlobReader, TextWriter, ZipReader } from "@zip.js/zip.js";
import { Blob as NodeBlob } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPremiereXml,
  calculateSlotMotion,
  exportPremiereXmlPackage,
  PREMIERE_FRAME_RATE,
  PREMIERE_LAYOUT_GAP_PX,
  PREMIERE_LAYOUT_PADDING_PX,
  PREMIERE_VIDEO_HEIGHT,
  PREMIERE_VIDEO_WIDTH,
  resolveSlotFrame,
} from "../premiereExport.js";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function restoreUrlObjectUrl() {
  if (originalCreateObjectURL) {
    URL.createObjectURL = originalCreateObjectURL;
  } else {
    delete URL.createObjectURL;
  }

  if (originalRevokeObjectURL) {
    URL.revokeObjectURL = originalRevokeObjectURL;
  } else {
    delete URL.revokeObjectURL;
  }
}

function parseXml(xml) {
  const doc = new globalThis.DOMParser().parseFromString(xml, "application/xml");
  const parserError = doc.querySelector("parsererror");
  expect(parserError?.textContent || "").toBe("");
  return doc;
}

function textContent(node, selector) {
  return node.querySelector(selector)?.textContent || "";
}

function fixtureScheduleIndex(baseMs) {
  return {
    entries: [
      {
        image: { name: "A & B.jpg" },
        index: 0,
        startMs: baseMs + 10_000,
        endMs: baseMs + 22_000,
        slotIndex: 0,
        maxConcurrency: 2,
      },
      {
        image: { name: "C < D.jpg" },
        index: 1,
        startMs: baseMs + 16_000,
        endMs: baseMs + 22_000,
        slotIndex: 1,
        maxConcurrency: 2,
      },
    ],
    segments: [
      {
        startMs: baseMs + 10_000,
        endMs: baseMs + 16_000,
        layoutSize: 1,
        slots: [0],
      },
      {
        startMs: baseMs + 16_000,
        endMs: baseMs + 22_000,
        layoutSize: 2,
        slots: [0, 1],
      },
    ],
  };
}

function fixtureAssets() {
  return {
    imageAssets: [
      {
        id: "file-image-0",
        name: "A & B.jpg",
        packagePath: "media/images/A & B.jpg",
        width: 4000,
        height: 3000,
        durationFrames: 24 * 60 * PREMIERE_FRAME_RATE,
      },
      {
        id: "file-image-1",
        name: "C < D.jpg",
        packagePath: "media/images/C < D.jpg",
        width: 1920,
        height: 1080,
        durationFrames: 24 * 60 * PREMIERE_FRAME_RATE,
      },
    ],
    audioAssets: [
      {
        id: "file-audio-0",
        name: "Sound 01.wav",
        packagePath: "media/audio/Sound 01.wav",
        durationFrames: 30 * PREMIERE_FRAME_RATE,
      },
    ],
  };
}

describe("premiereExport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    restoreUrlObjectUrl();
  });

  it("builds parsable xmeml with still images, audio, timecode and Basic Motion", () => {
    const baseMs = Date.parse("2025-10-08T12:00:00Z");
    const { imageAssets, audioAssets } = fixtureAssets();
    const result = buildPremiereXml({
      sequenceName: "Diapaudio <Premiere>",
      scheduleIndex: fixtureScheduleIndex(baseMs),
      imageAssets,
      audioTracks: [
        {
          adjustedStartTime: new Date(baseMs),
          adjustedEndTime: new Date(baseMs + 30_000),
          duration: 30,
        },
      ],
      audioAssets,
    });

    const doc = parseXml(result.xml);
    expect(doc.documentElement.getAttribute("version")).toBe("5");
    expect(textContent(doc, "sequence > name")).toBe("Diapaudio <Premiere>");
    expect(textContent(doc, "sequence > duration")).toBe(String(30 * PREMIERE_FRAME_RATE));
    expect(textContent(doc, "timecode displayformat")).toBe("NDF");
    expect(doc.querySelectorAll("clipitem stillframe")).toHaveLength(3);
    expect(
      Array.from(doc.querySelectorAll("clipitem stillframe")).every(
        (node) => node.textContent === "TRUE"
      )
    ).toBe(true);
    expect(textContent(doc, "clipitem alphatype")).toBe("none");
    expect(
      Array.from(doc.querySelectorAll("effect > name")).some(
        (node) => node.textContent === "Basic Motion"
      )
    ).toBe(true);
    expect(Array.from(doc.querySelectorAll("parameterid")).map((node) => node.textContent)).toEqual(
      expect.arrayContaining(["scale", "center"])
    );
    const centerValues = Array.from(doc.querySelectorAll("parameterid"))
      .filter((node) => node.textContent === "center")
      .map((node) => node.parentElement.querySelector("value"))
      .flatMap((valueNode) => [
        Number(valueNode.querySelector("horiz")?.textContent),
        Number(valueNode.querySelector("vert")?.textContent),
      ]);
    expect(centerValues.every((value) => Math.abs(value) < 1)).toBe(true);
    expect(textContent(doc, "audio clipitem start")).toBe("0");
    expect(doc.querySelectorAll("pathurl")).toHaveLength(0);
  });

  it("extends the sequence when audio starts before images or ends after images", () => {
    const baseMs = Date.parse("2025-10-08T12:00:00Z");
    const { imageAssets, audioAssets } = fixtureAssets();
    const result = buildPremiereXml({
      scheduleIndex: fixtureScheduleIndex(baseMs),
      imageAssets,
      audioTracks: [
        {
          adjustedStartTime: new Date(baseMs - 5_000),
          adjustedEndTime: new Date(baseMs + 40_000),
          duration: 45,
        },
      ],
      audioAssets,
    });
    const doc = parseXml(result.xml);

    expect(textContent(doc, "sequence > duration")).toBe(String(45 * PREMIERE_FRAME_RATE));
    expect(textContent(doc, "audio clipitem start")).toBe("0");
    expect(textContent(doc, "video clipitem start")).toBe(String(15 * PREMIERE_FRAME_RATE));
  });

  it("emits only valid local pathurl values and encodes packaged media names", () => {
    const baseMs = Date.parse("2025-10-08T12:00:00Z");
    const { imageAssets, audioAssets } = fixtureAssets();
    const valid = buildPremiereXml({
      scheduleIndex: fixtureScheduleIndex(baseMs),
      imageAssets,
      audioTracks: [],
      audioAssets,
      mediaBasePathUrl: "file://localhost/Users/me/Diapaudio Package",
    });
    const validDoc = parseXml(valid.xml);
    const pathUrls = Array.from(validDoc.querySelectorAll("pathurl")).map(
      (node) => node.textContent
    );
    expect(pathUrls[0]).toBe(
      "file://localhost/Users/me/Diapaudio%20Package/media/images/A%20%26%20B.jpg"
    );
    expect(pathUrls.every((value) => value.startsWith("file://localhost/"))).toBe(true);

    const invalid = buildPremiereXml({
      scheduleIndex: fixtureScheduleIndex(baseMs),
      imageAssets,
      audioTracks: [],
      audioAssets,
      mediaBasePathUrl: "media/images",
    });
    const invalidDoc = parseXml(invalid.xml);
    expect(invalidDoc.querySelectorAll("pathurl")).toHaveLength(0);
  });

  it("calculates editable 4K slot scale and normalized center values", () => {
    expect(
      calculateSlotMotion({ imageWidth: 1920, imageHeight: 1080, layoutSize: 1, slotIndex: 0 })
    ).toMatchObject({
      scale: 171.4815,
      centerH: 0,
      centerV: 0,
    });

    const left = calculateSlotMotion({
      imageWidth: 4000,
      imageHeight: 3000,
      layoutSize: 2,
      slotIndex: 0,
    });
    expect(left.scale).toBeCloseTo(43.55, 4);
    expect(left.centerH).toBeCloseTo(-0.233073, 6);
    expect(left.centerV).toBe(0);

    const right = calculateSlotMotion({
      imageWidth: 4000,
      imageHeight: 3000,
      layoutSize: 2,
      slotIndex: 1,
    });
    expect(right.scale).toBeCloseTo(43.55, 4);
    expect(right.centerH).toBeCloseTo(0.233073, 6);
    expect(right.centerV).toBe(0);

    const farRight = calculateSlotMotion({
      imageWidth: 800,
      imageHeight: 1600,
      layoutSize: 4,
      slotIndex: 3,
    });
    expect(farRight.scale).toBeCloseTo(105.875, 4);
    expect(farRight.centerH).toBeCloseTo(0.349609, 6);
    expect(farRight.centerV).toBe(0);
  });

  it("keeps every exported slot frame inside the 4K canvas with browser-like margins", () => {
    for (let layoutSize = 1; layoutSize <= 6; layoutSize += 1) {
      let previousFrame = null;
      for (let slotIndex = 0; slotIndex < layoutSize; slotIndex += 1) {
        const frame = resolveSlotFrame({ layoutSize, slotIndex });

        expect(frame.x).toBeGreaterThanOrEqual(PREMIERE_LAYOUT_PADDING_PX);
        expect(frame.y).toBe(PREMIERE_LAYOUT_PADDING_PX);
        expect(frame.x + frame.width).toBeLessThanOrEqual(
          PREMIERE_VIDEO_WIDTH - PREMIERE_LAYOUT_PADDING_PX
        );
        expect(frame.y + frame.height).toBe(PREMIERE_VIDEO_HEIGHT - PREMIERE_LAYOUT_PADDING_PX);
        expect(frame.rows).toBe(1);

        if (previousFrame) {
          const gap = frame.x - (previousFrame.x + previousFrame.width);
          expect(gap).toBeCloseTo(PREMIERE_LAYOUT_GAP_PX, 5);
        }
        previousFrame = frame;
      }
    }
  });

  it("downloads a Premiere package containing XML, README and packaged media", async () => {
    vi.stubGlobal("Blob", NodeBlob);
    const imageBlob = new NodeBlob(["fake image"], { type: "image/jpeg" });
    const audioBlob = new NodeBlob(["fake audio"], { type: "audio/wav" });
    const blobByUrl = new Map([
      ["blob:image-1", imageBlob],
      ["blob:audio-1", audioBlob],
    ]);
    let downloadedBlob = null;
    let downloadedName = "";

    vi.stubGlobal("fetch", async (url) => ({
      ok: blobByUrl.has(url),
      blob: async () => blobByUrl.get(url),
    }));
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({
        width: 1600,
        height: 900,
        close: vi.fn(),
      }))
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn((blob) => {
        downloadedBlob = blob;
        return "blob:download";
      }),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    vi.spyOn(globalThis.HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
      downloadedName = this.download;
    });

    await exportPremiereXmlPackage({
      mediaData: {
        images: [
          {
            name: "photo test.jpg",
            url: "blob:image-1",
            originalTimestamp: new Date("2025-10-08T12:00:00Z"),
          },
        ],
        audioTracks: [
          {
            originalName: "sound test.wav",
            label: "sound test.wav",
            url: "blob:audio-1",
            adjustedStartTime: new Date("2025-10-08T12:00:00Z"),
            adjustedEndTime: new Date("2025-10-08T12:00:10Z"),
            duration: 10,
          },
        ],
      },
    });

    expect(downloadedName).toMatch(/^diapaudio_premiere_.*\.zip$/);
    expect(downloadedBlob?.type).toBe("application/zip");

    const reader = new ZipReader(new BlobReader(downloadedBlob));
    const entries = await reader.getEntries();
    const names = entries.map((entry) => entry.filename).sort();
    expect(names).toEqual(
      expect.arrayContaining([
        "README_IMPORT_PREMIERE.txt",
        "diapaudio-premiere.xml",
        "media/audio/sound test.wav",
        "media/images/photo test.jpg",
      ])
    );

    const xmlEntry = entries.find((entry) => entry.filename === "diapaudio-premiere.xml");
    const xml = await xmlEntry.getData(new TextWriter());
    expect(xml).toContain('<xmeml version="5">');
    expect(xml).toContain("<stillframe>TRUE</stillframe>");
    expect(xml).toContain("<name>Basic Motion</name>");
    await reader.close();
  });
});
