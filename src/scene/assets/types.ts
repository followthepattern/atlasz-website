import type * as THREE from "three";
import type { ScenePalette } from "../palette";

/**
 * The one shape every scene asset returns.
 *
 * This is the GLTF seam. `proceduralTruck()` ships today; a future
 * `gltfTruck(url)` returning the same shape drops in without `world.ts` or
 * `cameraRig.ts` changing a line. The camera positions itself from
 * `anchorPoints`, never from hardcoded coordinates, so swapping the model does
 * not invalidate the choreography.
 */
export type SceneAsset = {
  object3D: THREE.Object3D;
  bounds: THREE.Box3;
  /** Named positions in local space: camera targets, particle emitters. */
  anchorPoints: Record<string, THREE.Vector3>;
  setPalette(palette: ScenePalette): void;
  update?(elapsed: number, delta: number, progress: number): void;
  dispose(): void;
};
