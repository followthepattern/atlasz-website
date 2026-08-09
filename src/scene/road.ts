import * as THREE from "three";
import type { ScenePalette } from "./palette";
import { edgeMaterial } from "./materials";
import type { TreePlacement } from "./assets/trees";

/* The shared terrain kit: the road every scene's vehicles drive on, the ground
   under them, and the treeline that makes their motion legible.
 *
 * A toolkit, not a world. Nothing here decides what stands beside the road —
 * each scene assembles its own from these pieces, which is what lets one grow
 * stations and depots the other never sees. */

/* The route is the authority on layout. Assets are placed ON the curve and
   rotated to its tangent, so nothing hardcodes a position in world space. */
export const ROUTE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-150, 0.05, -8),
  new THREE.Vector3(-70, 0.05, -3),
  new THREE.Vector3(0, 0.05, 0),
  new THREE.Vector3(70, 0.05, 5),
  new THREE.Vector3(150, 0.05, 12),
  new THREE.Vector3(230, 0.05, 20),
]);

/** Heading that points an asset's local +X along the route at `t`. */
export function headingAt(t: number) {
  const tangent = ROUTE.getTangentAt(t);
  return Math.atan2(-tangent.z, tangent.x);
}

/** Places an object on the route, facing along it. */
export function placeOnRoute(object: THREE.Object3D, t: number, sideOffset = 0) {
  const point = ROUTE.getPointAt(t);
  const heading = headingAt(t);
  object.position.set(
    point.x + Math.sin(heading) * sideOffset,
    0,
    point.z + Math.cos(heading) * sideOffset,
  );
  object.rotation.y = heading;
}

const GRID_SIZE = 460;
const GRID_STEP = 8;

/** The ground plane, as a wireframe that fades out into the fog. */
export function buildGrid(palette: ScenePalette) {
  const material = edgeMaterial(palette, true);
  material.userData.kind = "grid";
  material.color.copy(palette.grid);
  material.opacity = palette.gridOpacity;

  const points: number[] = [];
  const half = GRID_SIZE / 2;
  for (let i = -half; i <= half; i += GRID_STEP) {
    points.push(-half, 0, i, half, 0, i);
    points.push(i, 0, -half, i, 0, half);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

  return { object3D: new THREE.LineSegments(geometry, material), material };
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

export type TreelineOptions = {
  from?: number;
  to?: number;
  /**
   * Distance from the centreline before jitter. This has to clear the camera's
   * own lateral offset — a verge inside it plants trees directly in front of
   * the lens, where one conifer can blot out an entire headline.
   */
  verge?: number;
  /** Extra metres of scatter beyond the verge. */
  spread?: number;
  /** Stretches of route to leave clear, as [t, halfWidth] pairs — frontages,
      yards, anywhere a wall of conifers would be in the way. */
  clearings?: [number, number][];
  seed?: number;
};

/** Trees down both verges, spaced along the route by arc length. */
export function treePlacements(options: TreelineOptions = {}): TreePlacement[] {
  const {
    from = 0.18,
    to = 0.78,
    verge = 18,
    spread = 16,
    clearings = [],
    seed = 0x5ca17a,
  } = options;

  const random = mulberry32(seed);
  const placements: TreePlacement[] = [];
  const spacing = 17; // metres of arc between rows
  const step = spacing / ROUTE.getLength();

  for (let t = from; t <= to; t += step) {
    const point = ROUTE.getPointAt(t);
    const heading = headingAt(t);

    for (const sign of [1, -1]) {
      // Clearings are on the facility side only — that is the side things get
      // built on, and thinning both verges would open a corridor.
      if (sign > 0 && clearings.some(([at, half]) => Math.abs(t - at) < half)) continue;
      if (random() < 0.18) continue; // gaps, so the line is not a fence

      const offset = sign * (verge + random() * spread);
      const jitter = (random() - 0.5) * spacing * 0.6;

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

/** Live pose of the vehicle a camera is following. Mutated every frame. */
export type Follow = {
  position: THREE.Vector3;
  heading: number;
};
