import * as THREE from "three";
import { CAMERA_DAMPING } from "@/motion/tokens";
import type { Follow } from "./road";

/**
 * A framing, expressed relative to the moving vehicle rather than to the world.
 *
 * Offsets are in the truck's own frame: +x is ahead of it, +y up, +z out to one
 * side. Because the truck drives along the route as the page scrolls, a
 * world-space keyframe would be pointed at empty tarmac within a second — every
 * framing has to travel with the vehicle.
 */
export type Framing = {
  /** Scroll progress in [0, 1] at which this framing is fully reached. */
  at: number;
  offset: THREE.Vector3;
  lookOffset: THREE.Vector3;
};

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
 * Enforces the single-crossing invariant in development.
 *
 * A camera that changes sides more than once appears to jump back and forth,
 * which is invisible in a still and only shows up mid-scroll — exactly the kind
 * of thing that survives a review. Read each offset as a bearing around the
 * vehicle, angle = atan2(z, x): those bearings must decrease monotonically, so
 * the camera makes one continuous sweep. Distance and height are free to vary —
 * that is where the variety in the shots comes from — but the bearing may only
 * ever go one way.
 */
function assertSingleCrossing(framings: Framing[], label: string) {
  const bearings = framings.map((f) => (Math.atan2(f.offset.z, f.offset.x) * 180) / Math.PI);
  for (let i = 1; i < bearings.length; i += 1) {
    if (bearings[i] > bearings[i - 1] + 0.5) {
      console.warn(
        `[cameraRig:${label}] camera bearing must decrease monotonically so the ` +
        `view flips sides only once; framing ${i} (${bearings[i].toFixed(1)}°) ` +
        `swings back past framing ${i - 1} (${bearings[i - 1].toFixed(1)}°).`,
      );
    }
  }
}

/**
 * Interpolates a camera between framings and damps it toward the result.
 *
 * The mechanism only. Which framings, and how many, is the scene's to say —
 * this is what lets a five-viewport marketing scroll and a five-section deck
 * share their camera behaviour without sharing their choreography.
 */
export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  follow: Follow,
  framings: Framing[],
  options: { reduced?: boolean; label?: string } = {},
): CameraRig {
  if (import.meta.env.DEV) assertSingleCrossing(framings, options.label ?? "scene");

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
