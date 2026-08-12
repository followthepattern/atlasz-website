import * as THREE from "three";
import { applyPalette, disposeObject } from "../materials";
import { proceduralTruck } from "../assets/truck";
import { proceduralWarehouse } from "../assets/warehouse";
import { proceduralTrees } from "../assets/trees";
import type { SceneAsset } from "../assets/types";
import { buildGrid, placeOnRoute, treePlacements, type Follow } from "../road";
import { screenSize, type ScreenSize } from "../viewport";
import { createCameraRig, type Framing } from "../cameraRig";
import type { SceneContext, SceneInstance, SceneFactory } from "../types";

/* The sandbox's world: the marketing scroll's scenario, stood off to one side.
 *
 * A copy of src/scene/site/world.ts as it stood, and deliberately not an import
 * of it. The whole point of the lab is that nothing tried in here can reach the
 * page that matters, and sharing the world would mean the exact opposite: every
 * experiment one edit away from the landing page. The deck makes the same call
 * for the same reason.
 *
 * So this file is expected to drift from its original, and the drift is the
 * work. When something in here earns its place, it gets carried across on
 * purpose — rather than arriving on the site because the two happened to share
 * a module.
 *
 * Left behind in the copy: the projected screen anchor the site publishes for
 * its floating readouts. The lab renders no overlay, so it had no subscribers —
 * dead coupling to a page concern. */

/** Where the truck sits on the route at scroll 0 and scroll 1. */
const TRUCK_FROM = 0.3;
const TRUCK_TO = 0.612;

/* Two identical units already standing at the facility, parked side by side
   with a bay left empty between them for the one that arrives. They belong to
   the arrival, not the opening: the hero is one vehicle on an open road, and
   the end of the page is it pulling into its own fleet's yard. */
const PARKING_BAY = 5.4; // metres between bay centres, across the apron

const WAREHOUSE_AT = 0.62;
/* Beside the bays rather than across a wide apron, now that the truck holds a
   straight line instead of crossing the yard to reach it. */
const WAREHOUSE_OFFSET = 26; // metres from the route centreline

/**
 * How far back the camera stands, per viewport bucket.
 *
 * A vertical field of view means the width a framing gets is the aspect
 * ratio's to give. These framings are authored against a wide desktop window;
 * at 375px the visible width is about 4.7 m of a 17.7 m rig, so the frame lands
 * on the middle of the trailer rather than on a vehicle.
 *
 * The fix is one number per bucket, not a second set of framings. `lg` and `xl`
 * are 1 — a multiply by one, so every desktop window comes out bit-for-bit as
 * authored and no amount of tuning here can drift a composition already signed
 * off. Narrower buckets stand further back along the same bearing.
 *
 * Distance rather than field of view on purpose: widening the lens to fit a
 * long vehicle stretches it at the edges, where the cab is.
 */
const DISTANCE = {
  xs: 2.5,
  md: 1.6,
  lg: 1,
  xl: 1,
} as const satisfies Record<ScreenSize, number>;

/* Scaling the whole offset keeps each framing's bearing — atan2 of scaled
   components is unchanged — so the single-crossing sweep survives untouched.
   The look target is deliberately not scaled: the camera backs off, the aim
   stays where it was authored. */
const offsetBy =
  (distance: number) =>
  (base: THREE.Vector3, x: number, y: number, z: number) =>
    base.clone().add(new THREE.Vector3(x * distance, y * distance, z * distance));

/**
 * Framings are built from the truck's own anchor points, never from bare
 * coordinates, so replacing the procedural model with a GLTF of different
 * proportions moves the camera with it.
 *
 * The sweep, as bearings around the vehicle — see the rig's invariant:
 *
 *   0.00 +87°   0.24  +30°   0.48  +13°
 *   0.54 +13°   0.60  +13°   <- held, the sweep pauses here
 *   0.70 -11°   0.88  -33°   1.00  -50°
 *          ^ the single crossing now lives between 0.60 and 0.70
 */
function buildFramings(
  anchors: Record<string, THREE.Vector3>,
  distance: number,
): Framing[] {
  const trailer = anchors.trailer ?? new THREE.Vector3(-7.4, 2.5, 0);
  const from = offsetBy(distance);

  return [
    // Hero — near side-on, so the opening frame reads as a full profile with
    // the livery square to camera. The look target is centred on the vehicle
    // and lifted above it, holding the truck mid-frame and low, which leaves
    // the upper band to the headline.
    {
      at: 0,
      // Square to the flank: camera and look target share an x, so the view
      // direction is perpendicular to the vehicle's length and it reads as a
      // flat elevation rather than a three-quarter.
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

    /* Two beats where the camera stops turning, so the page can carry copy
       without the frame swinging underneath it.
     *
     * Bearing is atan2(z, x), so scaling x and z by the same factor leaves it
     * exactly where the framing above put it — 12.22/51.7 and 11.44/48.4 are
     * both 13/55 to five places. The camera closes in slightly across the hold
     * rather than freezing: the truck is still driving and the road still
     * slides past, so a dead-locked camera would read as a stalled render
     * rather than as a held shot. Height is free — bearing does not read y.
     *
     * Two framings, not one, because one keyframe is an instant: a value is
     * only held over an interval if both ends of that interval state it. */
    {
      at: 0.54,
      offset: from(trailer, 51.7, 20, 12.22), // +13°, held
      lookOffset: trailer.clone(),
    },
    {
      at: 0.6,
      offset: from(trailer, 48.4, 19, 11.44), // +13°, held
      lookOffset: trailer.clone(),
    },

    // The single crossing: the camera passes the truck's nose head-on and comes
    // out on the far side. It now has 0.60–0.70 to do it in rather than
    // 0.48–0.70, so the swing is a little over twice as quick as it was.
    {
      at: 0.7,
      offset: from(trailer, 55, 20, -11), // -11°
      lookOffset: trailer.clone(),
    },
    // The facility comes into frame beyond the truck as it slows. These last
    // two sit ~13% nearer than the wide pass above — far enough to keep the
    // References copy clear, close enough that the arrival still lands.
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

export const createSandboxScene: SceneFactory = ({
  palette,
  quality,
  aspect,
  screen,
  reduced,
}: SceneContext): SceneInstance => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(palette.fog.getHex(), palette.fogDensity);

  const camera = new THREE.PerspectiveCamera(28, aspect, 0.5, 600);

  const grid = buildGrid(palette);
  scene.add(grid.object3D);

  const truck = proceduralTruck(palette);
  scene.add(truck.object3D);

  // Flanking bays on the apron. Same road position as the arriving truck,
  // offset across it, so the empty middle bay is the one it pulls into.
  const parked = [-PARKING_BAY, PARKING_BAY].map((side) => {
    const unit = proceduralTruck(palette);
    placeOnRoute(unit.object3D, TRUCK_TO, side);
    scene.add(unit.object3D);
    return unit;
  });

  const trees = proceduralTrees(
    palette,
    // Leave the frontage clear where the facility meets the road.
    treePlacements({ clearings: [[WAREHOUSE_AT, 0.055]] }),
  );
  scene.add(trees.object3D);

  const warehouse = proceduralWarehouse(palette, quality.rackCount);
  placeOnRoute(warehouse.object3D, WAREHOUSE_AT, WAREHOUSE_OFFSET);
  // Turn the dock to face the carriageway the truck arrives on.
  warehouse.object3D.rotation.y += Math.PI / 2;
  scene.add(warehouse.object3D);

  const follow: Follow = { position: new THREE.Vector3(), heading: 0 };

  function driveTo(progress: number) {
    const p = Math.min(1, Math.max(0, progress));
    const t = TRUCK_FROM + (TRUCK_TO - TRUCK_FROM) * p;
    // Straight down its own line, never across it. An earlier version ramped
    // a lateral offset in over the last stretch to reach the dock, which slid
    // the truck sideways while it stayed pointed along the road — a
    // crab-walk, not a drive. The bays are on this line instead, so arriving
    // is pure forward motion and the truck is already square with the pair it
    // parks between.
    placeOnRoute(truck.object3D, t, 0);
    follow.position.copy(truck.object3D.position);
    follow.heading = truck.object3D.rotation.y;
  }

  driveTo(0);

  // The bucket the framings were last built for. Tracked so `resize` can tell a
  // breakpoint crossing from the hundreds of intervening pixel changes.
  let bucket: ScreenSize = screen;
  const rig = createCameraRig(
    camera,
    follow,
    buildFramings(truck.anchorPoints, DISTANCE[bucket]),
    { reduced, label: "sandbox" },
  );
  rig.setProgress(0);
  rig.snap();

  const assets: SceneAsset[] = [truck, ...parked, warehouse, trees];
  let progress = 0;

  return {
    scene,
    camera,
    setProgress(next) {
      progress = next;
      rig.setProgress(next);
    },
    update(elapsed, delta) {
      driveTo(progress);
      // Only the moving unit is animated. The parked pair keep their wheels
      // still, which is what tells them apart from the one under way.
      truck.update?.(elapsed, delta, progress);
      rig.update(elapsed, delta);
    },
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      /* Re-frame only when the window crosses a breakpoint, never on the
         intervening pixels. Dragging a window edge fires this continuously,
         and rebuilding the framings on every frame of a drag would have the
         camera creeping the whole time the visitor is still dragging.

         The bucket comes from the helper rather than from `width`, so it is
         resolving the same number a `lg:` class does — `width` here is
         innerWidth, which counts the scrollbar, and media queries do not. Near
         a breakpoint that difference is enough for the two to disagree. */
      const next = screenSize();
      if (next !== bucket) {
        bucket = next;
        rig.setFramings(buildFramings(truck.anchorPoints, DISTANCE[bucket]));
      }
    },
    setPalette(next) {
      applyPalette([grid.material], next);
      for (const asset of assets) asset.setPalette(next);
      const fog = scene.fog as THREE.FogExp2;
      fog.color.copy(next.fog);
      fog.density = next.fogDensity;
    },
    dispose() {
      for (const asset of assets) asset.dispose();
      disposeObject(scene);
      scene.clear();
    },
  };
};
