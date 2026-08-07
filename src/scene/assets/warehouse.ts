import * as THREE from "three";
import type { ScenePalette } from "../palette";
import {
  applyPalette,
  disposeObject,
  edgeMaterial,
  edgesFor,
  hologramFill,
  EDGE_RENDER_ORDER,
} from "../materials";
import type { SceneAsset } from "./types";

const WIDTH = 30;
const HEIGHT = 10;
const DEPTH = 18;

/**
 * A distribution hub as an open wireframe hangar: shell, roof trusses, dock
 * doors along the front, and instanced racking inside. Deliberately unfilled so
 * the camera can fly through it rather than around it.
 */
export function proceduralWarehouse(
  palette: ScenePalette,
  rackCount: number,
): SceneAsset {
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];

  const fill = hologramFill(palette);
  const edge = edgeMaterial(palette);
  const edgeDim = edgeMaterial(palette, true);
  materials.push(fill, edge, edgeDim);

  // Shell — edges only. A filled box would hide everything inside it.
  const shellGeometry = new THREE.BoxGeometry(WIDTH, HEIGHT, DEPTH);
  shellGeometry.translate(0, HEIGHT / 2, 0);
  group.add(edgesFor(shellGeometry, edge));

  // Roof trusses.
  const trussGeometry = new THREE.BufferGeometry();
  const trussPoints: number[] = [];
  for (let i = 1; i < 8; i += 1) {
    const z = -DEPTH / 2 + (i * DEPTH) / 8;
    trussPoints.push(-WIDTH / 2, HEIGHT, z, WIDTH / 2, HEIGHT, z);
  }
  trussGeometry.setAttribute("position", new THREE.Float32BufferAttribute(trussPoints, 3));
  const trusses = new THREE.LineSegments(trussGeometry, edgeDim);
  trusses.renderOrder = EDGE_RENDER_ORDER;
  group.add(trusses);

  // Dock doors along the +X face.
  const doorGeometry = new THREE.PlaneGeometry(3.4, 4.2);
  doorGeometry.rotateY(Math.PI / 2);
  for (let i = 0; i < 4; i += 1) {
    const z = -DEPTH / 2 + 3 + i * 4;
    const door = new THREE.Mesh(doorGeometry, fill);
    door.position.set(WIDTH / 2, 2.1, z);
    door.add(edgesFor(doorGeometry, edge));
    group.add(door);
  }

  // Racking — the one place instancing earns its complexity.
  const rackGeometry = new THREE.BoxGeometry(1.8, 5.2, 1.3);
  const racks = new THREE.InstancedMesh(rackGeometry, fill, rackCount);
  const rackEdges = new THREE.EdgesGeometry(rackGeometry, 22);
  const matrix = new THREE.Matrix4();
  const perRow = Math.max(1, Math.ceil(rackCount / 4));
  for (let i = 0; i < rackCount; i += 1) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = -WIDTH / 2 + 4 + (col * (WIDTH - 10)) / Math.max(1, perRow - 1);
    const z = -DEPTH / 2 + 4 + row * 3.4;
    matrix.setPosition(x, 2.6, z);
    racks.setMatrixAt(i, matrix);

    const outline = new THREE.LineSegments(rackEdges, edgeDim);
    outline.position.set(x, 2.6, z);
    outline.renderOrder = EDGE_RENDER_ORDER;
    group.add(outline);
  }
  racks.instanceMatrix.needsUpdate = true;
  group.add(racks);

  const bounds = new THREE.Box3().setFromObject(group);

  return {
    object3D: group,
    bounds,
    anchorPoints: {
      dock: new THREE.Vector3(WIDTH / 2, 2.4, 0),
      interior: new THREE.Vector3(0, 4, 0),
      approach: new THREE.Vector3(WIDTH / 2 + 16, 3, 0),
      whole: bounds.getCenter(new THREE.Vector3()),
    },
    setPalette(next) {
      applyPalette(materials, next);
    },
    dispose() {
      disposeObject(group);
      rackEdges.dispose();
    },
  };
}
