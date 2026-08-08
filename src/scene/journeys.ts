import * as THREE from "three";

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

/**
 * One page's worth of choreography: how far the truck drives, and what the
 * camera does while it does.
 *
 * The rig owns the mechanism — interpolation, damping, the local-to-world
 * transform — and a journey owns everything that differs between pages. Two
 * pages of very different length can then share one scene without either
 * inheriting the other's pacing.
 */
export type Journey = {
  /** Route parameter the truck sits at when scroll progress is 0. */
  truckFrom: number;
  /** Route parameter it reaches at progress 1. */
  truckTo: number;
  buildFramings(anchors: Record<string, THREE.Vector3>): Framing[];
};

const from = (base: THREE.Vector3, x: number, y: number, z: number) =>
  base.clone().add(new THREE.Vector3(x, y, z));

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
function buildLandingFramings(anchors: Record<string, THREE.Vector3>): Framing[] {
  const trailer = anchors.trailer ?? new THREE.Vector3(-7.4, 2.5, 0);

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
      offset: from(trailer, 1.7, 1.2, 31),
      lookOffset: from(trailer, 1.7, 4.8, 0),
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

/**
 * The marketing scroll: a full run from open road to the facility, across six
 * framings and a document some five viewports tall.
 */
export const landingJourney: Journey = {
  truckFrom: 0.3,
  truckTo: 0.612,
  buildFramings: buildLandingFramings,
};

/**
 * Pans the aim sideways so the vehicle sits off-centre in frame.
 *
 * The deck's copy occupies a left band the full height of every section, and a
 * centred truck sits straight underneath it. Panning the camera's aim to the
 * left pushes the subject to the right, into the empty half.
 *
 * Computed in the truck's local frame, which is the world frame rotated about
 * y — a rotation preserves angles, so the screen-right worked out here survives
 * the transform the rig applies later.
 */
function biasAim(offset: THREE.Vector3, look: THREE.Vector3, amount: number) {
  const view = look.clone().sub(offset);
  // Screen-right for a y-up camera is normalize(cross(forward, up)), which for
  // up = (0,1,0) reduces to (-z, 0, x). Flattened, so a high framing does not
  // shorten the pan.
  const right = new THREE.Vector3(-view.z, 0, view.x).normalize();
  return look.clone().addScaledVector(right, -amount);
}

/**
 * The Early Partner deck: the last leg of the same trip.
 *
 * The deck page is roughly half the landing page's height, and scroll progress
 * is normalised against document height — so running the full route here would
 * drive the truck at twice the speed per scrolled pixel and read as hurried. It
 * starts most of the way along instead, and still arrives at the bays.
 *
 * Four framings rather than six, with a gentler sweep. The page is presented
 * live on a landscape screen and the copy is the subject, so the camera has no
 * reason to work as hard as it does over five viewports of marketing.
 *
 * The single-crossing invariant holds — bearings run +87° → +29° → -15° → -48°.
 */
function buildDeckFramings(anchors: Record<string, THREE.Vector3>): Framing[] {
  const trailer = anchors.trailer ?? new THREE.Vector3(-7.4, 2.5, 0);

  /* How far the truck sits right of centre, in metres of pan at the look
     target. Enough to clear the copy band without pushing the vehicle off the
     edge of the frame. */
  const BIAS = 13;

  const framing = (
    at: number,
    offset: THREE.Vector3,
    look: THREE.Vector3,
    bias = BIAS,
  ): Framing => ({ at, offset, lookOffset: biasAim(offset, look, bias) });

  return [
    // Title — a close profile with the livery square to camera, the same
    // opening note the landing page strikes, aimed high so the truck rides low.
    framing(
      0,
      from(trailer, 1.7, 1.6, 34), // +87°
      from(trailer, 1.7, 4.2, 0),
    ),
    // Standing back for the two copy-heavy sections. Still facility side.
    framing(
      0.36,
      from(trailer, 46, 20, 26), // +29°
      trailer.clone(),
    ),
    // "Élő bemutató" — the crossing, past the nose onto the far side. That
    // section is a near-empty frame, so this is where the scene does the work.
    framing(
      0.7,
      from(trailer, 52, 18, -14), // -15°
      trailer.clone(),
    ),
    // Arrived: the truck pulls in between the parked pair, facility behind.
    // Less bias — the yard is the subject here, not a backdrop to step around.
    framing(
      1,
      from(trailer, 37, 19, -33), // -48°
      from(trailer, 4, 0, 10),
      7,
    ),
  ];
}

export const deckJourney: Journey = {
  truckFrom: 0.45,
  truckTo: 0.612,
  buildFramings: buildDeckFramings,
};
