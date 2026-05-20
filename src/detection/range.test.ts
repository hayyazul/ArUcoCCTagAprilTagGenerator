import { describe, expect, it } from "vitest";
import type { DetectionModel } from "../families/family";
import {
  estimateRange,
  focalLengthPx,
  minTagSizeForDistance,
  type CameraSpec,
} from "./range";

const APRILTAG_36H11: DetectionModel = {
  kind: "px-per-bit",
  bits: 8,
  pxPerBitReliable: 10,
  pxPerBitEdge: 5,
  maxViewAngleDeg: 60,
};

const CCTAG: DetectionModel = {
  kind: "px-per-disk-diameter",
  pxDiameterReliable: 100,
  pxDiameterEdge: 60,
  maxViewAngleDeg: 80,
};

// iPhone main wide preset: HFOV 73°, 1920 px → f_px ≈ 1297.
const IPHONE_WIDE: CameraSpec = { hfovDeg: 73, widthPx: 1920 };

describe("focalLengthPx", () => {
  it("computes f_px from HFOV and width", () => {
    // f_px = (width/2) / tan(HFOV/2). 73° → tan(36.5°) ≈ 0.74021 → 960/0.74021 ≈ 1297.37
    expect(focalLengthPx(IPHONE_WIDE)).toBeCloseTo(1297.37, 1);
  });

  it("scales linearly with image width at fixed HFOV", () => {
    const a = focalLengthPx({ hfovDeg: 60, widthPx: 1000 });
    const b = focalLengthPx({ hfovDeg: 60, widthPx: 2000 });
    expect(b / a).toBeCloseTo(2, 6);
  });

  it("60° HFOV gives the familiar f_px = width · √3 / 2", () => {
    expect(focalLengthPx({ hfovDeg: 60, widthPx: 2 })).toBeCloseTo(Math.sqrt(3), 6);
  });

  it("throws on non-positive HFOV", () => {
    expect(() => focalLengthPx({ hfovDeg: 0, widthPx: 1920 })).toThrow(/hfovDeg/);
    expect(() => focalLengthPx({ hfovDeg: -10, widthPx: 1920 })).toThrow(/hfovDeg/);
  });

  it("throws on HFOV >= 180", () => {
    expect(() => focalLengthPx({ hfovDeg: 180, widthPx: 1920 })).toThrow(/hfovDeg/);
    expect(() => focalLengthPx({ hfovDeg: 200, widthPx: 1920 })).toThrow(/hfovDeg/);
  });

  it("throws on non-positive width", () => {
    expect(() => focalLengthPx({ hfovDeg: 60, widthPx: 0 })).toThrow(/widthPx/);
    expect(() => focalLengthPx({ hfovDeg: 60, widthPx: -1 })).toThrow(/widthPx/);
  });
});

describe("estimateRange (px-per-bit)", () => {
  it("tag36h11 at 100 mm with iPhone wide → ~1.62 m reliable, ~3.24 m edge", () => {
    const r = estimateRange(APRILTAG_36H11, 100, IPHONE_WIDE);
    // 0.1 m · 1297.5 / (8 · 10) and / (8 · 5)
    expect(r.reliable_m).toBeCloseTo(1.622, 2);
    expect(r.edge_m).toBeCloseTo(3.244, 2);
    expect(r.maxViewAngleDeg).toBe(60);
  });

  it("scales linearly with tag size", () => {
    const a = estimateRange(APRILTAG_36H11, 50, IPHONE_WIDE);
    const b = estimateRange(APRILTAG_36H11, 100, IPHONE_WIDE);
    expect(b.reliable_m / a.reliable_m).toBeCloseTo(2, 6);
    expect(b.edge_m / a.edge_m).toBeCloseTo(2, 6);
  });

  it("edge distance is always greater than reliable distance", () => {
    const r = estimateRange(APRILTAG_36H11, 40, IPHONE_WIDE);
    expect(r.edge_m).toBeGreaterThan(r.reliable_m);
  });

  it("smaller bit count gives longer range at same tag size", () => {
    const tagCircle: DetectionModel = { ...APRILTAG_36H11, bits: 5 };
    const a = estimateRange(APRILTAG_36H11, 100, IPHONE_WIDE);
    const b = estimateRange(tagCircle, 100, IPHONE_WIDE);
    expect(b.reliable_m).toBeGreaterThan(a.reliable_m);
    expect(b.reliable_m / a.reliable_m).toBeCloseTo(8 / 5, 6);
  });
});

describe("estimateRange (px-per-disk-diameter)", () => {
  it("cctag3 at 100 mm with iPhone wide → ~1.30 m reliable, ~2.16 m edge", () => {
    const r = estimateRange(CCTAG, 100, IPHONE_WIDE);
    // 0.1 m · 1297.5 / 100 and / 60
    expect(r.reliable_m).toBeCloseTo(1.2975, 3);
    expect(r.edge_m).toBeCloseTo(2.1625, 3);
    expect(r.maxViewAngleDeg).toBe(80);
  });
});

describe("estimateRange — validation", () => {
  it("throws on non-positive tag size", () => {
    expect(() => estimateRange(APRILTAG_36H11, 0, IPHONE_WIDE)).toThrow(/tagSize/);
    expect(() => estimateRange(APRILTAG_36H11, -10, IPHONE_WIDE)).toThrow(/tagSize/);
  });

  it("propagates camera-validation errors", () => {
    expect(() =>
      estimateRange(APRILTAG_36H11, 40, { hfovDeg: 0, widthPx: 1920 }),
    ).toThrow(/hfovDeg/);
  });
});

describe("minTagSizeForDistance", () => {
  it("round-trips with estimateRange for px-per-bit", () => {
    const target = 3.0;
    const s = minTagSizeForDistance(APRILTAG_36H11, target, IPHONE_WIDE, "reliable");
    const back = estimateRange(APRILTAG_36H11, s, IPHONE_WIDE).reliable_m;
    // s is rounded up to 0.5 mm, so reachable distance is >= target.
    expect(back).toBeGreaterThanOrEqual(target);
    // ...and not by more than the worst-case rounding gain (0.5 mm).
    const epsilon_m = estimateRange(APRILTAG_36H11, 0.5, IPHONE_WIDE).reliable_m;
    expect(back - target).toBeLessThanOrEqual(epsilon_m + 1e-9);
  });

  it("tag36h11 + iPhone wide + 3.0 m reliable → 185.0 mm", () => {
    // 3 m · 8 bits · 10 px/bit · 1000 mm/m / 1297.5 ≈ 184.97 → round up to 185.0
    expect(minTagSizeForDistance(APRILTAG_36H11, 3, IPHONE_WIDE, "reliable")).toBe(185);
  });

  it("uses the edge threshold when requested", () => {
    const reliable = minTagSizeForDistance(APRILTAG_36H11, 3, IPHONE_WIDE, "reliable");
    const edge = minTagSizeForDistance(APRILTAG_36H11, 3, IPHONE_WIDE, "edge");
    // Edge threshold is half the px/bit, so half the tag size is sufficient.
    expect(edge).toBeLessThan(reliable);
  });

  it("rounds up to the nearest 0.5 mm", () => {
    const s = minTagSizeForDistance(APRILTAG_36H11, 3, IPHONE_WIDE, "reliable");
    expect((s * 2) % 1).toBe(0);
  });

  it("round-trips with estimateRange for px-per-disk-diameter", () => {
    const target = 1.5;
    const s = minTagSizeForDistance(CCTAG, target, IPHONE_WIDE, "reliable");
    const back = estimateRange(CCTAG, s, IPHONE_WIDE).reliable_m;
    expect(back).toBeGreaterThanOrEqual(target);
  });

  it("throws on non-positive distance", () => {
    expect(() =>
      minTagSizeForDistance(APRILTAG_36H11, 0, IPHONE_WIDE, "reliable"),
    ).toThrow(/targetDistance/);
    expect(() =>
      minTagSizeForDistance(APRILTAG_36H11, -1, IPHONE_WIDE, "reliable"),
    ).toThrow(/targetDistance/);
  });
});
