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
 * Aspect at or above which the framings are used exactly as authored.
 *
 * Portrait only. Every landscape window — laptop, desktop, tablet held sideways
 * — must come out bit-for-bit identical to the framings written below, so the
 * narrow-frame handling can never drift the view anyone has already signed off.
 */
const NARROW_BELOW = 1;

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
 *   0.00 +102°   0.24  +31°   0.48  +15°
 *   0.70  -13°   0.88  -35°   1.00  -50°
 *          ^ the single crossing lives between 0.48 and 0.70
 *
 * Bearings are measured from the truck's origin, so they account for each
 * framing's anchor: the hero hangs off `cab`, the rest off `trailer`.
 */
function buildFramings(
  anchors: Record<string, THREE.Vector3>,
  aspect: number,
): Framing[] {
  const trailer = anchors.trailer ?? new THREE.Vector3(-7.4, 2.5, 0);
  const cab = anchors.cab ?? new THREE.Vector3(1.3, 2.3, 0);

  /* A vertical field of view means the width a framing gets is the aspect
     ratio's to give. These are authored against a wide desktop window; a
     portrait phone sees roughly a quarter of that width at the same distance,
     which crops the rig to whatever the look target happens to sit on — the
     middle of the trailer.

     `pull` backs the camera off in proportion, but only part of the way:
     fitting all 17 m of a full-length rig into a portrait frame makes it a toy.
     `cabBias` slides the aim forward onto the tractor unit instead, so what a
     narrow frame is filled with is the cab rather than a length of box.

     Both are 1 and 0 on a wide window, so desktop framing is untouched. */
  const narrow =
    aspect >= NARROW_BELOW ? 1 : Math.min(3, NARROW_BELOW / Math.max(aspect, 0.35));
  const pull = 1 + (narrow - 1) * 0.5;

  // Scaling the whole offset keeps each framing's bearing, so the
  // single-crossing sweep survives the adjustment. At narrow = 1 this is a
  // multiply by one — the framings come through untouched.
  const from = (base: THREE.Vector3, x: number, y: number, z: number) =>
    base.clone().add(new THREE.Vector3(x * pull, y * pull, z * pull));

  /* Where the hero aims along the vehicle: its authored point on a landscape
     window, sliding to the cab as the frame turns portrait. Interpolating to
     the cab anchor rather than adding a bias keeps it bounded — an additive
     bias overshoots past the nose onto empty road at the narrowest clamp. */
  const towardCab = Math.min(1, (narrow - 1) / 1.2);
  const heroAimX = 1.7 * pull + (cab.x - trailer.x - 1.7 * pull) * towardCab;

  return [
    // Hero — near side-on, so the opening frame reads as a full profile with
    // the livery square to camera. The look target is centred on the vehicle
    // and lifted above it, holding the truck mid-frame and low, which leaves
    // the upper band to the headline.
    //
    // A wider opening bearing only lengthens the first leg of the sweep; it
    // still decreases from here, so the single-crossing invariant holds.
    {
      at: 0,
      // Square to the flank: camera and look target share an x, so the view
      // direction is perpendicular to the vehicle's length and it reads as a
      // flat elevation rather than a three-quarter. The target is lifted above
      // the truck, which drops it into the lower band and leaves the upper one
      // to the headline.
      // Camera and look share an x — including the aim bias — so the view
      // direction stays perpendicular to the vehicle however narrow the frame.
      offset: trailer.clone().add(new THREE.Vector3(heroAimX, 1.2 * pull, 31 * pull)),
      lookOffset: trailer.clone().add(new THREE.Vector3(heroAimX, 4.8 * pull, 0)),
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
    // Arrived: camera opposite the yard, the truck between it and the bays.
    {
      at: 1,
      offset: from(trailer, 35.5, 19, -34), // -50°
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
  let builtAspect = camera.aspect;
  let framings = buildFramings(anchors, builtAspect);
  if (import.meta.env.DEV) assertSingleCrossing(framings);

  let lastProgress = 0;
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
    lastProgress = p;
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
    // Re-author the framings when the window changes shape — a rotated phone
    // needs a different pull-back, and the rig is the only thing that knows it.
    if (Math.abs(camera.aspect - builtAspect) > 0.01) {
      builtAspect = camera.aspect;
      framings = buildFramings(anchors, builtAspect);
      setProgress(lastProgress);
    }

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
