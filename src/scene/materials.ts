import * as THREE from "three";
import type { ScenePalette } from "./palette";

/* Everything in the scene is unlit. Solid panels plus crisp outlines — a
   technical drawing, not a hologram. No additive blending anywhere, so the
   model reads the same way against a dark or a light page. */

/**
 * Edges and their panels are coplanar, so three's back-to-front sort between
 * them is a coin flip. Forcing edges to draw last removes the ambiguity; the
 * panel materials also carry a polygon offset so the depth test agrees.
 */
export const EDGE_RENDER_ORDER = 2;

/* Panels are double-sided. Much of the bodywork is single-sided planes —
   windows, trailer doors — and their normals all point one way, so a
   front-facing-only material renders whichever side faces away as nothing but
   its outline. */

export function panelFill(palette: ScenePalette) {
  const material = new THREE.MeshBasicMaterial({
    color: palette.fill,
    transparent: true,
    opacity: palette.fillOpacity,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.userData.kind = "fill";
  return material;
}

export function glassFill(palette: ScenePalette) {
  const material = new THREE.MeshBasicMaterial({
    color: palette.glass,
    transparent: true,
    opacity: palette.glassOpacity,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.userData.kind = "glass";
  return material;
}

export function edgeMaterial(palette: ScenePalette, dim = false) {
  const material = new THREE.LineBasicMaterial({
    color: dim ? palette.lineDim : palette.line,
    transparent: true,
    opacity: dim ? palette.lineOpacity * 0.65 : palette.lineOpacity,
    depthWrite: false,
  });
  material.userData.kind = dim ? "edgeDim" : "edge";
  return material;
}

export function accentFill(palette: ScenePalette) {
  const material = new THREE.MeshBasicMaterial({
    color: palette.accent,
    transparent: true,
    opacity: 0.9,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.userData.kind = "accent";
  return material;
}

/**
 * Wraps a geometry's hard edges in outlines, drawn after the panels.
 *
 * `threshold` is the angle in degrees above which an edge is drawn. It matters
 * for chamfered and curved bodywork: too high and the rounding renders as an
 * unlit grey blob with no contour at all, since nothing here is shaded and the
 * outlines are the only thing describing the form.
 */
export function edgesFor(
  geometry: THREE.BufferGeometry,
  material: THREE.LineBasicMaterial,
  threshold = 22,
) {
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, threshold),
    material,
  );
  lines.renderOrder = EDGE_RENDER_ORDER;
  return lines;
}

/** A free-standing set of line segments from raw point pairs. */
export function lineSegments(points: number[], material: THREE.LineBasicMaterial) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = EDGE_RENDER_ORDER;
  return lines;
}

/**
 * Re-tints every material an asset created, in place. Assets keep a flat list
 * of their materials and hand it here on theme change — no rebuilding, no
 * dropped GPU buffers.
 */
export function applyPalette(materials: THREE.Material[], palette: ScenePalette) {
  for (const material of materials) {
    const kind = material.userData.kind as string | undefined;
    const basic = material as THREE.MeshBasicMaterial;
    const line = material as THREE.LineBasicMaterial;

    if (kind === "fill") {
      basic.color.copy(palette.fill);
      basic.opacity = palette.fillOpacity;
    } else if (kind === "glass") {
      basic.color.copy(palette.glass);
      basic.opacity = palette.glassOpacity;
    } else if (kind === "accent") {
      basic.color.copy(palette.accent);
    } else if (kind === "edge") {
      line.color.copy(palette.line);
      line.opacity = palette.lineOpacity;
    } else if (kind === "edgeDim") {
      line.color.copy(palette.lineDim);
      line.opacity = palette.lineOpacity * 0.65;
    } else if (kind === "grid") {
      line.color.copy(palette.grid);
      line.opacity = palette.gridOpacity;
    }
    material.needsUpdate = true;
  }
}

/** Frees GPU memory for a whole subtree. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh | THREE.LineSegments | THREE.Points;
    mesh.geometry?.dispose?.();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose?.();
  });
}
