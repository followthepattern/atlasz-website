import * as THREE from "three";
import { edgeMaterial } from "../../materials";
import type { ScenePalette } from "../../palette";

/* The ground plane, as a wireframe that runs past where the fog can reach.
 *
 * The shared `buildGrid` is 460m across, which is fine for a scene watched from
 * fifty metres and wrong for one watched from three hundred: from the apex its
 * edge sits well inside the visible distance, and a floor with a visible edge
 * is a table, not a world.
 *
 * So this is the same idea at a size chosen against the fog rather than against
 * the content. The haze reaches full strength at roughly 1300m from the camera
 * at the highest framing, so the grid runs to 1400 and the map has no end that
 * can be seen — everything simply thins out and stops.
 *
 * Coarser than the shared one, 12m against 8m. At this extent an 8m pitch is
 * 350 lines a side, and the far half of them land inside a pixel of each other.
 */

const SIZE = 2800;
const STEP = 12;

export type Ground = {
  object3D: THREE.Object3D;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

export function proceduralGround(palette: ScenePalette): Ground {
  const material = edgeMaterial(palette, true);
  material.userData.kind = "grid";
  material.color.copy(palette.grid);
  material.opacity = palette.gridOpacity;

  const points: number[] = [];
  const half = SIZE / 2;
  for (let i = -half; i <= half; i += STEP) {
    points.push(-half, 0, i, half, 0, i);
    points.push(i, 0, -half, i, 0, half);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

  return {
    object3D: new THREE.LineSegments(geometry, material),

    setPalette(next) {
      material.color.copy(next.grid);
      material.opacity = next.gridOpacity;
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
