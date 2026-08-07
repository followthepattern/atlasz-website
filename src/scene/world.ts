import * as THREE from "three";
import type { ScenePalette } from "./palette";
import type { QualitySettings } from "./quality";
import { applyPalette, disposeObject, edgeMaterial } from "./materials";
import { proceduralTruck } from "./assets/truck";
import { proceduralWarehouse } from "./assets/warehouse";
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

/** Where the truck sits on the route at scroll 0 and scroll 1. */
const TRUCK_FROM = 0.3;
const TRUCK_TO = 0.612;

const WAREHOUSE_AT = 0.62;
const WAREHOUSE_OFFSET = 24; // metres from the carriageway centreline
const WAREHOUSE_WIDTH = 30; // must match proceduralWarehouse

/** How far off the carriageway the truck pulls in toward the dock face. */
const DOCK_PULL = WAREHOUSE_OFFSET - WAREHOUSE_WIDTH / 2 - 5;
/** Fraction of the scroll over which that turn-in happens, at the very end. */
const PULL_IN_FROM = 0.78;

const GRID_SIZE = 460;
const GRID_STEP = 8;

function smoothstep(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

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

function buildRoute(material: THREE.LineBasicMaterial) {
  const centre = ROUTE.getPoints(220);
  const group = new THREE.Group();
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(centre), material));

  for (const offset of [4.5, -4.5]) {
    const edge = centre.map((point, i) => {
      const heading = headingAt(Math.min(1, i / (centre.length - 1)));
      return new THREE.Vector3(
        point.x + Math.sin(heading) * offset,
        point.y,
        point.z + Math.cos(heading) * offset,
      );
    });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge), material));
  }
  return group;
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

export function createWorld(palette: ScenePalette, quality: QualitySettings): World {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(palette.fog.getHex(), palette.fogDensity);

  const materials: THREE.Material[] = [];

  const gridMaterial = edgeMaterial(palette, true);
  gridMaterial.userData.kind = "grid";
  gridMaterial.color.copy(palette.grid);
  gridMaterial.opacity = palette.gridOpacity;
  materials.push(gridMaterial);
  scene.add(buildGrid(gridMaterial));

  const routeMaterial = edgeMaterial(palette, true);
  routeMaterial.userData.kind = "route";
  routeMaterial.opacity = palette.lineOpacity * 0.5;
  materials.push(routeMaterial);
  scene.add(buildRoute(routeMaterial));

  const truck = proceduralTruck(palette);
  scene.add(truck.object3D);

  const warehouse = proceduralWarehouse(palette, quality.rackCount);
  placeOnRoute(warehouse.object3D, WAREHOUSE_AT, WAREHOUSE_OFFSET);
  // Turn the dock to face the carriageway the truck arrives on.
  warehouse.object3D.rotation.y += Math.PI / 2;
  scene.add(warehouse.object3D);

  const follow: Follow = { position: new THREE.Vector3(), heading: 0 };

  function driveTo(progress: number) {
    const p = Math.min(1, Math.max(0, progress));
    const t = TRUCK_FROM + (TRUCK_TO - TRUCK_FROM) * p;
    // Turn in toward the dock over the last stretch of the scroll.
    const side = smoothstep((p - PULL_IN_FROM) / (1 - PULL_IN_FROM)) * DOCK_PULL;
    placeOnRoute(truck.object3D, t, side);
    follow.position.copy(truck.object3D.position);
    follow.heading = truck.object3D.rotation.y;
  }

  driveTo(0);

  const assets: SceneAsset[] = [truck, warehouse];

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
      for (const asset of assets) asset.update?.(elapsed, delta, progress);
    },
    dispose() {
      for (const asset of assets) asset.dispose();
      disposeObject(scene);
      scene.clear();
    },
  };
}
