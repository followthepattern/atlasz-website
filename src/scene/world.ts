import * as THREE from "three";
import type { ScenePalette } from "./palette";
import type { QualitySettings } from "./quality";
import type { Journey } from "./journeys";
import { applyPalette, disposeObject, edgeMaterial } from "./materials";
import { proceduralTruck } from "./assets/truck";
import { proceduralWarehouse } from "./assets/warehouse";
import { proceduralTrees, type TreePlacement } from "./assets/trees";
import type { SceneAsset } from "./assets/types";

/* The route is the authority on layout. The truck is placed ON the curve and
   rotated to its tangent, and its position along the curve is driven by scroll:
   scrolling the page drives the vehicle down the road until it pulls in at the
   facility. Nothing here hardcodes a vehicle position. */

const ROUTE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-150, 0.05, -8),
  new THREE.Vector3(-70, 0.05, -3),
  new THREE.Vector3(0, 0.05, 0),
  new THREE.Vector3(70, 0.05, 5),
  new THREE.Vector3(150, 0.05, 12),
  new THREE.Vector3(230, 0.05, 20),
]);

/* Where the truck starts and stops along the route is the journey's to say — a
   short page covers less road than a long one — so nothing here fixes either
   end. The parked pair are placed at whatever the journey's arrival point is,
   which is what keeps them straddling it however far the truck has driven. */

/* Two identical units already standing at the facility, parked side by side
   with a bay left empty between them for the one that arrives. They belong to
   the arrival, not the opening: the hero is one vehicle on an open road, and
   the end of the page is it pulling into its own fleet's yard. */
const PARKING_BAY = 5.4; // metres between bay centres, across the apron

const WAREHOUSE_AT = 0.62;
/* Beside the bays rather than across a wide apron, now that the truck holds a
   straight line instead of crossing the yard to reach it. */
const WAREHOUSE_OFFSET = 26; // metres from the route centreline

const GRID_SIZE = 460;
const GRID_STEP = 8;

/* Treeline. It exists to make the truck's travel legible — an empty ground
   plane gives the eye nothing to measure motion against. */
const TREES_FROM = 0.18;
const TREES_TO = 0.78;
const TREE_SPACING = 17; // metres of arc between rows
/**
 * Distance from the centreline before jitter. This has to clear the camera's
 * own lateral offset — the rig swings up to ~12 m to the side at the hero
 * framing, and a verge inside that plants trees directly in front of the lens,
 * where one conifer can blot out the entire headline.
 */
const TREE_VERGE = 18;
const TREE_SPREAD = 16; // extra metres of scatter beyond the verge

/** Heading that points an asset's local +X along the route at `t`. */
function headingAt(t: number) {
  const tangent = ROUTE.getTangentAt(t);
  return Math.atan2(-tangent.z, tangent.x);
}

/** Places an object on the route, facing along it. */
function placeOnRoute(object: THREE.Object3D, t: number, sideOffset = 0) {
  const point = ROUTE.getPointAt(t);
  const heading = headingAt(t);
  object.position.set(
    point.x + Math.sin(heading) * sideOffset,
    0,
    point.z + Math.cos(heading) * sideOffset,
  );
  object.rotation.y = heading;
}

function buildGrid(material: THREE.LineBasicMaterial) {
  const points: number[] = [];
  const half = GRID_SIZE / 2;
  for (let i = -half; i <= half; i += GRID_STEP) {
    points.push(-half, 0, i, half, 0, i);
    points.push(i, 0, -half, i, 0, half);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(geometry, material);
}

/* Deterministic PRNG, so the treeline is identical on every load. Math.random
   here would reshuffle the scenery between reloads and between screenshots. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Trees down both verges, spaced along the route by arc length. */
function treePlacements(): TreePlacement[] {
  const random = mulberry32(0x5ca17a);
  const placements: TreePlacement[] = [];
  const length = ROUTE.getLength();
  const step = TREE_SPACING / length;

  for (let t = TREES_FROM; t <= TREES_TO; t += step) {
    const point = ROUTE.getPointAt(t);
    const heading = headingAt(t);

    for (const sign of [1, -1]) {
      // Leave the frontage clear where the facility meets the road.
      if (sign > 0 && Math.abs(t - WAREHOUSE_AT) < 0.055) continue;
      if (random() < 0.18) continue; // gaps, so the line is not a fence

      const offset = sign * (TREE_VERGE + random() * TREE_SPREAD);
      const jitter = (random() - 0.5) * TREE_SPACING * 0.6;

      placements.push({
        position: new THREE.Vector3(
          point.x + Math.sin(heading) * offset + Math.cos(heading) * jitter,
          0,
          point.z + Math.cos(heading) * offset - Math.sin(heading) * jitter,
        ),
        scale: 0.7 + random() * 0.6,
        rotation: random() * Math.PI * 2,
        conifer: random() < 0.55,
      });
    }
  }

  return placements;
}

/** Live pose of the vehicle the camera is following. Mutated every frame. */
export type Follow = {
  position: THREE.Vector3;
  heading: number;
};

export type World = {
  scene: THREE.Scene;
  follow: Follow;
  /** The truck's own anchor points, in its local space. */
  truckAnchors: Record<string, THREE.Vector3>;
  setPalette(palette: ScenePalette): void;
  update(elapsed: number, delta: number, progress: number): void;
  dispose(): void;
};

export function createWorld(
  palette: ScenePalette,
  quality: QualitySettings,
  journey: Journey,
): World {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(palette.fog.getHex(), palette.fogDensity);

  const materials: THREE.Material[] = [];

  const gridMaterial = edgeMaterial(palette, true);
  gridMaterial.userData.kind = "grid";
  gridMaterial.color.copy(palette.grid);
  gridMaterial.opacity = palette.gridOpacity;
  materials.push(gridMaterial);
  scene.add(buildGrid(gridMaterial));

  const truck = proceduralTruck(palette);
  scene.add(truck.object3D);

  // Flanking bays on the apron. Same road position as the arriving truck,
  // offset across it, so the empty middle bay is the one it pulls into.
  const parked = [-PARKING_BAY, PARKING_BAY].map((side) => {
    const unit = proceduralTruck(palette);
    placeOnRoute(unit.object3D, journey.truckTo, side);
    scene.add(unit.object3D);
    return unit;
  });

  const trees = proceduralTrees(palette, treePlacements());
  scene.add(trees.object3D);

  const warehouse = proceduralWarehouse(palette, quality.rackCount);
  placeOnRoute(warehouse.object3D, WAREHOUSE_AT, WAREHOUSE_OFFSET);
  // Turn the dock to face the carriageway the truck arrives on.
  warehouse.object3D.rotation.y += Math.PI / 2;
  scene.add(warehouse.object3D);

  const follow: Follow = { position: new THREE.Vector3(), heading: 0 };

  function driveTo(progress: number) {
    const p = Math.min(1, Math.max(0, progress));
    const t = journey.truckFrom + (journey.truckTo - journey.truckFrom) * p;
    // Straight down its own line, never across it. An earlier version ramped a
    // lateral offset in over the last stretch to reach the dock, which slid the
    // truck sideways while it stayed pointed along the road — a crab-walk, not
    // a drive. The bays are on this line instead, so arriving is pure forward
    // motion and the truck is already square with the pair it parks between.
    placeOnRoute(truck.object3D, t, 0);
    follow.position.copy(truck.object3D.position);
    follow.heading = truck.object3D.rotation.y;
  }

  driveTo(0);

  const assets: SceneAsset[] = [truck, ...parked, warehouse, trees];

  return {
    scene,
    follow,
    truckAnchors: truck.anchorPoints,
    setPalette(next) {
      applyPalette(materials, next);
      for (const asset of assets) asset.setPalette(next);
      const fog = scene.fog as THREE.FogExp2;
      fog.color.copy(next.fog);
      fog.density = next.fogDensity;
    },
    update(elapsed, delta, progress) {
      driveTo(progress);
      // Only the moving unit is animated. The parked pair keep their wheels
      // still, which is what tells them apart from the one under way.
      truck.update?.(elapsed, delta, progress);
    },
    dispose() {
      for (const asset of assets) asset.dispose();
      disposeObject(scene);
      scene.clear();
    },
  };
}
