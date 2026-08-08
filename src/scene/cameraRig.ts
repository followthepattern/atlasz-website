import * as THREE from "three";
import { CAMERA_DAMPING } from "@/motion/tokens";
import type { Follow } from "./world";
import type { Framing, Journey } from "./journeys";

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export type CameraRig = {
  setProgress(progress: number): void;
  update(elapsed: number, delta: number): void;
  /** Jump straight to the current framing — used under reduced motion. */
  snap(): void;
};

/**
 * Enforces the single-crossing invariant in development. Bearings drifting out
 * of order is invisible in a still and only shows up as the viewpoint jumping
 * sides mid-scroll, which is exactly the kind of thing that survives a review.
 */
function assertSingleCrossing(framings: Framing[]) {
  const bearings = framings.map((f) => (Math.atan2(f.offset.z, f.offset.x) * 180) / Math.PI);
  for (let i = 1; i < bearings.length; i += 1) {
    if (bearings[i] > bearings[i - 1] + 0.5) {
      console.warn(
        "[cameraRig] camera bearing must decrease monotonically so the view " +
        `flips sides only once; framing ${i} (${bearings[i].toFixed(1)}°) ` +
        `swings back past framing ${i - 1} (${bearings[i - 1].toFixed(1)}°).`,
      );
    }
  }
}

export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  follow: Follow,
  anchors: Record<string, THREE.Vector3>,
  journey: Journey,
  options: { reduced?: boolean } = {},
): CameraRig {
  const framings = journey.buildFramings(anchors);
  if (import.meta.env.DEV) assertSingleCrossing(framings);

  const localOffset = framings[0].offset.clone();
  const localLook = framings[0].lookOffset.clone();
  const desiredPosition = new THREE.Vector3();
  const desiredTarget = new THREE.Vector3();
  const currentTarget = new THREE.Vector3();

  /** Local offset -> world, using the truck's current position and heading. */
  function toWorld(local: THREE.Vector3, out: THREE.Vector3) {
    const h = follow.heading;
    const cos = Math.cos(h);
    const sin = Math.sin(h);
    // Truck forward is +X rotated by h; its side axis is +Z rotated by h.
    return out.set(
      follow.position.x + cos * local.x + sin * local.z,
      follow.position.y + local.y,
      follow.position.z - sin * local.x + cos * local.z,
    );
  }

  function setProgress(progress: number) {
    const p = Math.min(1, Math.max(0, progress));
    const first = framings[0];
    const last = framings[framings.length - 1];

    if (p <= first.at) {
      localOffset.copy(first.offset);
      localLook.copy(first.lookOffset);
    } else if (p >= last.at) {
      localOffset.copy(last.offset);
      localLook.copy(last.lookOffset);
    } else {
      for (let i = 0; i < framings.length - 1; i += 1) {
        const a = framings[i];
        const b = framings[i + 1];
        if (p >= a.at && p <= b.at) {
          const span = b.at - a.at;
          const t = smoothstep(span === 0 ? 0 : (p - a.at) / span);
          localOffset.lerpVectors(a.offset, b.offset, t);
          localLook.lerpVectors(a.lookOffset, b.lookOffset, t);
          break;
        }
      }
    }

    toWorld(localOffset, desiredPosition);
    toWorld(localLook, desiredTarget);
  }

  function snap() {
    toWorld(localOffset, desiredPosition);
    toWorld(localLook, desiredTarget);
    camera.position.copy(desiredPosition);
    currentTarget.copy(desiredTarget);
    camera.lookAt(currentTarget);
  }

  snap();

  function update(elapsed: number, delta: number) {
    // The truck has moved since setProgress ran, so resolve the framing against
    // its current pose every frame rather than only on scroll.
    toWorld(localOffset, desiredPosition);
    toWorld(localLook, desiredTarget);

    if (options.reduced) {
      camera.position.copy(desiredPosition);
      currentTarget.copy(desiredTarget);
      camera.lookAt(currentTarget);
      return;
    }

    // Frame-rate independent damping: the same weight at 60fps and 144fps.
    const factor = 1 - Math.pow(1 - CAMERA_DAMPING, Math.min(delta, 0.1) * 60);
    camera.position.lerp(desiredPosition, factor);
    currentTarget.lerp(desiredTarget, factor);

    // Idle drift, so the frame breathes when the visitor stops scrolling.
    camera.position.x += Math.sin(elapsed * 0.21) * 0.03;
    camera.position.y += Math.cos(elapsed * 0.17) * 0.02;

    camera.lookAt(currentTarget);
  }

  return { setProgress, update, snap };
}
