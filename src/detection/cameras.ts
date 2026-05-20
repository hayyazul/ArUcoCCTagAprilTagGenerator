/**
 * Camera presets for the detection-range estimator. Each preset gives a
 * representative HFOV and capture resolution; users can pick one and
 * then override either field to model their own camera.
 *
 * HFOV values are nominal manufacturer specs (or, where the manufacturer
 * publishes a diagonal FOV instead, the horizontal component derived
 * from the published aspect ratio). They are estimates: real lenses
 * drift a few degrees, and many phones change FOV between zoom levels.
 *
 * `custom` is listed first so it remains a stable fallback when the
 * user edits HFOV or width manually away from any preset.
 */

export interface CameraPreset {
  readonly id: string;
  readonly label: string;
  readonly hfovDeg: number;
  readonly widthPx: number;
}

export const CAMERA_PRESETS: readonly CameraPreset[] = [
  { id: "custom", label: "Custom", hfovDeg: 65, widthPx: 1920 },
  { id: "iphone-wide", label: "iPhone main (wide)", hfovDeg: 73, widthPx: 1920 },
  { id: "iphone-uw", label: "iPhone ultra-wide", hfovDeg: 120, widthPx: 1920 },
  { id: "logitech-c920", label: "Logitech C920", hfovDeg: 78, widthPx: 1920 },
  { id: "webcam-720", label: "Generic 720p webcam", hfovDeg: 60, widthPx: 1280 },
  { id: "rpi-cam-v2", label: "Raspberry Pi Camera v2", hfovDeg: 62, widthPx: 1920 },
  { id: "rpi-cam-v3-wa", label: "Raspberry Pi Camera v3 wide", hfovDeg: 102, widthPx: 1920 },
  { id: "realsense-d435", label: "Intel RealSense D435 (RGB)", hfovDeg: 69, widthPx: 1920 },
  { id: "gopro-wide", label: "GoPro Hero (wide)", hfovDeg: 118, widthPx: 1920 },
];

export function findCameraPreset(id: string): CameraPreset | undefined {
  return CAMERA_PRESETS.find((p) => p.id === id);
}
