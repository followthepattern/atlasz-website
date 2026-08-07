import * as THREE from "three";
import type { ScenePalette } from "./palette";

/* Everything in the scene is unlit. The hologram look — translucent fill plus
   bright edges — needs no lights at all, which removes a whole class of
   shading bugs and keeps the frame cost close to nothing. */

export function hologramFill(palette: ScenePalette) {
  const material = new THREE.MeshBasicMaterial({
    color: palette.fill,
    transparent: true,
    opacity: palette.fillOpacity,
    // Edge lines sit exactly on the surfaces they outline. Without a polygon
    // offset the two z-fight and the wireframe dissolves into a faint stipple —
    // which is precisely how this looked before the offset was added.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.userData.kind = "fill";
  return material;
}

export function edgeMaterial(palette: ScenePalette, dim = false) {
  const material = new THREE.LineBasicMaterial({
    color: dim ? palette.lineDim : palette.line,
    transparent: true,
    opacity: palette.lineOpacity,
    blending: palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  });
  material.userData.kind = dim ? "edgeDim" : "edge";
  return material;
}

export function accentMaterial(palette: ScenePalette) {
  const material = new THREE.MeshBasicMaterial({
    color: palette.accent,
    transparent: true,
    opacity: 0.95,
    blending: palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  });
  material.userData.kind = "accent";
  return material;
}

/** Wraps a geometry's hard edges in glowing lines. */
export function edgesFor(geometry: THREE.BufferGeometry, material: THREE.LineBasicMaterial) {
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 22), material);
  lines.renderOrder = EDGE_RENDER_ORDER;
  return lines;
}

/**
 * Edges and their fills are transparent and sit at the same depth, so three's
 * back-to-front sort between them is a coin flip. Losing it means the fill
 * paints over the outline it belongs to — invisible under additive blending in
 * dark mode, but it washes the whole model out in light mode. Forcing edges last
 * removes the ambiguity.
 */
export const EDGE_RENDER_ORDER = 2;

/**
 * Re-tints every material an asset created, in place. Assets keep a flat list
 * of their materials and hand it here on theme change — no rebuilding, no
 * dropped GPU buffers.
 */
export function applyPalette(
  materials: THREE.Material[],
  palette: ScenePalette,
) {
  for (const material of materials) {
    const kind = material.userData.kind as string | undefined;
    if (kind === "fill" && material instanceof THREE.MeshBasicMaterial) {
      material.color.copy(palette.fill);
      material.opacity = palette.fillOpacity;
    } else if (kind === "edge" && material instanceof THREE.LineBasicMaterial) {
      material.color.copy(palette.line);
      material.opacity = palette.lineOpacity;
      material.blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    } else if (kind === "edgeDim" && material instanceof THREE.LineBasicMaterial) {
      material.color.copy(palette.lineDim);
      material.opacity = palette.lineOpacity * 0.7;
      material.blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    } else if (kind === "accent") {
      const m = material as THREE.MeshBasicMaterial | THREE.LineBasicMaterial;
      m.color.copy(palette.accent);
      m.blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    } else if (kind === "particle" && material instanceof THREE.PointsMaterial) {
      material.color.copy(palette.particle);
      material.blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    } else if (kind === "grid" && material instanceof THREE.LineBasicMaterial) {
      material.color.copy(palette.grid);
      material.blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
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
