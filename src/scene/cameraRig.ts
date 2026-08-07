import * as THREE from "three";
import { CAMERA_DAMPING } from "@/motion/tokens";
import type { Follow } from "./world";

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

/**
 * Framings are built from the truck's own anchor points, never from bare
 * coordinates, so replacing the procedural model with a GLTF of different
 * proportions moves the camera with it.
 *
 * INVARIANT — the camera changes sides exactly once across the whole scroll.
 *
 * Read each offset as a bearing around the truck: angle = atan2(z, x), with
 * the facility on the +z side. Those bearings must decrease monotonically, so
 * the camera makes one continuous sweep from the facility side, across the
 * truck's nose, to the far side it watches the arrival from. Every sign change
 * in z is a visible flip; more than one and the viewpoint appears to jump back
 * and forth. Distance and height are free to vary — that is where the variety
 * in the shots comes from — but the bearing may only ever go one way.
 *
 *   0.00  +35°   0.24  +30°   0.48  +15°
 *   0.70  -12°   0.88  -33°   1.00  -48°
 *          ^ the single crossing lives between 0.48 and 0.70
 *
 * Bearings are measured from the truck's origin, so they account for each
 * framing's anchor: the hero hangs off `cab`, the rest off `trailer`.
 */
function buildFramings(anchors: Record<string, THREE.Vector3>): Framing[] {
  const cab = anchors.cab ?? new THREE.Vector3(1.3, 2.3, 0);
  const trailer = anchors.trailer ?? new THREE.Vector3(-4.9, 2.5, 0);

  const from = (base: THREE.Vector3, x: number, y: number, z: number) =>
    base.clone().add(new THREE.Vector3(x, y, z));

  return [
    // Hero — low three-quarter ahead of the cab. The look target is centred on
    // the vehicle and lifted above it, which holds the truck in the middle of
    // frame and low, leaving the upper band to the headline. Only the look
    // target moves; `offset` sets the bearing, so the single-crossing sweep is
    // unaffected by this framing choice.
    {
      at: 0,
      offset: from(cab, 16, 2.2, 12),
      lookOffset: from(trailer, 3, 3.4, 0),
    },
    // From here down the page is dense with copy and cards, so every framing
    // stands well back. Close framings put the truck and the warehouse straight
    // through the section headings and made them hard to read.

    // Pull back and up. Still on the facility side, bearing barely moved.
    {
      at: 0.24,
      offset: from(trailer, 42, 19, 21), // +30°
      lookOffset: trailer.clone(),
    },
    // Swinging toward the truck's nose, still on the near side.
    {
      at: 0.48,
      offset: from(trailer, 55, 21, 13), // +13°
      lookOffset: trailer.clone(),
    },
    // The single crossing: the camera passes the truck's nose head-on and comes
    // out on the far side.
    {
      at: 0.7,
      offset: from(trailer, 55, 20, -11), // -11°
      lookOffset: trailer.clone(),
    },
    // The facility comes into frame beyond the truck as it slows. These last
    // two sit ~13% nearer than the wide pass above — far enough to keep the
    // References copy clear, close enough that the arrival still lands.
    // Scaled along the bearing, so the sweep order is untouched.
    {
      at: 0.88,
      offset: from(trailer, 41.5, 17, -23.5), // -33°
      lookOffset: from(trailer, 6, 0, 6),
    },
    // Arrived: camera opposite the facility, truck between it and the dock.
    {
      at: 1,
      offset: from(trailer, 35.5, 19, -34), // -48°
      lookOffset: from(trailer, 4, 0, 10),
    },
  ];
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
  options: { reduced?: boolean } = {},
): CameraRig {
  const framings = buildFramings(anchors);
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
