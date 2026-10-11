export const motionTokens = {
  duration: {
    fast: 0.14,
    normal: 0.26,
    slow: 0.5,
    reveal: 0.7,
    section: 0.85,
  },
  ease: {
    ui: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    reveal: "cubic-bezier(0.16, 1, 0.3, 1)",
    exit: "cubic-bezier(0.7, 0, 0.84, 0)",
    gsapReveal: "power3.out",
  },
} as const;

export const revealPresets = {
  fadeUp: { autoAlpha: 0, y: 36 },
  fadeDown: { autoAlpha: 0, y: -24 },
  fadeLeft: { autoAlpha: 0, x: 34 },
  fadeRight: { autoAlpha: 0, x: -34 },
  scaleIn: { autoAlpha: 0, scale: 0.965 },
  blurIn: { autoAlpha: 0, y: 22, filter: "blur(8px)" },
} as const;
