import * as THREE from "three";
import { panelFill, edgeMaterial, lineSegments } from "../../materials";
import { ROUTE, headingAt } from "../road";
import type { ScenePalette } from "../../palette";

/* The road itself.
 *
 * The sandbox ROUTE is the authority on this scene's layout from the beginning —
 * every vehicle, tree, building and camera is placed along it — and until now
 * nothing has drawn it. The truck has been driving down an invisible line on a
 * wireframe floor, which reads as a model on a table rather than as a journey.
 *
 * Built by walking the same curve everything else is placed on, so the surface
 * cannot disagree with what drives on it. If the route is ever re-shaped, the
 * road re-shapes with it and no number here needs touching.
 */

/** Half the carriageway, in metres. Two lanes and a little shoulder. */
const HALF_WIDTH = 4.8;
/** How far outside the surface the verge line runs. */
const VERGE = 1.6;

/* Samples along the curve. The route is ~1150m, so this puts a cross-section
   about every 1.4m — fine enough that the bends read as curves rather than as
   a chain of straights, and cheap enough to be one draw call. */
const SAMPLES = 840;

/** Lifted clear of the grid, which sits at y=0 and would otherwise z-fight. */
const SURFACE_Y = 0.06;

/* How far the road runs past each end of the route, in metres.
 *
 * ROUTE stops where the scene's content stops, and a road that stops is a road
 * with an end in shot — at scroll 0 the camera sits behind a vehicle that is
 * near the start of the curve, and the tarmac simply ran out behind it. So the
 * carriageway continues straight along the end tangents until the fog takes it,
 * which is what a road does. Nothing drives on the run-out; it exists to not be
 * seen ending — so it is sized against the haze rather than against the scene,
 * and runs further than the fog can see at any framing. */
const RUNOUT = 1200;

/** Cross-sections per 100m of run-out. Straight, so it needs very few. */
const RUNOUT_STEP = 40;

export type Carriageway = {
  object3D: THREE.Object3D;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

export function proceduralCarriageway(palette: ScenePalette): Carriageway {
  const group = new THREE.Group();

  const surface = panelFill(palette);
  // The road is a surface, not an object with a silhouette: outlining every
  // cross-section would draw 280 rungs of a ladder up the middle of the scene.
  const edge = edgeMaterial(palette);
  const edgeDim = edgeMaterial(palette, true);
  const materials: THREE.Material[] = [surface, edge, edgeDim];

  const positions: number[] = [];
  const edges: number[] = [];
  const verges: number[] = [];
  const dashes: number[] = [];
  const banks: number[] = [];

  /* Every cross-section the road is built from: a straight run-out, the route
     itself, then another straight run-out. Assembled first so the strip below
     does not care which part of the road it is bridging. */
  const centres: { x: number; y: number; z: number; heading: number }[] = [];

  const runout = (t: 0 | 1, direction: -1 | 1) => {
    const end = ROUTE.getPointAt(t);
    const tangent = ROUTE.getTangentAt(t);
    const heading = headingAt(t);
    const steps = Math.round(RUNOUT / RUNOUT_STEP);
    const out: { x: number; y: number; z: number; heading: number }[] = [];
    for (let i = 1; i <= steps; i += 1) {
      const d = (i / steps) * RUNOUT * direction;
      out.push({ x: end.x + tangent.x * d, y: end.y, z: end.z + tangent.z * d, heading });
    }
    return out;
  };

  // Backwards from the start, reversed so the whole list runs in one direction.
  centres.push(...runout(0, -1).reverse());
  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = i / SAMPLES;
    const point = ROUTE.getPointAt(t);
    centres.push({ x: point.x, y: point.y, z: point.z, heading: headingAt(t) });
  }
  centres.push(...runout(1, 1));

  let previous: { lx: number; lz: number; rx: number; rz: number; y: number } | null = null;

  for (let i = 0; i < centres.length; i += 1) {
    const point = centres[i];
    const heading = point.heading;
    // The route's own side axis — the same (sin, cos) placeOnRoute offsets by,
    // so the road's edges are parallel to everything standing beside it.
    const sx = Math.sin(heading);
    const sz = Math.cos(heading);

    const current = {
      y: point.y + SURFACE_Y,
      lx: point.x + sx * HALF_WIDTH,
      lz: point.z + sz * HALF_WIDTH,
      rx: point.x - sx * HALF_WIDTH,
      rz: point.z - sz * HALF_WIDTH,
    };

    if (previous) {
      const { lx, lz, rx, rz } = current;
      const p = previous;
      // Two triangles bridging this cross-section and the last.
      positions.push(
        p.lx, p.y, p.lz, p.rx, p.y, p.rz, lx, current.y, lz,
        p.rx, p.y, p.rz, rx, current.y, rz, lx, current.y, lz,
      );
      edges.push(p.lx, p.y, p.lz, lx, current.y, lz);
      edges.push(p.rx, p.y, p.rz, rx, current.y, rz);

      if (p.y > .07 || current.y > .07) {
        for (const side of [-1, 1]) {
          const ax = side > 0 ? p.lx : p.rx, az = side > 0 ? p.lz : p.rz;
          const bx = side > 0 ? lx : rx, bz = side > 0 ? lz : rz;
          const reach = 16;
          const psx = (p.lx - p.rx) / (HALF_WIDTH * 2);
          const psz = (p.lz - p.rz) / (HALF_WIDTH * 2);
          banks.push(ax,p.y-.03,az, ax+psx*side*reach,0,az+psz*side*reach, bx,current.y-.03,bz,
            bx,current.y-.03,bz, ax+psx*side*reach,0,az+psz*side*reach, bx+sx*side*reach,0,bz+sz*side*reach);
        }
      }
      // Verge markers a little outside the tarmac, which is most of what gives
      // the eye a sense of speed when the camera is low and close.
      const vl = HALF_WIDTH + VERGE;
      verges.push(
        point.x + sx * vl, point.y * .9 + SURFACE_Y, point.z + sz * vl,
        point.x + sx * (vl + 0.9), point.y * .84375 + SURFACE_Y, point.z + sz * (vl + 0.9),
      );
      verges.push(
        point.x - sx * vl, point.y * .9 + SURFACE_Y, point.z - sz * vl,
        point.x - sx * (vl + 0.9), point.y * .84375 + SURFACE_Y, point.z - sz * (vl + 0.9),
      );

      /* Centre line, dashed: four samples on, two off. Drawn from the curve
         rather than from the quad, so it stays centred through the bends.
         Longer marks than gaps, which is what a real carriageway runs and what
         gives the eye something to measure speed against. */
      if (i % 6 < 4) {
        dashes.push(p.lx * 0 + (p.lx + p.rx) / 2, p.y, (p.lz + p.rz) / 2);
        dashes.push((current.lx + current.rx) / 2, current.y, (current.lz + current.rz) / 2);
      }
    }

    previous = current;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry, surface));
  const bankGeometry = new THREE.BufferGeometry();
  bankGeometry.setAttribute('position', new THREE.Float32BufferAttribute(banks, 3));
  const bankMaterial = panelFill(palette); bankMaterial.side = THREE.DoubleSide;
  materials.push(bankMaterial);
  group.add(new THREE.Mesh(bankGeometry, bankMaterial));

  group.add(lineSegments(edges, edge));
  group.add(lineSegments(dashes, edge));
  group.add(lineSegments(verges, edgeDim));

  return {
    object3D: group,

    setPalette(next) {
      bankMaterial.color.copy(next.fill);
      bankMaterial.opacity = next.fillOpacity;
      surface.color.copy(next.fill);
      surface.opacity = next.fillOpacity;
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
