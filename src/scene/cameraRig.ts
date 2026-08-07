import * as THREE from "three";
import { CAMERA_DAMPING } from "@/motion/tokens";

export type Keyframe = {
  /** Scroll progress in [0, 1] at which this framing is fully reached. */
  at: number;
  position: THREE.Vector3;
  target: THREE.Vector3;
};

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

/**
 * Framings for each section of the page. Every position is derived from a world
 * anchor plus an offset — never a bare coordinate — so replacing the procedural
 * truck with a GLTF of different proportions shifts the camera with it instead
 * of leaving it pointed at empty grid.
 */
function buildKeyframes(anchors: Record<string, THREE.Vector3>): Keyframe[] {
  const cab = anchors.truckCab;
  const trailer = anchors.truckTrailer;
  const whole = anchors.truckWhole;
  const dock = anchors.warehouseDock;
  const warehouse = anchors.warehouseWhole;
  const finale = new THREE.Vector3().lerpVectors(whole, warehouse, 0.5);

  return [
    // Hero — low three-quarter on the cab, headlights toward camera. The target
    // is pushed screen-left of the truck so the vehicle sits in the right half
    // of the frame and leaves the headline column clear.
    {
      at: 0,
      position: cab.clone().add(new THREE.Vector3(16, 2.2, 12)),
      target: cab.clone().add(new THREE.Vector3(-4.2, 0.3, 5.6)),
    },
    // RouteEconomics — pull back and up, the route line reads across the grid.
    {
      at: 0.25,
      position: trailer.clone().add(new THREE.Vector3(26, 13, 30)),
      target: trailer.clone(),
    },
    // Features — slow orbit around to the far side.
    {
      at: 0.48,
      position: whole.clone().add(new THREE.Vector3(-19, 7, 23)),
      target: whole.clone(),
    },
    // Onboarding — tracking shot alongside the trailer.
    {
      at: 0.62,
      position: trailer.clone().add(new THREE.Vector3(-11, 2.4, 13)),
      target: trailer.clone().add(new THREE.Vector3(6, 0.5, 0)),
    },
    // Integrations — the warehouse, with the data stream arriving at the dock.
    {
      at: 0.8,
      position: dock.clone().add(new THREE.Vector3(30, 11, 30)),
      target: warehouse.clone(),
    },
    // References — wide and static, the whole route in frame.
    {
      at: 0.95,
      position: finale.clone().add(new THREE.Vector3(10, 34, 78)),
      target: finale.clone(),
    },
  ];
}

export type CameraRig = {
  setProgress(progress: number): void;
  update(elapsed: number, delta: number): void;
  /** Jump straight to the current framing — used under reduced motion. */
  snap(): void;
};

export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  anchors: Record<string, THREE.Vector3>,
  options: { reduced?: boolean } = {},
): CameraRig {
  const keyframes = buildKeyframes(anchors);
  const desiredPosition = keyframes[0].position.clone();
  const desiredTarget = keyframes[0].target.clone();
  const currentTarget = keyframes[0].target.clone();

  camera.position.copy(desiredPosition);
  camera.lookAt(currentTarget);

  function setProgress(progress: number) {
    const p = Math.min(1, Math.max(0, progress));

    if (p <= keyframes[0].at) {
      desiredPosition.copy(keyframes[0].position);
      desiredTarget.copy(keyframes[0].target);
      return;
    }
    const last = keyframes[keyframes.length - 1];
    if (p >= last.at) {
      desiredPosition.copy(last.position);
      desiredTarget.copy(last.target);
      return;
    }

    for (let i = 0; i < keyframes.length - 1; i += 1) {
      const a = keyframes[i];
      const b = keyframes[i + 1];
      if (p >= a.at && p <= b.at) {
        const span = b.at - a.at;
        const t = smoothstep(span === 0 ? 0 : (p - a.at) / span);
        desiredPosition.lerpVectors(a.position, b.position, t);
        desiredTarget.lerpVectors(a.target, b.target, t);
        return;
      }
    }
  }

  function snap() {
    camera.position.copy(desiredPosition);
    currentTarget.copy(desiredTarget);
    camera.lookAt(currentTarget);
  }

  function update(elapsed: number, delta: number) {
    if (options.reduced) {
      snap();
      return;
    }

    // Frame-rate independent damping: the same weight at 60fps and 144fps.
    const factor = 1 - Math.pow(1 - CAMERA_DAMPING, Math.min(delta, 0.1) * 60);
    camera.position.lerp(desiredPosition, factor);
    currentTarget.lerp(desiredTarget, factor);

    // Idle drift, so the frame breathes when the visitor stops scrolling.
    const driftX = Math.sin(elapsed * 0.21) * 0.5;
    const driftY = Math.cos(elapsed * 0.17) * 0.32;
    camera.position.x += driftX * 0.06;
    camera.position.y += driftY * 0.06;

    camera.lookAt(currentTarget);
  }

  return { setProgress, update, snap };
}
