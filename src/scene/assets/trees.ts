import * as THREE from "three";
import type { ScenePalette } from "../palette";
import { applyPalette, disposeObject, edgeMaterial, panelFill } from "../materials";
import type { SceneAsset } from "./types";

/**
 * Concatenates geometries into one, keeping only `position`.
 *
 * Deliberately hand-rolled rather than using three's BufferGeometryUtils:
 * importing from three/examples makes Vite pre-bundle the addon with its own
 * copy of three, which trips "Multiple instances of Three.js being imported"
 * and leaves merge helpers operating on foreign classes. `vite build` resolves
 * to a single copy and hides it, so it only breaks in dev.
 *
 * Position is all that is needed here: these materials are unlit, so normals
 * are never read, there are no maps so uv is dead weight, and EdgesGeometry
 * works off position alone.
 */
function mergePositions(parts: THREE.BufferGeometry[]) {
  const flats = parts.map((part) => {
    const flat = part.index ? part.toNonIndexed() : part;
    if (flat !== part) part.dispose();
    return flat;
  });

  let total = 0;
  for (const flat of flats) total += flat.getAttribute("position").count * 3;

  const positions = new Float32Array(total);
  let offset = 0;
  for (const flat of flats) {
    const attribute = flat.getAttribute("position") as THREE.BufferAttribute;
    positions.set(attribute.array as Float32Array, offset);
    offset += attribute.array.length;
    flat.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return merged;
}

export type TreePlacement = {
  position: THREE.Vector3;
  /** Overall size multiplier; 1 is roughly a 6 m tree. */
  scale: number;
  /** Rotation about Y, so repeated silhouettes do not read as clones. */
  rotation: number;
  conifer: boolean;
};

function conifer() {
  const parts: THREE.BufferGeometry[] = [];

  const trunk = new THREE.CylinderGeometry(0.13, 0.18, 1.6, 6);
  trunk.translate(0, 0.8, 0);
  parts.push(trunk);

  // Two stacked cones read as a conifer far more clearly than one.
  const lower = new THREE.CylinderGeometry(0.3, 1.25, 2.8, 7);
  lower.translate(0, 2.6, 0);
  parts.push(lower);

  const upper = new THREE.CylinderGeometry(0, 0.85, 2.4, 7);
  upper.translate(0, 4.5, 0);
  parts.push(upper);

  return parts;
}

function broadleaf() {
  const parts: THREE.BufferGeometry[] = [];

  const trunk = new THREE.CylinderGeometry(0.15, 0.22, 2.4, 6);
  trunk.translate(0, 1.2, 0);
  parts.push(trunk);

  const canopy = new THREE.IcosahedronGeometry(1.5, 0);
  canopy.scale(1, 0.88, 1);
  canopy.translate(0, 3.5, 0);
  parts.push(canopy);

  return parts;
}

/**
 * Roadside trees, merged into a single geometry.
 *
 * These exist to make the truck's motion legible: an empty ground plane gives
 * the eye nothing to measure travel against, so the vehicle appears to hang in
 * place no matter how far it actually moves. Everything here is static — the
 * parallax as the truck passes is the whole point.
 *
 * One merged mesh and one merged outline, rather than a few hundred objects:
 * this style needs outlines to read, and there is no instanced equivalent of
 * LineSegments to lean on.
 */
export function proceduralTrees(
  palette: ScenePalette,
  placements: TreePlacement[],
): SceneAsset {
  const group = new THREE.Group();

  const fill = panelFill(palette);
  const edge = edgeMaterial(palette, true);
  const materials: THREE.Material[] = [fill, edge];

  const pieces: THREE.BufferGeometry[] = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3();

  for (const placement of placements) {
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotation);
    scaleVec.setScalar(placement.scale);
    matrix.compose(placement.position, quaternion, scaleVec);

    for (const part of placement.conifer ? conifer() : broadleaf()) {
      part.applyMatrix4(matrix);
      pieces.push(part);
    }
  }

  const merged = pieces.length ? mergePositions(pieces) : null;

  if (merged) {
    group.add(new THREE.Mesh(merged, fill));
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(merged, 24), edge);
    outline.renderOrder = 2;
    group.add(outline);
  }

  return {
    object3D: group,
    bounds: new THREE.Box3().setFromObject(group),
    anchorPoints: {},
    setPalette(next) {
      applyPalette(materials, next);
    },
    dispose() {
      disposeObject(group);
    },
  };
}
