import * as THREE from "three";
import { panelFill, accentFill, edgeMaterial, edgesFor } from "../../materials";
import type { ScenePalette } from "../../palette";

/* A fuel station: a canopy on columns, two pumps under it, and a shop behind.
 *
 * Built in its own local frame — +x along the road, +z away from it, so the
 * pumps sit nearest the carriageway and the shop stands behind them — and
 * placed on the route by the world, the same way the warehouse is. Nothing here
 * knows where it stands.
 *
 * Same panel-and-outline vocabulary as the truck and the warehouse. The clouds
 * are this scene's one departure from the register; a building is not the place
 * to add a second.
 */

/** The island itself, in the station's own frame. */
export const PUMP_ISLAND = new THREE.Vector3(0, 0, 3.4);

const CANOPY_HEIGHT = 6.2;
const CANOPY = { length: 17, depth: 11 } as const;

export type Station = {
  object3D: THREE.Object3D;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

export function proceduralStation(palette: ScenePalette): Station {
  const group = new THREE.Group();

  const fill = panelFill(palette);
  const accent = accentFill(palette);
  const edge = edgeMaterial(palette);
  const edgeDim = edgeMaterial(palette, true);
  const materials: THREE.Material[] = [fill, accent, edge, edgeDim];

  const addBox = (
    size: [number, number, number],
    at: [number, number, number],
    material: THREE.Material = fill,
    outline = edge,
  ) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...at);
    group.add(new THREE.Mesh(geometry, material), edgesFor(geometry, outline));
  };

  // --- Canopy -------------------------------------------------------------
  // A deep flat roof, which is the thing that reads as "fuel station" from a
  // distance long before the pumps are resolvable.
  addBox([CANOPY.length, 0.55, CANOPY.depth], [0, CANOPY_HEIGHT, 4], fill, edge);
  // Fascia band under the leading edge, where the branding would go.
  addBox([CANOPY.length, 0.3, 0.12], [0, CANOPY_HEIGHT - 0.42, 4 - CANOPY.depth / 2],
    accent, edge);

  for (const x of [-CANOPY.length / 2 + 0.3, CANOPY.length / 2 - 0.3]) {
    for (const z of [4 - CANOPY.depth / 2 + 1.4, 4 + CANOPY.depth / 2 - 1.4]) {
      addBox([0.55, CANOPY_HEIGHT - 0.3, 0.55], [x, (CANOPY_HEIGHT - 0.3) / 2, z],
        fill, edgeDim);
    }
  }

  // --- Pump island --------------------------------------------------------
  addBox([7.5, 0.22, 2.2], [PUMP_ISLAND.x, 0.11, PUMP_ISLAND.z], fill, edgeDim);

  for (const x of [-2.2, 2.2]) {
    // Pump body, and the reader panel facing the road.
    addBox([1.0, 2.1, 0.9], [x, 1.27, PUMP_ISLAND.z], fill, edge);
    addBox([0.62, 0.5, 0.06], [x, 1.86, PUMP_ISLAND.z + 0.48], accent, edgeDim);
    const hosePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x + 0.48, 2.2, PUMP_ISLAND.z),
      new THREE.Vector3(x + 0.9, 1.6, PUMP_ISLAND.z - 0.3),
      new THREE.Vector3(x + 0.8, 0.55, PUMP_ISLAND.z - 0.5),
      new THREE.Vector3(x + 0.55, 0.65, PUMP_ISLAND.z - 0.5),
      new THREE.Vector3(x + 0.5, 1.5, PUMP_ISLAND.z - 0.5),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(hosePath, 20, 0.035, 5, false), accent));
    // The hose gantry over it.
    addBox([0.12, 0.7, 0.12], [x + 0.42, 2.62, PUMP_ISLAND.z], fill, edgeDim);
  }

  // --- Shop ---------------------------------------------------------------
  // Set back behind the canopy, so the forecourt stays open where the vehicle
  // has to be.
  addBox([9, 3.6, 6], [-1, 1.8, 13.5], fill, edge);
  addBox([9.4, 0.25, 6.4], [-1, 3.72, 13.5], fill, edgeDim); // roof lip
  for (const x of [-3.6, -1, 1.6]) {
    addBox([1.7, 1.6, 0.08], [x, 1.9, 10.46], accent, edgeDim); // windows
  }

  // Storage tanks beside the shop, clear of the driver's path and pump island.
  for (const x of [6.2, 9]) {
    const geometry = new THREE.CylinderGeometry(0.95, 0.95, 3.6, 20);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(x, 1.4, 13.5);
    group.add(new THREE.Mesh(geometry, fill), edgesFor(geometry, edge));
    for (const z of [12.3, 14.7]) addBox([1.8, 0.5, 0.35], [x, 0.25, z], fill, edgeDim);
  }

  return {
    object3D: group,

    setPalette(next) {
      fill.color.copy(next.fill);
      fill.opacity = next.fillOpacity;
      accent.color.copy(next.accent);
      edge.color.copy(next.line);
      edge.opacity = next.lineOpacity;
      edgeDim.color.copy(next.lineDim);
      edgeDim.opacity = next.lineOpacity * 0.65;
    },

    dispose() {
      group.traverse((child) => {
        (child as Partial<THREE.Mesh>).geometry?.dispose();
      });
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}
