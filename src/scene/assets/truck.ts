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
import { createTextDecal } from "../decal";
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
/** Corner rounding on the cab extrusion. */
const CAB_BEVEL = 0.13;
/**
 * Where the cab's front face actually is. The bevel pushes the extrusion's
 * mid-section proud of the profile by `bevelSize`, so the visible face is at
 * NOSE + CAB_BEVEL. Panels placed at NOSE land *inside* the solid body and
 * vanish — which is exactly what happened to the windscreen, grille and
 * headlamps on the first pass at this shape.
 */
const FACE = NOSE + CAB_BEVEL;
const HALF_W = 1.24;
const ROOF = 3.88;
const WHEEL_RADIUS = 0.56;
const TRACK = 1.05;
const FRONT_AXLE = 1.8;

/* A full-length European semi-trailer — 13.6 m is the standard box. Derived
   rather than written out at each call site: the rear doors, underrun bar,
   mudflaps, ribbing and rear bogie all key off these. */
const TRAILER_FRONT = -0.6;
const TRAILER_LENGTH = 13.6;
const TRAILER_REAR = TRAILER_FRONT - TRAILER_LENGTH;
const TRAILER_MID = (TRAILER_FRONT + TRAILER_REAR) / 2;

const AXLES = [FRONT_AXLE, TRAILER_REAR + 3.2, TRAILER_REAR + 1.9];

/**
 * Tall and upright, but with the roof sweeping down into the screen header on
 * a long curve rather than a straight chamfer. Together with the bevelled
 * extrusion below, this is what stops the front reading as a plain box.
 */
function cabProfile() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.4);
  shape.lineTo(0, ROOF - 0.3);
  shape.quadraticCurveTo(0, ROOF, 0.3, ROOF); // rounded rear-top corner
  shape.lineTo(1.55, ROOF);
  shape.quadraticCurveTo(2.42, ROOF, NOSE, 3.12); // roof sweeps down to the screen
  shape.lineTo(NOSE, 0.4);
  shape.closePath();
  return shape;
}

/** Rounded rectangle centred on the origin, in the shape's own XY plane. */
function roundedRect(w: number, h: number, r: number) {
  const x = w / 2;
  const y = h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-x + r, -y);
  shape.lineTo(x - r, -y);
  shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r);
  shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y);
  shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r);
  shape.quadraticCurveTo(-x, -y, -x + r, -y);
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
    addBox([TRAILER_LENGTH + 3.6, 0.16, 0.14], [TRAILER_MID - 1.1, 0.86, z], fill, edgeDim);
  }
  addBox([0.5, 0.34, 1.5], [-0.35, 1.05, 0], fill, edgeDim); // fifth wheel

  /** Rounded panel standing on the front face, facing +X. */
  const facePanel = (
    w: number,
    h: number,
    r: number,
    thickness: number,
    at: [number, number, number],
    material: THREE.Material = fill,
    outline = edge,
  ) => {
    const geometry = new THREE.ExtrudeGeometry(roundedRect(w, h, r), {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 4,
    });
    geometry.rotateY(Math.PI / 2);
    geometry.translate(...at);
    group.add(new THREE.Mesh(geometry, material), edgesFor(geometry, outline));
  };

  /** Slab with a rounded plan, extruded upward — bumpers, spoilers, visors. */
  const planSlab = (
    depth: number,
    width: number,
    r: number,
    height: number,
    at: [number, number, number],
    material: THREE.Material = fill,
    outline = edge,
  ) => {
    const geometry = new THREE.ExtrudeGeometry(roundedRect(depth, width, r), {
      depth: height,
      bevelEnabled: false,
      curveSegments: 5,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(...at);
    group.add(new THREE.Mesh(geometry, material), edgesFor(geometry, outline));
  };

  // --- Cab shell ---------------------------------------------------------
  // Bevelled extrusion: the bevel runs along the extrusion caps, which are the
  // cab's left and right sides, so it rounds every vertical corner where the
  // front face meets a flank. That chamfer plus the curved roof profile is what
  // takes the front away from a plain rectangle.
  const cabGeometry = new THREE.ExtrudeGeometry(cabProfile(), {
    depth: HALF_W * 2 - CAB_BEVEL * 2,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: CAB_BEVEL,
    bevelThickness: CAB_BEVEL,
    curveSegments: 3,
  });
  cabGeometry.translate(0, 0, -(HALF_W - CAB_BEVEL));
  // A 20° threshold keeps a contour line on each chamfer and roof facet. Higher
  // and the rounding renders as an unlit grey blob with no outline at all.
  group.add(new THREE.Mesh(cabGeometry, fill), edgesFor(cabGeometry, edge, 20));

  // Roof air deflector, sitting on the flat part of the roof.
  planSlab(1.6, 2.3, 0.42, 0.22, [0.62, ROOF - 0.02, 0]);

  // --- Front face --------------------------------------------------------
  // Sun visor, with the marker lights along its leading edge — on the R-series
  // they sit on the screen header, not up on the roof.
  planSlab(0.26, 2.32, 0.1, 0.13, [FACE + 0.06, 2.99, 0]);
  for (const z of [-1.0, -0.5, 0, 0.5, 1.0]) {
    facePanel(0.16, 0.07, 0.03, 0.04, [FACE + 0.16, 3.04, z], accent, edgeDim);
  }

  // Deep windscreen with rounded corners.
  facePanel(2.14, 0.94, 0.16, 0.05, [FACE, 2.48, 0], glass, edge);

  // Body-colour band under the screen (where the badge would sit).
  group.add(
    lineSegments(
      [
        FACE + 0.02, 1.99, -1.02, FACE + 0.02, 1.99, 1.02,
        FACE + 0.02, 1.88, -1.02, FACE + 0.02, 1.88, 1.02,
      ],
      edgeDim,
    ),
  );

  // Large soft-cornered grille.
  facePanel(1.7, 0.82, 0.17, 0.07, [FACE, 1.44, 0]);
  for (const y of [1.16, 1.34, 1.53, 1.72]) {
    group.add(lineSegments([FACE + 0.09, y, -0.8, FACE + 0.09, y, 0.8], edgeDim));
  }

  // Headlamp units, outboard of the grille and tucked inside the chamfer.
  for (const z of [0.98, -0.98]) {
    facePanel(0.3, 0.56, 0.09, 0.06, [FACE, 1.5, z], accent, edge);
  }

  // Deep bumper with rounded ends that wrap toward the flanks.
  planSlab(0.34, 2.5, 0.17, 0.74, [FACE + 0.06, 0.32, 0]);
  planSlab(0.24, 2.4, 0.13, 0.2, [FACE + 0.02, 0.13, 0], fill, edgeDim);
  for (const z of [0.92, -0.92]) {
    facePanel(0.34, 0.17, 0.06, 0.04, [FACE + 0.22, 0.62, z], accent, edgeDim);
  }
  facePanel(0.72, 0.3, 0.09, 0.04, [FACE + 0.22, 0.66, 0], fill, edgeDim);

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
  addBox([TRAILER_LENGTH, 3.0, 2.55], [TRAILER_MID, 2.5, 0]);

  const ribPoints: number[] = [];
  for (let x = TRAILER_FRONT - 1.0; x > TRAILER_REAR + 0.5; x -= 0.95) {
    ribPoints.push(x, 1.05, 1.28, x, 3.95, 1.28);
    ribPoints.push(x, 1.05, -1.28, x, 3.95, -1.28);
  }
  group.add(lineSegments(ribPoints, edgeDim));

  for (const z of [0.63, -0.63]) {
    addPlane([1.2, 2.76], [TRAILER_REAR - 0.01, 2.5, z], "x", fill, edge);
  }

  group.add(
    lineSegments(
      [
        TRAILER_REAR - 0.02, 1.18, 0.28, TRAILER_REAR - 0.02, 3.82, 0.28,
        TRAILER_REAR - 0.02, 1.18, -0.28, TRAILER_REAR - 0.02, 3.82, -0.28,
        TRAILER_REAR, 4.0, 1.27, TRAILER_FRONT, 4.0, 1.27,
        TRAILER_REAR, 4.0, -1.27, TRAILER_FRONT, 4.0, -1.27,
      ],
      edgeDim,
    ),
  );

  // Operator branding down both flanks, the way a fleet liveries its trailers.
  const decal = createTextDecal("ATLASZ", palette.line);
  const decalMaterial = new THREE.MeshBasicMaterial({
    map: decal.texture,
    transparent: true,
    // FrontSide, not DoubleSide: the trailer panels are slightly translucent, so
    // a double-sided decal shows through mirror-imaged from the far flank.
    side: THREE.FrontSide,
    depthWrite: false,
  });
  // Sized to fill the flank: the trailer runs x -9.2…-0.6 and y 1.0…4.0, so
  // this leaves roughly a half-metre margin all round.
  for (const z of [1.3, -1.3]) {
    const panel = new THREE.PlaneGeometry(TRAILER_LENGTH - 2.6, 2.3);
    if (z < 0) panel.rotateY(Math.PI); // face outward, so the text is not mirrored
    panel.translate(TRAILER_MID, 2.6, z);
    const mesh = new THREE.Mesh(panel, decalMaterial);
    mesh.renderOrder = 3; // over the flank ribbing
    group.add(mesh);
  }

  addBox([0.14, 0.12, 2.2], [TRAILER_REAR + 0.1, 0.62, 0], fill, edgeDim); // underrun bar
  for (const z of [0.7, -0.7]) {
    addBox([0.04, 0.5, 0.42], [TRAILER_REAR + 0.85, 0.4, z], fill, edgeDim); // mudflaps
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
      trailer: new THREE.Vector3(TRAILER_MID, 2.5, 0),
      rear: new THREE.Vector3(TRAILER_REAR, 2.1, 0),
      roof: new THREE.Vector3(TRAILER_MID, 4.0, 0),
      whole: bounds.getCenter(new THREE.Vector3()),
    },
    setPalette(next) {
      applyPalette(materials, next);
      decal.recolor(next.line);
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
      decal.dispose();
    },
  };
}
