import * as THREE from "three";
import type { ScenePalette } from "../palette";
import {
  accentFill,
  applyPalette,
  disposeObject,
  edgeMaterial,
  edgesFor,
  glassFill,
  lineSegments,
  panelFill,
} from "../materials";
import type { SceneAsset } from "./types";

/* Local space, and the one rule that matters here:
     +X is FORWARD — the front bumper has the LARGEST x
     +Y is up, ground at y = 0
     +Z is the width axis
   The cab occupies x ≈ 0…2.7 with its flat face at x = 2.7; the trailer runs
   back to x ≈ -9.2. Getting this backwards points the cab and headlights at
   the trailer, which is exactly how the first version looked wrong. */

const NOSE = 2.7;
const WHEEL_RADIUS = 0.56;
const TRACK = 1.05;
const AXLES = [1.85, -6.3, -7.6];

/** A cab-over silhouette: flat front, roof overhang, raked screen transition. */
function cabProfile() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.45);
  shape.lineTo(0, 3.25);
  shape.lineTo(2.35, 3.25);
  shape.lineTo(NOSE, 2.95);
  shape.lineTo(NOSE, 0.45);
  shape.closePath();
  return shape;
}

/** Wedge filling the gap between cab roof and the taller trailer front. */
function deflectorProfile() {
  const shape = new THREE.Shape();
  shape.moveTo(1.35, 3.25);
  shape.lineTo(2.3, 3.25);
  shape.lineTo(0.35, 4.0);
  shape.lineTo(0, 4.0);
  shape.closePath();
  return shape;
}

export function proceduralTruck(palette: ScenePalette): SceneAsset {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const fill = panelFill(palette);
  const glass = glassFill(palette);
  const accent = accentFill(palette);
  const edge = edgeMaterial(palette);
  const edgeDim = edgeMaterial(palette, true);
  const materials: THREE.Material[] = [fill, glass, accent, edge, edgeDim];

  /** Box positioned by centre, added with its outline. */
  const addBox = (
    size: [number, number, number],
    at: [number, number, number],
    material: THREE.Material = fill,
    outline = edge,
  ) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...at);
    group.add(new THREE.Mesh(geometry, material), edgesFor(geometry, outline));
    return geometry;
  };

  // --- Chassis: one continuous frame, so cab and trailer read as one vehicle
  // rather than two floating boxes.
  for (const z of [0.82, -0.82]) {
    addBox([11.4, 0.16, 0.14], [-3.9, 0.86, z], fill, edgeDim);
  }
  addBox([0.5, 0.34, 1.5], [-0.35, 1.05, 0], fill, edgeDim); // fifth wheel

  // --- Cab ---------------------------------------------------------------
  const cabGeometry = new THREE.ExtrudeGeometry(cabProfile(), {
    depth: 2.46,
    bevelEnabled: false,
  });
  cabGeometry.translate(0, 0, -1.23);
  group.add(new THREE.Mesh(cabGeometry, fill), edgesFor(cabGeometry, edge));

  const deflectorGeometry = new THREE.ExtrudeGeometry(deflectorProfile(), {
    depth: 2.2,
    bevelEnabled: false,
  });
  deflectorGeometry.translate(0, 0, -1.1);
  group.add(
    new THREE.Mesh(deflectorGeometry, fill),
    edgesFor(deflectorGeometry, edgeDim),
  );

  // Windscreen — deep, and set high on the front face. Sitting it low leaves a
  // blank slab of cab above the glass and the proportions read as a van.
  const screenGeometry = new THREE.PlaneGeometry(2.14, 1.0);
  screenGeometry.rotateY(Math.PI / 2);
  screenGeometry.translate(NOSE + 0.01, 2.32, 0);
  group.add(new THREE.Mesh(screenGeometry, glass), edgesFor(screenGeometry, edge));

  // Side windows, aligned to the windscreen's top edge.
  for (const z of [1.24, -1.24]) {
    const sideGeometry = new THREE.PlaneGeometry(0.95, 0.8);
    sideGeometry.translate(2.02, 2.32, z);
    group.add(new THREE.Mesh(sideGeometry, glass), edgesFor(sideGeometry, edge));
  }

  // Door outlines on the cab flanks — cheap linework, a lot of readability.
  for (const z of [1.235, -1.235]) {
    const x0 = 0.62;
    const x1 = 2.2;
    const y0 = 0.6;
    const y1 = 2.72;
    group.add(
      lineSegments(
        [
          x0, y0, z, x0, y1, z,
          x1, y0, z, x1, y1, z,
          x0, y0, z, x1, y0, z,
          x0, y1, z, x1, y1, z,
          // handle
          x0 + 0.22, 1.62, z, x0 + 0.52, 1.62, z,
        ],
        edgeDim,
      ),
    );
  }

  addBox([0.08, 0.5, 1.9], [NOSE + 0.02, 1.45, 0], fill, edgeDim); // grille
  addBox([0.14, 0.4, 2.4], [NOSE + 0.03, 0.6, 0], fill, edge); // bumper

  // Headlights — on the FRONT face, sitting just above the bumper.
  for (const z of [0.86, -0.86]) {
    addBox([0.1, 0.24, 0.46], [NOSE + 0.06, 0.98, z], accent, edge);
  }

  // Mirrors, tucked against the cab shoulder. Held out on a longer arm they
  // detach visually and read as floating slots rather than mirrors.
  for (const z of [1.29, -1.29]) {
    addBox([0.05, 0.05, 0.14], [2.42, 2.72, z * 0.96], fill, edgeDim); // arm
    addBox([0.06, 0.42, 0.12], [2.42, 2.46, z], fill, edge); // housing
  }

  // Exhaust stack behind the cab.
  const stackGeometry = new THREE.CylinderGeometry(0.09, 0.09, 2.5, 10);
  stackGeometry.translate(0.18, 2.2, 1.12);
  group.add(new THREE.Mesh(stackGeometry, fill), edgesFor(stackGeometry, edgeDim));

  // Fuel tank slung under the left rail.
  const tankGeometry = new THREE.CylinderGeometry(0.36, 0.36, 1.7, 12);
  tankGeometry.rotateZ(Math.PI / 2);
  tankGeometry.translate(0.55, 0.78, -1.16);
  group.add(new THREE.Mesh(tankGeometry, fill), edgesFor(tankGeometry, edgeDim));

  // --- Trailer -----------------------------------------------------------
  addBox([8.6, 2.95, 2.5], [-4.9, 2.45, 0]);

  // Flank ribbing.
  const ribPoints: number[] = [];
  for (let i = 1; i < 9; i += 1) {
    const x = -1.1 - i * 0.9;
    ribPoints.push(x, 1.05, 1.26, x, 3.85, 1.26);
    ribPoints.push(x, 1.05, -1.26, x, 3.85, -1.26);
  }
  group.add(lineSegments(ribPoints, edgeDim));

  // Rear doors, split down the middle.
  for (const z of [0.62, -0.62]) {
    const doorGeometry = new THREE.PlaneGeometry(1.18, 2.7);
    doorGeometry.rotateY(-Math.PI / 2);
    doorGeometry.translate(-9.21, 2.45, z);
    group.add(new THREE.Mesh(doorGeometry, fill), edgesFor(doorGeometry, edge));
  }

  // Door furniture: vertical locking bars and a top rail along the roof edge.
  group.add(
    lineSegments(
      [
        -9.22, 1.15, 0.28, -9.22, 3.75, 0.28,
        -9.22, 1.15, -0.28, -9.22, 3.75, -0.28,
        -9.2, 3.94, 1.24, -0.62, 3.94, 1.24,
        -9.2, 3.94, -1.24, -0.62, 3.94, -1.24,
      ],
      edgeDim,
    ),
  );

  addBox([0.14, 0.12, 2.2], [-9.1, 0.62, 0], fill, edgeDim); // underrun bar
  for (const z of [0.7, -0.7]) {
    addBox([0.04, 0.5, 0.42], [-8.35, 0.4, z], fill, edgeDim); // mudflaps
  }

  // --- Wheels ------------------------------------------------------------
  const tireGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.36, 20);
  tireGeometry.rotateX(Math.PI / 2);
  const hubGeometry = new THREE.CylinderGeometry(0.21, 0.21, 0.4, 10);
  hubGeometry.rotateX(Math.PI / 2);
  const tireEdges = new THREE.EdgesGeometry(tireGeometry, 22);
  const hubEdges = new THREE.EdgesGeometry(hubGeometry, 22);

  for (const x of AXLES) {
    for (const z of [TRACK, -TRACK]) {
      const wheel = new THREE.Mesh(tireGeometry, fill);
      wheel.position.set(x, WHEEL_RADIUS, z);

      const tireOutline = new THREE.LineSegments(tireEdges, edge);
      const hub = new THREE.Mesh(hubGeometry, fill);
      const hubOutline = new THREE.LineSegments(hubEdges, edgeDim);
      tireOutline.renderOrder = 2;
      hubOutline.renderOrder = 2;
      wheel.add(tireOutline, hub, hubOutline);

      wheels.push(wheel);
      group.add(wheel);
    }
  }

  const bounds = new THREE.Box3().setFromObject(group);

  return {
    object3D: group,
    bounds,
    anchorPoints: {
      cab: new THREE.Vector3(1.35, 1.95, 0),
      hood: new THREE.Vector3(NOSE, 1.5, 0),
      trailer: new THREE.Vector3(-4.9, 2.45, 0),
      rear: new THREE.Vector3(-9.2, 2.0, 0),
      roof: new THREE.Vector3(-4.9, 3.95, 0),
      whole: bounds.getCenter(new THREE.Vector3()),
    },
    setPalette(next) {
      applyPalette(materials, next);
    },
    update(elapsed, delta) {
      // Tied to elapsed time, not scroll — the truck should feel alive when the
      // visitor stops moving.
      for (const wheel of wheels) wheel.rotation.z -= delta * 2.4;
      group.position.y = Math.sin(elapsed * 0.6) * 0.035;
    },
    dispose() {
      disposeObject(group);
      tireEdges.dispose();
      hubEdges.dispose();
    },
  };
}
