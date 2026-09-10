import * as THREE from "three";
import { routeAt } from "./journey";
import { within } from "./scenes";
import type { TreePlacement } from "../assets/trees";
export type { Follow } from "../road";

const BEND_FROM = -450 + 1140 * routeAt(within(4, .03));
const BEND_TO = -450 + 1140 * routeAt(within(4, .97));

// A longer sandbox-only journey. Scroll timing remains authored in scenes.ts.
export function roadProfile(x: number) {
  // One shallow bend under the satellite view; the later open road is flat.
  if (x <= BEND_FROM || x >= BEND_TO) return { y: 0, z: 0 };
  const t = (x - BEND_FROM) / (BEND_TO - BEND_FROM);
  return { y: 0, z: 4 * Math.sin(Math.PI * t) ** 2 };
}
class JourneyRoad extends THREE.Curve<THREE.Vector3> {
  constructor() { super(); this.arcLengthDivisions = 2400; }
  getPoint(t: number, target = new THREE.Vector3()) {
    const x = -450 + 1140 * t;
    const { y, z } = roadProfile(x);
    return target.set(x, y, z);
  }
}
export const ROUTE = new JourneyRoad();
export function headingAt(t: number) {
  const tangent = ROUTE.getTangentAt(t);
  return Math.atan2(-tangent.z, tangent.x);
}
export function placeOnRoute(object: THREE.Object3D, t: number, sideOffset = 0) {
  const point = ROUTE.getPointAt(t);
  const heading = headingAt(t);
  object.position.set(point.x + Math.sin(heading) * sideOffset, point.y, point.z + Math.cos(heading) * sideOffset);
  object.rotation.set(0, heading, 0);
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
          roadProfile(point.x + Math.sin(heading) * offset + Math.cos(heading) * jitter).y * Math.max(0, 1 - (Math.abs(offset) - 4.8) / 16),
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

