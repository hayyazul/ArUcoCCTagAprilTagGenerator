/**
 * Detection-range estimator: given a family's `DetectionModel`, a tag
 * size in millimetres, and a camera (HFOV + image width), report the
 * physical distance at which detection is expected to be reliable and
 * the further "edge" distance where it starts to fail.
 *
 * The model is intentionally simple: an optical-resolution ceiling
 * derived from per-bit (or per-disk-diameter) pixel thresholds. Real
 * conditions (lighting, motion blur, defocus, paper sheen) only ever
 * shorten this — never extend it.
 *
 * Pure math, no DOM. Loud on invalid input.
 */
import type { DetectionModel } from "../families/family";

export interface CameraSpec {
  /** Horizontal field of view, degrees. (0, 180). */
  readonly hfovDeg: number;
  /** Image width, pixels. > 0. */
  readonly widthPx: number;
}

export interface RangeEstimate {
  /** Reliable detection distance, metres. */
  readonly reliable_m: number;
  /** Edge detection distance, metres — detection fails beyond this. */
  readonly edge_m: number;
  /** Pass-through from the family's detection model. Off-axis tilt (deg)
   *  up to which detection remains reliable. Informational only. */
  readonly maxViewAngleDeg: number;
}

/**
 * Pinhole focal length in pixels from HFOV and image width:
 *   f_px = (widthPx / 2) / tan(HFOV / 2)
 * Used by every distance / size formula in this module.
 */
export function focalLengthPx(camera: CameraSpec): number {
  validateCamera(camera);
  const halfFovRad = (camera.hfovDeg * Math.PI) / 360;
  return camera.widthPx / 2 / Math.tan(halfFovRad);
}

/**
 * Forward estimate: at what distance can a tag of `tagSize_mm` still
 * be detected by `camera`? Returns reliable and edge distances in
 * metres. Throws on invalid input or unknown detection kind.
 */
export function estimateRange(
  detection: DetectionModel,
  tagSize_mm: number,
  camera: CameraSpec,
): RangeEstimate {
  if (!Number.isFinite(tagSize_mm) || tagSize_mm <= 0) {
    throw new RangeError(`tagSize_mm must be positive, got ${tagSize_mm}`);
  }
  const fPx = focalLengthPx(camera);
  switch (detection.kind) {
    case "px-per-bit": {
      const numerator_mm = tagSize_mm * fPx;
      return {
        reliable_m: numerator_mm / (detection.bits * detection.pxPerBitReliable) / 1000,
        edge_m: numerator_mm / (detection.bits * detection.pxPerBitEdge) / 1000,
        maxViewAngleDeg: detection.maxViewAngleDeg,
      };
    }
    case "px-per-disk-diameter": {
      const numerator_mm = tagSize_mm * fPx;
      return {
        reliable_m: numerator_mm / detection.pxDiameterReliable / 1000,
        edge_m: numerator_mm / detection.pxDiameterEdge / 1000,
        maxViewAngleDeg: detection.maxViewAngleDeg,
      };
    }
  }
}

/**
 * Inverse: minimum tag size (mm) such that detection remains at the
 * chosen threshold out to `targetDistance_m`. Result is rounded up to
 * the nearest 0.5 mm to match the project's tag-size input step.
 *
 * Throws on invalid input or unknown detection kind.
 */
export function minTagSizeForDistance(
  detection: DetectionModel,
  targetDistance_m: number,
  camera: CameraSpec,
  threshold: "reliable" | "edge",
): number {
  if (!Number.isFinite(targetDistance_m) || targetDistance_m <= 0) {
    throw new RangeError(
      `targetDistance_m must be positive, got ${targetDistance_m}`,
    );
  }
  const fPx = focalLengthPx(camera);
  const targetDistance_mm = targetDistance_m * 1000;
  let exact_mm: number;
  switch (detection.kind) {
    case "px-per-bit": {
      const pxPerBit =
        threshold === "reliable" ? detection.pxPerBitReliable : detection.pxPerBitEdge;
      exact_mm = (targetDistance_mm * detection.bits * pxPerBit) / fPx;
      break;
    }
    case "px-per-disk-diameter": {
      const pxDiameter =
        threshold === "reliable"
          ? detection.pxDiameterReliable
          : detection.pxDiameterEdge;
      exact_mm = (targetDistance_mm * pxDiameter) / fPx;
      break;
    }
  }
  return Math.ceil(exact_mm * 2) / 2;
}

function validateCamera(camera: CameraSpec): void {
  if (!Number.isFinite(camera.hfovDeg) || camera.hfovDeg <= 0 || camera.hfovDeg >= 180) {
    throw new RangeError(
      `hfovDeg must be in (0, 180), got ${camera.hfovDeg}`,
    );
  }
  if (!Number.isFinite(camera.widthPx) || camera.widthPx <= 0) {
    throw new RangeError(`widthPx must be positive, got ${camera.widthPx}`);
  }
}
