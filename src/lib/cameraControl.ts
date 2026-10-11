export type XYZ = { x: number; y: number; z: number };

export type PanBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * The vector that moves `target` back inside `bounds`. Add it to both the
 * orbit target and the camera so the view keeps its framing and stops at the
 * edge instead of jumping.
 */
export function panCorrection(target: XYZ, bounds: PanBounds): XYZ {
  return {
    x: clamp(target.x, bounds.minX, bounds.maxX) - target.x,
    y: clamp(target.y, bounds.minY, bounds.maxY) - target.y,
    z: clamp(target.z, bounds.minZ, bounds.maxZ) - target.z,
  };
}

/**
 * Idle timer for the camera's return to the building. `wheel` input is
 * bursty, so it only restarts a short debounce; the long idle countdown
 * starts once the wheel has been quiet. Nothing arms before `ready()` (the
 * intro fly-in has finished).
 */
export function createIdleReturn({
  delayMs,
  wheelDebounceMs,
  onReturn,
}: {
  delayMs: number;
  wheelDebounceMs: number;
  onReturn: () => void;
}) {
  let isReady = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let wheelTimer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (idleTimer !== null) clearTimeout(idleTimer);
    if (wheelTimer !== null) clearTimeout(wheelTimer);
    idleTimer = null;
    wheelTimer = null;
  };

  const arm = () => {
    if (!isReady) return;
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      idleTimer = null;
      onReturn();
    }, delayMs);
  };

  return {
    ready() {
      isReady = true;
    },
    cancel: clear,
    arm,
    wheel() {
      clear();
      if (!isReady) return;
      wheelTimer = setTimeout(() => {
        wheelTimer = null;
        arm();
      }, wheelDebounceMs);
    },
    dispose() {
      clear();
      isReady = false;
    },
  };
}

/**
 * One frame of the glide back to the building: eases target and zoom, and
 * snaps exactly onto them once within 5 cm and 0.2 zoom so the glide ends
 * without a floating-point tail.
 */
export function stepReturn(
  current: XYZ,
  desired: XYZ,
  zoom: number,
  targetZoom: number,
  dt: number,
): { target: XYZ; zoom: number; done: boolean } {
  const k = 1 - Math.exp(-dt * 3);
  const target = {
    x: current.x + (desired.x - current.x) * k,
    y: current.y + (desired.y - current.y) * k,
    z: current.z + (desired.z - current.z) * k,
  };
  const nextZoom = zoom + (targetZoom - zoom) * k;
  const distance = Math.hypot(
    desired.x - target.x,
    desired.y - target.y,
    desired.z - target.z,
  );
  if (distance <= 0.05 && Math.abs(targetZoom - nextZoom) <= 0.2) {
    return { target: { ...desired }, zoom: targetZoom, done: true };
  }
  return { target, zoom: nextZoom, done: false };
}
