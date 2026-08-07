import * as THREE from "three";
import type { ScenePalette } from "../palette";
import {
  accentMaterial,
  applyPalette,
  disposeObject,
  edgeMaterial,
  edgesFor,
  hologramFill,
  EDGE_RENDER_ORDER,
} from "../materials";
import type { SceneAsset } from "./types";

/* Local space: the truck faces +X, sits on y = 0, width runs along Z.
   Cab occupies x 0…2.6; the trailer runs back to x ≈ -8.8. */

const WHEEL_RADIUS = 0.55;
const WHEEL_POSITIONS: Array<[number, number]> = [
  [1.9, 1.15],
  [1.9, -1.15],
  [-6.4, 1.15],
  [-6.4, -1.15],
  [-7.7, 1.15],
  [-7.7, -1.15],
];

/** A cab-over silhouette in side profile — the European long-haul shape. */
function cabProfile() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.35);
  shape.lineTo(0, 2.5);
  shape.lineTo(0.45, 3.15);
  shape.lineTo(2.6, 3.15);
  shape.lineTo(2.6, 0.35);
  shape.closePath();
  return shape;
}

export function proceduralTruck(palette: ScenePalette): SceneAsset {
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];
  const wheels: THREE.Mesh[] = [];

  const fill = hologramFill(palette);
  const edge = edgeMaterial(palette);
  const edgeDim = edgeMaterial(palette, true);
  const accent = accentMaterial(palette);
  materials.push(fill, edge, edgeDim, accent);

  // Cab — extruded along Z so the profile's X becomes vehicle length.
  const cabGeometry = new THREE.ExtrudeGeometry(cabProfile(), {
    depth: 2.5,
    bevelEnabled: false,
  });
  cabGeometry.translate(0, 0, -1.25);
  const cab = new THREE.Mesh(cabGeometry, fill);
  group.add(cab, edgesFor(cabGeometry, edge));

  // Trailer — taller than the cab, as a real box trailer is.
  const trailerGeometry = new THREE.BoxGeometry(8.5, 2.95, 2.5);
  trailerGeometry.translate(-4.55, 2.42, 0);
  const trailer = new THREE.Mesh(trailerGeometry, fill);
  group.add(trailer, edgesFor(trailerGeometry, edge));

  // Ribbing along the trailer flank reads as structure at a distance.
  const ribGeometry = new THREE.BufferGeometry();
  const ribPoints: number[] = [];
  for (let i = 1; i < 9; i += 1) {
    const x = -0.6 - i * 0.92;
    ribPoints.push(x, 0.98, 1.26, x, 3.86, 1.26);
    ribPoints.push(x, 0.98, -1.26, x, 3.86, -1.26);
  }
  ribGeometry.setAttribute("position", new THREE.Float32BufferAttribute(ribPoints, 3));
  const ribs = new THREE.LineSegments(ribGeometry, edgeDim);
  ribs.renderOrder = EDGE_RENDER_ORDER; // lies flat on the trailer flank
  group.add(ribs);

  // Wheels. Six meshes rather than an InstancedMesh — the per-frame spin is
  // trivial at this count and keeps the update path readable.
  const wheelGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.34, 18);
  wheelGeometry.rotateX(Math.PI / 2);
  const wheelEdges = new THREE.EdgesGeometry(wheelGeometry, 22);
  for (const [x, z] of WHEEL_POSITIONS) {
    const wheel = new THREE.Mesh(wheelGeometry, fill);
    wheel.position.set(x, WHEEL_RADIUS, z);
    const rim = new THREE.LineSegments(wheelEdges, edge);
    rim.renderOrder = EDGE_RENDER_ORDER;
    wheel.add(rim);
    wheels.push(wheel);
    group.add(wheel);
  }

  // Headlights: small additive blocks reading as glow without postprocessing.
  const lampGeometry = new THREE.BoxGeometry(0.12, 0.26, 0.5);
  for (const z of [0.82, -0.82]) {
    const lamp = new THREE.Mesh(lampGeometry, accent);
    lamp.position.set(0.02, 1.05, z);
    group.add(lamp);
  }

  const bounds = new THREE.Box3().setFromObject(group);

  return {
    object3D: group,
    bounds,
    anchorPoints: {
      cab: new THREE.Vector3(1.3, 1.9, 0),
      hood: new THREE.Vector3(2.6, 1.2, 0),
      trailer: new THREE.Vector3(-4.5, 2.4, 0),
      rear: new THREE.Vector3(-8.8, 2.0, 0),
      roof: new THREE.Vector3(-4.5, 3.9, 0),
      whole: bounds.getCenter(new THREE.Vector3()),
    },
    setPalette(next) {
      applyPalette(materials, next);
    },
    update(elapsed, delta) {
      // Wheel spin is tied to elapsed time, not scroll — the truck should feel
      // alive when the visitor stops moving.
      for (const wheel of wheels) wheel.rotation.z -= delta * 2.4;
      group.position.y = Math.sin(elapsed * 0.6) * 0.045;
    },
    dispose() {
      disposeObject(group);
      wheelEdges.dispose();
    },
  };
}
