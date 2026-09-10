import * as THREE from "three";
import { disposeObject } from "../materials";
import { proceduralTruck } from "./assets/truck";
import { proceduralWarehouse } from "../assets/warehouse";
import { proceduralTrees } from "../assets/trees";
import type { SceneAsset } from "../assets/types";
import { ROUTE, headingAt, placeOnRoute, treePlacements, type Follow } from "./road";
import { screenSize, type ScreenSize } from "../viewport";
import { createCameraRig, type Framing } from "../cameraRig";
import { proceduralClouds, CLOUD_BASE, CLOUD_TOP } from "./assets/clouds";
import { proceduralUplink } from "./assets/uplink";
import { proceduralStation } from "./assets/station";
import { proceduralCarriageway } from "./assets/carriageway";
import { proceduralGround } from "./assets/ground";
import { proceduralForklift } from "./assets/forklift";
import { proceduralFactory } from "./assets/factory";
import { proceduralBridge } from "./assets/bridge";
import { createDriver } from "./driver";
import { fuelStopPose } from "./fuelStop";
import { TRUCK_FROM, TRUCK_TO, BRIDGE_SCENE, BRIDGE_FADE, TRAILER_REAR_BACK, FUEL_SCENE, STOPPED_FROM, routeAt } from "./journey";
import { within, SCENE_START, SCENE_SPAN } from "./scenes";
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

// Route geometry is isolated in sandbox/road.ts; scene timing stays unchanged.
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/* Where the station stands, derived from where the vehicle actually stops
   rather than typed in beside it. Retune the profile above and the forecourt
   follows the truck instead of being left behind on the verge. */
const STATION_AT = routeAt(STOPPED_FROM);

/* Metres from the centreline. Bounded by the framing, not by taste: this
   scene inherits a shallow bearing from the uplink, so the camera is nearly
   in front of the nose and the frame is only ~20m wide at the vehicle. Pumps
   at 17m were simply outside it. */

const STATION_OFFSET = 6; // pumps land ~9.4m off the centreline

/* Two identical units already standing at the facility, parked side by side
   with a bay left empty between them for the one that arrives. They belong to
   the arrival, not the opening: the hero is one vehicle on an open road, and
   the end of the page is it pulling into its own fleet's yard. */
const PARKING_BAY = 5.4; // metres between bay centres, across the apron

/* How much of the ground haze survives at altitude.
 *
 * FogExp2 fades by exp(-(density * distance)^2), and the palette's density is
 * tuned for a camera fifty-odd metres from the truck. At the top of the climb
 * the camera is over three hundred metres away, where that same density fogs
 * the vehicle out completely — 100%, measured, not estimated.
 *
 * So the density is derived from the distance rather than fixed: hold
 * density * distance at or under this figure and the haze reads the same from
 * every altitude. Capped by the palette's own value, so nothing at ground level
 * changes — at 55m this asks for a thicker fog than the palette gives, and the
 * palette wins.
 *
 * Deriving it from distance rather than from scroll is also what keeps the
 * phone honest, where the DISTANCE multiplier puts the camera 2.5x higher.
 *
 * Lowered from 0.9 once there was terrain to see: at 0.9 the subject itself sat
 * under 56% haze and the far hills under 91%, which is not atmosphere, it is a
 * blank. */
const HAZE_BUDGET = 0.55;

/** Camera altitude over which the deck fades in — just before entering it. */
const CLOUD_FADE = [CLOUD_BASE - 50, CLOUD_BASE + 10] as const;

/* Camera altitude over which the satellites fade in, and this is a framing
   number rather than a narrative one. They sit 60m out to each side, and at a
   28° vertical field of view the frame is only ~32m wide at their depth until
   the camera is well above 240m. Fading them in any earlier brings them to full
   strength while they are still outside the picture, so they would not appear —
   they would already be there, off-frame, and then swing in.
   Held against CLOUD_TOP so it is obvious they arrive after the deck. */
const UPLINK_FADE = [Math.max(CLOUD_TOP, 240), 330] as const;

/** 0 below `from`, 1 above `to`, smooth in between. */
function ramp(value: number, [from, to]: readonly [number, number]) {
  return Math.min(1, Math.max(0, (value - from) / (to - from)));
}

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
 * scene 1 - the road
 *   0.00 +87°   0.09  +27°   0.17  +20°
 *   0.25 +20°   0.30  +20°   <- held, the sweep pauses
 *   0.35 +16°
 * scene 2 - the uplink
 *   0.42 +16°   <- straight up, bearing held
 *   0.47 +16°   0.60  +16°   <- on station, held
 *   0.66 +12°   <- back down through the deck
 *   0.70  +8°
 * scene 3 - the fuel stop        (the vehicle stops; see the speed profile)
 *          +7°  +6°  +5°  +4°   <- slowing, standing, pulling away
 * scene 4 - the approach
 *          -9°  -29°  -50°      <- the crossing, still turning, and it arrives
 *
 * One continuous rotation from +87° to -44°, never reversed. It stays on the
 * near side of the vehicle for two whole scenes and changes sides exactly once,
 * early in the approach — so the page's one change of viewpoint is spent on the
 * run in to the bays, and the camera keeps turning from there to the arrival
 * rather than parking and snapping round at the end. Putting that crossing back
 * where it was, at the end of the road scene, spends it on nothing in
 * particular.
 */
function buildFramings(
  anchors: Record<string, THREE.Vector3>,
  distance: number,
): Framing[] {
  const trailer = anchors.trailer ?? new THREE.Vector3(-7.4, 2.5, 0);
  const from = offsetBy(distance);
  const orbit = (anchor: THREE.Vector3, radius: number, height: number, degrees: number) => {
    const angle = THREE.MathUtils.degToRad(degrees);
    return from(anchor, radius * Math.cos(angle), height, radius * Math.sin(angle));
  };

  return [
    /* ---- The opening. The camera turns; the vehicle does not move. ----
     *
     * Back to the original hero: square to the flank, livery flat to camera,
     * the vehicle low so the upper band is free for a headline.
     *
     * Which settles a question the last pass got wrong. Rear doors are only
     * seen face-on from behind the trailer, and chasing that moved the entire
     * opening round the back — at the cost of this frame. Wrong trade. With the
     * doors standing open they read from here perfectly well, as two leaves
     * swung out past the rear corners, and a loader coming up the trailer's
     * axis is clear of the bodywork at any of these bearings. */
    {
      at: within(0, 0),
      offset: from(trailer, 1.7, 1.2, 31),
      lookOffset: from(trailer, 1.7, 4.8, 0),
    },
    {
      at: within(0, 0.5),
      offset: from(trailer, 1.77, 12, 35.56), // 99 deg at 36m, easing back
      lookOffset: from(trailer, -4, 2.4, 0),
    },
    {
      at: within(0, 1.0),
      offset: from(trailer, 3.22, 14, 39.78), // 96 deg at 40m, the doors come open
      lookOffset: from(trailer, -4, 2.4, 0),
    },

    /* ---- Loading. Still stationary; the loader works up the rear. ----
     *
     * Almost no rotation, 94 to 88 degrees across a whole scene, because there
     * is one small thing to watch. The aim sits well back on the trailer so the
     * open doors and the loader hold the frame rather than the cab.
     *
     * The sightline clears: from 34m out at 91 degrees the camera is level with
     * the coupling, and a line from there to a loader 22m behind the rear
     * passes outside the trailer's flank before it ever reaches it. */
    {
      at: within(1, 0.15),
      offset: from(trailer, 4.47, 12, 41.9), // 94 deg at 42m, closing on the doors
      lookOffset: from(trailer, -9, 1.8, 0),
    },
    {
      at: within(1, 0.5),
      offset: from(trailer, 6.81, 8, 33.99), // 91 deg at 34m, the lift
      lookOffset: from(trailer, -9, 1.8, 0),
    },
    {
      at: within(1, 0.82),
      offset: from(trailer, 7.4, 8, 34.0), // 90 deg at 34m, held, while the pallet goes in
      lookOffset: from(trailer, -9, 1.8, 0),
    },
    {
      at: within(1, 1.0),
      offset: from(trailer, 8.8, 11, 39.98), // 88 deg at 40m, doors shut, loader away
      lookOffset: from(trailer, -9, 1.8, 0),
    },

    /* ---- The road. The drive, and the long swing to the flank. ----
     *
     * 85 degrees down to 23, the biggest rotation in the scene, and it belongs
     * here: everything before this was parked, so there was nothing for a swing
     * that size to be about. */
    {
      at: within(2, 0.12),
      offset: from(trailer, 11.58, 16, 47.82), // 85 deg at 48m, as it pulls away
      lookOffset: trailer.clone(),
    },
    {
      at: within(2, 0.32),
      offset: from(trailer, 29.38, 19, 47.13), // 65 deg at 52m
      lookOffset: trailer.clone(),
    },
    {
      at: within(2, 0.55),
      offset: from(trailer, 45.58, 20, 38.18), // 45 deg at 54m
      lookOffset: trailer.clone(),
    },
    {
      at: within(2, 0.78),
      offset: from(trailer, 53.19, 21, 28.62), // 32 deg at 54m
      lookOffset: trailer.clone(),
    },
    {
      at: within(2, 1.0),
      offset: from(trailer, 55.01, 21, 20.01), // 22.8 deg at 51.64m, alongside
      lookOffset: trailer.clone(),
    },

    /* ---- The bridge. Stand back; the span is the subject. ----
     *
     * The bearing barely moves, 22 to 18 degrees, and the radius opens out to
     * 70m at the middle. Everything else in this world is framed on the
     * vehicle, but a 124m truss only reads as a crossing if both banks are in
     * shot — so here the truck is the small thing moving through the picture
     * rather than the thing the picture is of. It climbs a little too, to see
     * along the deck and put the water underneath. */
    {
      at: within(3, 0.18),
      offset: from(trailer, 63.03, 24, 22.48), // 22.0 deg at 60m, the span comes up
      lookOffset: from(trailer, 0, 1.5, 0),
    },
    {
      at: within(3, 0.45),
      offset: from(trailer, 72.92, 33, 24.63), // 20.6 deg at 70m, out over the water
      lookOffset: from(trailer, 0, 1.5, 0),
    },
    {
      at: within(3, 0.75),
      offset: from(trailer, 69.65, 30, 21.92), // 19.4 deg at 66m, through the far portal
      lookOffset: from(trailer, 0, 1.5, 0),
    },
    {
      at: within(3, 1.0),
      offset: from(trailer, 58.64, 22, 17.05), // 18.4 deg at 54m, back down to the road
      lookOffset: from(trailer, 0, 1.5, 0),
    },

    /* Straight up. The camera stops going around the vehicle and starts going
       over it, and the bearing is held the whole way — -11.31° at every rung,
       because -9.8/49, -8/40 and -7.2/36 are all -11/55. The ascent is
       therefore a pure vertical move: nothing swings, the truck only recedes.
       That is what "zoom out upward" has to mean in a rig whose framings are
       bearings around a subject.
     *
     * The look target stays on the trailer, so however high this gets, the
     * camera is still pointed at the vehicle.
     *
     * The climb is deliberately quick — 0.18 to 0.26 for 310m — because the
     * altitude is not the point. It is the fare, and the satellites are what it
     * buys. Getting there slowly would spend the page on the journey.
     *
     * These heights are before the per-breakpoint DISTANCE multiplier, which
     * scales all three components — so a phone climbs 2.5x higher on the same
     * bearing. Nothing downstream reads a hardcoded altitude for that reason;
     * the cloud fade and the fog both work off where the camera actually is. */
    {
      at: within(4, 0.2),
      offset: from(trailer, 49.17, 150, 13.82), // 18.3° absolute, into the deck
      lookOffset: trailer.clone(),
    },

    /* On station, and held for a fifth of the page — the longest beat in the
     * scene by some way, and the one everything else is arranged around.
     *
     * These two are the satellite window. The uplink reaches full strength at
     * 240m and the camera is above 330m at both ends, so the pair is present
     * and framed for the whole of 0.26–0.46 rather than passing through a
     * single instant. Two framings for that, and not one, for the same reason
     * the pause at +13° needed two: one keyframe is an instant, and a value is
     * only held across an interval if both ends of it say so.
     *
     * Bearing is identical at both — -7.2/36 and -8/40 are both -0.2 — so the
     * hold is exact. The camera still creeps up and in across it, because a
     * frozen frame reads as a stalled render, and there is packet traffic
     * running on the beams that wants watching. */
    {
      at: within(4, 0.35),
      offset: from(trailer, 41.58, 330, 11.3), // 18.3° absolute, on station
      lookOffset: trailer.clone(),
    },
    {
      at: within(4, 0.7),
      offset: from(trailer, 38.73, 345, 10.36), // 18.3° absolute, held
      lookOffset: trailer.clone(),
    },

    /* And back down, to be on the ground before the vehicle gets to the bays.
     *
     * The descent gets 0.46–0.57 against the climb's 0.18–0.26. Deliberately
     * the slower of the two: the climb is a transition to be got through, and
     * this one has to hand the page back to the road, put the camera on the
     * ground and pick the rotation up again without any of those reading as
     * three separate events.
     *
     * The bearing is free to move again here, and does: -11° to -20° to -44°,
     * still decreasing, so the rig's single-crossing invariant survives a
     * manoeuvre that goes up and comes back. Coming down on a different bearing
     * from the one it went up on is also what stops the descent looking like
     * the climb played backwards. */
    {
      at: within(4, 0.88),
      offset: from(trailer, 44, 130, 9.35), // +12°, back down through the deck
      lookOffset: trailer.clone(),
    },
    // On the ground and turning again — the early rotation picking up exactly
    // where the climb interrupted it, while the vehicle runs its last stretch
    // toward the bays.
    {
      at: within(4, 1),
      offset: from(trailer, 47.53, 19, 6.68), // +8° at 48m, on the ground
      lookOffset: trailer.clone(),
    },

    /* ---- The fuel stop. The only scene where the vehicle is not moving. ----
     *
     * Bearings stay shallow and positive — +7 down to +4 — so the camera is
     * almost in front of the nose, off to the pump side. That is what keeps the
     * forecourt and the vehicle both in frame without one standing in front of
     * the other: at these angles the station reads as beside the truck rather
     * than behind or across it.
     *
     * The radius closes from 50m to 44m while it stands, and opens to 52m as it
     * pulls away. The camera also rides low — 8m against the 12-20m the rest of
     * the scene uses — because a fuel stop watched from above is a roof, and
     * what has to read here is a person beside a vehicle. Coming in is what makes a 1.8m figure legible at all; going
     * back out is what hands the road back. Written as bearing-and-radius for
     * the same reason the approach is — holding x and solving z for an angle
     * quietly shortens the shot.
     *
     * The aim shifts forward off the trailer to the cab, since the door and
     * the pumps are both up that end and the box behind is not the subject
     * here. */
    {
      at: within(5, 0.18),
      offset: from(trailer, 49.63, 12, 6.09), // +7° at 50m, slowing in
      lookOffset: from(trailer, 6, 1, 0),
    },
    {
      at: within(5, 0.4),
      offset: from(trailer, 43.76, 8, 4.6), // +6° at 44m, standing at the pump
      lookOffset: from(trailer, 8, 0.5, 0),
    },
    {
      at: within(5, 0.72),
      offset: from(trailer, 43.83, 8, 3.83), // +5° at 44m, held while refuelling
      lookOffset: from(trailer, 8, 0.5, 0),
    },
    {
      at: within(5, 1),
      offset: from(trailer, 51.87, 12, 3.63), // +4° at 52m, pulling away
      lookOffset: from(trailer, 6, 1, 0),
    },

    // Quiet road travel: a gentle tracking shot with no stop or new activity.
    {
      at: within(6, 0.35),
      offset: orbit(trailer, 52, 15, -5),
      lookOffset: from(trailer, 3, 0.5, 0),
    },
    {
      at: within(6, 1),
      offset: orbit(trailer, 52, 18, -22),
      lookOffset: trailer.clone(),
    },

    // Continue the same orbit into the approach: +4° at the station exit,
    // -22° at the end of the open road, then -44° on arrival. Sin/cos offsets
    // preserve the radius as the camera crosses the nose and comes around.
    {
      at: within(7, 0.35),
      offset: orbit(trailer, 52, 19, -30),
      lookOffset: trailer.clone(),
    },
    {
      at: within(7, 0.7),
      offset: orbit(trailer, 53, 20, -38),
      lookOffset: trailer.clone(),
    },
    /* Arrived. The vehicle reaches the bays exactly here — driveTo runs it to
       TRUCK_TO at scroll 1, and TRUCK_TO is where the facility stands — so the
       page ends on the arrival rather than watching it from altitude or having
       already driven past it.
     *
     * The aim leaves the trailer for the first time since the crossing, to take
     * in the buildings the truck has arrived at. */
    {
      at: within(7, 1),
      offset: orbit(trailer, 54, 21, -44),
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

  /* Far plane at 1500, not the 600 the other scenes use. This world has
     terrain a kilometre long standing 470m out to each side, and from the apex
     its far corners are 762m away — the old plane was simply deleting them, and
     no amount of tuning the hills would have brought back geometry the frustum
     had already thrown out. Near stays at 0.5 because the camera flies through
     cloud sprites; 0.5/1500 is still comfortable for a 24-bit depth buffer. */
  const camera = new THREE.PerspectiveCamera(28, aspect, 0.5, 1500);

  /* No shared buildGrid here: it is 460m across, and its edge is precisely the
     thing this scene must not show. `proceduralGround` is the same idea sized
     against the fog instead. */

  /* The ground the journey happens on. Both walk the same ROUTE and grid the
     rest of the scene is placed against, so neither can disagree with what
     drives over it. Added before everything else so they read as the floor. */
  const carriageway = proceduralCarriageway(palette);
  scene.add(carriageway.object3D);

  const bridgeRoute = routeAt(within(BRIDGE_SCENE, 0.5));
  const riverPosition = ROUTE.getPointAt(bridgeRoute);
  const riverHeading = headingAt(bridgeRoute);
  const ground = proceduralGround(palette, { position: riverPosition, heading: riverHeading });
  scene.add(ground.object3D);

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

  const factory = proceduralFactory(palette);
  placeOnRoute(factory.object3D, TRUCK_FROM);
  factory.object3D.position.x -= 11;
  scene.add(factory.object3D);

  const trees = proceduralTrees(
    palette,
    // Leave the frontage clear where the facility meets the road.
    [
      ...treePlacements({ from: 0.02, to: 0.94, clearings: [[WAREHOUSE_AT, 0.025], [STATION_AT, 0.025]] }),
      ...treePlacements({ from: 0.035, to: 0.94, verge: 36, spread: 10, seed: 0x71ee, clearings: [[WAREHOUSE_AT, 0.03], [STATION_AT, 0.028]] }),
    ].filter(({ position }) =>
      !(position.x < ROUTE.getPointAt(TRUCK_FROM).x - 18 && position.x > ROUTE.getPointAt(TRUCK_FROM).x - 70 && position.z < 2 && position.z > -30) &&
      Math.abs(Math.cos(riverHeading) * (position.x - riverPosition.x) - Math.sin(riverHeading) * (position.z - riverPosition.z)) > 25,
    ),
  );
  scene.add(trees.object3D);

  /* The forecourt, and the person. Placed on the route like the warehouse, so
     neither knows where it stands — only how far along and how far aside. */
  const station = proceduralStation(palette);
  placeOnRoute(station.object3D, STATION_AT, STATION_OFFSET);
  scene.add(station.object3D);
  const driver = createDriver(palette);
  const driverFrame = new THREE.Group();
  placeOnRoute(driverFrame, STATION_AT);
  driverFrame.add(driver.object3D);
  scene.add(driverFrame);

  /* The loader, parked where the vehicle starts. Its own +x points at the
     trailer's flank, which is a quarter turn off the route's — hence the extra
     rotation. Placed once: the truck does not move while it is working, which
     is the whole reason the drive profile holds it still. */
  const forklift = proceduralForklift(palette);
  /* At the trailer's rear doors, pointing up its axis — placed by hand rather
     than with placeOnRoute, because the rear is 17m behind the vehicle and the
     vehicle starts at route 0.02, which leaves no curve to sit on. Same
     transform placeOnRoute would apply, resolved for a point behind the truck
     instead of beside it. */
  {
    const at = ROUTE.getPointAt(TRUCK_FROM);
    const h = headingAt(TRUCK_FROM);
    forklift.object3D.position.set(
      at.x - Math.cos(h) * TRAILER_REAR_BACK,
      0,
      at.z + Math.sin(h) * TRAILER_REAR_BACK,
    );
    forklift.object3D.rotation.y = h;
  }
  scene.add(forklift.object3D);

  const bridge = proceduralBridge(palette);
  placeOnRoute(bridge.object3D, routeAt(within(BRIDGE_SCENE, 0.5)), 0);
  scene.add(bridge.object3D);
  const bridgeAt = bridge.object3D.position.clone();

  const warehouse = proceduralWarehouse(palette, quality.rackCount);
  placeOnRoute(warehouse.object3D, WAREHOUSE_AT, WAREHOUSE_OFFSET);
  // Turn the dock to face the carriageway the truck arrives on.
  warehouse.object3D.rotation.y += Math.PI / 2;
  scene.add(warehouse.object3D);

  /* The deck sits in world space and stays put — it is weather, not scenery
     belonging to the vehicle. The uplink is the opposite: built in the truck's
     own frame and dropped onto it each frame, so the pair keeps station over a
     vehicle that is still driving. */
  const clouds = proceduralClouds(palette);
  scene.add(clouds.object3D);

  const uplink = proceduralUplink(palette);
  scene.add(uplink.object3D);

  let baseFogDensity = palette.fogDensity;

  const follow: Follow = { position: new THREE.Vector3(), heading: 0 };

  function driveTo(progress: number) {
    const t = routeAt(progress);
    // Straight down its own line, never across it. An earlier version ramped
    // a lateral offset in over the last stretch to reach the dock, which slid
    // the truck sideways while it stayed pointed along the road — a
    // crab-walk, not a drive. The bays are on this line instead, so arriving
    // is pure forward motion and the truck is already square with the pair it
    // parks between.
    placeOnRoute(truck.object3D, t, 0);
    // Pitch the rigid vehicle to the average road grade across its wheelbase.
    const back = ROUTE.getPointAt(Math.max(0, t - 12 / ROUTE.getLength()));
    const front = ROUTE.getPointAt(Math.min(1, t + 3 / ROUTE.getLength()));
    truck.object3D.rotation.order = 'YXZ';
    truck.object3D.rotation.z = Math.atan2(front.y - back.y, Math.hypot(front.x - back.x, front.z - back.z));
    truck.object3D.position.y = back.y + (front.y - back.y) * 0.8;
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

  const assets: SceneAsset[] = [truck, ...parked, warehouse, trees, factory];
  let progress = 0;
  let lastRoute = routeAt(0);
  const closePosition = new THREE.Vector3();
  const closeTarget = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();

  return {
    scene,
    camera,
    setProgress(next) {
      progress = next;
      rig.setProgress(next);
    },
    update(elapsed, delta) {
      driveTo(progress);
      // Distance-driven wheels stop with scrolling, reverse when rewinding,
      // and stay still throughout both loading and the driver walk.
      const route = routeAt(progress);
      truck.update?.(0, (route - lastRoute) * ROUTE.getLength() / (0.56 * 2.4), progress);
      // The asset's idle animation resets y; retain the road grade instead.
      truck.object3D.position.y = follow.position.y;
      lastRoute = route;
      const fuel = (progress - SCENE_START[FUEL_SCENE]) / SCENE_SPAN[FUEL_SCENE];
      const pose = fuelStopPose(fuel);
      truck.setDriverDoor(pose.door);
      driver.update(pose, reduced);
      rig.update(elapsed, delta);
      // A driver-side insert during the stop. The original journey rig keeps
      // running underneath, so the satellite descent and depot sweep retain
      // their authored framings on either side of this close view.
      const closeWeight = smoothstep(ramp(fuel, [0.18, 0.30])) * (1 - smoothstep(ramp(fuel, [0.76, 0.94])));
      if (closeWeight > 0) {
        camera.getWorldDirection(cameraTarget);
        cameraTarget.multiplyScalar(camera.position.distanceTo(follow.position)).add(camera.position);
        const scale = DISTANCE[bucket];
        const cos = Math.cos(follow.heading), sin = Math.sin(follow.heading);
        closePosition.set(
          follow.position.x + (18 * cos + 13 * sin) * scale,
          7.5 * scale,
          follow.position.z + (-18 * sin + 13 * cos) * scale,
        );
        closeTarget.set(follow.position.x + cos + 3.8 * sin, 1.8, follow.position.z - sin + 3.8 * cos);
        camera.position.lerp(closePosition, closeWeight);
        camera.lookAt(cameraTarget.lerp(closeTarget, closeWeight));
      }
      /* The load, over its own scene — and the doors with it. They open ahead
         of the loader arriving and shut behind it leaving, so the pallet is
         never seen passing through a closed panel and the vehicle never drives
         off with its back open. */
      const loading = (progress - SCENE_START[1]) / SCENE_SPAN[1];
      forklift.setStage(loading);
      truck.setDoors(
        loading <= 0 || loading >= 1
          ? 0
          : loading < 0.12
            ? loading / 0.12
            : loading < 0.86
              ? 1
              : 1 - (loading - 0.86) / 0.14,
      );

      // The bridge, on approach and departure rather than on scroll.
      bridge.setStrength(1 - ramp(follow.position.distanceTo(bridgeAt), BRIDGE_FADE));


      /* Ride the uplink on the vehicle. Position and heading only — no roll or
         pitch to inherit, since the truck has none. */
      uplink.object3D.position.copy(follow.position);
      uplink.object3D.rotation.y = follow.heading;

      /* Everything below keys off the camera's actual altitude and distance
         rather than off scroll progress. Those two are the same thing on a
         desktop, and are not on a phone, where the per-breakpoint multiplier
         puts the camera two and a half times higher for the same scroll. */
      const altitude = camera.position.y;
      clouds.setStrength(ramp(altitude, CLOUD_FADE));
      uplink.setStrength(ramp(altitude, UPLINK_FADE));
      clouds.update(reduced ? 0 : elapsed);
      uplink.update(elapsed);

      const fog = scene.fog as THREE.FogExp2;
      const distance = camera.position.distanceTo(follow.position);
      fog.density = Math.min(baseFogDensity, HAZE_BUDGET / Math.max(distance, 1));
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
      for (const asset of assets) asset.setPalette(next);
      carriageway.setPalette(next);
      ground.setPalette(next);
      forklift.setPalette(next);
      bridge.setPalette(next);
      clouds.setPalette(next);
      station.setPalette(next);
      driver.setPalette(next);
      uplink.setPalette(next);
      const fog = scene.fog as THREE.FogExp2;
      fog.color.copy(next.fog);
      /* Record the new ceiling but do not write the density: `update` derives
         it from where the camera is, and setting it here would snap the haze
         back to its ground-level value for one frame at any altitude. */
      baseFogDensity = next.fogDensity;
    },
    dispose() {
      driver.dispose();
      carriageway.dispose();
      ground.dispose();
      forklift.dispose();
      bridge.dispose();
      clouds.dispose();
      station.dispose();
      uplink.dispose();
      for (const asset of assets) asset.dispose();
      disposeObject(scene);
      scene.clear();
    },
  };
};
