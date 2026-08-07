import * as THREE from "three";
import type { ScenePalette } from "./palette";
import type { QualitySettings } from "./quality";
import { applyPalette, disposeObject, edgeMaterial } from "./materials";
import { proceduralTruck } from "./assets/truck";
import { proceduralWarehouse } from "./assets/warehouse";
import { proceduralParticles } from "./assets/particles";
import type { SceneAsset } from "./assets/types";

/* The route is the authority on layout. The truck and the warehouse are placed
   ON the curve and rotated to its tangent — the first version pinned the truck
   to the +X axis while the road drifted in Z, so it sat visibly askew to its
   own route. Nothing here hardcodes a vehicle position any more. */

const ROUTE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-150, 0.05, -8),
  new THREE.Vector3(-70, 0.05, -3),
  new THREE.Vector3(0, 0.05, 0),
  new THREE.Vector3(70, 0.05, 5),
  new THREE.Vector3(150, 0.05, 12),
  new THREE.Vector3(230, 0.05, 20),
]);

const TRUCK_AT = 0.44;
const WAREHOUSE_AT = 0.68;
const WAREHOUSE_OFFSET = 26; // metres to the side of the carriageway

const GRID_SIZE = 460;
const GRID_STEP = 8;

/** Heading that points an asset's local +X along the route at `t`. */
function headingAt(t: number) {
  const tangent = ROUTE.getTangentAt(t);
  return Math.atan2(-tangent.z, tangent.x);
}

/** Places an object on the route, facing along it. */
function placeOnRoute(object: THREE.Object3D, t: number, sideOffset = 0) {
  const point = ROUTE.getPointAt(t);
  const heading = headingAt(t);
  // Perpendicular to the tangent in the ground plane.
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
  const geometry = new THREE.BufferGeometry().setFromPoints(centre);
  const group = new THREE.Group();
  group.add(new THREE.Line(geometry, material));

  // Carriageway edges, so the route reads as a road rather than a stray line.
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

export type World = {
  scene: THREE.Scene;
  anchors: Record<string, THREE.Vector3>;
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
  placeOnRoute(truck.object3D, TRUCK_AT);
  scene.add(truck.object3D);

  const warehouse = proceduralWarehouse(palette, quality.rackCount);
  placeOnRoute(warehouse.object3D, WAREHOUSE_AT, WAREHOUSE_OFFSET);
  // Turn the dock to face the carriageway the truck is arriving on.
  warehouse.object3D.rotation.y += Math.PI / 2;
  scene.add(warehouse.object3D);

  // Anchors resolve in world space, after placement and rotation — otherwise
  // the warehouse's local +X dock lands on the wrong side.
  truck.object3D.updateMatrixWorld(true);
  warehouse.object3D.updateMatrixWorld(true);

  const toWorld = (asset: SceneAsset, key: string) =>
    asset.object3D.localToWorld(asset.anchorPoints[key].clone());

  const anchors: Record<string, THREE.Vector3> = {
    truckCab: toWorld(truck, "cab"),
    truckHood: toWorld(truck, "hood"),
    truckTrailer: toWorld(truck, "trailer"),
    truckRear: toWorld(truck, "rear"),
    truckRoof: toWorld(truck, "roof"),
    truckWhole: toWorld(truck, "whole"),
    warehouseDock: toWorld(warehouse, "dock"),
    warehouseInterior: toWorld(warehouse, "interior"),
    warehouseWhole: toWorld(warehouse, "whole"),
  };

  const particles = proceduralParticles(
    palette,
    quality.particleCount,
    anchors.truckRoof.clone(),
    anchors.warehouseDock.clone(),
  );
  scene.add(particles.object3D);

  const assets: SceneAsset[] = [truck, warehouse, particles];

  return {
    scene,
    anchors,
    setPalette(next) {
      applyPalette(materials, next);
      for (const asset of assets) asset.setPalette(next);
      const fog = scene.fog as THREE.FogExp2;
      fog.color.copy(next.fog);
      fog.density = next.fogDensity;
    },
    update(elapsed, delta, progress) {
      for (const asset of assets) asset.update?.(elapsed, delta, progress);
    },
    dispose() {
      for (const asset of assets) asset.dispose();
      disposeObject(scene);
      scene.clear();
    },
  };
}
