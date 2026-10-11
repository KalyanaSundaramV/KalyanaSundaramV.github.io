/**
 * Public gameplay or demo video shown when the interactive scene cannot run.
 * Leave null until an approved video is published; the link stays hidden.
 */
export const demoVideoHref: string | null = null;

// Procedural Homestead capture: 300 frame-indexed samples, seamless 10-second camera path.
export const heroPreview = {
  scene: "homestead",
  seed: 1103,
  sourceCommit: "01424c55a1b85e9ecd65c7edf7240b06576a862d",
  capturedAt: "2026-10-11T13:20:33.0564066Z",
  width: 1280,
  height: 720,
  fps: 30,
  frames: 300,
  duration: 10,
  webm: {
    href: "/media/homestead-preview.webm",
    codec: "vp9",
    bytes: 834731,
    sha256: "8ff17de913b2dd49e5b60d27cfcc3fdf7d997a726712dc53a3ca4a28f1687969",
  },
  mp4: {
    href: "/media/homestead-preview.mp4",
    codec: "h264",
    bytes: 638748,
    sha256: "2605e3c800bd068708f717ac816e31304073d65b66e93d29341a63a6fd0b49eb",
  },
  poster: {
    href: "/media/homestead-preview-poster.webp",
    width: 1280,
    height: 720,
    bytes: 22942,
    sha256: "015e0e1faee0a51f43912e50b4b59c1d3860ee3c56e63d7c20f8cb002f63fbc6",
  },
} as const;
