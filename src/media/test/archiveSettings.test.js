import { describe, expect, it } from "vitest";
import {
  ARCHIVE_SETTINGS_FILE_NAME,
  isArchiveSettingsFileName,
  normalizeArchiveSettings,
  parseArchiveSettings,
  serializeArchiveSettings,
} from "../archiveSettings.js";

describe("archiveSettings", () => {
  it("serializes settings as flat YAML with beginner-friendly keys", () => {
    const yaml = serializeArchiveSettings({
      speed: 2,
      autoSkipVoids: true,
      snapToGrid: false,
      snapGridSeconds: 5,
      imageDisplaySeconds: 4,
      imageHoldSeconds: 12,
      compositionIntervalSeconds: 120,
      showClock: false,
      clockMode: "analog",
      timelinePinned: true,
    });

    expect(yaml).toContain("# Simple format: one key: value per line.");
    expect(yaml).toContain("speed: 2");
    expect(yaml).toContain("skip_blanks: true");
    expect(yaml).toContain("minimum_photo_time_seconds: 4");
    expect(yaml).not.toContain("{");
  });

  it("parses flat YAML settings and comments", () => {
    const parsed = parseArchiveSettings(`
# Settings edited by hand
speed: 1.5
skip_blanks: yes
align_photos: no
grid_step_seconds: 3 # seconds
minimum_photo_time_seconds: 4
keep_last_photo_seconds: 12
composition_change_seconds: 90
show_clock: false
clock_mode: analog
timeline_pinned: true
`);

    expect(parsed).toEqual({
      speed: 1.5,
      autoSkipVoids: true,
      snapToGrid: false,
      snapGridSeconds: 3,
      imageDisplaySeconds: 4,
      imageHoldSeconds: 12,
      compositionIntervalSeconds: 90,
      showClock: false,
      clockMode: "analog",
      timelinePinned: true,
    });
  });

  it("keeps reading legacy French YAML keys", () => {
    expect(
      parseArchiveSettings(`
vitesse: 2
sauter_passages_sans_media: oui
aligner_photos: non
`)
    ).toMatchObject({
      speed: 2,
      autoSkipVoids: true,
      snapToGrid: false,
    });
  });

  it("accepts yml and yaml settings filenames", () => {
    expect(isArchiveSettingsFileName(ARCHIVE_SETTINGS_FILE_NAME)).toBe(true);
    expect(isArchiveSettingsFileName("_settings.yaml")).toBe(true);
    expect(isArchiveSettingsFileName("_settings.json")).toBe(false);
  });

  it("normalizes unsafe numeric values without capping the last-photo duration", () => {
    expect(
      normalizeArchiveSettings({
        speed: -1,
        snapGridSeconds: 0,
        imageDisplaySeconds: 0,
        imageHoldSeconds: 999,
      })
    ).toEqual({
      snapGridSeconds: 1,
      imageDisplaySeconds: 1,
      imageHoldSeconds: 999,
    });
  });
});
