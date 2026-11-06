import {
  Canvas,
  addAfterEffect,
  type ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import {
  Activity,
  Bomb,
  CircleDot,
  Crosshair,
  Gauge,
  Hammer,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Rotate3D,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box3,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  type OrthographicCamera,
  Quaternion,
  SRGBColorSpace,
  type Sprite,
  Vector3,
} from "three";
import { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { LayeredGlassAsset } from "@/components/glass/LayeredGlassAsset";
import { ContractCard } from "@/components/lab/ContractCard";
import { WeatherLayer, weatherSettings } from "@/components/lab/WeatherLayer";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { ownerAssets } from "@/content/ownerAssets";
import { DESTRUCTION_USE_TOOL_EVENT } from "@/lib/events";
import {
  blockedAhead,
  clearRigYaw,
  RIG_FOOTPRINTS,
  createBuilding,
  createEnvironment,
  scenePresets,
  steerAroundDebris,
  toolLabels,
  type BuildingPartSpec,
  type DebrisHazard,
  type EnvironmentProp,
  type EnvironmentSurface,
  type ScenePreset,
  type ToolId,
  type Vec3,
} from "@/lib/destruction";
import {
  assessContract,
  contractAvailability,
  contracts,
  dormantHazardBlast,
  siteFeatures,
  toolBlockReason,
  toolEnergy,
  type DebrisSnapshot,
  type FailedRecord,
  type ToolUse,
  type Weather,
} from "@/lib/contracts";
import {
  createIdleReturn,
  panCorrection,
  stepReturn,
} from "@/lib/cameraControl";
import {
  applyAttempt,
  isLocked,
  loadReputation,
  saveReputation,
  type ReputationState,
} from "@/lib/reputation";
import {
  analyzeStructuralSupport,
  collapseWaves,
} from "@/lib/structuralSupport";

type TargetSelection = {
  point: Vec3;
  partId: string;
  label: string;
};

// A blast that is not a player tool use; ids order after the pulse that
// caused it.
type Blast = { id: number; point: Vec3 };

type FractureRecord = {
  tool: ToolId;
  point: Vec3;
  direction: Vec3;
  impactId: number;
  structural?: boolean;
};

type DebrisHazardRegistry = MutableRefObject<Map<string, DebrisHazard>>;
// Where each moving actor stands, so followers on its route queue behind it
// and traffic yields to people.
type MoverRegistry = MutableRefObject<
  Map<string, DebrisHazard & { route: string; kind: EnvironmentProp["kind"] }>
>;

type MeshSlot = "building" | "environment";

type ImportedMeshFile = {
  name: string;
  url: string;
};

type ImportedMesh = {
  name: string;
  slot: MeshSlot;
  files: ImportedMeshFile[];
};

function configuredMesh(slot: MeshSlot): ImportedMesh | null {
  const configured = ownerAssets.meshes[slot];
  if (!configured || configured.files.length === 0) return null;
  return {
    name: configured.name,
    slot,
    files: configured.files.map((url) => ({
      name: url.split("/").pop() ?? `${slot}.glb`,
      url,
    })),
  };
}

const SCROLL_WORLD_READY_EVENT = "destruction-scroll-world-ready";
const DESTRUCTION_CAMERA_COMMAND_EVENT = "destruction-camera-command";

type CameraCommand = "zoom-in" | "zoom-out" | "focus" | "reset";
const SCROLL_WORLD_MIN_ZOOM = 5.5;
const SCROLL_WORLD_MAX_ZOOM = 65;
const WORLD_EXTENT = 520;
const CAMERA_NEAR_CLIP = 3.5;
const MAX_IMPACT_FRAGMENTS = 5;
const CRUMBLE_BUDGET = 260;

function syncDebrisHazard(
  registry: DebrisHazardRegistry,
  id: string,
  position: { x: number; y: number; z: number },
  scale: Vec3,
) {
  const largestDimension = Math.max(scale[0], scale[1], scale[2]);
  const groundReach = largestDimension * 0.6 + 0.9;
  if (position.y > groundReach) {
    registry.current.delete(id);
    return;
  }

  const projectedSize = Math.max(scale[0], scale[2], scale[1] * 0.45);
  registry.current.set(id, {
    id,
    x: position.x,
    z: position.z,
    radius: MathUtils.clamp(projectedSize * 0.55 + 0.18, 0.34, 3.2),
  });
}

type DestructionErrorBoundaryProps = {
  children: ReactNode;
  onError?: () => void;
};

type DestructionErrorBoundaryState = {
  failed: boolean;
};

const BUILDING_X = 3.2;

const impactDelays: Record<ToolId, number> = {
  hammer: 580,
  "wrecking-ball": 760,
  dynamite: 520,
  crusher: 2050,
  plasma: 390,
};

const impactRadii: Record<ToolId, number> = {
  hammer: 1.35,
  "wrecking-ball": 2.25,
  dynamite: 2.75,
  crusher: 2.4,
  plasma: 1.15,
};
const toolStress: Record<ToolId, number> = {
  hammer: 0.8,
  "wrecking-ball": 1.35,
  dynamite: 1.85,
  crusher: 2.55,
  plasma: 0.95,
};

const partStrength: Record<BuildingPartSpec["kind"], number> = {
  foundation: 6,
  wall: 1,
  window: 0.42,
  door: 0.82,
  column: 2.35,
  beam: 2.25,
  roof: 1.05,
  slab: 3.1,
  detail: 0.55,
};

const materialStrength: Record<BuildingPartSpec["material"], number> = {
  wood: 0.78,
  brick: 1.1,
  concrete: 1.5,
  glass: 0.45,
  steel: 1.85,
  stone: 1.4,
  tile: 0.7,
};

const impactPartLimits: Record<ToolId, number> = {
  hammer: 2,
  "wrecking-ball": 5,
  dynamite: 12,
  crusher: 6,
  plasma: 3,
};

const toolIcons: Record<ToolId, ComponentType<{ size?: number }>> = {
  hammer: Hammer,
  "wrecking-ball": CircleDot,
  dynamite: Bomb,
  crusher: Minimize2,
  plasma: Zap,
};

const defaultTargetPoints: Record<ScenePreset["id"], Vec3> = {
  homestead: [4.45, 2.55, 2.32],
  village: [4.65, 3.1, 2.56],
  industrial: [5.55, 3.05, 3.12],
  civic: [4.65, 3.35, 2.78],
  metro: [5.05, 6.3, 2.08],
};

class DestructionErrorBoundary extends Component<
  DestructionErrorBoundaryProps,
  DestructionErrorBoundaryState
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Destruction scene failed to render", error, info);
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="lab-fallback">
          The interactive scene could not start on this device. The portfolio
          content below remains available.
        </div>
      );
    }
    return this.props.children;
  }
}

function nearestPartTarget(scene: ScenePreset): TargetSelection {
  const point = defaultTargetPoints[scene.id];
  const parts = createBuilding(scene);
  const nearest = parts.reduce((best, part) => {
    const bestDistance = distanceToPart(point, best);
    return distanceToPart(point, part) < bestDistance ? part : best;
  }, parts[0]);

  return {
    point,
    partId: nearest.id,
    label: `${nearest.kind} - level ${nearest.level + 1}`,
  };
}

function distanceToPart(point: Vec3, part: BuildingPartSpec) {
  const dx = Math.max(
    Math.abs(point[0] - part.position[0]) - part.scale[0] / 2,
    0,
  );
  const dy = Math.max(
    Math.abs(point[1] - part.position[1]) - part.scale[1] / 2,
    0,
  );
  const dz = Math.max(
    Math.abs(point[2] - part.position[2]) - part.scale[2] / 2,
    0,
  );
  return Math.hypot(dx, dy, dz);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function CameraRig({
  scene,
  overviewDistance,
}: {
  scene: ScenePreset;
  overviewDistance: number;
}) {
  const { camera, gl } = useThree();
  const transitionStart = useRef(performance.now());
  const transitionComplete = useRef(false);
  const overviewZoom = 6.5;
  const closeZoom = {
    homestead: 29,
    village: 27,
    industrial: 23,
    civic: 21,
    metro: 16,
  }[scene.id];
  const focusHeight = useMemo(() => {
    const parts = createBuilding(scene);
    const top = Math.max(
      ...parts.map((part) => part.position[1] + part.scale[1] / 2),
    );
    return Math.max(2.8, top * 0.46);
  }, [scene]);
  const closePosition = useMemo(
    () => new Vector3(BUILDING_X + 12, focusHeight + 12, 38),
    [focusHeight],
  );
  const closeTarget = useMemo(
    () => new Vector3(BUILDING_X, focusHeight, 0),
    [focusHeight],
  );
  const overviewPosition = useMemo(
    () =>
      new Vector3(
        BUILDING_X + overviewDistance * 0.14,
        overviewDistance * 0.72,
        overviewDistance * 1.48,
      ),
    [overviewDistance],
  );
  const overviewTarget = useMemo(
    () => new Vector3(BUILDING_X, focusHeight * 0.42, 0),
    [focusHeight],
  );
  const workingPosition = useMemo(() => new Vector3(), []);
  const workingTarget = useMemo(() => new Vector3(), []);

  useEffect(() => {
    transitionStart.current = performance.now();
    transitionComplete.current = false;
    camera.position.copy(overviewPosition);
    camera.lookAt(overviewTarget);
    const orthographicCamera = camera as OrthographicCamera;
    orthographicCamera.zoom = overviewZoom;
    orthographicCamera.updateProjectionMatrix();

    const interruptFlight = () => {
      if (transitionComplete.current) return;
      transitionComplete.current = true;
      gl.domElement.dispatchEvent(new Event(SCROLL_WORLD_READY_EVENT));
    };

    gl.domElement.addEventListener("wheel", interruptFlight, {
      capture: true,
      passive: true,
    });

    return () => {
      gl.domElement.removeEventListener("wheel", interruptFlight, {
        capture: true,
      });
    };
  }, [camera, gl, overviewPosition, overviewTarget, scene.id]);

  useFrame(() => {
    if (transitionComplete.current) return;
    const elapsed = (performance.now() - transitionStart.current) / 1000;
    const raw = MathUtils.clamp((elapsed - 0.8) / 3.8, 0, 1);
    const progress = 1 - Math.pow(1 - raw, 4);
    workingPosition.lerpVectors(overviewPosition, closePosition, progress);
    workingTarget.lerpVectors(overviewTarget, closeTarget, progress);

    camera.position.copy(workingPosition);
    camera.lookAt(workingTarget);
    const orthographicCamera = camera as OrthographicCamera;
    orthographicCamera.zoom = MathUtils.lerp(overviewZoom, closeZoom, progress);
    orthographicCamera.updateProjectionMatrix();
    if (raw >= 1) {
      transitionComplete.current = true;
      gl.domElement.dispatchEvent(new Event(SCROLL_WORLD_READY_EVENT));
    }
  });

  return null;
}

// The resolved subtree reports pixels after R3F's renderer, never onCreated.
function SceneFirstFrame({ onFrame }: { onFrame?: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    if (!onFrame) return;
    const before = gl.info.render.frame;
    let delivered = false;
    return addAfterEffect(() => {
      if (!delivered && gl.info.render.frame > before) {
        delivered = true;
        onFrame();
      }
    });
  }, [gl, onFrame]);
  return null;
}

function CaptureCamera({ frame }: { frame: number }) {
  useFrame(({ camera, gl, scene }) => {
    const angle = (frame / 300) * Math.PI * 2;
    // A settled, periodic orbit: both pose and velocity close at frame 300.
    camera.position.set(
      BUILDING_X + 13 + Math.sin(angle) * 4,
      15 + Math.cos(angle) * 0.7,
      38 + Math.cos(angle) * 2,
    );
    camera.lookAt(BUILDING_X, 3.2, 0);
    const ortho = camera as OrthographicCamera;
    ortho.zoom = 30;
    ortho.updateProjectionMatrix();
    gl.render(scene, camera);
    gl.domElement.dataset.captureFrame = String(frame);
    gl.domElement.dataset.capturePose = JSON.stringify([
      ...camera.position.toArray(),
      ortho.zoom,
    ]);
  }, 1);
  return null;
}

function SceneTelemetry({ onFps }: { onFps: (fps: number) => void }) {
  const sample = useRef({ frames: 0, startedAt: performance.now() });

  useFrame(() => {
    sample.current.frames += 1;
    const now = performance.now();
    const elapsed = now - sample.current.startedAt;
    if (elapsed < 600) return;
    onFps(Math.round((sample.current.frames * 1000) / elapsed));
    sample.current = { frames: 0, startedAt: now };
  });

  return null;
}

function BuildingOrbitController({
  scene,
  onReady,
}: {
  scene: ScenePreset;
  onReady?: () => void;
}) {
  const { camera, gl } = useThree();
  const controls = useRef<ThreeOrbitControls | null>(null);
  // Glide back to the building after 8 s without camera input.
  const returning = useRef(false);
  const focus = useRef({ y: 0, zoom: 0 });
  const shift = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const orbit = new ThreeOrbitControls(camera, gl.domElement);
    const parts = createBuilding(scene);
    const top = Math.max(
      ...parts.map((part) => part.position[1] + part.scale[1] / 2),
    );
    orbit.target.set(BUILDING_X, Math.max(2.8, top * 0.46), 0);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    // Right-drag pans (OrbitControls' default mouse mapping); two fingers
    // pinch-zoom and pan on touch. Panning is bounded to the site below.
    orbit.enablePan = true;
    orbit.screenSpacePanning = true;
    orbit.enableZoom = true;
    orbit.zoomToCursor = true;
    orbit.zoomSpeed = 0.85;
    orbit.minZoom = SCROLL_WORLD_MIN_ZOOM;
    orbit.maxZoom = SCROLL_WORLD_MAX_ZOOM;
    orbit.rotateSpeed = 0.55;
    orbit.minPolarAngle = 0.48;
    orbit.maxPolarAngle = 1.42;
    orbit.enabled = false;
    controls.current = orbit;
    // OrbitControls sets touch-action: none, which traps vertical page scrolling
    // on phones. On touch-first devices let vertical swipes scroll the page;
    // horizontal drags still orbit and taps still strike.
    if (window.matchMedia("(pointer: coarse)").matches) {
      gl.domElement.style.touchAction = "pan-y";
    }
    // pan-y would let a two-finger vertical drag scroll the page; claim
    // multi-touch gestures for the camera (one finger still scrolls).
    const claimMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    gl.domElement.addEventListener("touchstart", claimMultiTouch, {
      passive: false,
    });
    gl.domElement.addEventListener("touchmove", claimMultiTouch, {
      passive: false,
    });

    const enableControls = () => {
      idle.ready();
      orbit.enabled = true;
      gl.domElement.dataset.demoControlsReady = "true";
      onReady?.();
      gl.domElement.style.cursor = "grab";
      orbit.update();
      gl.domElement.dataset.cameraZoom = (
        camera as OrthographicCamera
      ).zoom.toFixed(2);
    };
    const startDrag = () => {
      gl.domElement.style.cursor = "grabbing";
    };
    const endDrag = () => {
      gl.domElement.style.cursor = "grab";
    };
    const focusY = Math.max(2.8, top * 0.46);
    const closeZoom = {
      homestead: 29,
      village: 27,
      industrial: 23,
      civic: 21,
      metro: 16,
    }[scene.id];
    focus.current = { y: focusY, zoom: closeZoom };

    // Keep the orbit target within 8 m of the building's footprint and
    // between the ground and its roof, so the site can't be dragged away.
    const bounds = {
      minX: Math.min(...parts.map((p) => p.position[0] - p.scale[0] / 2)) - 8,
      maxX: Math.max(...parts.map((p) => p.position[0] + p.scale[0] / 2)) + 8,
      minY: 0.5,
      maxY: Math.max(top, 0.5),
      minZ: Math.min(...parts.map((p) => p.position[2] - p.scale[2] / 2)) - 8,
      maxZ: Math.max(...parts.map((p) => p.position[2] + p.scale[2] / 2)) + 8,
    };
    const correction = new Vector3();
    const keepInBounds = () => {
      const { x, y, z } = panCorrection(orbit.target, bounds);
      if (!x && !y && !z) return;
      correction.set(x, y, z);
      orbit.target.add(correction);
      camera.position.add(correction);
    };

    const idle = createIdleReturn({
      delayMs: 8000,
      wheelDebounceMs: 100,
      onReturn: () => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          // Same instant result as the Focus button, keeping the angle.
          const delta = new Vector3(BUILDING_X, focusY, 0).sub(orbit.target);
          orbit.target.add(delta);
          camera.position.add(delta);
          const orthographicCamera = camera as OrthographicCamera;
          orthographicCamera.zoom = Math.max(
            orthographicCamera.zoom,
            closeZoom,
          );
          orthographicCamera.updateProjectionMatrix();
          orbit.update();
          return;
        }
        returning.current = true;
      },
    });
    const cancelReturn = () => {
      returning.current = false;
      idle.cancel();
    };
    const onWheel = () => {
      returning.current = false;
      idle.wheel();
    };

    const handleCameraCommand = (event: Event) => {
      const command = (event as CustomEvent<CameraCommand>).detail;
      cancelReturn();
      enableControls();
      const orthographicCamera = camera as OrthographicCamera;
      if (command === "zoom-in") {
        orthographicCamera.zoom = MathUtils.clamp(
          orthographicCamera.zoom * 1.22,
          orbit.minZoom,
          orbit.maxZoom,
        );
      } else if (command === "zoom-out") {
        orthographicCamera.zoom = MathUtils.clamp(
          orthographicCamera.zoom / 1.22,
          orbit.minZoom,
          orbit.maxZoom,
        );
      } else if (command === "focus") {
        orbit.target.set(BUILDING_X, focusY, 0);
        orthographicCamera.zoom = MathUtils.clamp(
          Math.max(orthographicCamera.zoom, closeZoom),
          orbit.minZoom,
          orbit.maxZoom,
        );
      } else {
        camera.position.set(BUILDING_X + 12, focusY + 12, 38);
        orbit.target.set(BUILDING_X, focusY, 0);
        orthographicCamera.zoom = closeZoom;
      }
      orthographicCamera.updateProjectionMatrix();
      orbit.update();
      gl.domElement.dataset.cameraZoom = orthographicCamera.zoom.toFixed(2);
      idle.arm();
    };
    gl.domElement.addEventListener(SCROLL_WORLD_READY_EVENT, enableControls);
    orbit.addEventListener("change", keepInBounds);
    orbit.addEventListener("start", cancelReturn);
    orbit.addEventListener("end", idle.arm);
    gl.domElement.addEventListener("pointerdown", cancelReturn);
    gl.domElement.addEventListener("touchstart", cancelReturn, {
      passive: true,
    });
    // Observe only: never preventDefault, OrbitControls owns the zoom.
    gl.domElement.addEventListener("wheel", onWheel, {
      capture: true,
      passive: true,
    });
    // On window, so a drag released outside the canvas still re-arms.
    window.addEventListener("pointerup", idle.arm);
    window.addEventListener("pointercancel", idle.arm);
    gl.domElement.addEventListener(
      DESTRUCTION_CAMERA_COMMAND_EVENT,
      handleCameraCommand,
    );
    orbit.addEventListener("start", startDrag);
    orbit.addEventListener("end", endDrag);

    return () => {
      gl.domElement.removeEventListener(
        SCROLL_WORLD_READY_EVENT,
        enableControls,
      );
      gl.domElement.removeEventListener(
        DESTRUCTION_CAMERA_COMMAND_EVENT,
        handleCameraCommand,
      );
      orbit.removeEventListener("start", startDrag);
      orbit.removeEventListener("end", endDrag);
      gl.domElement.removeEventListener("touchstart", claimMultiTouch);
      gl.domElement.removeEventListener("touchmove", claimMultiTouch);
      orbit.removeEventListener("change", keepInBounds);
      orbit.removeEventListener("start", cancelReturn);
      orbit.removeEventListener("end", idle.arm);
      gl.domElement.removeEventListener("pointerdown", cancelReturn);
      gl.domElement.removeEventListener("touchstart", cancelReturn);
      gl.domElement.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("pointerup", idle.arm);
      window.removeEventListener("pointercancel", idle.arm);
      idle.dispose();
      returning.current = false;
      orbit.dispose();
      gl.domElement.style.cursor = "";
      delete gl.domElement.dataset.demoControlsReady;
      controls.current = null;
    };
  }, [camera, gl, scene.id, onReady]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit?.enabled) return;
    if (returning.current) {
      const orthographicCamera = camera as OrthographicCamera;
      const step = stepReturn(
        orbit.target,
        { x: BUILDING_X, y: focus.current.y, z: 0 },
        orthographicCamera.zoom,
        Math.max(orthographicCamera.zoom, focus.current.zoom),
        delta,
      );
      // Move the camera with the target so the player's orbit angle stays.
      shift.set(step.target.x, step.target.y, step.target.z).sub(orbit.target);
      camera.position.add(shift);
      orbit.target.add(shift);
      orthographicCamera.zoom = step.zoom;
      orthographicCamera.updateProjectionMatrix();
      if (step.done) returning.current = false;
    }
    orbit.update();
    gl.domElement.dataset.cameraZoom = (
      camera as OrthographicCamera
    ).zoom.toFixed(2);
  });

  return null;
}
function PartGeometry({
  part,
  fragment = false,
}: {
  part: BuildingPartSpec;
  fragment?: boolean;
}) {
  if (fragment && part.shape !== "glass" && part.shape !== "cylinder") {
    return <tetrahedronGeometry args={[0.72, 0]} />;
  }
  if (part.shape === "cylinder") {
    return <cylinderGeometry args={[0.5, 0.5, 1, fragment ? 7 : 18]} />;
  }
  if (part.shape === "sphere") {
    return (
      <sphereGeometry args={[0.5, fragment ? 7 : 18, fragment ? 5 : 12]} />
    );
  }
  if (part.shape === "pediment") {
    return <PedimentGeometry />;
  }
  return <boxGeometry args={[1, 1, 1]} />;
}

function PedimentGeometry() {
  const geometry = useMemo(() => {
    const vertices = new Float32Array([
      -0.5, -0.5, 0.5, 0, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0, 0.5,
      -0.5, 0.5, -0.5, -0.5,
    ]);
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    result.setIndex([
      0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5,
    ]);
    result.computeVertexNormals();
    return result;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function PartMaterial({
  part,
  fragment = false,
}: {
  part: BuildingPartSpec;
  fragment?: boolean;
}) {
  if (part.shape === "glass") {
    return (
      <meshPhysicalMaterial
        color={part.color}
        metalness={0.08}
        opacity={fragment ? 0.72 : 0.54}
        roughness={0.15}
        transparent
      />
    );
  }
  const metalness = part.material === "steel" ? 0.58 : 0.03;
  const roughness: Record<BuildingPartSpec["material"], number> = {
    wood: 0.88,
    brick: 0.94,
    concrete: 0.9,
    glass: 0.16,
    steel: 0.42,
    stone: 0.86,
    tile: 0.78,
  };
  return (
    <meshStandardMaterial
      color={part.color}
      metalness={metalness}
      roughness={roughness[part.material]}
    />
  );
}

type FragmentSpec = {
  id: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  irregular: boolean;
  color: string;
};

function numberHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let mixed = hash;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Pieces a large fallen part breaks into when it lands, by face area.
function crumbleCount(part: BuildingPartSpec) {
  const [first, second] = [...part.scale].sort((a, b) => b - a);
  return MathUtils.clamp(Math.round((first * second) / 1.2), 3, 8);
}

function createFragments(
  part: BuildingPartSpec,
  count = Math.max(
    Math.min(
      MAX_IMPACT_FRAGMENTS,
      Math.max(
        part.kind === "window" || part.kind === "detail" ? 2 : 3,
        part.fragmentCount,
      ),
    ),
    // Big panels break by area, so a hit slab isn't four slabs.
    Math.max(...part.scale) > 1.2 ? crumbleCount(part) : 0,
  ),
): FragmentSpec[] {
  const random = numberHash(part.id);
  // Split across the two largest axes and keep the thinnest whole, so a slab
  // breaks into tiles, not full-width strips.
  const [across, down, thin] = [0, 1, 2].sort(
    (a, b) => part.scale[b] - part.scale[a],
  );
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const rotation = new Euler(...part.rotation);

  return Array.from({ length: count }, (_, index): FragmentSpec => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const offset = [0, 0, 0];
    offset[across] =
      ((column + 0.5) / columns - 0.5) * part.scale[across] +
      (random() - 0.5) * part.scale[across] * 0.09;
    offset[down] =
      ((row + 0.5) / rows - 0.5) * part.scale[down] +
      (random() - 0.5) * part.scale[down] * 0.08;
    offset[thin] = (random() - 0.5) * part.scale[thin] * 0.42;
    const local = new Vector3(...offset).applyEuler(rotation);
    const tint = new Color(part.color).offsetHSL(
      (random() - 0.5) * 0.025,
      (random() - 0.5) * 0.04,
      (random() - 0.5) * 0.1,
    );

    return {
      id: `${part.id}-fragment-${index}`,
      position: [
        part.position[0] + local.x,
        part.position[1] + local.y,
        part.position[2] + local.z,
      ],
      rotation: [
        part.rotation[0] + (random() - 0.5) * 0.26,
        part.rotation[1] + (random() - 0.5) * 0.26,
        part.rotation[2] + (random() - 0.5) * 0.26,
      ],
      scale: (() => {
        const size: Vec3 = [0, 0, 0];
        size[across] =
          Math.max(part.scale[across] / columns, 0.16) *
          (0.72 + random() * 0.2);
        size[down] =
          Math.max(part.scale[down] / rows, 0.16) * (0.7 + random() * 0.22);
        size[thin] =
          Math.max(part.scale[thin], 0.12) *
          (part.material === "glass" ? 0.3 : 0.48 + random() * 0.32);
        return size;
      })(),
      irregular:
        part.material === "concrete" ||
        part.material === "stone" ||
        part.material === "tile" ||
        part.material === "glass" ||
        index % 4 === 0,
      color: `#${tint.getHexString()}`,
    };
  }).map((fragment, index) => {
    if (part.material !== "wood") return fragment;
    const horizontal = index % 2 === 0;
    return {
      ...fragment,
      scale: [
        fragment.scale[0] * (horizontal ? 1.55 : 0.52),
        fragment.scale[1] * (horizontal ? 0.44 : 1.35),
        Math.max(0.09, fragment.scale[2] * 0.62),
      ] as Vec3,
      irregular: index % 5 === 0,
    };
  });
}

function fragmentImpulse(
  fragment: FragmentSpec,
  record: FractureRecord,
  index: number,
) {
  const offset = new Vector3(
    fragment.position[0] - record.point[0],
    fragment.position[1] - record.point[1],
    fragment.position[2] - record.point[2],
  );
  if (offset.lengthSq() < 0.02) offset.set(index % 2 ? 0.4 : -0.4, 0.25, 0.2);
  const distance = offset.length();
  offset.normalize();

  const direction = new Vector3(...record.direction).normalize();
  const volume = Math.max(
    0.02,
    fragment.scale[0] * fragment.scale[1] * fragment.scale[2],
  );
  const massFactor = MathUtils.clamp(Math.cbrt(volume), 0.58, 2.4);
  const falloff = MathUtils.clamp(
    1 - distance / Math.max(0.8, impactRadii[record.tool] * 1.4),
    0.18,
    1,
  );

  if (record.structural) {
    return new Vector3(offset.x * 0.08, -0.16, offset.z * 0.08).divideScalar(
      massFactor,
    );
  }

  switch (record.tool) {
    case "hammer":
      return direction
        .multiplyScalar(1.05 * falloff)
        .add(new Vector3(offset.x * 0.2, 0.12, offset.z * 0.2))
        .divideScalar(massFactor);
    case "wrecking-ball":
      return direction
        .multiplyScalar(2.15 * falloff)
        .add(new Vector3(offset.x * 0.28, 0.28, offset.z * 0.28))
        .divideScalar(massFactor);
    case "dynamite":
      return offset
        .multiplyScalar(3.1 * falloff)
        .add(new Vector3(0, 0.85 * falloff, 0))
        .divideScalar(massFactor);
    case "crusher":
      return direction
        .multiplyScalar(0.9 * falloff)
        .add(new Vector3(-offset.x * 0.14, -0.42, -offset.z * 0.14))
        .divideScalar(massFactor);
    case "plasma":
      return direction
        .multiplyScalar(0.52 * falloff)
        .add(new Vector3(offset.x * 0.12, 0.04, offset.z * 0.12))
        .divideScalar(massFactor);
  }
}

function JaggedShardGeometry({ seed }: { seed: string }) {
  const geometry = useMemo(() => {
    const random = numberHash(seed);
    const jitter = () => (random() - 0.5) * 0.2;
    const vertices = new Float32Array([
      -0.55 + jitter(),
      -0.5 + jitter(),
      -0.5,
      0.5 + jitter(),
      -0.4 + jitter(),
      -0.46,
      -0.24 + jitter(),
      0.52 + jitter(),
      -0.5,
      -0.46 + jitter(),
      -0.46 + jitter(),
      0.5,
      0.43 + jitter(),
      -0.5 + jitter(),
      0.48,
      -0.05 + jitter(),
      0.48 + jitter(),
      0.5,
    ]);
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    result.setIndex([
      0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0,
    ]);
    result.computeVertexNormals();
    return result;
  }, [seed]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function FragmentGeometry({
  fragment,
  part,
}: {
  fragment: FragmentSpec;
  part: BuildingPartSpec;
}) {
  if (fragment.irregular) {
    return <JaggedShardGeometry seed={fragment.id} />;
  }
  if (part.material === "brick") {
    return <boxGeometry args={[1, 0.72, 0.84]} />;
  }
  return <boxGeometry args={[1, 1, 1]} />;
}

function FragmentCluster({
  part,
  record,
  debrisHazards,
  count,
}: {
  part: BuildingPartSpec;
  record: FractureRecord;
  debrisHazards: DebrisHazardRegistry;
  count?: number;
}) {
  const fragments = useMemo(() => createFragments(part, count), [count, part]);
  const bodies = useRef<Array<RapierRigidBody | null>>([]);
  const hazardFrame = useRef(0);

  useFrame(() => {
    hazardFrame.current = (hazardFrame.current + 1) % 4;
    if (hazardFrame.current !== 0) return;
    fragments.forEach((fragment, index) => {
      const body = bodies.current[index];
      if (!body) {
        debrisHazards.current.delete(fragment.id);
        return;
      }
      syncDebrisHazard(
        debrisHazards,
        fragment.id,
        body.translation(),
        fragment.scale,
      );
    });
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      bodies.current.forEach((body, index) => {
        if (!body) return;
        const impulse = fragmentImpulse(fragments[index], record, index);
        body.applyImpulse(impulse, true);
        body.applyTorqueImpulse(
          {
            x: (index % 2 ? 1 : -1) * (record.structural ? 0.04 : 0.18),
            y: record.structural ? 0.03 : 0.11 + index * 0.012,
            z: ((index % 3) - 1) * (record.structural ? 0.05 : 0.2),
          },
          true,
        );
        const velocity = body.linvel();
        const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
        const maxSpeed = record.structural
          ? 1.1
          : record.tool === "dynamite"
            ? 3.2
            : record.tool === "wrecking-ball"
              ? 2.55
              : record.tool === "hammer"
                ? 1.45
                : 1.15;
        if (speed > maxSpeed) {
          const scale = maxSpeed / speed;
          body.setLinvel(
            {
              x: velocity.x * scale,
              y: velocity.y * scale,
              z: velocity.z * scale,
            },
            true,
          );
        }
        const angular = body.angvel();
        const angularSpeed = Math.hypot(angular.x, angular.y, angular.z);
        const maxAngularSpeed = record.structural ? 1.2 : 3.6;
        if (angularSpeed > maxAngularSpeed) {
          const scale = maxAngularSpeed / angularSpeed;
          body.setAngvel(
            {
              x: angular.x * scale,
              y: angular.y * scale,
              z: angular.z * scale,
            },
            true,
          );
        }
      });
    }, 20);
    return () => window.clearTimeout(timer);
  }, [fragments, record]);

  useEffect(
    () => () => {
      fragments.forEach((fragment) => {
        debrisHazards.current.delete(fragment.id);
      });
    },
    [debrisHazards, fragments],
  );

  return fragments.map((fragment, index) => {
    return (
      <RigidBody
        key={fragment.id}
        ref={(body) => {
          bodies.current[index] = body;
        }}
        colliders="cuboid"
        position={fragment.position}
        rotation={fragment.rotation}
        restitution={0.04}
        friction={0.96}
        linearDamping={0.72}
        angularDamping={0.86}
        gravityScale={1.12}
        canSleep
      >
        <mesh scale={fragment.scale}>
          <FragmentGeometry fragment={fragment} part={part} />
          <meshStandardMaterial
            color={fragment.color}
            metalness={part.material === "steel" ? 0.46 : 0.02}
            roughness={part.material === "glass" ? 0.2 : 0.92}
            transparent={part.material === "glass"}
            opacity={part.material === "glass" ? 0.72 : 1}
            flatShading
          />
        </mesh>
      </RigidBody>
    );
  });
}

function StructuralDebris({
  part,
  record,
  debrisHazards,
}: {
  part: BuildingPartSpec;
  record: FractureRecord;
  debrisHazards: DebrisHazardRegistry;
}) {
  const body = useRef<RapierRigidBody>(null);
  const hazardFrame = useRef(0);
  const hazardId = `structural-${part.id}`;
  // Where the part lay when it struck something or came to rest after a real
  // fall; it then breaks into rubble there instead of staying one slab.
  const [landed, setLanded] = useState<{
    part: BuildingPartSpec;
    pieces: number;
  } | null>(null);
  const lastSpeed = useRef(0);
  const breaks =
    part.material !== "steel" &&
    part.material !== "glass" &&
    Math.max(...part.scale) > 1.2;

  useFrame(() => {
    hazardFrame.current = (hazardFrame.current + 1) % 4;
    const current = body.current;
    if (hazardFrame.current !== 0 || !current || landed) return;
    const at = current.translation();
    syncDebrisHazard(debrisHazards, hazardId, at, part.scale);

    const velocity = current.linvel();
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    const impact = lastSpeed.current - speed > 0.8;
    lastSpeed.current = speed;
    // Released parts still touch their neighbours; only a fall breaks them.
    if (!breaks || part.position[1] - at.y < 0.35) return;
    if (!impact && speed > 0.25) return;
    const { x, y, z, w } = current.rotation();
    const turn = new Euler().setFromQuaternion(new Quaternion(x, y, z, w));
    debrisHazards.current.delete(hazardId);
    setLanded({
      part: {
        ...part,
        position: [at.x, at.y, at.z],
        rotation: [turn.x, turn.y, turn.z],
      },
      // ponytail: ground-debris count as the body budget; past it, break coarser.
      pieces:
        debrisHazards.current.size > CRUMBLE_BUDGET ? 3 : crumbleCount(part),
    });
  });

  useEffect(() => {
    const impulseTimer = window.setTimeout(() => {
      body.current?.applyImpulse(
        {
          x: record.direction[0] * 0.09,
          y: -0.08,
          z: record.direction[2] * 0.09,
        },
        true,
      );
      body.current?.applyTorqueImpulse(
        {
          x: (part.level % 2 ? 1 : -1) * 0.025,
          y: 0.012,
          z: (part.level % 3 ? -1 : 1) * 0.025,
        },
        true,
      );
    }, 20);
    return () => {
      window.clearTimeout(impulseTimer);
    };
  }, [part.level, record.direction]);

  useEffect(
    () => () => {
      debrisHazards.current.delete(hazardId);
    },
    [debrisHazards, hazardId],
  );

  if (landed) {
    return (
      <FragmentCluster
        part={landed.part}
        record={record}
        debrisHazards={debrisHazards}
        count={landed.pieces}
      />
    );
  }

  const simpleCollider =
    part.shape === "box" || part.shape === "glass" || part.shape === "roof";
  return (
    <RigidBody
      ref={body}
      colliders={simpleCollider ? "cuboid" : "hull"}
      position={part.position}
      rotation={part.rotation}
      restitution={0.02}
      friction={0.98}
      linearDamping={0.88}
      angularDamping={0.92}
      gravityScale={1.08}
      canSleep
    >
      <mesh receiveShadow scale={part.scale}>
        <PartGeometry part={part} />
        <PartMaterial part={part} />
      </mesh>
    </RigidBody>
  );
}

function BuildingPart({
  part,
  fracture,
  onTarget,
  debrisHazards,
}: {
  part: BuildingPartSpec;
  fracture?: FractureRecord;
  onTarget: (target: TargetSelection) => void;
  debrisHazards: DebrisHazardRegistry;
}) {
  const pressStart = useRef<[number, number] | null>(null);
  if (
    fracture?.structural &&
    (part.kind === "window" || part.kind === "detail")
  ) {
    return null;
  }
  if (fracture?.structural) {
    return (
      <StructuralDebris
        part={part}
        record={fracture}
        debrisHazards={debrisHazards}
      />
    );
  }
  if (fracture) {
    return (
      <FragmentCluster
        part={part}
        record={fracture}
        debrisHazards={debrisHazards}
      />
    );
  }

  const beginPointer = (event: ThreeEvent<PointerEvent>) => {
    // Only the primary button strikes; right-drag pans the camera.
    pressStart.current =
      event.button === 0 ? [event.clientX, event.clientY] : null;
  };

  const selectPart = (event: ThreeEvent<PointerEvent>) => {
    const start = pressStart.current;
    pressStart.current = null;
    if (
      !start ||
      Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 6
    ) {
      return;
    }
    event.stopPropagation();
    onTarget({
      point: [event.point.x, event.point.y, event.point.z],
      partId: part.id,
      label: `${part.kind} - level ${part.level + 1}`,
    });
  };

  return (
    <RigidBody
      type="fixed"
      colliders={part.shape === "cylinder" ? "hull" : "cuboid"}
      position={part.position}
      rotation={part.rotation}
    >
      <mesh
        castShadow
        receiveShadow
        scale={part.scale}
        onPointerDown={beginPointer}
        onPointerUp={selectPart}
        onPointerEnter={() => {
          document.body.style.cursor = "crosshair";
        }}
        onPointerLeave={() => {
          pressStart.current = null;
          document.body.style.cursor = "";
        }}
      >
        <PartGeometry part={part} />
        <PartMaterial part={part} />
      </mesh>
    </RigidBody>
  );
}

function BuildingAssembly({
  scene,
  tool,
  pulse,
  resetToken,
  target,
  onTarget,
  onDamage,
  onFailures,
  onStress,
  debrisHazards,
  playbackRate,
  blast,
}: {
  scene: ScenePreset;
  tool: ToolId;
  pulse: number;
  resetToken: number;
  target: TargetSelection;
  onTarget: (target: TargetSelection) => void;
  onDamage: (value: number) => void;
  /** Failed part ids, oldest first. */
  onFailures: (records: { id: string; tool: ToolId }[]) => void;
  onStress: (status: string) => void;
  debrisHazards: DebrisHazardRegistry;
  playbackRate: number;
  blast: Blast | null;
}) {
  const parts = useMemo(() => createBuilding(scene), [scene]);
  const { camera } = useThree();
  const [fractures, setFractures] = useState<Record<string, FractureRecord>>(
    {},
  );
  const lastProcessedPulse = useRef(0);
  const accumulatedStress = useRef<Record<string, number>>({});
  const collapseHandledImpacts = useRef(new Set<number>());
  // Pending collapse waves. Kept outside the effect's cleanup so applying one
  // wave (which changes `fractures`) does not cancel the waves after it.
  const waveTimers = useRef<number[]>([]);
  const clearWaves = () => {
    waveTimers.current.forEach((timer) => window.clearTimeout(timer));
    waveTimers.current = [];
  };
  useEffect(() => clearWaves, []);

  useEffect(() => {
    clearWaves();
    lastBlast.current = 0;
    setFractures({});
    accumulatedStress.current = {};
    collapseHandledImpacts.current.clear();
    onDamage(0);
    onStress("Load paths stable");
  }, [onDamage, onStress, resetToken, scene.id]);

  // One strike: stress parts near the point and fail those past their
  // strength. Player tool uses and the gas-leak blast both come through here.
  // Returns a cleanup that cancels the pending fracture.
  const scheduleStrike = useCallback(
    (tool: ToolId, target: TargetSelection, impactId: number) => {
      const impactDirection = new Vector3(
        target.point[0] - camera.position.x,
        0,
        target.point[2] - camera.position.z,
      );
      if (impactDirection.lengthSq() < 0.01) impactDirection.set(-1, 0, 0);
      impactDirection.normalize();
      const record: FractureRecord = {
        tool,
        point: target.point,
        direction: [impactDirection.x, 0, impactDirection.z],
        impactId,
      };
      const nearby = parts
        .filter(
          (part) =>
            part.id === target.partId ||
            distanceToPart(target.point, part) <= impactRadii[tool],
        )
        .sort((first, second) => {
          if (first.id === target.partId) return -1;
          if (second.id === target.partId) return 1;
          return (
            distanceToPart(target.point, first) -
            distanceToPart(target.point, second)
          );
        })
        .slice(0, impactPartLimits[tool]);

      const fractureTimer = window.setTimeout(
        () => {
          const failedParts: BuildingPartSpec[] = [];
          let targetStress = accumulatedStress.current[target.partId] ?? 0;
          for (const part of nearby) {
            const distance = distanceToPart(target.point, part);
            const proximity =
              part.id === target.partId
                ? 1
                : MathUtils.clamp(1 - distance / impactRadii[tool], 0.22, 0.82);
            const previous = accumulatedStress.current[part.id] ?? 0;
            const next =
              previous +
              (toolStress[tool] * proximity) /
                (partStrength[part.kind] * materialStrength[part.material]);
            accumulatedStress.current[part.id] = next;
            if (part.id === target.partId) targetStress = next;
            if (next >= 1) failedParts.push(part);
          }

          if (failedParts.length === 0) {
            onStress(
              `${target.label.split(" - ")[0]} at ${Math.min(99, Math.round(targetStress * 100))}% stress - holding`,
            );
            return;
          }

          onStress(
            `${failedParts.length} local elements failed - checking load paths`,
          );
          setFractures((current) => {
            const next = { ...current };
            failedParts.forEach((part) => {
              next[part.id] = record;
            });
            return next;
          });
        },
        (impactDelays[tool] + (tool === "plasma" ? 150 : 260)) / playbackRate,
      );

      return () => {
        window.clearTimeout(fractureTimer);
      };
    },
    [camera, onStress, parts, playbackRate],
  );

  useEffect(() => {
    if (pulse === 0) {
      lastProcessedPulse.current = 0;
      return;
    }
    if (lastProcessedPulse.current === pulse) return;
    lastProcessedPulse.current = pulse;
    return scheduleStrike(tool, target, pulse);
  }, [pulse, scheduleStrike, target, tool]);

  // A free blast that is not a tool use (rule 20's dormant gas leak).
  const lastBlast = useRef(0);
  useEffect(() => {
    if (!blast || lastBlast.current === blast.id) return;
    lastBlast.current = blast.id;
    return scheduleStrike(
      "dynamite",
      { point: blast.point, partId: "", label: "Gas leak blast" },
      blast.id,
    );
  }, [blast, scheduleStrike]);
  useEffect(() => {
    const failedIds = new Set(Object.keys(fractures));
    onDamage(Math.round((failedIds.size / parts.length) * 100));
    // Object keys keep insertion order: the order parts failed in.
    onFailures(
      Object.entries(fractures).map(([id, record]) => ({
        id,
        tool: record.tool,
      })),
    );
    if (failedIds.size === 0) return;

    const records = Object.values(fractures);
    const source =
      records
        .filter((record) => !record.structural)
        .sort((first, second) => second.impactId - first.impactId)[0] ??
      records[records.length - 1];
    if (collapseHandledImpacts.current.has(source.impactId)) return;

    // Every part left without a load path falls, wherever it is. The analysis
    // covers all failures so far, so a newer impact replacing the pending
    // waves still drops anything an earlier impact left unsupported.
    const unsupported = analyzeStructuralSupport(parts, failedIds);
    clearWaves();

    collapseHandledImpacts.current.add(source.impactId);
    if (unsupported.length === 0) {
      onStress("Load paths redistributed - stable");
      return;
    }

    onStress(`${unsupported.length} unsupported elements collapsing`);
    const structuralRecord: FractureRecord = {
      ...source,
      structural: true,
    };

    // Release the collapse outward in waves 0.35 s apart (simulated time).
    collapseWaves(parts, failedIds, unsupported).forEach((wave, index) => {
      waveTimers.current.push(
        window.setTimeout(
          () => {
            setFractures((current) => {
              const next = { ...current };
              wave.forEach((part) => {
                if (!next[part.id]) next[part.id] = structuralRecord;
              });
              return next;
            });
          },
          (520 + index * 350) / playbackRate,
        ),
      );
    });
  }, [fractures, onDamage, onFailures, onStress, parts, playbackRate]);
  return (
    <>
      {parts.map((part) => (
        <BuildingPart
          key={part.id}
          part={part}
          fracture={fractures[part.id]}
          onTarget={onTarget}
          debrisHazards={debrisHazards}
        />
      ))}
    </>
  );
}
function Surface({ surface }: { surface: EnvironmentSurface }) {
  const horizontal = surface.scale[0] >= surface.scale[2];
  const roadLength = horizontal ? surface.scale[0] : surface.scale[2];
  const roadWidth = horizontal ? surface.scale[2] : surface.scale[0];
  const dashCount = Math.max(2, Math.floor(roadLength / 2.7));

  return (
    <group position={surface.position} rotation={[0, surface.rotation, 0]}>
      <mesh receiveShadow position={[0, -surface.scale[1] / 2, 0]}>
        <boxGeometry args={surface.scale} />
        <meshStandardMaterial
          color={surface.color}
          metalness={surface.kind === "water" ? 0.16 : 0}
          opacity={surface.kind === "water" ? 0.72 : 1}
          roughness={surface.kind === "water" ? 0.12 : 0.92}
          transparent={surface.kind === "water"}
        />
      </mesh>

      {surface.kind === "road" && (
        <>
          {Array.from({ length: dashCount }, (_, index) => {
            const travel =
              -roadLength / 2 + ((index + 0.5) / dashCount) * roadLength;
            return (
              <mesh
                key={`${surface.id}-dash-${index}`}
                position={horizontal ? [travel, 0.035, 0] : [0, 0.035, travel]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry
                  args={horizontal ? [1.25, 0.075] : [0.075, 1.25]}
                />
                <meshBasicMaterial color="#e2ded2" />
              </mesh>
            );
          })}

          {[-1, 1].map((side) => (
            <mesh
              key={`${surface.id}-curb-${side}`}
              castShadow
              receiveShadow
              position={
                horizontal
                  ? [0, 0.075, side * (roadWidth / 2 + 0.12)]
                  : [side * (roadWidth / 2 + 0.12), 0.075, 0]
              }
            >
              <boxGeometry
                args={
                  horizontal ? [roadLength, 0.15, 0.2] : [0.2, 0.15, roadLength]
                }
              />
              <meshStandardMaterial color="#c4c3bd" roughness={0.92} />
            </mesh>
          ))}

          {roadLength > 14 &&
            Array.from({ length: 6 }, (_, index) => {
              const stripe = (index - 2.5) * 0.32;
              return (
                <mesh
                  key={`${surface.id}-crosswalk-${index}`}
                  position={horizontal ? [stripe, 0.04, 0] : [0, 0.04, stripe]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry
                    args={
                      horizontal
                        ? [0.18, roadWidth * 0.72]
                        : [roadWidth * 0.72, 0.18]
                    }
                  />
                  <meshBasicMaterial color="#d7d5cd" />
                </mesh>
              );
            })}
        </>
      )}

      {surface.kind === "rail" && (
        <>
          {[-0.62, 0.62].map((z) => (
            <mesh key={z} position={[0, 0.07, z]}>
              <boxGeometry args={[surface.scale[0], 0.1, 0.09]} />
              <meshStandardMaterial
                color="#4f5455"
                metalness={0.75}
                roughness={0.42}
              />
            </mesh>
          ))}
          {Array.from(
            { length: Math.ceil(surface.scale[0] / 1.05) },
            (_, index) => (
              <mesh
                key={`${surface.id}-sleeper-${index}`}
                position={[-surface.scale[0] / 2 + index * 1.05, 0.035, 0]}
              >
                <boxGeometry args={[0.13, 0.08, 2]} />
                <meshStandardMaterial color="#6b5f52" roughness={0.9} />
              </mesh>
            ),
          )}
        </>
      )}
    </group>
  );
}
function Wheel({ position }: { position: Vec3 }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.27, 0.27, 0.18, 10]} />
      <meshStandardMaterial color="#24292c" roughness={0.86} />
    </mesh>
  );
}

function ArchitectureBuilding({ prop }: { prop: EnvironmentProp }) {
  const [width, height, depth] = prop.scale;
  const style = prop.style ?? "farm";
  const gabled = style === "farm" || style === "machiya";
  const glass = style === "metro";
  const floorCount = Math.max(2, Math.min(6, Math.round(height / 1.45)));
  const bayCount = Math.max(2, Math.min(5, Math.round(width / 1.5)));
  const trim =
    style === "industrial"
      ? "#493d38"
      : style === "machiya"
        ? "#3f3831"
        : style === "civic"
          ? "#d1cbc0"
          : glass
            ? "#586b71"
            : "#756a5f";

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={prop.color}
          metalness={glass ? 0.18 : style === "industrial" ? 0.05 : 0.01}
          roughness={glass ? 0.58 : style === "industrial" ? 0.9 : 0.86}
        />
      </mesh>

      {gabled ? (
        <>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              castShadow
              position={[0, height + depth * 0.22, side * depth * 0.28]}
              rotation={[side * 0.58, 0, 0]}
            >
              <boxGeometry args={[width * 1.08, 0.16, depth * 0.72]} />
              <meshStandardMaterial
                color={style === "machiya" ? "#414341" : "#676a67"}
                roughness={0.92}
              />
            </mesh>
          ))}
          {Array.from({ length: bayCount + 1 }, (_, index) => {
            const x = -width / 2 + (index / bayCount) * width;
            return (
              <mesh key={x} position={[x, height * 0.5, depth / 2 + 0.03]}>
                <boxGeometry args={[0.08, height, 0.08]} />
                <meshStandardMaterial color={trim} roughness={0.88} />
              </mesh>
            );
          })}
          {[0.34, 0.68].map((level) => (
            <mesh key={level} position={[0, height * level, depth / 2 + 0.035]}>
              <boxGeometry args={[width, 0.08, 0.08]} />
              <meshStandardMaterial color={trim} roughness={0.88} />
            </mesh>
          ))}
        </>
      ) : (
        <>
          <mesh castShadow position={[0, height + 0.14, 0]}>
            <boxGeometry args={[width * 1.04, 0.28, depth * 1.04]} />
            <meshStandardMaterial color={trim} roughness={0.72} />
          </mesh>
          {style === "civic" &&
            Array.from({ length: 5 }, (_, index) => (
              <mesh
                key={index}
                castShadow
                position={[
                  -width * 0.38 + index * width * 0.19,
                  height * 0.38,
                  depth / 2 + 0.26,
                ]}
              >
                <cylinderGeometry
                  args={[width * 0.035, width * 0.045, height * 0.72, 12]}
                />
                <meshStandardMaterial color="#d7d2c8" roughness={0.82} />
              </mesh>
            ))}
        </>
      )}

      {Array.from({ length: floorCount }, (_, floor) =>
        Array.from({ length: bayCount }, (__, bay) => {
          const x =
            -width * 0.4 + (bay / Math.max(1, bayCount - 1)) * width * 0.8;
          const y = ((floor + 0.62) / floorCount) * height;
          const windowColor =
            style === "machiya"
              ? "#d7d2bf"
              : style === "farm"
                ? "#80969a"
                : style === "industrial"
                  ? "#53666b"
                  : style === "civic"
                    ? "#78949a"
                    : "#82adba";
          return (
            <mesh key={`${floor}-${bay}`} position={[x, y, depth / 2 + 0.045]}>
              <boxGeometry
                args={[
                  Math.min(0.72, width / (bayCount + 1)),
                  Math.min(0.72, height / (floorCount + 1)),
                  0.05,
                ]}
              />
              {glass ? (
                <meshPhysicalMaterial
                  color={windowColor}
                  metalness={0.26}
                  opacity={0.82}
                  roughness={0.2}
                  transparent
                />
              ) : (
                <meshStandardMaterial
                  color={windowColor}
                  emissive={style === "machiya" ? "#4d493c" : "#1d3035"}
                  emissiveIntensity={style === "machiya" ? 0.04 : 0.08}
                  metalness={0.03}
                  roughness={style === "machiya" ? 0.72 : 0.38}
                />
              )}
            </mesh>
          );
        }),
      )}

      {(style === "industrial" || glass) &&
        Array.from({ length: floorCount }, (_, index) => (
          <mesh
            key={index}
            position={[
              0,
              ((index + 1) / floorCount) * height,
              depth / 2 + 0.02,
            ]}
          >
            <boxGeometry args={[width * 1.01, 0.075, 0.075]} />
            <meshStandardMaterial color={trim} metalness={glass ? 0.4 : 0.08} />
          </mesh>
        ))}
    </group>
  );
}

function PropModel({ prop, time }: { prop: EnvironmentProp; time: number }) {
  const [width, height, depth] = prop.scale;
  const walking = prop.path ? Math.sin(time * prop.path.speed * 8) * 0.08 : 0;

  switch (prop.kind) {
    case "building":
      return <ArchitectureBuilding prop={prop} />;
    case "tree":
      return (
        <group>
          <mesh castShadow position={[0, height * 0.34, 0]}>
            <cylinderGeometry
              args={[width * 0.12, width * 0.18, height * 0.68, 8]}
            />
            <meshStandardMaterial color="#72604a" roughness={1} />
          </mesh>
          <mesh
            castShadow
            position={[0, height * 0.82, 0]}
            scale={[width, height * 0.48, depth]}
          >
            <icosahedronGeometry args={[0.62, 1]} />
            <meshStandardMaterial color={prop.color} roughness={0.96} />
          </mesh>
        </group>
      );
    case "lamp":
      return (
        <group>
          <mesh castShadow position={[0, height / 2, 0]}>
            <cylinderGeometry args={[0.045, 0.07, height, 8]} />
            <meshStandardMaterial color="#4d5558" metalness={0.62} />
          </mesh>
          <mesh position={[0, height, 0]}>
            <sphereGeometry args={[width * 0.22, 10, 8]} />
            <meshStandardMaterial
              color="#fff1bf"
              emissive="#ffd980"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      );
    case "field":
      return (
        <group>
          <mesh receiveShadow position={[0, 0.03, 0]}>
            <boxGeometry args={[width, 0.06, depth]} />
            <meshStandardMaterial color={prop.color} roughness={1} />
          </mesh>
          {Array.from({ length: 7 }, (_, index) => (
            <mesh
              key={index}
              position={[-width / 2 + (index + 1) * (width / 8), height / 2, 0]}
            >
              <boxGeometry args={[0.08, height, depth * 0.9]} />
              <meshStandardMaterial color="#8d9d56" roughness={1} />
            </mesh>
          ))}
        </group>
      );
    case "vehicle":
      return (
        <group position={[0, 0.3, 0]}>
          <mesh castShadow position={[0, height * 0.32, 0]}>
            <boxGeometry args={[width, height * 0.42, depth]} />
            <meshStandardMaterial
              color={prop.color}
              metalness={0.18}
              roughness={0.55}
            />
          </mesh>
          <mesh castShadow position={[-width * 0.12, height * 0.68, 0]}>
            <boxGeometry args={[width * 0.5, height * 0.38, depth * 0.82]} />
            <meshStandardMaterial
              color="#82969c"
              metalness={0.08}
              roughness={0.28}
            />
          </mesh>
          {[
            [-width * 0.32, 0, -depth * 0.47],
            [width * 0.32, 0, -depth * 0.47],
            [-width * 0.32, 0, depth * 0.47],
            [width * 0.32, 0, depth * 0.47],
          ].map((position, index) => (
            <Wheel key={index} position={position as Vec3} />
          ))}
        </group>
      );
    case "pedestrian":
      return (
        <group position={[0, walking, 0]}>
          <mesh castShadow position={[0, height * 0.88, 0]}>
            <sphereGeometry args={[width * 0.19, 10, 8]} />
            <meshStandardMaterial color="#c89e7b" />
          </mesh>
          <mesh castShadow position={[0, height * 0.53, 0]}>
            <capsuleGeometry args={[width * 0.2, height * 0.34, 5, 8]} />
            <meshStandardMaterial color={prop.color} roughness={0.84} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} rotation={[side * walking * 2.5, 0, 0]}>
              <mesh position={[side * width * 0.12, height * 0.18, 0]}>
                <boxGeometry args={[width * 0.1, height * 0.34, width * 0.1]} />
                <meshStandardMaterial color="#41484d" />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "animal":
      return (
        <group position={[0, Math.abs(walking) * 0.6, 0]}>
          <mesh
            castShadow
            position={[0, height * 0.54, 0]}
            scale={[width, height * 0.55, depth]}
          >
            <sphereGeometry args={[0.5, 10, 7]} />
            <meshStandardMaterial color={prop.color} roughness={0.96} />
          </mesh>
          <mesh castShadow position={[width * 0.52, height * 0.64, 0]}>
            <sphereGeometry args={[height * 0.22, 9, 7]} />
            <meshStandardMaterial color={prop.color} roughness={0.96} />
          </mesh>
          {[-0.28, 0.28].flatMap((x) =>
            [-0.27, 0.27].map((z) => (
              <mesh
                key={`${x}-${z}`}
                position={[width * x, height * 0.22, depth * z]}
              >
                <cylinderGeometry args={[0.045, 0.055, height * 0.42, 7]} />
                <meshStandardMaterial color="#6c5c4a" />
              </mesh>
            )),
          )}
        </group>
      );
    case "market":
      return (
        <group>
          {[-0.44, 0.44].flatMap((x) =>
            [-0.42, 0.42].map((z) => (
              <mesh
                key={`${x}-${z}`}
                position={[width * x, height / 2, depth * z]}
              >
                <cylinderGeometry args={[0.035, 0.035, height, 7]} />
                <meshStandardMaterial color="#5f5145" />
              </mesh>
            )),
          )}
          <mesh
            castShadow
            position={[0, height, 0]}
            rotation={[0, 0, Math.PI / 16]}
          >
            <boxGeometry args={[width, 0.09, depth]} />
            <meshStandardMaterial color={prop.color} side={DoubleSide} />
          </mesh>
          <mesh position={[0, height * 0.42, 0]}>
            <boxGeometry args={[width * 0.72, height * 0.16, depth * 0.72]} />
            <meshStandardMaterial color="#a67d4b" />
          </mesh>
        </group>
      );
    case "tank":
      return (
        <group>
          <mesh castShadow position={[0, height / 2, 0]}>
            <cylinderGeometry args={[width / 2, width / 2, height, 18]} />
            <meshStandardMaterial
              color={prop.color}
              metalness={0.36}
              roughness={0.46}
            />
          </mesh>
          <mesh
            castShadow
            position={[0, height, 0]}
            scale={[width, width * 0.35, depth]}
          >
            <sphereGeometry args={[0.5, 16, 8]} />
            <meshStandardMaterial
              color={prop.color}
              metalness={0.36}
              roughness={0.46}
            />
          </mesh>
        </group>
      );
    case "stack":
      return (
        <group>
          <mesh castShadow position={[0, height / 2, 0]}>
            <cylinderGeometry args={[width * 0.34, width * 0.5, height, 16]} />
            <meshStandardMaterial color={prop.color} roughness={0.78} />
          </mesh>
          {[0.28, 0.58, 0.82].map((level) => (
            <mesh key={level} position={[0, height * level, 0]}>
              <torusGeometry args={[width * 0.4, 0.055, 6, 16]} />
              <meshStandardMaterial color="#d4d0c7" />
            </mesh>
          ))}
        </group>
      );
    case "fence":
      return (
        <group>
          {[-0.5, 0, 0.5].map((x) => (
            <mesh key={x} position={[width * x, height / 2, 0]}>
              <boxGeometry args={[0.08, height, 0.08]} />
              <meshStandardMaterial color={prop.color} />
            </mesh>
          ))}
          {[0.34, 0.72].map((level) => (
            <mesh key={level} position={[0, height * level, 0]}>
              <boxGeometry args={[width, 0.08, 0.08]} />
              <meshStandardMaterial color={prop.color} />
            </mesh>
          ))}
        </group>
      );
    case "bench":
      return (
        <group>
          <mesh castShadow position={[0, height * 0.46, 0]}>
            <boxGeometry args={[width, 0.12, depth]} />
            <meshStandardMaterial color={prop.color} />
          </mesh>
          <mesh
            castShadow
            position={[0, height * 0.78, -depth * 0.36]}
            rotation={[-0.12, 0, 0]}
          >
            <boxGeometry args={[width, height * 0.5, 0.1]} />
            <meshStandardMaterial color={prop.color} />
          </mesh>
          {[-0.36, 0.36].map((x) => (
            <mesh key={x} position={[width * x, height * 0.2, 0]}>
              <boxGeometry args={[0.09, height * 0.4, 0.09]} />
              <meshStandardMaterial color="#41484c" metalness={0.4} />
            </mesh>
          ))}
        </group>
      );
    case "fountain":
      return (
        <group>
          <mesh receiveShadow position={[0, height * 0.12, 0]}>
            <cylinderGeometry
              args={[width / 2, width / 2, height * 0.24, 24]}
            />
            <meshStandardMaterial color={prop.color} roughness={0.8} />
          </mesh>
          <mesh position={[0, height * 0.26, 0]}>
            <cylinderGeometry args={[width * 0.4, width * 0.4, 0.04, 24]} />
            <meshStandardMaterial color="#83b6c1" transparent opacity={0.66} />
          </mesh>
          <mesh position={[0, height * 0.62, 0]}>
            <cylinderGeometry
              args={[width * 0.08, width * 0.13, height * 0.75, 12]}
            />
            <meshStandardMaterial color={prop.color} />
          </mesh>
        </group>
      );
    case "train":
      return (
        <group position={[0, height * 0.4, 0]}>
          <mesh castShadow position={[0, height * 0.32, 0]}>
            <boxGeometry args={[width, height * 0.65, depth]} />
            <meshStandardMaterial
              color={prop.color}
              metalness={0.26}
              roughness={0.42}
            />
          </mesh>
          {[-0.28, -0.08, 0.12, 0.32].map((x) => (
            <mesh
              key={x}
              position={[width * x, height * 0.48, depth / 2 + 0.015]}
            >
              <boxGeometry args={[width * 0.13, height * 0.2, 0.03]} />
              <meshStandardMaterial
                color="#83a0a9"
                emissive="#27444d"
                emissiveIntensity={0.2}
              />
            </mesh>
          ))}
          {[-0.36, 0, 0.36].flatMap((x) =>
            [-0.46, 0.46].map((z) => (
              <Wheel
                key={`${x}-${z}`}
                position={[width * x, -height * 0.24, depth * z]}
              />
            )),
          )}
        </group>
      );
    case "crate":
      return (
        <group position={[0, height / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={prop.color} roughness={0.94} />
          </mesh>
          {[Math.PI / 4, -Math.PI / 4].map((angle) => (
            <mesh
              key={angle}
              position={[0, 0, depth / 2 + 0.015]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[width * 1.2, 0.07, 0.035]} />
              <meshStandardMaterial color="#6e5135" />
            </mesh>
          ))}
        </group>
      );
    case "utility-pole":
      return (
        <group>
          <mesh castShadow position={[0, height / 2, 0]}>
            <cylinderGeometry args={[0.09, 0.14, height, 9]} />
            <meshStandardMaterial color={prop.color} roughness={0.92} />
          </mesh>
          <mesh castShadow position={[0, height * 0.82, 0]}>
            <boxGeometry args={[1.25, 0.1, 0.1]} />
            <meshStandardMaterial color="#4c4640" roughness={0.9} />
          </mesh>
          {[-0.3, 0, 0.3].map((z) => (
            <mesh
              key={z}
              position={[0, height * (0.82 - Math.abs(z) * 0.08), z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.018, 0.018, width, 6]} />
              <meshStandardMaterial
                color="#596164"
                metalness={0.38}
                opacity={0.58}
                transparent
              />
            </mesh>
          ))}
        </group>
      );
    case "mountain":
      return (
        <mesh
          receiveShadow
          position={[0, height * 0.28, 0]}
          rotation={[0, prop.rotation + 0.2, -0.04]}
          scale={[width * 0.62, height * 0.72, depth * 0.72]}
        >
          <icosahedronGeometry args={[0.72, 1]} />
          <meshStandardMaterial color={prop.color} roughness={1} />
        </mesh>
      );
    case "fire-escape":
      return (
        <group>
          {[0.25, 0.5, 0.75].map((level, index) => (
            <group key={level} position={[0, height * level, 0]}>
              <mesh castShadow>
                <boxGeometry args={[width, 0.1, depth]} />
                <meshStandardMaterial color={prop.color} metalness={0.62} />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * width * 0.46, 0.36, 0]}>
                  <boxGeometry args={[0.06, 0.72, depth]} />
                  <meshStandardMaterial color={prop.color} metalness={0.62} />
                </mesh>
              ))}
              {index < 2 && (
                <mesh
                  position={[0, height * 0.12, depth * 0.15]}
                  rotation={[0, 0, index % 2 ? -0.6 : 0.6]}
                >
                  <boxGeometry args={[width * 0.82, 0.08, 0.36]} />
                  <meshStandardMaterial color={prop.color} metalness={0.62} />
                </mesh>
              )}
            </group>
          ))}
        </group>
      );
    case "bollard":
      return (
        <group>
          <mesh castShadow position={[0, height / 2, 0]}>
            <cylinderGeometry args={[width * 0.32, width * 0.42, height, 10]} />
            <meshStandardMaterial
              color={prop.color}
              metalness={0.55}
              roughness={0.48}
            />
          </mesh>
          <mesh position={[0, height, 0]}>
            <sphereGeometry args={[width * 0.36, 10, 7]} />
            <meshStandardMaterial color={prop.color} metalness={0.55} />
          </mesh>
        </group>
      );
  }
}

const calloutLines: Record<string, string[]> = {
  vehicle: [
    "Road's blocked!",
    "Honk! Honk!",
    "Now I'm late...",
    "Who parked a wall here?",
    "Seriously?!",
    "I just washed this car!",
  ],
  pedestrian: [
    "Hey, I walk here!",
    "That nearly hit me!",
    "Can't get through!",
    "Ugh, all this dust...",
    "Is it safe?!",
    "My commute...",
  ],
  animal: ["?!", "!!"],
  train: ["Track blocked!", "Toot toot!", "Delays ahead..."],
};
// Each complaint pops in, holds, then fades; after a few they give up.
const CALLOUT_CYCLE = 3.2;
const CALLOUT_COUNT = 3;

function calloutOpacity(talking: number) {
  const line = Math.floor(talking / CALLOUT_CYCLE);
  if (talking < 0 || line >= CALLOUT_COUNT) return 0;
  const t = talking - line * CALLOUT_CYCLE;
  if (t < 0.25) return t / 0.25;
  return MathUtils.clamp(1 - (t - 2.2) / 0.8, 0, 1);
}

// One texture per line, shared by every actor that says it.
const calloutTextures = new Map<string, CanvasTexture | null>();

function calloutTexture(text: string) {
  if (!calloutTextures.has(text)) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      context.font = "600 40px system-ui, sans-serif";
      const width = Math.min(500, context.measureText(text).width + 56);
      const left = (512 - width) / 2;
      // A speech balloon: a pill with a curved tail toward the speaker.
      context.fillStyle = "#fffdf7";
      context.shadowColor = "rgba(20, 24, 31, 0.35)";
      context.shadowBlur = 6;
      context.beginPath();
      context.roundRect(left, 6, width, 84, 42);
      context.moveTo(236, 84);
      context.quadraticCurveTo(250, 104, 240, 122);
      context.quadraticCurveTo(266, 108, 276, 84);
      context.fill();
      context.shadowColor = "transparent";
      context.fillStyle = "#1b2029";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 256, 49);
    }
    const texture = context ? new CanvasTexture(canvas) : null;
    if (texture) texture.colorSpace = SRGBColorSpace;
    calloutTextures.set(text, texture);
  }
  return calloutTextures.get(text) ?? null;
}

function AnimatedEnvironmentProp({
  prop,
  motionIndex,
  motionCount,
  motionOrigin,
  route,
  dangerActive,
  impactPoint,
  footprint,
  debrisHazards,
  movers,
  playbackRate,
}: {
  prop: EnvironmentProp;
  motionIndex: number;
  motionCount: number;
  motionOrigin: number;
  route: string;
  dangerActive: boolean;
  impactPoint: Vec3;
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number };
  debrisHazards: DebrisHazardRegistry;
  movers: MoverRegistry;
  playbackRate: number;
}) {
  const group = useRef<Group>(null);
  const start = useRef(performance.now() / 1000);
  // Simulation time for this actor, so the time scale and pause apply to
  // traffic and pedestrians as they do to the physics.
  const motionTime = useRef(0);
  // Route progress only advances while the way ahead is clear.
  const travel = useRef(0);
  const last = useRef<{ x: number; z: number } | null>(null);
  const heldFor = useRef(0);
  const callout = useRef<Sprite>(null);
  const shown = useRef(0);
  const saying = useRef(0);
  const reaction = useRef(0);
  const directionSeed = useMemo(() => numberHash(prop.id)(), [prop.id]);
  const lines = prop.path ? calloutLines[prop.kind] : undefined;
  const firstLine = Math.floor(directionSeed * (lines?.length ?? 0));
  const calloutMap = lines ? calloutTexture(lines[firstLine]) : null;
  const phaseSeed = useMemo(
    () =>
      ((motionIndex +
        (prop.path?.direction === -1 ? 0.65 : 0) +
        directionSeed * 0.05) /
        Math.max(1, motionCount)) %
      1,
    [directionSeed, motionCount, motionIndex, prop.path?.direction],
  );

  useFrame(({ camera }, delta) => {
    if (!group.current) return;
    const step = delta * playbackRate;
    motionTime.current += step;
    const nextTravel = travel.current + step;
    const now = performance.now() / 1000;
    const entrance = MathUtils.clamp(
      (now - start.current - prop.delay) / 0.72,
      0,
      1,
    );
    const eased = 1 - Math.pow(1 - entrance, 3);
    const reactionTarget = dangerActive ? 1 : 0;
    reaction.current = MathUtils.lerp(
      reaction.current,
      reactionTarget,
      Math.min(1, step * (dangerActive ? 2.1 : 3.4)),
    );

    group.current.scale.setScalar(Math.max(eased, 0.001));
    group.current.position.set(
      prop.position[0],
      prop.kind === "train" ? prop.position[1] : 0,
      prop.position[2],
    );
    group.current.rotation.y = prop.rotation;

    if (prop.path && entrance >= 1) {
      const speedScale =
        prop.kind === "vehicle"
          ? 0.1
          : prop.kind === "pedestrian"
            ? 0.18
            : prop.kind === "animal"
              ? 0.16
              : prop.kind === "train"
                ? 0.03
                : 0.1;
      const cycle = nextTravel * prop.path.speed * speedScale + phaseSeed;
      const phase = cycle - Math.floor(cycle);
      const offset = (phase * 2 - 1) * prop.path.distance * prop.path.direction;
      const lane =
        prop.path.direction *
        (prop.kind === "vehicle"
          ? 0.76
          : prop.kind === "pedestrian" || prop.kind === "animal"
            ? 0.24
            : 0);
      if (prop.path.axis === "x") {
        group.current.position.x = motionOrigin + offset;
        group.current.position.z += lane;
        group.current.rotation.y = prop.path.direction > 0 ? 0 : Math.PI;
      } else {
        group.current.position.z = motionOrigin + offset;
        group.current.position.x += lane;
        group.current.rotation.y =
          prop.path.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
    }

    const reactsToDanger =
      prop.kind === "vehicle" ||
      prop.kind === "pedestrian" ||
      prop.kind === "animal";
    if (reactsToDanger && reaction.current > 0.001) {
      const dx = group.current.position.x - impactPoint[0];
      const dz = group.current.position.z - impactPoint[2];
      const fallback = directionSeed > 0.5 ? 1 : -1;
      const length = Math.hypot(dx, dz);
      const awayX = length > 0.3 ? dx / length : fallback;
      const awayZ = length > 0.3 ? dz / length : -fallback;

      if (prop.kind === "vehicle" && prop.path) {
        const axisDelta =
          prop.path.axis === "x"
            ? group.current.position.x - impactPoint[0]
            : group.current.position.z - impactPoint[2];
        const direction =
          Math.abs(axisDelta) > 0.25 ? Math.sign(axisDelta) : fallback;
        const evacuation = direction * 5.8 * reaction.current;
        if (prop.path.axis === "x") {
          group.current.position.x += evacuation;
          group.current.rotation.y = direction > 0 ? 0 : Math.PI;
        } else {
          group.current.position.z += evacuation;
          group.current.rotation.y = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
        }
      } else {
        const evacuation =
          (prop.kind === "pedestrian" ? 4.8 : 3.8) * reaction.current;
        group.current.position.x += awayX * evacuation;
        group.current.position.z += awayZ * evacuation;
        group.current.rotation.y = Math.atan2(awayX, awayZ);
      }
    }

    if (
      reactsToDanger &&
      group.current.position.x > footprint.minX &&
      group.current.position.x < footprint.maxX &&
      group.current.position.z > footprint.minZ &&
      group.current.position.z < footprint.maxZ
    ) {
      if (prop.path?.axis === "z") {
        const leftDistance = group.current.position.x - footprint.minX;
        const rightDistance = footprint.maxX - group.current.position.x;
        group.current.position.x =
          leftDistance < rightDistance ? footprint.minX : footprint.maxX;
      } else {
        const backDistance = group.current.position.z - footprint.minZ;
        const frontDistance = footprint.maxZ - group.current.position.z;
        group.current.position.z =
          backDistance < frontDistance ? footprint.minZ : footprint.maxZ;
      }
    }

    if (
      (prop.kind === "pedestrian" || prop.kind === "animal") &&
      debrisHazards.current.size > 0
    ) {
      const steered = steerAroundDebris(
        {
          x: group.current.position.x,
          z: group.current.position.z,
        },
        debrisHazards.current.values(),
        prop.path?.axis,
        directionSeed,
        prop.kind === "pedestrian" ? 0.3 : 0.42,
      );
      group.current.position.x = steered.x;
      group.current.position.z = steered.z;
    }

    // Wait at rubble or behind the actor ahead instead of walking through.
    let held = false;
    // Only the actor facing the rubble complains, not the queue behind it.
    let facesRubble = false;
    const rides = prop.kind === "vehicle" || prop.kind === "train";
    if ((reactsToDanger || rides) && prop.path && entrance >= 1) {
      const to = { x: group.current.position.x, z: group.current.position.z };
      const from = last.current;
      const radius = rides
        ? prop.scale[0] / 2 + 0.1
        : prop.kind === "pedestrian"
          ? 0.3
          : 0.42;
      const halfWidth = rides ? prop.scale[2] / 2 : radius;
      // A jump this long is the wrap back to the route start, not a move.
      if (from && Math.hypot(to.x - from.x, to.z - from.z) < 1.5) {
        // Traffic also yields to people; people don't wait for traffic, so
        // two actors can never wait on each other.
        const queue = [...movers.current.values()].filter(
          (mover) =>
            (mover.route === route && mover.id !== prop.id) ||
            (rides && (mover.kind === "pedestrian" || mover.kind === "animal")),
        );
        facesRubble = blockedAhead(
          from,
          to,
          debrisHazards.current.values(),
          radius,
          halfWidth,
        );
        held = facesRubble || blockedAhead(from, to, queue, radius, halfWidth);
      }
      if (held && from) {
        group.current.position.x = from.x;
        group.current.position.z = from.z;
      } else {
        travel.current = nextTravel;
        last.current = to;
      }
      movers.current.set(prop.id, {
        id: prop.id,
        x: group.current.position.x,
        z: group.current.position.z,
        radius,
        route,
        kind: prop.kind,
      });
    } else {
      travel.current = nextTravel;
    }

    if (
      (prop.kind === "pedestrian" || prop.kind === "animal") &&
      entrance >= 1 &&
      !held
    ) {
      const pace = dangerActive ? 9 : 5;
      group.current.position.y =
        Math.abs(Math.sin(motionTime.current * pace + prop.delay)) * 0.045;
    }

    // Complain once stuck for a moment, staggered so neighbours take turns;
    // a paused clock freezes the balloon, moving on lets it fade.
    if (callout.current && lines && step > 0) {
      heldFor.current = facesRubble ? heldFor.current + step : 0;
      const talking = heldFor.current - (0.6 + directionSeed * 1.2);
      shown.current = facesRubble
        ? calloutOpacity(talking)
        : Math.max(0, shown.current - step * 2);
      const line = Math.floor(Math.max(0, talking) / CALLOUT_CYCLE);
      const material = callout.current.material;
      if (facesRubble && line !== saying.current) {
        saying.current = line;
        material.map = calloutTexture(lines[(firstLine + line) % lines.length]);
      }
      material.opacity = shown.current;
      callout.current.visible = shown.current > 0.01;
    }
    if (callout.current?.visible) {
      // Fixed on-screen size whatever the zoom; the balloon inflates in.
      const size =
        (0.7 + 0.3 * shown.current) / (camera as OrthographicCamera).zoom;
      callout.current.scale.set(184 * size, 46 * size, 1);
    }
  });

  useEffect(() => {
    const registry = movers.current;
    return () => {
      registry.delete(prop.id);
    };
  }, [movers, prop.id]);

  return (
    <group ref={group} rotation={[0, prop.rotation, 0]}>
      <PropModel prop={prop} time={performance.now() / 1000} />
      {calloutMap ? (
        <sprite
          ref={callout}
          visible={false}
          position={[0, prop.scale[1] + 0.35, 0]}
          center={[0.5, 0]}
          renderOrder={20}
        >
          <spriteMaterial map={calloutMap} depthTest={false} transparent />
        </sprite>
      ) : null}
    </group>
  );
}

function Environment({
  scene,
  dangerActive,
  impactPoint,
  debrisHazards,
  playbackRate,
}: {
  scene: ScenePreset;
  dangerActive: boolean;
  impactPoint: Vec3;
  debrisHazards: DebrisHazardRegistry;
  playbackRate: number;
}) {
  const { gl } = useThree();
  const diagnosticsFrame = useRef(0);
  const layout = useMemo(() => createEnvironment(scene), [scene]);
  const footprint = useMemo(() => {
    const parts = createBuilding(scene);
    return parts.reduce(
      (bounds, part) => ({
        minX: Math.min(
          bounds.minX,
          part.position[0] - part.scale[0] / 2 - 0.65,
        ),
        maxX: Math.max(
          bounds.maxX,
          part.position[0] + part.scale[0] / 2 + 0.65,
        ),
        minZ: Math.min(
          bounds.minZ,
          part.position[2] - part.scale[2] / 2 - 0.65,
        ),
        maxZ: Math.max(
          bounds.maxZ,
          part.position[2] + part.scale[2] / 2 + 0.65,
        ),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minZ: Number.POSITIVE_INFINITY,
        maxZ: Number.NEGATIVE_INFINITY,
      },
    );
  }, [scene]);
  const motionSlots = useMemo(() => {
    const moving = layout.props.filter((prop) => prop.path);
    const routes = new Map<string, EnvironmentProp[]>();
    moving.forEach((prop) => {
      const path = prop.path!;
      const perpendicular =
        path.axis === "x" ? prop.position[2] : prop.position[0];
      const routeKey = [
        prop.kind,
        path.axis,
        path.direction,
        Math.round(perpendicular * 4) / 4,
        path.distance,
      ].join(":");
      const route = routes.get(routeKey) ?? [];
      route.push(prop);
      routes.set(routeKey, route);
    });
    const byId = new Map<
      string,
      { index: number; count: number; origin: number; route: string }
    >();
    routes.forEach((route, routeKey) => {
      const path = route[0].path!;
      const origin =
        route.reduce(
          (sum, prop) =>
            sum + (path.axis === "x" ? prop.position[0] : prop.position[2]),
          0,
        ) / route.length;
      route.forEach((prop, index) => {
        byId.set(prop.id, {
          index,
          count: route.length,
          origin,
          route: routeKey,
        });
      });
    });
    return byId;
  }, [layout.props]);
  const movers: MoverRegistry = useRef(new Map());

  useFrame(() => {
    diagnosticsFrame.current = (diagnosticsFrame.current + 1) % 15;
    if (diagnosticsFrame.current === 0) {
      gl.domElement.dataset.debrisHazards = String(debrisHazards.current.size);
    }
  });

  useEffect(
    () => () => {
      delete gl.domElement.dataset.debrisHazards;
    },
    [gl],
  );

  return (
    <group key={scene.id}>
      {layout.surfaces.map((surface) => (
        <Surface key={surface.id} surface={surface} />
      ))}
      {layout.props.map((prop) =>
        (() => {
          const slot = motionSlots.get(prop.id) ?? {
            index: 0,
            count: 1,
            origin:
              prop.path?.axis === "z" ? prop.position[2] : prop.position[0],
            route: prop.id,
          };
          return (
            <AnimatedEnvironmentProp
              key={prop.id}
              prop={prop}
              motionIndex={slot.index}
              motionCount={slot.count}
              motionOrigin={slot.origin}
              route={slot.route}
              dangerActive={dangerActive}
              impactPoint={impactPoint}
              footprint={footprint}
              debrisHazards={debrisHazards}
              movers={movers}
              playbackRate={playbackRate}
            />
          );
        })(),
      )}
    </group>
  );
}

function TargetMarker({ point }: { point: Vec3 }) {
  const marker = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!marker.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 4.5) * 0.12;
    marker.current.scale.setScalar(pulse);
    marker.current.rotation.z = clock.elapsedTime * 0.35;
  });
  return (
    <group ref={marker} position={point}>
      <mesh>
        <torusGeometry args={[0.34, 0.045, 8, 28]} />
        <meshBasicMaterial color="#ed6c2c" depthTest={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.075, 12, 8]} />
        <meshBasicMaterial color="#fff5e9" depthTest={false} />
      </mesh>
    </group>
  );
}

function HammerActor({
  pulse,
  target,
  playbackRate,
}: {
  pulse: number;
  target: Vec3;
  playbackRate: number;
}) {
  const root = useRef<Group>(null);
  const pivot = useRef<Group>(null);
  const started = useRef(-10);
  const activationYaw = useRef(0);
  const { camera } = useThree();
  const pivotX = 1.05;
  const pivotY = 1.25;
  const length = Math.hypot(pivotX, pivotY);
  const impactAngle = Math.atan2(-pivotX, pivotY);

  useEffect(() => {
    if (pulse <= 0) return;
    const cameraX = camera.position.x - target[0];
    const cameraZ = camera.position.z - target[2];
    activationYaw.current = Math.atan2(-cameraZ, cameraX);
    started.current = performance.now() / 1000;
  }, [camera, pulse, target]);

  useFrame(() => {
    if (!root.current || !pivot.current) return;
    const elapsed = (performance.now() / 1000 - started.current) * playbackRate;
    root.current.visible = pulse > 0 && elapsed >= 0 && elapsed < 1.18;
    root.current.position.set(target[0], target[1], target[2]);
    root.current.rotation.y = activationYaw.current;
    root.current.translateX(0.34);

    let angle = -1.9;
    if (elapsed >= 0 && elapsed < 0.18) {
      angle = MathUtils.lerp(-1.9, -2.22, elapsed / 0.18);
    } else if (elapsed < 0.58) {
      const t = MathUtils.clamp((elapsed - 0.18) / 0.4, 0, 1);
      angle = MathUtils.lerp(-2.22, impactAngle, 1 - Math.pow(1 - t, 3));
    } else if (elapsed < 1.12) {
      const t = MathUtils.clamp((elapsed - 0.58) / 0.54, 0, 1);
      angle = MathUtils.lerp(impactAngle, -1.55, Math.sin(t * Math.PI * 0.5));
    }
    pivot.current.rotation.z = angle;
  });

  return (
    <group ref={root}>
      <group ref={pivot} position={[pivotX, pivotY, 0]}>
        <mesh castShadow position={[0, -length / 2, 0]}>
          <cylinderGeometry args={[0.045, 0.06, length, 12]} />
          <meshStandardMaterial color="#8b6040" roughness={0.78} />
        </mesh>
        <mesh castShadow position={[0, -length, 0]}>
          <boxGeometry args={[0.64, 0.28, 0.34]} />
          <meshStandardMaterial
            color="#3f474b"
            metalness={0.72}
            roughness={0.36}
          />
        </mesh>
        <mesh castShadow position={[0, -length + 0.22, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.18, 12]} />
          <meshStandardMaterial color="#596166" metalness={0.62} />
        </mesh>
      </group>
    </group>
  );
}

function RigBeam({
  from,
  to,
  thickness,
}: {
  from: Vec3;
  to: Vec3;
  thickness: number;
}) {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const midpoint = start.add(end).multiplyScalar(0.5);
  const quaternion = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction.normalize(),
  );
  return (
    <mesh
      castShadow
      position={[midpoint.x, midpoint.y, midpoint.z]}
      quaternion={quaternion}
    >
      <boxGeometry args={[thickness, length, thickness * 0.8]} />
      <meshStandardMaterial color="#bd8d36" metalness={0.34} roughness={0.52} />
    </mesh>
  );
}

function WreckingBallActor({
  pulse,
  target,
  playbackRate,
  scene,
}: {
  pulse: number;
  target: Vec3;
  playbackRate: number;
  scene: ScenePreset;
}) {
  const root = useRef<Group>(null);
  const pivot = useRef<Group>(null);
  const started = useRef(-10);
  const activationYaw = useRef(0);
  const { camera } = useThree();
  const deltaX = 5.8;
  const deltaY = 6.2;
  const ballRadius = 0.82;
  const contactDeltaX = deltaX - ballRadius;
  const length = Math.hypot(contactDeltaX, deltaY);
  const impactAngle = Math.asin(-contactDeltaX / length);

  useEffect(() => {
    if (pulse <= 0) return;
    const cameraX = camera.position.x - target[0];
    const cameraZ = camera.position.z - target[2];
    activationYaw.current = clearRigYaw(
      scene,
      target,
      Math.atan2(-cameraZ, cameraX),
      RIG_FOOTPRINTS.crane,
    );
    started.current = performance.now() / 1000;
  }, [camera, pulse, scene, target]);

  useFrame(() => {
    if (!root.current || !pivot.current) return;
    const elapsed = (performance.now() / 1000 - started.current) * playbackRate;
    root.current.visible = pulse > 0 && elapsed >= 0 && elapsed < 1.42;
    root.current.position.set(target[0], 0, target[2]);
    root.current.rotation.y = activationYaw.current;
    let angle = 0.42;
    if (elapsed >= 0 && elapsed < 0.18) {
      angle = MathUtils.lerp(0.42, 0.58, elapsed / 0.18);
    } else if (elapsed < 0.76) {
      const t = MathUtils.clamp((elapsed - 0.18) / 0.58, 0, 1);
      angle = MathUtils.lerp(0.58, impactAngle, 1 - Math.pow(1 - t, 2.4));
    } else if (elapsed < 1.34) {
      const t = (elapsed - 0.76) / 0.58;
      angle = MathUtils.lerp(impactAngle, 0.12, Math.sin(t * Math.PI * 0.5));
    }
    pivot.current.rotation.z = angle;
  });

  return (
    <group ref={root}>
      <group position={[8.8, 0, 4.1]}>
        {[-0.78, 0.78].map((z) => (
          <mesh key={z} castShadow position={[0, 0.42, z]}>
            <boxGeometry args={[3.5, 0.72, 0.58]} />
            <meshStandardMaterial
              color="#343a3c"
              metalness={0.5}
              roughness={0.62}
            />
          </mesh>
        ))}
        <mesh castShadow position={[0, 1.18, 0]}>
          <boxGeometry args={[2.25, 1.05, 1.55]} />
          <meshStandardMaterial
            color="#b98631"
            metalness={0.26}
            roughness={0.58}
          />
        </mesh>
        <mesh castShadow position={[0.55, 2.05, 0]}>
          <boxGeometry args={[1.08, 0.92, 1.45]} />
          <meshPhysicalMaterial
            color="#66757a"
            metalness={0.26}
            opacity={0.74}
            roughness={0.24}
            transparent
          />
        </mesh>
      </group>
      {/* One straight boom from the cab to the tip; the old two-piece boom
          read as bent. */}
      <RigBeam
        from={[8.45, 1.62, 4.1]}
        to={[deltaX, target[1] + deltaY, 0]}
        thickness={0.56}
      />
      <group ref={pivot} position={[deltaX, target[1] + deltaY, 0]}>
        <mesh castShadow position={[0, -length / 2, 0]}>
          <cylinderGeometry args={[0.045, 0.045, length, 8]} />
          <meshStandardMaterial
            color="#353a3d"
            metalness={0.86}
            roughness={0.3}
          />
        </mesh>
        <mesh castShadow position={[0, -length, 0]}>
          <sphereGeometry args={[0.82, 24, 18]} />
          <meshStandardMaterial
            color="#444b4f"
            metalness={0.8}
            roughness={0.32}
          />
        </mesh>
      </group>
    </group>
  );
}

function DynamiteActor({
  pulse,
  target,
  playbackRate,
}: {
  pulse: number;
  target: Vec3;
  playbackRate: number;
}) {
  const root = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const started = useRef(-10);
  useEffect(() => {
    if (pulse > 0) started.current = performance.now() / 1000;
  }, [pulse]);
  useFrame(() => {
    const elapsed = (performance.now() / 1000 - started.current) * playbackRate;
    if (root.current) {
      root.current.visible = pulse > 0 && elapsed >= 0 && elapsed < 0.92;
      root.current.rotation.z = Math.sin(elapsed * 14) * 0.04;
    }
    if (!ring.current) return;
    const active = elapsed > 0.46 && elapsed < 0.9;
    ring.current.visible = active;
    ring.current.scale.setScalar(active ? 1 + (elapsed - 0.46) * 8 : 1);
  });
  return (
    <group ref={root} position={target}>
      {[-0.18, 0, 0.18].map((x) => (
        <mesh
          key={x}
          castShadow
          position={[x, 0, 0]}
          rotation={[0, 0, 0.08 * x]}
        >
          <cylinderGeometry args={[0.105, 0.105, 0.72, 12]} />
          <meshStandardMaterial color="#b83b2d" roughness={0.72} />
        </mesh>
      ))}
      <mesh ref={ring} visible={false} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.26, 0.08, 8, 22]} />
        <meshBasicMaterial
          color="#ffb24d"
          transparent
          opacity={0.82}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

function CrusherActor({
  pulse,
  target,
  playbackRate,
  scene,
}: {
  pulse: number;
  target: Vec3;
  playbackRate: number;
  scene: ScenePreset;
}) {
  const root = useRef<Group>(null);
  const carriage = useRef<Group>(null);
  const cutter = useRef<Group>(null);
  const shaft = useRef<Mesh>(null);
  const started = useRef(-10);
  const activationYaw = useRef(0);
  const { camera } = useThree();
  const bodyFront = 4.8;
  const parked = 5.15;
  const contact = 0.64;
  // The cutter disc is 1.22m in radius: keep its centre high enough that a
  // low target never drives it into the ground.
  const cutY = Math.max(target[1], 1.26);
  const mastHeight = Math.max(1.4, cutY + 0.45);

  useEffect(() => {
    if (pulse <= 0) return;
    const cameraX = camera.position.x - target[0];
    const cameraZ = camera.position.z - target[2];
    activationYaw.current = clearRigYaw(
      scene,
      target,
      Math.atan2(-cameraZ, cameraX),
      RIG_FOOTPRINTS.crusher,
    );
    started.current = performance.now() / 1000;
  }, [camera, pulse, scene, target]);

  useFrame((_, delta) => {
    if (!root.current || !carriage.current || !shaft.current) return;
    const elapsed = (performance.now() / 1000 - started.current) * playbackRate;
    root.current.visible = pulse > 0 && elapsed >= 0 && elapsed < 4.25;
    root.current.position.set(target[0], 0, target[2]);
    root.current.rotation.y = activationYaw.current;

    let carriageX = parked;
    if (elapsed >= 0.38 && elapsed < 2.05) {
      const t = MathUtils.clamp((elapsed - 0.38) / 1.67, 0, 1);
      const hydraulicEase = t * t * (3 - 2 * t);
      carriageX = MathUtils.lerp(parked, contact, hydraulicEase);
    } else if (elapsed >= 2.05 && elapsed < 2.78) {
      carriageX = contact + Math.sin(elapsed * 42) * 0.025;
    } else if (elapsed >= 2.78 && elapsed < 4.2) {
      const t = MathUtils.clamp((elapsed - 2.78) / 1.42, 0, 1);
      carriageX = MathUtils.lerp(contact, parked, t * t * (3 - 2 * t));
    }

    carriage.current.position.set(carriageX, cutY, 0);
    const extension = Math.max(0.12, bodyFront - carriageX);
    shaft.current.position.set((bodyFront + carriageX) / 2, cutY, 0);
    shaft.current.scale.x = extension;
    if (cutter.current) {
      const engaged = elapsed >= 0.38 && elapsed < 2.78;
      cutter.current.rotation.x += delta * (engaged ? 7.5 : 0.75);
    }
  });

  return (
    <group ref={root}>
      <group ref={carriage} position={[parked, cutY, 0]}>
        <group ref={cutter}>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.22, 1.22, 0.48, 24]} />
            <meshStandardMaterial
              color="#c39a3f"
              metalness={0.58}
              roughness={0.38}
            />
          </mesh>
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index / 12) * Math.PI * 2;
            return (
              <mesh
                key={index}
                castShadow
                position={[-0.34, Math.cos(angle), Math.sin(angle)]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <coneGeometry args={[0.16, 0.42, 6]} />
                <meshStandardMaterial
                  color="#3b4347"
                  metalness={0.78}
                  roughness={0.3}
                />
              </mesh>
            );
          })}
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.34, 0.34, 0.62, 16]} />
            <meshStandardMaterial color="#525b60" metalness={0.72} />
          </mesh>
        </group>
      </group>

      <mesh ref={shaft} castShadow>
        <boxGeometry args={[1, 0.48, 0.48]} />
        <meshStandardMaterial color="#788187" metalness={0.72} />
      </mesh>
      <mesh castShadow position={[bodyFront + 0.16, mastHeight / 2, 0]}>
        <boxGeometry args={[0.5, mastHeight, 1.2]} />
        <meshStandardMaterial color="#b58b35" metalness={0.34} />
      </mesh>

      <group position={[6.35, 1.62, 0]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.55, 1.72, 3.05, 20]} />
          <meshStandardMaterial
            color="#d0a84c"
            metalness={0.38}
            roughness={0.48}
          />
        </mesh>
        {[-1.15, 1.15].map((z) => (
          <mesh key={z} castShadow position={[0, -1.42, z]}>
            <boxGeometry args={[3.5, 0.42, 0.55]} />
            <meshStandardMaterial
              color="#343b3f"
              metalness={0.62}
              roughness={0.58}
            />
          </mesh>
        ))}
        <mesh castShadow position={[0.55, 1.18, 0]}>
          <boxGeometry args={[1.15, 0.72, 1.18]} />
          <meshStandardMaterial color="#58656a" metalness={0.45} />
        </mesh>
      </group>
    </group>
  );
}
function PlasmaActor({
  pulse,
  target,
  playbackRate,
}: {
  pulse: number;
  target: Vec3;
  playbackRate: number;
}) {
  const root = useRef<Group>(null);
  const emitter = useRef<Group>(null);
  const beam = useRef<Mesh>(null);
  const started = useRef(-10);
  const activationYaw = useRef(0);
  const { camera } = useThree();
  const distance = 7;
  useEffect(() => {
    if (pulse <= 0) return;
    const cameraX = camera.position.x - target[0];
    const cameraZ = camera.position.z - target[2];
    activationYaw.current = Math.atan2(-cameraZ, cameraX);
    started.current = performance.now() / 1000;
  }, [camera, pulse, target]);
  useFrame(() => {
    const elapsed = (performance.now() / 1000 - started.current) * playbackRate;
    const active = elapsed >= 0.12 && elapsed < 0.72;
    if (root.current) {
      root.current.visible = pulse > 0 && elapsed >= 0 && elapsed < 0.9;
      root.current.position.set(target[0], target[1], target[2]);
      root.current.rotation.y = activationYaw.current;
    }
    if (beam.current) {
      beam.current.visible = active;
      const extension = active
        ? MathUtils.clamp((elapsed - 0.12) / 0.25, 0, 1)
        : 0.01;
      beam.current.scale.x = extension;
      beam.current.position.x = (-distance / 2) * extension;
    }
    if (emitter.current)
      emitter.current.rotation.x = Math.sin(elapsed * 12) * 0.025;
  });
  return (
    <group ref={root}>
      <group ref={emitter} position={[distance, 0, 0]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.38, 1.4, 14]} />
          <meshStandardMaterial
            color="#3d474d"
            metalness={0.72}
            roughness={0.35}
          />
        </mesh>
        <mesh ref={beam} visible={false} position={[-distance / 2, 0, 0]}>
          <boxGeometry args={[distance, 0.055, 0.055]} />
          <meshBasicMaterial color="#66ddff" transparent opacity={0.9} />
        </mesh>
        <pointLight color="#55cdea" intensity={1.8} distance={5} />
      </group>
    </group>
  );
}

function ImpactDust({
  pulse,
  target,
  tool,
  scene,
  playbackRate,
}: {
  pulse: number;
  target: Vec3;
  tool: ToolId;
  scene: ScenePreset;
  playbackRate: number;
}) {
  const root = useRef<Group>(null);
  const clouds = useRef<Array<Mesh | null>>([]);
  const started = useRef(-10);
  const strength =
    tool === "dynamite" ? 1.75 : tool === "wrecking-ball" ? 1.25 : 0.86;
  const dustColor =
    scene.id === "industrial" || scene.id === "civic"
      ? "#8b7768"
      : scene.id === "homestead" || scene.id === "village"
        ? "#988b78"
        : "#9aa1a1";

  useEffect(() => {
    if (pulse > 0) started.current = performance.now() / 1000;
  }, [pulse]);

  useFrame(() => {
    if (!root.current) return;
    const elapsed = (performance.now() / 1000 - started.current) * playbackRate;
    const local = elapsed - impactDelays[tool] / 1000;
    const active = pulse > 0 && local >= 0 && local < 1.15;
    root.current.visible = active;
    if (!active) return;
    const progress = MathUtils.clamp(local / 1.15, 0, 1);
    root.current.position.set(target[0], target[1], target[2]);
    clouds.current.forEach((cloud, index) => {
      if (!cloud) return;
      const drift = (index - 2) * 0.28;
      cloud.position.set(
        drift * progress,
        (0.3 + index * 0.16) * progress,
        ((index % 2) - 0.5) * 0.72 * progress,
      );
      cloud.scale.setScalar((0.3 + progress * (1.2 + index * 0.08)) * strength);
      const material = cloud.material as MeshStandardMaterial;
      material.opacity = (1 - progress) * 0.34;
    });
  });

  return (
    <group ref={root} visible={false} position={target}>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            clouds.current[index] = mesh;
          }}
        >
          <icosahedronGeometry args={[0.62, 1]} />
          <meshStandardMaterial
            color={dustColor}
            depthWrite={false}
            opacity={0}
            roughness={1}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}

function disposeImportedMesh(root: Group) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<MeshStandardMaterial>();
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    geometries.add(child.geometry);
    const childMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    childMaterials.forEach((material) => {
      if (material instanceof MeshStandardMaterial) materials.add(material);
      else material.dispose();
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function CustomMeshModel({
  asset,
  onStatus,
}: {
  asset: ImportedMesh;
  onStatus: (slot: MeshSlot, status: string) => void;
}) {
  const [model, setModel] = useState<Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedRoot: Group | null = null;
    const loadedParts: Group[] = [];
    setModel(null);
    onStatus(
      asset.slot,
      asset.files.length > 1
        ? `Loading ${asset.files.length} parts`
        : "Loading mesh",
    );
    const loader = new GLTFLoader();
    Promise.all(
      asset.files.map(
        (file) =>
          new Promise<Group>((resolve, reject) => {
            loader.load(
              file.url,
              (gltf) => {
                const partRoot = gltf.scene.clone(true);
                partRoot.name = file.name;
                partRoot.userData.sourceFile = file.name;
                loadedParts.push(partRoot);
                resolve(partRoot);
              },
              undefined,
              reject,
            );
          }),
      ),
    )
      .then((partRoots) => {
        const assembly = new Group();
        assembly.name = `${asset.slot}-assembly`;
        partRoots.forEach((partRoot) => assembly.add(partRoot));
        loadedRoot = assembly;
        assembly.traverse((child) => {
          if (!(child instanceof Mesh)) return;
          child.castShadow = true;
          child.receiveShadow = true;
        });

        const bounds = new Box3().setFromObject(assembly);
        const size = bounds.getSize(new Vector3());
        const largest = Math.max(size.x, size.y, size.z, 0.001);
        const targetSize = asset.slot === "building" ? 17 : 78;
        assembly.scale.setScalar(targetSize / largest);
        assembly.updateMatrixWorld(true);

        const normalizedBounds = new Box3().setFromObject(assembly);
        const center = normalizedBounds.getCenter(new Vector3());
        assembly.position.set(
          (asset.slot === "building" ? BUILDING_X : 0) - center.x,
          -normalizedBounds.min.y,
          -center.z,
        );
        assembly.updateMatrixWorld(true);

        if (cancelled) {
          disposeImportedMesh(assembly);
          loadedRoot = null;
          return;
        }
        setModel(assembly);
        onStatus(
          asset.slot,
          asset.files.length > 1
            ? `${asset.files.length} parts assembled`
            : "Mesh ready",
        );
      })
      .catch(() => {
        if (!loadedRoot) {
          loadedParts.forEach((partRoot) => disposeImportedMesh(partRoot));
        }
        if (!cancelled) onStatus(asset.slot, "Could not read mesh assembly");
      });

    return () => {
      cancelled = true;
      if (loadedRoot) disposeImportedMesh(loadedRoot);
    };
  }, [asset, onStatus]);

  return model ? <primitive object={model} /> : null;
}

function ToolActor({
  tool,
  pulse,
  target,
  playbackRate,
  scene,
}: {
  tool: ToolId;
  pulse: number;
  target: Vec3;
  playbackRate: number;
  scene: ScenePreset;
}) {
  const props = { pulse, target, playbackRate };
  switch (tool) {
    case "hammer":
      return <HammerActor {...props} />;
    case "wrecking-ball":
      return <WreckingBallActor {...props} scene={scene} />;
    case "dynamite":
      return <DynamiteActor {...props} />;
    case "crusher":
      return <CrusherActor {...props} scene={scene} />;
    case "plasma":
      return <PlasmaActor {...props} />;
  }
}

function SceneThemeGrade({ darkMode }: { darkMode: boolean }) {
  const { scene } = useThree();
  const frame = useRef(0);

  const gradeMaterials = useCallback(() => {
    scene.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => {
        const themed = material as MeshStandardMaterial & { color?: Color };
        if (!(themed.color instanceof Color)) return;
        const data = themed.userData as {
          portfolioTheme?: "light" | "dark";
          portfolioSourceColor?: number;
          portfolioAppliedColor?: number;
        };
        const currentColor = themed.color.getHex();
        const colorWasChangedOutsideTheme =
          data.portfolioAppliedColor !== undefined &&
          currentColor !== data.portfolioAppliedColor;

        if (
          data.portfolioSourceColor === undefined ||
          (!darkMode && colorWasChangedOutsideTheme)
        ) {
          data.portfolioSourceColor = currentColor;
        }

        const sourceColor = data.portfolioSourceColor;
        const targetColor = new Color(sourceColor);
        if (darkMode) {
          const hsl = { h: 0, s: 0, l: 0 };
          targetColor.getHSL(hsl);
          targetColor.setHSL(
            hsl.h,
            Math.min(1, hsl.s * 0.82),
            MathUtils.clamp(hsl.l * 0.5 + 0.055, 0.07, 0.48),
          );
        }

        const targetHex = targetColor.getHex();
        if (currentColor !== targetHex) {
          themed.color.copy(targetColor);
          themed.needsUpdate = true;
        }
        data.portfolioAppliedColor = targetHex;
        data.portfolioTheme = darkMode ? "dark" : "light";
      });
    });
  }, [darkMode, scene]);

  useEffect(gradeMaterials, [gradeMaterials]);
  useFrame(() => {
    frame.current = (frame.current + 1) % 12;
    if (frame.current === 0) gradeMaterials();
  });
  return null;
}

function DestructionScene({
  scene,
  tool,
  pulse,
  damage,
  resetToken,
  target,
  onTarget,
  onDamage,
  onFailures,
  debrisHazards,
  wind,
  weather,
  blast,
  onStress,
  customBuilding,
  customEnvironment,
  onMeshStatus,
  darkMode,
  timeScale,
  paused,
  onFps,
  onFirstFrame,
  onControlsReady,
  captureFrame,
}: {
  scene: ScenePreset;
  tool: ToolId;
  pulse: number;
  damage: number;
  resetToken: number;
  target: TargetSelection;
  onTarget: (target: TargetSelection) => void;
  onDamage: (damage: number) => void;
  onFailures: (records: { id: string; tool: ToolId }[]) => void;
  debrisHazards: DebrisHazardRegistry;
  wind?: { x: number; z: number };
  weather?: Weather;
  blast: Blast | null;
  onStress: (status: string) => void;
  customBuilding: ImportedMesh | null;
  customEnvironment: ImportedMesh | null;
  onMeshStatus: (slot: MeshSlot, status: string) => void;
  darkMode: boolean;
  timeScale: number;
  paused: boolean;
  onFps: (fps: number) => void;
  onFirstFrame?: () => void;
  onControlsReady?: () => void;
  captureFrame?: number;
}) {
  const environment = useMemo(() => createEnvironment(scene), [scene]);
  const keyTarget = useMemo(() => new Object3D(), []);

  useEffect(() => {
    debrisHazards.current.clear();
  }, [customBuilding, resetToken, scene.id]);

  const sceneBackground = darkMode ? "#030405" : scene.sky;
  const sceneGround = darkMode ? "#090b0c" : scene.ground;
  // Weather (rule 12) dims the scene's own lights and takes over the fog and
  // sky colour; WeatherLayer adds the rain and the night key light.
  const sky = weatherSettings(weather ?? null, prefersReducedMotion());
  const light = sky.ambientIntensity;
  return (
    <>
      <color
        attach="background"
        args={[sky.fog ? sky.fog.color : sceneBackground]}
      />
      {sky.fog ? null : <fog attach="fog" args={[sceneBackground, 105, 245]} />}
      <WeatherLayer
        weather={weather ?? null}
        reducedMotion={prefersReducedMotion()}
      />
      <SceneThemeGrade darkMode={darkMode} />
      {/* A low, soft-edged warm key pooled on the target block: long raking
          shadows, the surroundings falling off into shade, and a weak cool
          fill so the shadow sides stay readable. */}
      <ambientLight intensity={(darkMode ? 0.18 : 0.5) * light} />
      <hemisphereLight
        args={
          darkMode
            ? ["#2a3a48", "#050505", 0.65 * light]
            : [scene.sky, scene.ground, 0.85 * light]
        }
      />
      <primitive object={keyTarget} position={[BUILDING_X, 0, 0]} />
      <spotLight
        castShadow
        target={keyTarget}
        position={[BUILDING_X - 20, 24, 34]}
        color="#ffe0bd"
        intensity={(darkMode ? 7 : 5.5) * light}
        angle={0.7}
        penumbra={0.85}
        decay={0}
        distance={0}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={10}
        shadow-camera-far={150}
      />
      <directionalLight
        position={[BUILDING_X + 24, 10, -16]}
        color="#7f9cc4"
        intensity={(darkMode ? 0.45 : 0.6) * light}
      />
      {captureFrame === undefined ? (
        <>
          <CameraRig
            scene={scene}
            overviewDistance={environment.overviewDistance}
          />
          <BuildingOrbitController scene={scene} onReady={onControlsReady} />
          <SceneTelemetry onFps={onFps} />
        </>
      ) : (
        <CaptureCamera frame={captureFrame} />
      )}
      {/* ponytail: wind is uniform drift (tilted gravity on loose debris),
          not aerodynamics; add per-body drag forces if gusts are needed. */}
      <Physics
        gravity={[wind?.x ?? 0, -12, wind?.z ?? 0]}
        paused={paused}
        timeStep={timeScale / 60}
      >
        <RigidBody type="fixed" colliders={false}>
          <mesh receiveShadow position={[0, -0.35, 0]}>
            <boxGeometry args={[WORLD_EXTENT, 0.7, WORLD_EXTENT]} />
            <meshStandardMaterial color={sceneGround} roughness={0.98} />
          </mesh>
          <CuboidCollider
            args={[WORLD_EXTENT / 2, 0.35, WORLD_EXTENT / 2]}
            position={[0, -0.35, 0]}
            // Wet ground in rain: debris slides further. Otherwise default.
            friction={weather === "rain" ? 0.2 : undefined}
          />
        </RigidBody>
        {customEnvironment ? (
          <CustomMeshModel asset={customEnvironment} onStatus={onMeshStatus} />
        ) : captureFrame !== undefined ? (
          <group>
            {environment.surfaces.map((surface) => (
              <Surface key={surface.id} surface={surface} />
            ))}
            {environment.props.map((prop) => (
              <group
                key={prop.id}
                position={prop.position}
                rotation={prop.rotation ?? [0, 0, 0]}
              >
                <PropModel prop={prop} time={0} />
              </group>
            ))}
          </group>
        ) : (
          <Environment
            scene={scene}
            dangerActive={pulse > 0 || damage > 0}
            impactPoint={target.point}
            debrisHazards={debrisHazards}
            playbackRate={paused ? 0 : timeScale}
          />
        )}
        {customBuilding ? (
          <CustomMeshModel asset={customBuilding} onStatus={onMeshStatus} />
        ) : (
          <BuildingAssembly
            scene={scene}
            tool={tool}
            pulse={pulse}
            resetToken={resetToken}
            target={target}
            onTarget={onTarget}
            onDamage={onDamage}
            onFailures={onFailures}
            onStress={onStress}
            debrisHazards={debrisHazards}
            playbackRate={timeScale}
            blast={blast}
          />
        )}
        {captureFrame === undefined && !customBuilding && (
          <ToolActor
            tool={tool}
            pulse={pulse}
            target={target.point}
            playbackRate={timeScale}
            scene={scene}
          />
        )}
        {!customBuilding && blast ? (
          <DynamiteActor
            pulse={blast.id}
            target={blast.point}
            playbackRate={timeScale}
          />
        ) : null}
        <SceneFirstFrame onFrame={onFirstFrame} />
      </Physics>
      {captureFrame === undefined && !customBuilding && (
        <>
          <ImpactDust
            pulse={pulse}
            target={target.point}
            tool={tool}
            scene={scene}
            playbackRate={timeScale}
          />
          {blast ? (
            <ImpactDust
              pulse={blast.id}
              target={blast.point}
              tool="dynamite"
              scene={scene}
              playbackRate={timeScale}
            />
          ) : null}
          <TargetMarker point={target.point} />
        </>
      )}
    </>
  );
}

function playToolSound(tool: ToolId) {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const frequencies: Record<ToolId, number> = {
    hammer: 115,
    "wrecking-ball": 72,
    dynamite: 48,
    crusher: 84,
    plasma: 520,
  };
  oscillator.type = tool === "plasma" ? "sawtooth" : "triangle";
  oscillator.frequency.setValueAtTime(frequencies[tool], context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(34, frequencies[tool] * 0.45),
    context.currentTime + 0.28,
  );
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.36);
  oscillator.addEventListener("ended", () => void context.close());
}

type SimulationState =
  | "loading"
  | "ready"
  | "running"
  | "paused"
  | "resetting"
  | "reduced-performance"
  | "error";

const playbackRates = [0.5, 1, 2] as const;

export function DestructionLab({
  darkMode = false,
  onUnavailable,
  onFirstFrame,
  onControlsReady,
}: {
  darkMode?: boolean;
  /** Called when the scene cannot render, so the page can show its fallback. */
  onUnavailable?: () => void;
  onFirstFrame?: () => void;
  onControlsReady?: () => void;
}) {
  const [sceneIndex, setSceneIndex] = useState(2);
  const [tool, setTool] = useState<ToolId>("wrecking-ball");
  const [pulse, setPulse] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [damage, setDamage] = useState(0);
  const [muted, setMuted] = useState(false);
  const [stressStatus, setStressStatus] = useState("Load paths stable");
  const [timeScale, setTimeScale] = useState<number>(1);
  const [paused, setPaused] = useState(false);
  const [fps, setFps] = useState(60);
  const [debrisCount, setDebrisCount] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [contractId, setContractId] = useState(contracts[0].id);
  const [uses, setUses] = useState<ToolUse[]>([]);
  const [failedOrder, setFailedOrder] = useState<FailedRecord[]>([]);
  const [debris, setDebris] = useState<DebrisSnapshot[]>([]);
  const [attemptId, setAttemptId] = useState(0);
  // Rule 20: the gas leak's one free blast per attempt.
  const [blast, setBlast] = useState<Blast | null>(null);
  const blastAttempt = useRef(-1);
  // Simulated seconds since the first tool use (follows time scale, pause).
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef({ base: 0, since: 0, rate: 0 });
  const simNow = useCallback(() => {
    const { base, since, rate } = clock.current;
    return base + (rate ? ((performance.now() - since) / 1000) * rate : 0);
  }, []);
  const debrisHazards = useRef(new Map<string, DebrisHazard>());
  // Failures arrive as the building reports them; stamp new ones with the
  // simulated time they fell.
  const receiveFailures = useCallback(
    (records: { id: string; tool: ToolId }[]) => {
      setFailedOrder((previous) => {
        if (records.length === 0) return previous.length ? [] : previous;
        const known = new Set(previous.map((record) => record.id));
        const at = simNow();
        const added = records
          .filter((record) => !known.has(record.id))
          .map((record) => ({ ...record, at }));
        return added.length ? [...previous, ...added] : previous;
      });
    },
    [simNow],
  );
  const [damageFlash, setDamageFlash] = useState(false);
  const [simulationState, setSimulationState] =
    useState<SimulationState>("loading");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateTimer = useRef<number | null>(null);
  const previousDamage = useRef(0);
  const reducedPerformance = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (navigator.hardwareConcurrency ?? 8) <= 4
    );
  }, []);
  const customBuilding = useMemo(() => configuredMesh("building"), []);
  const customEnvironment = useMemo(() => configuredMesh("environment"), []);
  const scene = scenePresets[sceneIndex];
  const [target, setTarget] = useState<TargetSelection>(() =>
    nearestPartTarget(scene),
  );
  const contract =
    contracts.find((item) => item.id === contractId) ?? contracts[0];
  const contractParts = useMemo(() => createBuilding(scene), [scene]);
  const site = useMemo(() => siteFeatures(scene), [scene]);
  // Rule 19. Starts from storage (0 if it is unavailable) and stays usable
  // in memory if saving fails.
  const [reputation, setReputation] = useState<ReputationState>(() => ({
    score: loadReputation(),
    applied: [],
  }));
  const lockReason = (item: (typeof contracts)[number]) =>
    isLocked(reputation.score, item.minReputation) ??
    contractAvailability(item, site, contractParts);
  const contractRun = { uses, failedOrder, elapsed, debris, attemptId };
  const assessment = assessContract(contract, contractParts, contractRun, site);
  const blockReason = toolBlockReason(
    contract,
    contractParts,
    contractRun,
    tool,
    site,
  );
  const ActiveToolIcon = toolIcons[tool];

  const clearStateTimer = useCallback(() => {
    if (stateTimer.current === null) return;
    window.clearTimeout(stateTimer.current);
    stateTimer.current = null;
  }, []);

  const queueReady = useCallback(
    (delay = 460) => {
      clearStateTimer();
      stateTimer.current = window.setTimeout(() => {
        stateTimer.current = null;
        setSimulationState(
          reducedPerformance ? "reduced-performance" : "ready",
        );
      }, delay);
    },
    [clearStateTimer, reducedPerformance],
  );

  const updateMeshStatus = useCallback(() => undefined, []);

  const selectScene = (index: number) => {
    const nextScene = scenePresets[index];
    setSimulationState("resetting");
    setPaused(false);
    setSceneIndex(index);
    setTool(nextScene.defaultTool);
    setTarget(nearestPartTarget(nextScene));
    setDamage(0);
    setDebrisCount(0);
    setEnergy(0);
    setUses([]);
    setElapsed(0);
    setDebris([]);
    setBlast(null);
    setAttemptId((value) => value + 1);
    clock.current = { base: 0, since: 0, rate: 0 };
    setStressStatus("Load paths stable");
    setPulse(0);
    setResetToken((value) => value + 1);
    queueReady(620);
  };

  const resetScene = () => {
    setSimulationState("resetting");
    setPaused(false);
    setDamage(0);
    setDebrisCount(0);
    setEnergy(0);
    setUses([]);
    setElapsed(0);
    setDebris([]);
    setBlast(null);
    setAttemptId((value) => value + 1);
    clock.current = { base: 0, since: 0, rate: 0 };
    setStressStatus("Load paths stable");
    setTarget(nearestPartTarget(scene));
    setPulse(0);
    setResetToken((value) => value + 1);
    queueReady(560);
  };

  const chooseContract = (id: string) => {
    const next = contracts.find((item) => item.id === id);
    if (!next || lockReason(next)) return;
    setContractId(id);
    resetScene();
  };

  const useTool = useCallback(
    (strikeAt?: TargetSelection) => {
      if (customBuilding || paused) return;
      if (blockReason) {
        setStressStatus(blockReason);
        return;
      }
      const [x, , z] = (strikeAt ?? target).point;
      setUses((value) => [
        ...value,
        { tool, at: simNow(), point: { x, z }, radius: impactRadii[tool] },
      ]);
      setPulse((value) => value + 1);
      setEnergy(toolEnergy[tool]);
      setSimulationState("running");
      clearStateTimer();
      stateTimer.current = window.setTimeout(
        () => {
          stateTimer.current = null;
          setSimulationState(
            reducedPerformance ? "reduced-performance" : "ready",
          );
        },
        (impactDelays[tool] + 1450) / timeScale,
      );
      if (!muted) playToolSound(tool);
    },
    [
      blockReason,
      clearStateTimer,
      customBuilding,
      muted,
      paused,
      reducedPerformance,
      simNow,
      target,
      timeScale,
      tool,
    ],
  );

  // Apply each finished attempt to reputation exactly once.
  const finished =
    contract.id !== "free" && assessment.result !== "running"
      ? assessment.result
      : null;
  const violations = assessment.meters.filter((meter) => !meter.ok).length;
  useEffect(() => {
    if (!finished) return;
    setReputation((previous) =>
      applyAttempt(previous, { attemptId, result: finished, violations }),
    );
  }, [attemptId, finished, violations]);
  useEffect(() => saveReputation(reputation.score), [reputation.score]);

  // The hazard failed while dormant: one free dynamite-strength blast at it,
  // not counted as a use, charge, cost, noise or energy.
  const hazardBlastDue =
    Boolean(contract.gasLeak) && dormantHazardBlast(contractRun, site);
  useEffect(() => {
    if (!hazardBlastDue || !site.hazard || blastAttempt.current === attemptId) {
      return;
    }
    blastAttempt.current = attemptId;
    setBlast({ id: pulse + 0.5, point: [site.hazard.x, 1.2, site.hazard.z] });
    if (!muted) playToolSound("dynamite");
  }, [attemptId, hazardBlastDue, muted, pulse, site.hazard]);

  const contractActive =
    contract.id !== "free" &&
    uses.length > 0 &&
    assessment.result === "running" &&
    !paused;
  // The clock runs only while a contract is live; fold its reading whenever
  // that or the time scale changes, so `simNow` stays exact between ticks.
  useEffect(() => {
    clock.current = {
      base: simNow(),
      since: performance.now(),
      rate: contractActive ? timeScale : 0,
    };
    if (!contractActive) return;
    const timer = window.setInterval(() => setElapsed(simNow()), 250);
    return () => window.clearInterval(timer);
  }, [contractActive, simNow, timeScale]);

  const strikeTarget = (nextTarget: TargetSelection) => {
    if (customBuilding || paused) return;
    setTarget(nextTarget);
    useTool(nextTarget);
  };

  const commandCamera = (command: CameraCommand) => {
    canvasRef.current?.dispatchEvent(
      new CustomEvent<CameraCommand>(DESTRUCTION_CAMERA_COMMAND_EVENT, {
        detail: command,
      }),
    );
  };

  const togglePause = () => {
    setPaused((value) => {
      const next = !value;
      setSimulationState(
        next ? "paused" : reducedPerformance ? "reduced-performance" : "ready",
      );
      return next;
    });
  };

  useEffect(() => {
    const triggerTool = () => useTool();
    window.addEventListener(DESTRUCTION_USE_TOOL_EVENT, triggerTool);
    return () =>
      window.removeEventListener(DESTRUCTION_USE_TOOL_EVENT, triggerTool);
  }, [useTool]);

  // Ground debris for the HUD count and the contract rules. Only publish a
  // new snapshot when it changed, so idle ticks don't re-render the lab.
  useEffect(() => {
    let signature = "";
    const timer = window.setInterval(() => {
      const snapshot = [...debrisHazards.current.values()].map((hazard) => ({
        x: hazard.x,
        z: hazard.z,
        r: hazard.radius,
      }));
      const next = snapshot
        .map((piece) => `${piece.x.toFixed(1)},${piece.z.toFixed(1)}`)
        .join(";");
      setDebrisCount(snapshot.length);
      if (next === signature) return;
      signature = next;
      setDebris(snapshot);
    }, 300);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (damage > previousDamage.current) {
      setDamageFlash(true);
      const timer = window.setTimeout(() => setDamageFlash(false), 360);
      previousDamage.current = damage;
      return () => window.clearTimeout(timer);
    }
    previousDamage.current = damage;
  }, [damage]);

  useEffect(() => clearStateTimer, [clearStateTimer]);

  const stateLabel = {
    loading: "Loading world",
    ready: "Live destruction demo",
    running: "Simulation running",
    paused: "Simulation paused",
    resetting: "Resetting world",
    "reduced-performance": "Reduced-performance mode",
    error: "Demo unavailable",
  }[simulationState];

  return (
    <div
      className="destruction-lab"
      data-state={simulationState}
      id="destruction-demo"
    >
      <div className="lab-canvas-wrap">
        <DestructionErrorBoundary
          onError={() => {
            setSimulationState("error");
            onUnavailable?.();
          }}
        >
          <Canvas
            orthographic
            shadows="basic"
            dpr={[1, 1.4]}
            camera={{
              position: [24, 15, 28],
              zoom: 6.5,
              near: CAMERA_NEAR_CLIP,
              far: 500,
            }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              canvasRef.current = gl.domElement;
              gl.domElement.dataset.liquidIgnore = "true";
              setSimulationState(
                reducedPerformance ? "reduced-performance" : "ready",
              );
            }}
            aria-label="Interactive destruction world. Use the mouse wheel to zoom and drag to orbit; right-drag or two fingers to pan."
          >
            <DestructionScene
              scene={scene}
              tool={tool}
              pulse={pulse}
              damage={damage}
              resetToken={resetToken}
              target={target}
              onTarget={strikeTarget}
              onDamage={setDamage}
              onFailures={receiveFailures}
              debrisHazards={debrisHazards}
              wind={contract.wind}
              weather={contract.weather}
              blast={blast}
              onStress={setStressStatus}
              customBuilding={customBuilding}
              customEnvironment={customEnvironment}
              onMeshStatus={updateMeshStatus}
              darkMode={darkMode}
              timeScale={timeScale}
              paused={paused}
              onFps={setFps}
              onControlsReady={onControlsReady}
              onFirstFrame={onFirstFrame}
            />
          </Canvas>
        </DestructionErrorBoundary>

        {simulationState === "loading" ? (
          <div className="lab-loading" role="status">
            <span>
              <i />
            </span>
            <strong>Building the destruction world</strong>
            <small>Loading geometry, physics, traffic, and tools</small>
          </div>
        ) : null}

        <LayeredGlassAsset
          asset="live_badge"
          className="lab-live-badge"
          contentClassName="lab-live-badge-content"
        >
          <span className="lab-live-dot" aria-hidden="true" />
          <strong>{stateLabel}</strong>
        </LayeredGlassAsset>

        <LayeredGlassAsset
          asset="destruction_stats_card"
          className="damage-card lab-stats-glass"
          contentClassName="lab-stats"
          data-flash={damageFlash}
          aria-live="polite"
        >
          <div className="lab-stats-head">
            <strong>Destruction stats</strong>
            <Gauge aria-hidden="true" />
          </div>
          <div className="lab-stats-grid">
            <span>
              <small>Damage</small>
              <AnimatedCounter
                value={damage}
                format={(value) => `${Math.round(value)}%`}
              />
            </span>
            <span>
              <small>Debris pieces</small>
              <AnimatedCounter value={debrisCount} />
            </span>
            <span>
              <small>Energy</small>
              <AnimatedCounter
                value={energy}
                format={(value) => `${value.toFixed(1)} kJ`}
              />
            </span>
            <span>
              <small>FPS</small>
              <AnimatedCounter value={fps} />
            </span>
          </div>
          <div className="damage-chart" aria-hidden="true">
            {[12, 22, 15, 28, 19, 31, 18, 26].map((height, index) => (
              <i
                key={index}
                style={{ height: `${Math.min(32, height + damage * 0.13)}px` }}
              />
            ))}
          </div>
        </LayeredGlassAsset>

        <LayeredGlassAsset
          asset="damage_pill"
          className="lab-target-hint-glass"
          contentClassName="lab-target-hint"
        >
          <Crosshair aria-hidden="true" />
          <span>{customBuilding ? "Mesh preview" : "Target"}</span>
          <strong>{customBuilding?.name ?? target.label}</strong>
          <small className="lab-stress-readout">{stressStatus}</small>
          <small>
            {customBuilding
              ? "Generated destruction resumes when the preview mesh is cleared"
              : "Click a part to strike - drag the scene to rotate"}
          </small>
        </LayeredGlassAsset>

        <ContractCard
          contracts={contracts}
          contract={contract}
          assessment={assessment}
          reputation={reputation.score}
          lockReason={lockReason}
          onChoose={chooseContract}
          onRetry={resetScene}
        />

        <div className="lab-scene-label">
          <span>{scene.environment}</span>
          <strong>{scene.structure}</strong>
        </div>

        <LayeredGlassAsset
          asset="tool_chip_bar"
          className="lab-tool-chip-glass"
          contentClassName="lab-tool-list"
          aria-label="Destruction tool selector"
        >
          {(Object.keys(toolLabels) as ToolId[]).map((toolId) => {
            const Icon = toolIcons[toolId];
            return (
              <button
                key={toolId}
                className="lab-icon-button"
                data-active={tool === toolId}
                aria-pressed={tool === toolId}
                aria-label={toolLabels[toolId]}
                title={toolLabels[toolId]}
                type="button"
                onClick={() => {
                  setTool(toolId);
                  setPulse(0);
                  setEnergy(0);
                  setSimulationState(
                    reducedPerformance ? "reduced-performance" : "ready",
                  );
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{toolLabels[toolId]}</span>
              </button>
            );
          })}
          <button
            className="lab-use-tool"
            type="button"
            aria-label={`Use ${toolLabels[tool]}`}
            title={blockReason ?? undefined}
            disabled={Boolean(customBuilding) || paused || Boolean(blockReason)}
            onClick={() => useTool()}
          >
            <ActiveToolIcon size={17} aria-hidden="true" />
            Use <span className="lab-use-tool-name">{toolLabels[tool]}</span>
          </button>
          <button
            className="lab-reset-tool"
            type="button"
            title="Reset scene"
            onClick={resetScene}
          >
            <RotateCcw size={17} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </LayeredGlassAsset>

        <div className="lab-control-stack">
          <LayeredGlassAsset
            asset="environment_selector"
            className="lab-environment-glass"
            contentClassName="lab-environment-selector"
          >
            <span className="lab-control-label">Environment</span>
            <div>
              {scenePresets.map((preset, index) => (
                <button
                  key={preset.id}
                  className="scene-tile"
                  data-active={sceneIndex === index}
                  type="button"
                  title={`${preset.label}: ${preset.environment}`}
                  aria-label={`Load ${preset.label}`}
                  onClick={() => selectScene(index)}
                >
                  <i
                    style={
                      { "--scene-color": preset.accent } as React.CSSProperties
                    }
                  />
                </button>
              ))}
            </div>
            <p className="lab-environment-current" aria-live="polite">
              {scene.label}
            </p>
          </LayeredGlassAsset>

          <LayeredGlassAsset
            asset="camera_controls"
            className="lab-camera-glass"
            contentClassName="lab-camera-controls"
          >
            <span className="lab-control-label">Camera</span>
            <div>
              <button
                type="button"
                title="Focus building"
                aria-label="Focus building"
                onClick={() => commandCamera("focus")}
              >
                <Rotate3D aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() => commandCamera("zoom-out")}
              >
                <ZoomOut aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() => commandCamera("zoom-in")}
              >
                <ZoomIn aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Reset camera"
                aria-label="Reset camera"
                onClick={() => commandCamera("reset")}
              >
                <Maximize2 aria-hidden="true" />
              </button>
            </div>
          </LayeredGlassAsset>

          <LayeredGlassAsset
            asset="time_scale_control"
            className="lab-time-glass"
            contentClassName="lab-time-controls"
          >
            <span className="lab-control-label">Time scale</span>
            <div>
              <button
                type="button"
                data-active={paused}
                aria-label={paused ? "Resume simulation" : "Pause simulation"}
                onClick={togglePause}
              >
                {paused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
              </button>
              {playbackRates.map((rate) => (
                <button
                  type="button"
                  data-active={!paused && timeScale === rate}
                  key={rate}
                  onClick={() => {
                    setPaused(false);
                    setTimeScale(rate);
                    setSimulationState(
                      reducedPerformance ? "reduced-performance" : "ready",
                    );
                  }}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </LayeredGlassAsset>
        </div>

        <LayeredGlassAsset
          asset="keyboard_help_bar"
          className="lab-keyboard-glass"
          contentClassName="lab-keyboard-help"
        >
          <span>
            <kbd>Wheel</kbd> Zoom
          </span>
          <span>
            <kbd>Drag</kbd> Orbit
          </span>
          <span>
            <kbd>Click</kbd> Strike
          </span>
          <button
            type="button"
            aria-label={muted ? "Turn sound on" : "Mute sound"}
            onClick={() => setMuted((value) => !value)}
          >
            {muted ? (
              <VolumeX aria-hidden="true" />
            ) : (
              <Volume2 aria-hidden="true" />
            )}
          </button>
        </LayeredGlassAsset>

        {simulationState === "running" ? (
          <span className="lab-impact-indicator" aria-hidden="true">
            <Activity /> Impact in progress
          </span>
        ) : null}
      </div>
    </div>
  );
}

// DEV-only entry, lazily imported by App; the production page never mounts it.
export function HomesteadCapture() {
  const [frame, setFrame] = useState(0);
  const debrisHazards = useRef(new Map<string, DebrisHazard>());
  const scene = scenePresets[0];
  const noop = useCallback(() => {}, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      <input
        aria-label="Capture frame"
        type="number"
        min={0}
        max={300}
        value={frame}
        style={{
          position: "fixed",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
        onChange={(event) =>
          setFrame(Math.max(0, Math.min(300, Number(event.target.value))))
        }
      />
      <Canvas
        orthographic
        shadows="basic"
        dpr={1}
        camera={{
          position: [16.2, 15.7, 40],
          zoom: 30,
          near: CAMERA_NEAR_CLIP,
          far: 500,
        }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <DestructionScene
          scene={scene}
          tool="hammer"
          pulse={0}
          damage={0}
          resetToken={0}
          target={nearestPartTarget(scene)}
          onTarget={noop}
          onDamage={noop}
          onFailures={noop}
          debrisHazards={debrisHazards}
          blast={null}
          onStress={noop}
          customBuilding={null}
          customEnvironment={null}
          onMeshStatus={noop}
          darkMode={false}
          timeScale={0}
          paused
          onFps={noop}
          captureFrame={frame}
        />
      </Canvas>
    </div>
  );
}
