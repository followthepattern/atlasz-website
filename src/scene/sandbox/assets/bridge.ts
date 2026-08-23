import * as THREE from "three";
import {
  panelFill,
  glassFill,
  edgeMaterial,
  edgesFor,
  lineSegments,
} from "../../materials";
import type { ScenePalette } from "../../palette";

/* A short through-truss bridge over a river.
 *
 * A truss because this register is line-art and a truss is already a drawing —
 * chords and diagonals, which is the one thing an unlit scene renders well. A
 * solid beam would be two grey rectangles.
 *
 * Two panels, and only two. The first version had ten across a 124m span, which
 * was wrong twice over: the vehicle covers about 35m during this scene, so it
 * could never have crossed the thing inside its own scene, and a truss that
 * long is visible from most of the page. Sized to be got over, not admired.
 *
 * It is the only structure in this world the vehicle passes *through* rather
 * than beside, so the trusses stand either side of the carriageway.
 *
 * Local frame: +x along the road, +z across it. The river therefore runs along
 * z and is narrow in x — the first version had that the wrong way round and
 * laid the water out parallel to the road, which is a canal, not a crossing.
 */

/** Half the span, in metres. 31m end to end. */
const SPAN = 15.5;

/** Half the width between trusses, and how deep they are. */
const HALF_WIDTH = 6;
const DEPTH = 4.6;
/** Bottom chord, just clear of the road surface at y = 0.06. */
const CHORD_Y = 0.85;

/** Panels per side. */
const PANELS = 2;

/** The river: narrow across the road, long along its own course. */
const WATER_Y = -2.4;
const RIVER = { halfWidth: 12.5, length: 720 } as const;

export type Bridge = {
  object3D: THREE.Object3D;
  /** 0 hides it, 1 is fully present. Driven by the vehicle's distance to it. */
  setStrength(value: number): void;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

export function proceduralBridge(palette: ScenePalette): Bridge {
  const group = new THREE.Group();

  const fill = panelFill(palette);
  const water = glassFill(palette);
  const edge = edgeMaterial(palette);
  const edgeDim = edgeMaterial(palette, true);
  const materials: THREE.Material[] = [fill, water, edge, edgeDim];
  const geometries: THREE.BufferGeometry[] = [];

  const box = (
    size: [number, number, number],
    at: [number, number, number],
    outline = edge,
  ) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...at);
    geometries.push(geometry);
    group.add(new THREE.Mesh(geometry, fill), edgesFor(geometry, outline));
  };

  // --- The river, running across the road ---------------------------------
  const surface = new THREE.PlaneGeometry(RIVER.halfWidth * 2, RIVER.length);
  surface.rotateX(-Math.PI / 2);
  surface.translate(0, WATER_Y, 0);
  geometries.push(surface);
  group.add(new THREE.Mesh(surface, water));

  /* Banks: a lip either side at ground level, so the water reads as a channel
     cut into the ground rather than a grey rectangle lying on it. */
  for (const x of [-RIVER.halfWidth, RIVER.halfWidth]) {
    box([0.5, 0.35, RIVER.length], [x, -0.17, 0], edgeDim);
  }

  /* Ripples run with the current, along z, at irregular lengths — regular ones
     read as a grid, which is the one thing water is not. */
  const ripples: number[] = [];
  for (let x = -RIVER.halfWidth + 2; x < RIVER.halfWidth; x += 2.6) {
    for (let z = -RIVER.length / 2; z < RIVER.length / 2; z += 26) {
      const drift = Math.sin(z * 0.03 + x) * 0.8;
      const run = 9 + Math.abs(Math.sin(z * 0.041 + x)) * 11;
      ripples.push(x + drift, WATER_Y + 0.05, z, x + drift, WATER_Y + 0.05, z + run);
    }
  }
  group.add(lineSegments(ripples, edgeDim));

  // --- Deck ---------------------------------------------------------------
  // The running surface is the carriageway, which already crosses here. This is
  // what carries it.
  box([SPAN * 2, 0.5, HALF_WIDTH * 2 + 0.5], [0, -0.22, 0], edgeDim);

  // --- Trusses ------------------------------------------------------------
  const step = (SPAN * 2) / PANELS;
  const web: number[] = [];

  for (const side of [1, -1]) {
    const z = side * HALF_WIDTH;
    box([SPAN * 2, 0.3, 0.24], [0, CHORD_Y, z], edgeDim); // bottom chord
    box([SPAN * 2, 0.34, 0.28], [0, CHORD_Y + DEPTH, z], edgeDim); // top chord

    for (let i = 0; i <= PANELS; i += 1) {
      const x = -SPAN + i * step;
      web.push(x, CHORD_Y, z, x, CHORD_Y + DEPTH, z); // vertical
      if (i === PANELS) continue;
      // Diagonals meeting at the crown: the pattern that reads as a truss
      // rather than as a ladder, and with two panels it is a single vee.
      const next = x + step;
      if (i === 0) web.push(x, CHORD_Y, z, next, CHORD_Y + DEPTH, z);
      else web.push(x, CHORD_Y + DEPTH, z, next, CHORD_Y, z);
    }
  }

  /* Transverse ties overhead at the panel points only.
   *
   * The X-shaped sway bracing that was here is gone. Drawn between two top
   * chords it crosses the carriageway at truck height in plan and reads as
   * something the vehicle drives into — and at this span there is nothing for
   * it to brace anyway. Straight ties do the job and stay out of the way. */
  for (let i = 0; i <= PANELS; i += 1) {
    const x = -SPAN + i * step;
    web.push(x, CHORD_Y + DEPTH, -HALF_WIDTH, x, CHORD_Y + DEPTH, HALF_WIDTH);
  }
  group.add(lineSegments(web, edgeDim));

  // Portal frames at both ends: the thing the vehicle visibly drives through.
  for (const x of [-SPAN, SPAN]) {
    for (const z of [-HALF_WIDTH, HALF_WIDTH]) {
      box([0.42, DEPTH + 0.3, 0.42], [x, CHORD_Y + DEPTH / 2, z]);
    }
    box([0.42, 0.5, HALF_WIDTH * 2], [x, CHORD_Y + DEPTH + 0.42, 0]);
  }

  // --- Abutments ----------------------------------------------------------
  // On the banks, not in the water: a single clear span over the channel.
  for (const x of [-SPAN + 1.6, SPAN - 1.6]) {
    box([2.4, 2.6, HALF_WIDTH * 2 + 1], [x, -1.5, 0], edgeDim);
  }

  let strength = 0;

  function applyStrength(value: number) {
    strength = Math.min(1, Math.max(0, value));
    group.visible = strength > 0.001;
    fill.opacity = palette.fillOpacity * strength;
    water.opacity = palette.glassOpacity * 0.8 * strength;
    edge.opacity = palette.lineOpacity * strength;
    edgeDim.opacity = palette.lineOpacity * 0.65 * strength;
  }
  applyStrength(0);

  return {
    object3D: group,

    setStrength: applyStrength,

    setPalette(next) {
      palette = next;
      fill.color.copy(next.fill);
      water.color.copy(next.glass);
      edge.color.copy(next.line);
      edgeDim.color.copy(next.lineDim);
      applyStrength(strength);
    },

    dispose() {
      for (const geometry of geometries) geometry.dispose();
      group.traverse((child) => {
        (child as Partial<THREE.Mesh>).geometry?.dispose();
      });
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}
