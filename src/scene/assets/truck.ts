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

/* A Scania S-series tractor unit, by silhouette rather than by badge.
   The shape cues that make it read as an S rather than a generic cab-over:

     - a very tall, upright flat front (roof ≈ 3.9 m) with only a slight
       taper where the roof meets the screen
     - a deep windscreen set high, over a body-colour band
     - a large slatted grille with angular headlamp units OUTBOARD of it
     - a deep, stepped bumper with a lower valance and inset fog lamps
     - a roof spoiler carrying marker lights along its leading edge
     - the low "vision" window forward and low in the door
     - mirrors on slim arms hung from the top of the A-pillar

   Local space, and the rule that matters most here:
     +X is FORWARD — the front bumper has the LARGEST x
     +Y is up, ground at y = 0
     +Z is the width axis */

const NOSE = 2.62;
const HALF_W = 1.24;
const ROOF = 3.88;
const WHEEL_RADIUS = 0.56;
const TRACK = 1.05;
const FRONT_AXLE = 1.8;
const AXLES = [FRONT_AXLE, -6.3, -7.6];

/** Tall, upright, with a small roof-to-screen taper. */
function cabProfile() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.4);
  shape.lineTo(0, ROOF);
  shape.lineTo(1.9, ROOF);
  shape.lineTo(2.36, 3.72);
  shape.lineTo(NOSE, 3.34);
  shape.lineTo(NOSE, 0.4);
  shape.closePath();
  return shape;
}

/** Point pairs tracing an arc, for wheel arches. */
function arcSegments(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  steps: number,
  z: number,
) {
  const points: number[] = [];
  for (let i = 0; i < steps; i += 1) {
    const t0 = a0 + ((a1 - a0) * i) / steps;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / steps;
    points.push(cx + Math.cos(t0) * r, cy + Math.sin(t0) * r, z);
    points.push(cx + Math.cos(t1) * r, cy + Math.sin(t1) * r, z);
  }
  return points;
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

  const addPlane = (
    size: [number, number],
    at: [number, number, number],
    facing: "x" | "z",
    material: THREE.Material = glass,
    outline = edge,
  ) => {
    const geometry = new THREE.PlaneGeometry(...size);
    if (facing === "x") geometry.rotateY(Math.PI / 2);
    geometry.translate(...at);
    group.add(new THREE.Mesh(geometry, material), edgesFor(geometry, outline));
  };

  // --- Chassis -----------------------------------------------------------
  for (const z of [0.82, -0.82]) {
    addBox([11.4, 0.16, 0.14], [-3.9, 0.86, z], fill, edgeDim);
  }
  addBox([0.5, 0.34, 1.5], [-0.35, 1.05, 0], fill, edgeDim); // fifth wheel

  // --- Cab shell ---------------------------------------------------------
  const cabGeometry = new THREE.ExtrudeGeometry(cabProfile(), {
    depth: HALF_W * 2,
    bevelEnabled: false,
  });
  cabGeometry.translate(0, 0, -HALF_W);
  group.add(new THREE.Mesh(cabGeometry, fill), edgesFor(cabGeometry, edge));

  // Roof spoiler, with marker lights along its leading edge.
  addBox([2.2, 0.17, 2.34], [1.2, ROOF + 0.08, 0], fill, edge);
  for (const z of [-0.92, -0.31, 0.31, 0.92]) {
    addBox([0.09, 0.06, 0.16], [2.26, ROOF + 0.14, z], accent, edgeDim);
  }

  // Sun visor over the screen.
  addBox([0.18, 0.11, 2.34], [NOSE + 0.04, 3.31, 0], fill, edge);

  // --- Front face --------------------------------------------------------
  // Deep windscreen, set high.
  addPlane([2.18, 0.92], [NOSE + 0.01, 2.78, 0], "x");

  // Body-colour band under the screen (where the badge would sit).
  group.add(
    lineSegments(
      [
        NOSE + 0.01, 2.3, -1.09, NOSE + 0.01, 2.3, 1.09,
        NOSE + 0.01, 1.98, -1.09, NOSE + 0.01, 1.98, 1.09,
      ],
      edgeDim,
    ),
  );

  // Large slatted grille.
  addBox([0.07, 0.86, 1.72], [NOSE + 0.02, 1.53, 0], fill, edge);
  for (const y of [1.24, 1.44, 1.64, 1.84]) {
    group.add(
      lineSegments([NOSE + 0.06, y, -0.84, NOSE + 0.06, y, 0.84], edgeDim),
    );
  }

  // Angular headlamp units, OUTBOARD of the grille — the S-series signature.
  for (const z of [1.03, -1.03]) {
    addBox([0.09, 0.6, 0.36], [NOSE + 0.03, 1.55, z], accent, edge);
  }

  // Deep, stepped bumper with lower valance and inset fog lamps.
  addBox([0.24, 0.72, 2.5], [NOSE + 0.1, 0.7, 0], fill, edge);
  addBox([0.16, 0.22, 2.4], [NOSE + 0.06, 0.26, 0], fill, edgeDim);
  for (const z of [0.92, -0.92]) {
    addBox([0.07, 0.17, 0.34], [NOSE + 0.23, 0.62, z], accent, edgeDim);
  }
  addBox([0.08, 0.34, 0.72], [NOSE + 0.23, 0.66, 0], fill, edgeDim); // centre plate

  // --- Cab sides ---------------------------------------------------------
  for (const z of [HALF_W + 0.005, -(HALF_W + 0.005)]) {
    const sign = Math.sign(z);

    addPlane([1.02, 0.8], [1.92, 2.76, z], "z"); // door window
    addPlane([0.44, 0.38], [2.34, 1.88, z], "z"); // low vision window

    group.add(
      lineSegments(
        [
          // door outline
          0.52, 0.5, z, 0.52, 3.3, z,
          2.46, 0.5, z, 2.46, 3.3, z,
          0.52, 0.5, z, 2.46, 0.5, z,
          0.52, 3.3, z, 2.46, 3.3, z,
          // handle
          0.72, 2.24, z, 1.02, 2.24, z,
          // swage line running the length of the cab
          0.1, 1.52, z, 2.5, 1.52, z,
          // entry steps below the door
          0.66, 1.02, z, 1.16, 1.02, z,
          0.7, 0.72, z, 1.2, 0.72, z,
          0.74, 0.42, z, 1.24, 0.42, z,
        ],
        edgeDim,
      ),
    );

    // Front wheel arch.
    group.add(
      lineSegments(
        arcSegments(FRONT_AXLE, WHEEL_RADIUS, 0.82, 0.18, Math.PI - 0.18, 14, z),
        edgeDim,
      ),
    );

    // Side skirt below the door.
    addBox([1.4, 0.5, 0.06], [-0.1, 0.78, sign * (HALF_W - 0.02)], fill, edgeDim);
  }

  // Mirrors: slim housings hung from the top of the A-pillar.
  for (const z of [1.42, -1.42]) {
    addBox([0.06, 0.06, 0.2], [2.28, 3.16, z * 0.93], fill, edgeDim); // arm
    addBox([0.07, 0.64, 0.12], [2.3, 2.78, z], fill, edge); // housing
  }

  // Exhaust stack and fuel tank.
  const stackGeometry = new THREE.CylinderGeometry(0.09, 0.09, 2.6, 10);
  stackGeometry.translate(0.15, 2.3, 1.12);
  group.add(new THREE.Mesh(stackGeometry, fill), edgesFor(stackGeometry, edgeDim));

  const tankGeometry = new THREE.CylinderGeometry(0.36, 0.36, 1.7, 12);
  tankGeometry.rotateZ(Math.PI / 2);
  tankGeometry.translate(-1.5, 0.78, -1.16);
  group.add(new THREE.Mesh(tankGeometry, fill), edgesFor(tankGeometry, edgeDim));

  // --- Trailer -----------------------------------------------------------
  addBox([8.6, 3.0, 2.55], [-4.9, 2.5, 0]);

  const ribPoints: number[] = [];
  for (let i = 1; i < 9; i += 1) {
    const x = -1.1 - i * 0.9;
    ribPoints.push(x, 1.05, 1.28, x, 3.95, 1.28);
    ribPoints.push(x, 1.05, -1.28, x, 3.95, -1.28);
  }
  group.add(lineSegments(ribPoints, edgeDim));

  for (const z of [0.63, -0.63]) {
    addPlane([1.2, 2.76], [-9.21, 2.5, z], "x", fill, edge);
  }

  group.add(
    lineSegments(
      [
        -9.22, 1.18, 0.28, -9.22, 3.82, 0.28,
        -9.22, 1.18, -0.28, -9.22, 3.82, -0.28,
        -9.2, 4.0, 1.27, -0.62, 4.0, 1.27,
        -9.2, 4.0, -1.27, -0.62, 4.0, -1.27,
      ],
      edgeDim,
    ),
  );

  addBox([0.14, 0.12, 2.2], [-9.1, 0.62, 0], fill, edgeDim); // underrun bar
  for (const z of [0.7, -0.7]) {
    addBox([0.04, 0.5, 0.42], [-8.35, 0.4, z], fill, edgeDim); // mudflaps
  }

  // --- Wheels ------------------------------------------------------------
  const tireGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.36, 22);
  tireGeometry.rotateX(Math.PI / 2);
  const hubGeometry = new THREE.CylinderGeometry(0.23, 0.23, 0.4, 12);
  hubGeometry.rotateX(Math.PI / 2);
  const tireEdges = new THREE.EdgesGeometry(tireGeometry, 22);
  const hubEdges = new THREE.EdgesGeometry(hubGeometry, 22);

  // Rim spokes, so the wheels read as alloys once they are turning.
  const spokePoints: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    spokePoints.push(
      Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0.19,
      Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0.19,
    );
  }
  const spokeGeometry = new THREE.BufferGeometry();
  spokeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(spokePoints, 3));

  for (const x of AXLES) {
    for (const z of [TRACK, -TRACK]) {
      const wheel = new THREE.Mesh(tireGeometry, fill);
      wheel.position.set(x, WHEEL_RADIUS, z);

      const tireOutline = new THREE.LineSegments(tireEdges, edge);
      const hub = new THREE.Mesh(hubGeometry, fill);
      const hubOutline = new THREE.LineSegments(hubEdges, edgeDim);
      const spokes = new THREE.LineSegments(spokeGeometry, edgeDim);
      tireOutline.renderOrder = 2;
      hubOutline.renderOrder = 2;
      spokes.renderOrder = 2;
      wheel.add(tireOutline, hub, hubOutline, spokes);

      wheels.push(wheel);
      group.add(wheel);
    }
  }

  const bounds = new THREE.Box3().setFromObject(group);

  return {
    object3D: group,
    bounds,
    anchorPoints: {
      cab: new THREE.Vector3(1.3, 2.3, 0),
      hood: new THREE.Vector3(NOSE + 0.2, 1.7, 0),
      trailer: new THREE.Vector3(-4.9, 2.5, 0),
      rear: new THREE.Vector3(-9.2, 2.1, 0),
      roof: new THREE.Vector3(-4.9, 4.0, 0),
      whole: bounds.getCenter(new THREE.Vector3()),
    },
    setPalette(next) {
      applyPalette(materials, next);
    },
    update(elapsed, delta) {
      for (const wheel of wheels) wheel.rotation.z -= delta * 2.4;
      group.position.y = Math.sin(elapsed * 0.6) * 0.035;
    },
    dispose() {
      disposeObject(group);
      tireEdges.dispose();
      hubEdges.dispose();
      spokeGeometry.dispose();
    },
  };
}
