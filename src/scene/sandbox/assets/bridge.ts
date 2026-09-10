import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  panelFill,
  glassFill,
  edgeMaterial,
  lineSegments,
} from "../../materials";
import type { ScenePalette } from "../../palette";

/* A compact through-truss crossing. The carriageway runs along local +x;
 * the river runs across it along z. Structural detail stays outside the road,
 * and all transverse steel stays above the truck's clearance envelope. */

/** Half the span, in metres. 39m end to end. */
const SPAN = 19.5;

/** Half the width between trusses, and how deep they are. */
const HALF_WIDTH = 6;
const DEPTH = 5.2;
/** Bottom chord, just clear of the road surface at y = 0.06. */
const CHORD_Y = 0.85;

/** Panels per side. */
const PANELS = 5;

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
  const steel = new THREE.MeshBasicMaterial({
    color: palette.lineDim,
    transparent: true,
  });
  const materials: THREE.Material[] = [fill, water, edge, edgeDim, steel];
  // Batch structural surfaces and outlines so extra detail adds geometry,
  // rather than a draw call for every rail, plate and beam.
  const solids: THREE.BufferGeometry[] = [];
  const outlines = new Map<THREE.LineBasicMaterial, THREE.BufferGeometry[]>([
    [edge, []],
    [edgeDim, []],
  ]);
  const addSolid = (geometry: THREE.BufferGeometry, outline = edgeDim) => {
    solids.push(geometry);
    outlines.get(outline)!.push(new THREE.EdgesGeometry(geometry));
  };

  const box = (
    size: [number, number, number],
    at: [number, number, number],
    outline = edge,
  ) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...at);
    addSolid(geometry, outline);
  };

  // --- The river, running across the road ---------------------------------
  const surface = new THREE.PlaneGeometry(RIVER.halfWidth * 2, RIVER.length);
  surface.rotateX(-Math.PI / 2);
  surface.translate(0, WATER_Y, 0);
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
  const topY = CHORD_Y + DEPTH;
  const bolts: THREE.Vector3[] = [];
  const beam = (from: THREE.Vector3, to: THREE.Vector3, width: number, depth: number) => {
    const direction = to.clone().sub(from);
    const geometry = new THREE.BoxGeometry(width, direction.length(), depth);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), direction.normalize(),
    ));
    const middle = from.clone().add(to).multiplyScalar(0.5);
    geometry.translate(middle.x, middle.y, middle.z);
    addSolid(geometry);
  };

  for (const side of [1, -1]) {
    const z = side * HALF_WIDTH;
    // Chords have a broad flange and a narrower web, readable in silhouette.
    for (const y of [CHORD_Y, topY]) {
      box([SPAN * 2, 0.28, 0.25], [0, y, z]);
      for (const offset of [-0.19, 0.19]) {
        box([SPAN * 2, 0.075, 0.48], [0, y + offset, z], edgeDim);
      }
    }
    for (let i = 0; i <= PANELS; i += 1) {
      const x = -SPAN + i * step;
      box([0.28, DEPTH, 0.32], [x, CHORD_Y + DEPTH / 2, z]);
      if (i < PANELS) {
        const rises = i % 2 === 0;
        beam(
          new THREE.Vector3(x, rises ? CHORD_Y : topY, z),
          new THREE.Vector3(x + step, rises ? topY : CHORD_Y, z),
          0.24, 0.22,
        );
      }
      // Broad joint plates connect the diagonals, posts and chord flanges.
      for (const y of [CHORD_Y + 0.16, topY - 0.16]) {
        // End plates face inward along x, keeping plates inside the span.
        const plateX = x + (i === 0 ? 0.36 : i === PANELS ? -0.36 : 0);
        const plateZ = z + side * 0.27;
        box([0.88, 0.7, 0.085], [plateX, y, plateZ], edgeDim);
        for (const dx of [-0.27, 0.27]) {
          for (const dy of [-0.2, 0.2]) {
            bolts.push(new THREE.Vector3(plateX + dx, y + dy, plateZ + side * 0.07));
          }
        }
      }
    }

    // Walkway curbs sit well outside the eight-metre vehicle corridor.
    box([SPAN * 2, 0.16, 1.04], [0, 0.12, side * 5.25], edgeDim);
    box([SPAN * 2, 0.3, 0.2], [0, 0.22, side * 4.68], edgeDim);
    for (const y of [0.66, 1.18]) {
      box([SPAN * 2, 0.09, 0.1], [0, y, side * 4.85], edgeDim);
    }
    for (let i = 0; i <= 12; i += 1) {
      box([0.09, 1.05, 0.1], [-SPAN + i * SPAN / 6, 0.69, side * 4.85], edgeDim);
    }
  }

  // The lowest transverse beam face is 5.85 m above the road origin.
  // Solid portal headers make the opening legible without crossing the truck.
  for (let i = 0; i <= PANELS; i += 1) {
    const x = -SPAN + i * step;
    box([0.28, 0.4, HALF_WIDTH * 2], [x, topY, 0], edgeDim);
  }

  // --- Abutments and bearing seats ----------------------------------------
  for (const x of [-SPAN + 1.6, SPAN - 1.6]) {
    box([2.4, 2.6, HALF_WIDTH * 2 + 1], [x, -1.5, 0], edgeDim);
    box([2.7, 0.26, HALF_WIDTH * 2 + 1.35], [x, -0.51, 0], edgeDim);
    for (const side of [-1, 1]) {
      box([1.3, 0.22, 0.95], [x, -0.3, side * HALF_WIDTH], edgeDim);
      box([0.86, 0.15, 0.66], [x, -0.13, side * HALF_WIDTH], edgeDim);
      box([2.4, 0.38, 0.32], [x, -2.52, side * (HALF_WIDTH + 0.45)], edgeDim);
    }
  }

  // Expansion seams and drainage grates at the deck edges.
  const deckDetail: number[] = [];
  for (const x of [-SPAN + 0.25, SPAN - 0.25]) {
    deckDetail.push(x, 0.07, -4.55, x, 0.07, 4.55);
  }
  for (const side of [-1, 1]) {
    for (let x = -12; x <= 12; x += 6) {
      for (let slit = 0; slit < 5; slit += 1) {
        const sx = x + slit * 0.12;
        deckDetail.push(sx, 0.208, side * 5.05, sx, 0.208, side * 5.48);
      }
    }
  }
  group.add(lineSegments(deckDetail, edgeDim));

  // Free-flow electronic toll: all hardware clears the moving truck.
  const tollX = -SPAN - 9;
  for (const side of [-1, 1]) {
    box([0.45, 7.4, 0.45], [tollX, 3.7, side * 5.7]);
    box([1.15, 0.35, 1.15], [tollX, 0.18, side * 5.7]);
  }
  box([0.6, 0.5, 12], [tollX, 7.25, 0]);
  box([0.22, 1.25, 5.4], [tollX - 0.1, 7.9, 0]);
  for (const z of [-2.2, 2.2]) {
    box([0.8, 0.35, 0.55], [tollX - 0.3, 6.7, z]);
    box([0.12, 0.2, 0.28], [tollX - 0.76, 6.7, z]);
    box([0.7, 0.12, 0.9], [tollX + 0.35, 6.85, z]);
  }
  // Roadside advance sign and lane guide marks before the reader.
  box([0.16, 3.2, 0.16], [tollX - 8, 1.6, 6.8]);
  box([0.2, 1, 3], [tollX - 8, 3.2, 6.8]);
  const tollMarks: number[] = [];
  const glyphs: Record<string, number[][]> = {
    E: [[1,1,0,1,0,0,1,0], [0,.5,.8,.5]],
    T: [[0,1,1,1],[.5,1,.5,0]],
    O: [[0,0,0,1,1,1,1,0,0,0]],
    L: [[0,1,0,0,1,0]],
    '-': [[0,.5,1,.5]],
  };
  const lettering = (word: string, x: number, y: number, z: number, size: number, facing = 1) => {
    const width = (word.length * 1.4 - .4) * size;
    for (let i = 0; i < word.length; i++) {
      for (const stroke of glyphs[word[i]]) {
        for (let j = 2; j < stroke.length; j += 2) {
          for (const k of [j - 2, j]) {
            tollMarks.push(x, y + stroke[k + 1] * size, z + facing * (-width / 2 + (i * 1.4 + stroke[k]) * size));
          }
        }
      }
    }
  };
  lettering('E-TOLL', tollX - .23, 7.56, 0, .56);
  lettering('E-TOLL', tollX + .03, 7.56, 0, .56, -1);
  lettering('TOLL', tollX - 8.11, 2.95, 6.8, .48);
  lettering('TOLL', tollX - 7.89, 2.95, 6.8, .48, -1);
  for (const side of [-1, 1]) {
    tollMarks.push(tollX - 10, .09, side * 3.8, tollX + 5, .09, side * 3.8);
  }
  const tollLines = lineSegments(tollMarks, edge);
  tollLines.name = 'electronic-toll-signs-and-lane-guides';
  group.add(tollLines);

  const merged = mergeGeometries(solids)!;
  group.add(new THREE.Mesh(merged, fill));
  for (const [material, parts] of outlines) {
    if (parts.length) {
      const lines = new THREE.LineSegments(mergeGeometries(parts)!, material);
      lines.renderOrder = 2;
      group.add(lines);
    }
    for (const part of parts) part.dispose();
  }
  for (const solid of solids) solid.dispose();

  const boltGeometry = new THREE.CylinderGeometry(0.065, 0.065, 0.055, 6);
  boltGeometry.rotateX(Math.PI / 2);
  const boltHeads = new THREE.InstancedMesh(boltGeometry, steel, bolts.length);
  const boltMatrix = new THREE.Matrix4();
  bolts.forEach((position, index) => {
    boltHeads.setMatrixAt(index, boltMatrix.makeTranslation(position.x, position.y, position.z));
  });
  boltHeads.instanceMatrix.needsUpdate = true;
  group.add(boltHeads);

  let strength = 0;

  function applyStrength(value: number) {
    strength = Math.min(1, Math.max(0, value));
    group.visible = strength > 0.001;
    fill.opacity = palette.fillOpacity * strength;
    water.opacity = palette.glassOpacity * 0.8 * strength;
    edge.opacity = palette.lineOpacity * strength;
    edgeDim.opacity = palette.lineOpacity * 0.65 * strength;
    steel.opacity = palette.lineOpacity * strength;
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
      steel.color.copy(next.lineDim);
      applyStrength(strength);
    },

    dispose() {
      group.traverse((child) => {
        (child as Partial<THREE.Mesh>).geometry?.dispose();
      });
      boltHeads.dispose();
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}
