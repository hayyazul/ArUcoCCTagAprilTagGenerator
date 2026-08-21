import { describe, expect, it } from "vitest";
import { CAMERA_PRESETS, findCameraPreset } from "./cameras";

describe("CAMERA_PRESETS", () => {
  it("lists at least one preset and starts with 'custom'", () => {
    expect(CAMERA_PRESETS.length).toBeGreaterThan(0);
    expect(CAMERA_PRESETS[0]!.id).toBe("custom");
  });

  it("all ids are unique", () => {
    const ids = CAMERA_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all HFOV values are in (0, 180)", () => {
    for (const p of CAMERA_PRESETS) {
      expect(p.hfovDeg).toBeGreaterThan(0);
      expect(p.hfovDeg).toBeLessThan(180);
    }
  });

  it("all widthPx values are positive integers", () => {
    for (const p of CAMERA_PRESETS) {
      expect(p.widthPx).toBeGreaterThan(0);
      expect(Number.isInteger(p.widthPx)).toBe(true);
    }
  });

  it("all labels are non-empty", () => {
    for (const p of CAMERA_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

describe("findCameraPreset", () => {
  it("returns the matching preset by id", () => {
    expect(findCameraPreset("iphone-wide")?.hfovDeg).toBe(73);
  });

  it("returns undefined for an unknown id", () => {
    expect(findCameraPreset("nope")).toBeUndefined();
  });
});
