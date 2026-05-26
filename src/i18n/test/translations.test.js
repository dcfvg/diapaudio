import { describe, expect, it } from "vitest";
import { translations } from "../translations.js";

const REQUIRED_KEYS = [
  "timelineSettings",
  "timelineSettingsTitle",
  "timelineSettingsSubtitle",
  "timelineSettingsExportPremiere",
  "timelineSettingsExportXmlOnly",
  "timelineImageGroup",
  "timelineImageGroup_plural",
  "timelineImageGroupShort",
  "timelineImageGroupShort_plural",
  "timelinePin",
  "timelineUnpin",
  "tooltipTimelinePin",
  "tooltipTimelineUnpin",
];

describe("translations", () => {
  it("keeps timeline panel and grouped-image labels available in every locale", () => {
    for (const [language, catalog] of Object.entries(translations)) {
      for (const key of REQUIRED_KEYS) {
        expect(catalog[key], `${language}.${key}`).toEqual(expect.any(String));
        expect(catalog[key].length, `${language}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});
