import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";
import ts from "typescript";

const root = new URL("../", import.meta.url);

const footprint = (position, scale, rotation = 0) => {
  const cosine = Math.abs(Math.cos(rotation));
  const sine = Math.abs(Math.sin(rotation));
  const halfX = (scale[0] * cosine + scale[2] * sine) / 2;
  const halfZ = (scale[0] * sine + scale[2] * cosine) / 2;
  return {
    minX: position[0] - halfX,
    maxX: position[0] + halfX,
    minZ: position[2] - halfZ,
    maxZ: position[2] + halfZ,
  };
};

const overlaps = (first, second) =>
  first.minX < second.maxX &&
  first.maxX > second.minX &&
  first.minZ < second.maxZ &&
  first.maxZ > second.minZ;

const architecturalFootprint = (building) => {
  const gabled = building.style === "farm" || building.style === "machiya";
  return footprint(
    building.position,
    [
      building.scale[0] * (gabled ? 1.12 : 1.06),
      building.scale[1],
      building.scale[2] * (gabled ? 1.2 : 1.08),
    ],
    building.rotation,
  );
};

const trainRouteFootprint = (train) => {
  if (!train.path)
    return footprint(train.position, train.scale, train.rotation);
  const routeLength = train.path.distance * 2 + train.scale[0];
  const routeScale =
    train.path.axis === "x"
      ? [routeLength, train.scale[1], train.scale[2]]
      : [train.scale[2], train.scale[1], routeLength];
  return footprint(train.position, routeScale, 0);
};

const railSupportsTrainRoute = (rail, train) => {
  const railBounds = footprint(rail.position, rail.scale, rail.rotation);
  const routeBounds = trainRouteFootprint(train);
  const margin = 0.55;
  if (train.path?.axis === "z") {
    return (
      routeBounds.minZ >= railBounds.minZ - margin &&
      routeBounds.maxZ <= railBounds.maxZ + margin &&
      train.position[0] >= railBounds.minX - margin &&
      train.position[0] <= railBounds.maxX + margin
    );
  }
  return (
    routeBounds.minX >= railBounds.minX - margin &&
    routeBounds.maxX <= railBounds.maxX + margin &&
    train.position[2] >= railBounds.minZ - margin &&
    train.position[2] <= railBounds.maxZ + margin
  );
};

async function loadDestructionModule() {
  const source = await readFile(
    new URL("src/lib/destruction.ts", root),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}

test("keeps the portfolio content and adds the interactive destruction experience", async () => {
  const [
    app,
    lab,
    destruction,
    html,
    css,
    glassCss,
    layeredGlass,
    glassManifest,
    tools,
    projects,
    profile,
    resume,
    learning,
    detail,
    dialog,
    quickLook,
    types,
    artwork,
    ownerAssets,
  ] = await Promise.all([
    readFile(new URL("src/App.tsx", root), "utf8"),
    readFile(new URL("src/components/DestructionLab.tsx", root), "utf8"),
    readFile(new URL("src/lib/destruction.ts", root), "utf8"),
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("src/index.css", root), "utf8"),
    readFile(new URL("src/glass.css", root), "utf8"),
    readFile(
      new URL("src/components/glass/LayeredGlassAsset.tsx", root),
      "utf8",
    ),
    readFile(new URL("src/content/glassManifest.json", root), "utf8"),
    readFile(new URL("src/content/tools.ts", root), "utf8"),
    readFile(new URL("src/content/projects.ts", root), "utf8"),
    readFile(new URL("src/content/profile.ts", root), "utf8"),
    readFile(new URL("src/content/resume.ts", root), "utf8"),
    readFile(new URL("src/content/learning.ts", root), "utf8"),
    readFile(new URL("src/lib/detail.ts", root), "utf8"),
    readFile(new URL("src/components/detail/DetailDialog.tsx", root), "utf8"),
    readFile(new URL("src/components/detail/QuickLook.tsx", root), "utf8"),
    readFile(new URL("src/lib/types.ts", root), "utf8"),
    readFile(new URL("src/components/art/PortfolioArtwork.tsx", root), "utf8"),
    readFile(new URL("src/content/ownerAssets.ts", root), "utf8"),
  ]);

  assert.doesNotMatch(app, /cloudfront\.net/);
  assert.doesNotMatch(app, /Offerings/);
  assert.match(app, /Selected work/);
  assert.match(app, /Tools I built/);
  assert.match(app, /asset="nav_bar"/);
  assert.match(app, /asset="hero_demo_frame"/);
  assert.match(app, /DEMO_PLAY_REQUEST_EVENT/);
  assert.doesNotMatch(app, /from "@\/components\/DestructionLab"/);
  assert.match(app, /useSectionObserver/);
  assert.match(app, /DestructionPipeline/);
  assert.match(app, /\{ label: "Resume", href: "#resume" \}/);
  assert.match(app, /id="resume"/);
  assert.doesNotMatch(app, /\{ label: "Resume", href: "#experience" \}/);
  assert.match(app, /Hiring and roles/);
  assert.match(app, /Projects and collaboration/);
  assert.match(detail, /export type ActiveDetail/);
  assert.match(dialog, /event\.target === event\.currentTarget/);
  assert.match(dialog, /trapFocus/);
  assert.match(app, /detailTriggerRef/);
  assert.match(app, /tool-suite-card/);
  assert.match(app, /utility-item/);
  assert.match(app, /game-system-card/);
  assert.match(app, /learning-card/);
  assert.match(app, /QuickLookButton/);
  assert.match(app, /text-size-control/);
  assert.match(app, /kalyan-portfolio-text-scale/);
  assert.match(app, /capabilityDetail/);
  assert.match(app, /className="capability-card"/);
  assert.match(app, /className="shipped-work"/);
  assert.match(
    quickLook,
    /role=\{shown\.mode === "mobile" \? "dialog" : "tooltip"\}/,
  );
  assert.match(quickLook, /window\.innerHeight - measuredHeight/);
  assert.match(quickLook, /event\.stopPropagation\(\)/);
  assert.match(quickLook, /aria-expanded/);
  assert.match(app, /display-apostrophe/);
  assert.doesNotMatch(app, /setSelectedProject/);
  assert.doesNotMatch(app, /Ã|Â/);
  assert.match(lab, /<Canvas/);
  assert.match(lab, /<Physics/);
  assert.match(lab, /TargetMarker/);
  assert.match(lab, /Click a part to strike - drag the scene to rotate/);
  assert.match(lab, /impactDelays/);
  assert.match(lab, /FragmentCluster/);
  assert.match(lab, /overviewDistance/);
  assert.match(lab, /orthographic/);
  assert.match(
    lab,
    /import \{[^}]*analyzeStructuralSupport[^}]*\} from "@\/lib\/structuralSupport"/,
  );
  assert.doesNotMatch(lab, /collapseRadius/);
  assert.doesNotMatch(lab, /CrackPattern/);
  assert.match(lab, /JaggedShardGeometry/);
  assert.match(lab, /ThreeOrbitControls/);
  assert.match(lab, /SCROLL_WORLD_READY_EVENT/);
  assert.match(lab, /orbit\.enableZoom = true/);
  assert.match(lab, /orbit\.zoomToCursor = true/);
  assert.match(lab, /SCROLL_WORLD_MIN_ZOOM/);
  assert.match(lab, /SCROLL_WORLD_MAX_ZOOM/);
  assert.match(lab, /WORLD_EXTENT = 520/);
  assert.match(lab, /const overviewZoom = 6\.5/);
  assert.match(lab, /CAMERA_NEAR_CLIP = 3\.5/);
  assert.match(lab, /near: CAMERA_NEAR_CLIP/);
  assert.match(lab, /focusHeight/);
  assert.match(lab, /addEventListener\("wheel", interruptFlight/);
  assert.match(lab, /Use the mouse wheel to zoom and drag to orbit/);
  assert.match(lab, /dataset\.cameraZoom/);
  assert.match(lab, /accumulatedStress/);
  assert.match(lab, /partStrength/);
  assert.match(lab, /impactPartLimits/);
  assert.match(lab, /dangerActive/);
  assert.match(lab, /hydraulicEase/);
  assert.match(lab, /crusher: 2050/);
  assert.match(lab, /crosswalk/);
  assert.match(lab, /curb/);
  assert.match(lab, /unsupported elements collapsing/);
  assert.match(lab, /GLTFLoader/);
  assert.match(lab, /CustomMeshModel/);
  assert.match(lab, /configuredMesh/);
  assert.match(lab, /ownerAssets\.meshes/);
  assert.doesNotMatch(lab, /type="file"/);
  assert.doesNotMatch(lab, /URL\.createObjectURL/);
  assert.match(lab, /asset\.files\.length/);
  assert.match(lab, /partRoots\.forEach/);
  assert.match(lab, /17 : 78/);
  assert.match(lab, /routeKey/);
  assert.match(lab, /motionOrigin/);
  assert.match(lab, /setLinvel/);
  assert.match(lab, /maxAngularSpeed/);
  assert.match(lab, /MAX_IMPACT_FRAGMENTS = 5/);
  assert.match(lab, /StructuralDebris/);
  assert.match(lab, /fracture\?\.structural/);
  assert.match(lab, /timeStep=\{timeScale \/ 60\}/);
  assert.match(lab, /paused=\{paused\}/);
  assert.match(lab, /DESTRUCTION_CAMERA_COMMAND_EVENT/);
  assert.match(lab, /lab-tool-chip-glass/);
  assert.match(lab, /className="lab-reset-tool"/);
  assert.doesNotMatch(lab, /asset="tool_rail_vertical"/);
  assert.match(lab, /lab-environment-glass/);
  assert.match(lab, /lab-time-glass/);
  assert.match(lab, /Simulation running/);
  assert.match(lab, /Reduced-performance mode/);
  assert.match(lab, /dpr=\{\[1, 1\.4\]\}/);
  assert.doesNotMatch(lab, /timeStep="vary"/);
  assert.doesNotMatch(lab, /\sccd(?:\s|\/>)/);
  assert.match(lab, /root\.current\.visible = pulse > 0/);
  assert.match(lab, /activationYaw/);
  assert.match(lab, /contactDeltaX/);
  assert.match(lab, /const contact = 0\.64/);
  assert.match(lab, /root\.current\.translateX\(0\.34\)/);
  assert.match(lab, /const windowColor/);
  assert.doesNotMatch(lab, /MathUtils\.lerp\(impactAngle, -1\.12/);
  assert.match(lab, /SceneThemeGrade/);
  assert.match(lab, /sceneBackground = darkMode \? "#030405"/);
  assert.match(lab, /colorWasChangedOutsideTheme/);
  assert.match(lab, /themed\.color\.copy\(targetColor\)/);
  assert.match(lab, /debrisHazards\.current\.values\(\)/);
  assert.match(lab, /syncDebrisHazard/);
  assert.match(lab, /dataset\.debrisHazards/);
  assert.doesNotMatch(lab, /Ãƒ|Ã‚|Â/);
  assert.match(destruction, /Wrecking ball/);
  assert.match(destruction, /Plasma cutter/);
  assert.match(destruction, /fragmentCount/);
  assert.match(destruction, /"vehicle"/);
  assert.match(destruction, /"pedestrian"/);
  assert.match(destruction, /"animal"/);
  assert.match(destruction, /export type DebrisHazard/);
  assert.match(destruction, /export function steerAroundDebris/);
  assert.match(destruction, /BuildingMaterial/);
  assert.match(destruction, /const grandeur: Record<SceneId, Vec3>/);
  assert.match(destruction, /placeFrontageBuildings/);
  assert.match(destruction, /roadAccess/);
  assert.match(destruction, /footprintsOverlap/);
  assert.match(destruction, /activeBuildingFootprint/);
  assert.match(destruction, /const seam = closesStructuralSeam \? 0\.14 : 0/);
  assert.doesNotMatch(destruction, /grand-skyline/);
  assert.match(
    destruction,
    /overviewDistance: layout\.overviewDistance \* 1\.9/,
  );
  assert.match(destruction, /material: "brick"/);
  assert.match(destruction, /style: "machiya"/);
  assert.match(destruction, /style: "industrial"/);
  assert.match(destruction, /style: "civic"/);
  assert.match(destruction, /style: "metro"/);
  assert.match(destruction, /"utility-pole"/);
  assert.match(destruction, /"fire-escape"/);
  for (const scene of [
    "homestead",
    "village",
    "industrial",
    "civic",
    "metro",
  ]) {
    assert.match(destruction, new RegExp(`id: "${scene}"`));
  }
  assert.match(destruction, /createBuilding/);
  assert.match(destruction, /createEnvironment/);
  assert.match(html, /PODIUM\+Sharp\+4\.11/);
  assert.match(html, /family=Inter/);
  assert.match(html, /JetBrains\+Mono/);
  assert.match(html, /Space\+Grotesk/);
  // The PNG frame layers are gone, so the old hero frame preload must be too.
  assert.doesNotMatch(html, /hero_demo_frame__surface@2x\.png/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.destruction-lab/);
  assert.match(css, /\.detail-content/);
  assert.match(css, /\.detail-evidence/);
  assert.match(css, /\.learning-card-footer/);
  assert.match(css, /--page: #000000/);
  assert.match(css, /\.quick-look-popover/);
  assert.doesNotMatch(css, /\.project-card\s*>\s*button/);
  assert.match(glassCss, /\.project-card-glass,[\s\S]*?border:\s*0/);
  assert.match(glassCss, /\.quick-look-info,[\s\S]*?border:\s*0/);
  assert.match(css, /\.capability-card/);
  assert.match(css, /\.shipped-work > button/);
  assert.match(css, /--portfolio-text-scale/);
  assert.match(css, /transform: scaleX\(1\)/);
  assert.match(css, /\.portfolio-artwork/);
  assert.match(css, /\.owner-art-raster/);
  assert.match(css, /place-items: center/);
  assert.match(css, /calc\(100svh - 205px\)/);
  assert.match(css, /overscroll-behavior: contain/);
  assert.match(css, /touch-action: pan-y/);
  assert.match(glassCss, /\.layered-glass/);
  assert.match(glassCss, /page_background_4k\.webp/);
  assert.match(glassCss, /\.hero-demo-glass/);
  assert.match(glassCss, /\.lab-control-stack/);
  assert.doesNotMatch(app, /hero-scroll-cue/);
  assert.match(glassCss, /@supports not/);
  assert.match(glassCss, /prefers-reduced-motion/);
  assert.match(glassCss, /:root\[data-theme="dark"\]/);
  assert.match(layeredGlass, /manifest\.components\[asset\]/);
  // Panels are drawn in CSS; the stretched PNG frame layers are gone.
  assert.doesNotMatch(layeredGlass, /<img/);
  assert.match(glassCss, /\.layered-glass::after/);
  assert.doesNotMatch(glassCss, /\.glass-asset-layer/);
  assert.match(glassManifest, /"hero_demo_frame"/);
  assert.match(glassManifest, /"project_card"/);
  assert.match(tools, /AssetForge Transport Importer/);
  assert.match(tools, /export const gameSystems/);
  assert.match(tools, /destructible-building-parts/);
  assert.match(tools, /problem:/);
  assert.match(tools, /technologies:/);
  assert.match(tools, /suitePublicDetail/);
  assert.match(tools, /utilityPublicDetail/);
  assert.match(tools, /gameSystemPublicDetail/);
  assert.equal((projects.match(/^ {4}slug:/gm) ?? []).length, 8);
  assert.match(projects, /name: "King Cube"/);
  assert.match(projects, /slug: "cube-kingdom"/);
  assert.match(projects, /Money Planner/);
  assert.match(projects, /AssetForge \/ PackTriage/);
  assert.match(projects, /427-pack/);
  assert.match(projects, /SHA-256/);
  assert.match(projects, /Agent bridge/);
  assert.match(projects, /OpenAI-backed slice analysis/);
  assert.match(profile, /Kalyana Sundaram V/);
  assert.match(profile, /Bengaluru, Karnataka, India/);
  assert.match(profile, /kalyan\.wired@gmail\.com/);
  assert.match(profile, /kalyana-sundaram-v-742ba731/);
  assert.match(profile, /extendedResumePdfHref/);
  assert.doesNotMatch(profile, /8848307313/);
  assert.match(profile, /Readable systems/);
  assert.match(resume, /November 2024-March 2026/);
  assert.match(resume, /September 2021-May 2023/);
  assert.match(resume, /March 2018-April 2019/);
  assert.match(resume, /Gameplay programming/);
  assert.match(learning, /learningEntries: LearningEntry\[\] = \[\]/);
  assert.doesNotMatch([profile, resume, learning].join("\n"), /\[Add /);
  assert.match(dialog, /links\.some\(\(link\) => link\.href\)/);
  assert.doesNotMatch(dialog, /pending-link/);
  assert.match(app, /extendedResumePdfHref/);
  assert.match(types, /export type PublicDetail/);
  assert.match(artwork, /owner-art-raster/);
  assert.match(artwork, /projectArtwork/);
  assert.match(ownerAssets, /artwork:/);
  assert.match(ownerAssets, /meshes:/);
  assert.match(ownerAssets, /building: null/);
  assert.doesNotMatch(
    [
      app,
      tools,
      projects,
      profile,
      resume,
      learning,
      detail,
      dialog,
      quickLook,
    ].join("\n"),
    /R\u00c3|\u00c3\u0192|\u00c3\u201a/,
  );
});

test("packs every district on road frontage without spatial collisions", async () => {
  const { createBuilding, createEnvironment, scenePresets } =
    await loadDestructionModule();
  const minimumDistrictBuildings = {
    homestead: 2,
    village: 8,
    industrial: 5,
    civic: 4,
    metro: 10,
  };

  for (const scene of scenePresets) {
    const environment = createEnvironment(scene);
    const buildings = environment.props.filter(
      (prop) => prop.kind === "building",
    );
    assert.ok(
      buildings.length >= minimumDistrictBuildings[scene.id],
      `${scene.id} should retain a substantial surrounding district`,
    );

    const buildingFootprints = buildings.map((building) => ({
      id: building.id,
      bounds: architecturalFootprint(building),
    }));
    for (let first = 0; first < buildingFootprints.length; first += 1) {
      for (
        let second = first + 1;
        second < buildingFootprints.length;
        second += 1
      ) {
        assert.equal(
          overlaps(
            buildingFootprints[first].bounds,
            buildingFootprints[second].bounds,
          ),
          false,
          `${scene.id} buildings ${buildingFootprints[first].id} and ${buildingFootprints[second].id} overlap`,
        );
      }
    }

    for (const building of buildings) {
      const buildingBounds = architecturalFootprint(building);
      for (const surface of environment.surfaces) {
        assert.equal(
          overlaps(
            buildingBounds,
            footprint(surface.position, surface.scale, surface.rotation),
          ),
          false,
          `${scene.id} building ${building.id} overlaps ${surface.kind} ${surface.id}`,
        );
      }
      const access = environment.surfaces.find(
        (surface) => surface.id === building.roadAccess?.surfaceId,
      );
      assert.ok(
        access,
        `${scene.id} building ${building.id} needs road access`,
      );
      assert.ok(
        access.kind === "road" || access.kind === "path",
        `${scene.id} building ${building.id} must face a road or path`,
      );
    }

    for (let first = 0; first < environment.surfaces.length; first += 1) {
      for (
        let second = first + 1;
        second < environment.surfaces.length;
        second += 1
      ) {
        const firstSurface = environment.surfaces[first];
        const secondSurface = environment.surfaces[second];
        const pair = new Set([firstSurface.kind, secondSurface.kind]);
        if (!pair.has("plaza") || !pair.has("road")) continue;
        assert.equal(
          overlaps(
            footprint(
              firstSurface.position,
              firstSurface.scale,
              firstSurface.rotation,
            ),
            footprint(
              secondSurface.position,
              secondSurface.scale,
              secondSurface.rotation,
            ),
          ),
          false,
          `${scene.id} plaza overlaps road`,
        );
      }
    }

    for (const rail of environment.surfaces.filter(
      (surface) => surface.kind === "rail",
    )) {
      assert.ok(rail.position[1] <= 0.1, `${scene.id} rail must be grounded`);
    }
    for (const train of environment.props.filter(
      (prop) => prop.kind === "train",
    )) {
      assert.ok(
        train.position[1] <= 0.2,
        `${scene.id} train must meet its rail`,
      );
      assert.ok(
        environment.surfaces
          .filter((surface) => surface.kind === "rail")
          .some((rail) => railSupportsTrainRoute(rail, train)),
        `${scene.id} train ${train.id} needs rail under its full animated route`,
      );
    }

    const heroBounds = createBuilding(scene).reduce(
      (bounds, part) => {
        const partBounds = footprint(
          part.position,
          part.scale,
          part.rotation[1],
        );
        return {
          minX: Math.min(bounds.minX, partBounds.minX),
          maxX: Math.max(bounds.maxX, partBounds.maxX),
          minZ: Math.min(bounds.minZ, partBounds.minZ),
          maxZ: Math.max(bounds.maxZ, partBounds.maxZ),
        };
      },
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minZ: Number.POSITIVE_INFINITY,
        maxZ: Number.NEGATIVE_INFINITY,
      },
    );
    for (const building of buildingFootprints) {
      assert.equal(
        overlaps(heroBounds, building.bounds),
        false,
        `${scene.id} building ${building.id} overlaps the hero structure`,
      );
    }
    for (const surface of environment.surfaces.filter((item) =>
      ["road", "rail", "path"].includes(item.kind),
    )) {
      assert.equal(
        overlaps(
          heroBounds,
          footprint(surface.position, surface.scale, surface.rotation),
        ),
        false,
        `${scene.id} hero structure overlaps ${surface.kind} ${surface.id}`,
      );
    }

    const structuralBodyCount = createBuilding(scene).filter(
      (part) => part.kind !== "window" && part.kind !== "detail",
    ).length;
    assert.ok(
      structuralBodyCount <= 125,
      `${scene.id} structural collapse exceeds the rigid-body budget`,
    );
  }
});
