import * as THREE from "three";
import type { ScenePalette } from "./palette";
import type { QualitySettings } from "./quality";
import { applyPalette, disposeObject, edgeMaterial } from "./materials";
import { proceduralTruck } from "./assets/truck";
import { proceduralWarehouse } from "./assets/warehouse";
import { proceduralParticles } from "./assets/particles";
import type { SceneAsset } from "./assets/types";

/* World layout, in metres:
     truck      at the origin, facing +X
     warehouse  90 m ahead, rotated so its dock faces the approaching truck
     route      a ground line running through both
   The camera rig reads every position from `anchors` rather than these
   numbers, so moving a building does not silently break the choreography. */

const WAREHOUSE_POSITION = new THREE.Vector3(90, 0, 8);
const GRID_SIZE = 420;
const GRID_STEP = 8;

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
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-140, 0.06, -6),
    new THREE.Vector3(-60, 0.06, -2),
    new THREE.Vector3(0, 0.06, 0),
    new THREE.Vector3(45, 0.06, 4),
    new THREE.Vector3(90, 0.06, 8),
    new THREE.Vector3(170, 0.06, 14),
  ]);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(180));
  return new THREE.Line(geometry, material);
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
  gridMaterial.opacity = 0.42;
  materials.push(gridMaterial);
  scene.add(buildGrid(gridMaterial));

  const routeMaterial = edgeMaterial(palette);
  routeMaterial.userData.kind = "accent";
  routeMaterial.color.copy(palette.accent);
  materials.push(routeMaterial);
  scene.add(buildRoute(routeMaterial));

  const truck = proceduralTruck(palette);
  scene.add(truck.object3D);

  const warehouse = proceduralWarehouse(palette, quality.rackCount);
  warehouse.object3D.position.copy(WAREHOUSE_POSITION);
  warehouse.object3D.rotation.y = Math.PI; // dock faces the approaching truck
  scene.add(warehouse.object3D);

  // Anchors must be resolved in world space, after placement and rotation —
  // otherwise the warehouse's local +X dock lands on the wrong side.
  warehouse.object3D.updateMatrixWorld(true);
  truck.object3D.updateMatrixWorld(true);

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
      gridMaterial.color.copy(next.grid);
      gridMaterial.opacity = 0.42;
      routeMaterial.color.copy(next.accent);
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
