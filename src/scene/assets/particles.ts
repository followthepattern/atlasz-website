import * as THREE from "three";
import type { ScenePalette } from "../palette";
import { applyPalette, disposeObject } from "../materials";
import type { SceneAsset } from "./types";

/**
 * Two particle systems with different jobs:
 *
 * - An ambient field filling the volume, rotated as a whole. No per-point CPU
 *   work, so its cost is flat no matter how many points the tier allows.
 * - A data stream flowing truck → warehouse, advanced on the CPU. This one is
 *   deliberately small: it carries the "data moving" idea, and only a few
 *   hundred points are needed to read as flow.
 */
export function proceduralParticles(
  palette: ScenePalette,
  count: number,
  from: THREE.Vector3,
  to: THREE.Vector3,
): SceneAsset {
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];

  // --- Ambient field -------------------------------------------------------
  const fieldCount = Math.round(count * 0.75);
  const fieldPositions = new Float32Array(fieldCount * 3);
  for (let i = 0; i < fieldCount; i += 1) {
    fieldPositions[i * 3] = (Math.random() - 0.5) * 220;
    fieldPositions[i * 3 + 1] = Math.random() * 46 - 4;
    fieldPositions[i * 3 + 2] = (Math.random() - 0.5) * 220;
  }
  const fieldGeometry = new THREE.BufferGeometry();
  fieldGeometry.setAttribute("position", new THREE.BufferAttribute(fieldPositions, 3));

  const fieldMaterial = new THREE.PointsMaterial({
    color: palette.particle,
    size: 0.16,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  fieldMaterial.userData.kind = "particle";
  materials.push(fieldMaterial);

  const field = new THREE.Points(fieldGeometry, fieldMaterial);
  group.add(field);

  // --- Data stream ---------------------------------------------------------
  const streamCount = Math.max(60, Math.round(count * 0.25));
  const streamPositions = new Float32Array(streamCount * 3);
  const offsets = new Float32Array(streamCount);
  const jitter = new Float32Array(streamCount * 2);
  for (let i = 0; i < streamCount; i += 1) {
    offsets[i] = Math.random();
    jitter[i * 2] = (Math.random() - 0.5) * 3.2;
    jitter[i * 2 + 1] = (Math.random() - 0.5) * 2.4;
  }
  const streamGeometry = new THREE.BufferGeometry();
  streamGeometry.setAttribute("position", new THREE.BufferAttribute(streamPositions, 3));

  const streamMaterial = new THREE.PointsMaterial({
    color: palette.particle,
    size: 0.3,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  streamMaterial.userData.kind = "particle";
  materials.push(streamMaterial);

  const stream = new THREE.Points(streamGeometry, streamMaterial);
  group.add(stream);

  const start = from.clone();
  const end = to.clone();
  const span = new THREE.Vector3().subVectors(end, start);

  return {
    object3D: group,
    bounds: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(0, 12, 0),
      new THREE.Vector3(220, 50, 220),
    ),
    anchorPoints: {},
    setPalette(next) {
      applyPalette(materials, next);
    },
    update(elapsed, delta) {
      field.rotation.y += delta * 0.012;

      for (let i = 0; i < streamCount; i += 1) {
        offsets[i] = (offsets[i] + delta * 0.09) % 1;
        const t = offsets[i];
        // Slight arc so the stream lifts off the ground mid-flight.
        const lift = Math.sin(t * Math.PI) * 5.5;
        streamPositions[i * 3] = start.x + span.x * t + jitter[i * 2];
        streamPositions[i * 3 + 1] =
          start.y + span.y * t + lift + Math.sin(elapsed * 1.4 + i) * 0.22;
        streamPositions[i * 3 + 2] = start.z + span.z * t + jitter[i * 2 + 1];
      }
      streamGeometry.attributes.position.needsUpdate = true;
    },
    dispose() {
      disposeObject(group);
    },
  };
}
