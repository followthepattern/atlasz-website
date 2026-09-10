import * as THREE from "three";
import { edgeMaterial } from "../../materials";
import type { ScenePalette } from "../../palette";

/* A flat working corridor opens into rolling, faceted terrain. The mesh and
 * its topographic contours reach beyond the altitude fog; the original grid
 * remains visible around the road, depot and forecourt. */

const SIZE = 2800;
const STEP = 12;

export type Ground = {
  object3D: THREE.Object3D;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

export function proceduralGround(
  palette: ScenePalette,
  river: { position: THREE.Vector3; heading: number } = {
    position: new THREE.Vector3(-82.4913, 0, -3.69493), heading: -0.0582196,
  },
): Ground {
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

  const group = new THREE.Group();
  group.name = "sandbox-terrain";
  group.add(new THREE.LineSegments(geometry, material));

  // An unlit mesh gets its relief from restrained per-face tones and contours,
  // rather than lights that would change the site's technical-drawing style.
  const terrain = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const tones: number[] = [];
  const contourPoints: number[] = [];
  const smooth = (v: number) => {
    const t = THREE.MathUtils.clamp(v, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const riverDistance = (x: number, z: number) => Math.abs(
    Math.cos(river.heading) * (x - river.position.x)
      - Math.sin(river.heading) * (z - river.position.z),
  );
  const height = (x: number, z: number) => {
    const shoulder = smooth((Math.abs(z) - 52) / 65);
    const river = smooth((riverDistance(x, z) - 38) / 65);
    const rolling = 57 + 30 * Math.sin(x * 0.009 + z * 0.005)
      + 23 * Math.cos(z * 0.013 - x * 0.003)
      + 14 * Math.sin(x * 0.021 + z * 0.017);
    return shoulder * river * rolling;
  };
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const normal = new THREE.Vector3().subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a)).normalize();
    const tone = THREE.MathUtils.clamp(0.35 + normal.x * 0.3 + normal.z * 0.22
      + (a.y + b.y + c.y) / 1100, 0.08, 0.75);
    for (const p of [a, b, c]) {
      vertices.push(p.x, p.y, p.z);
      tones.push(tone);
    }
    // Intersect each triangle with horizontal levels, so contours sit exactly
    // on the faceted surface instead of floating over interpolated hills.
    for (let level = 18; level <= 144; level += 18) {
      const crossings: THREE.Vector3[] = [];
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        if ((p.y < level) !== (q.y < level)) {
          crossings.push(p.clone().lerp(q, (level - p.y) / (q.y - p.y)));
        }
      }
      if (crossings.length === 2) {
        for (const p of crossings) contourPoints.push(p.x, p.y + 0.12, p.z);
      }
    }
  };
  const columns = 88;
  const rows = 42;
  for (const sign of [-1, 1]) {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const corner = (dx: number, dz: number) => {
          const x = -half + (col + dx) * SIZE / columns;
          const z = sign * (52 + (row + dz) * (half - 52) / rows);
          return new THREE.Vector3(x, height(x, z), z);
        };
        const a = corner(0, 0), b = corner(1, 0);
        const c = corner(1, 1), d = corner(0, 1);
        // Leave an open ravine through the landscape for the bridge's river.
        if ([a, b, c, d].some(p => riverDistance(p.x, p.z) < 38)) continue;
        if (sign > 0) { triangle(a, d, b); triangle(b, d, c); }
        else { triangle(a, b, d); triangle(b, c, d); }
      }
    }
  }
  terrain.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  const colors = new Float32Array(vertices.length);
  terrain.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const landMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const contours = new THREE.BufferGeometry();
  contours.setAttribute("position", new THREE.Float32BufferAttribute(contourPoints, 3));
  const contourMaterial = edgeMaterial(palette, true);
  const contourLines = new THREE.LineSegments(contours, contourMaterial);
  contourLines.renderOrder = 2;
  group.add(new THREE.Mesh(terrain, landMaterial), contourLines);
  const tintTerrain = (next: ScenePalette) => {
    const tint = new THREE.Color();
    for (let i = 0; i < tones.length; i += 1) {
      tint.copy(next.fog).lerp(next.lineDim, 0.06 + tones[i] * 0.19);
      tint.toArray(colors, i * 3);
    }
    terrain.getAttribute("color").needsUpdate = true;
    contourMaterial.color.copy(next.grid);
    contourMaterial.opacity = next.gridOpacity * 0.72;
  };
  tintTerrain(palette);

  return {
    object3D: group,

    setPalette(next) {
      material.color.copy(next.grid);
      material.opacity = next.gridOpacity;
      tintTerrain(next);
    },

    dispose() {
      geometry.dispose();
      material.dispose();
      terrain.dispose();
      landMaterial.dispose();
      contours.dispose();
      contourMaterial.dispose();
      group.clear();
    },
  };
}
