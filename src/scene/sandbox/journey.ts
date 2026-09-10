import { within } from "./scenes";
import { DRIVER_STOP_FROM, DRIVER_STOP_TO } from "./fuelStop";

export const TRUCK_FROM = 0.02;
export const TRUCK_TO = 0.612;

/* The drive, written as a speed profile rather than as a position curve.
 *
 * Every earlier version mapped scroll to route position linearly, which is
 * exactly right for a vehicle that never stops and useless for one that does.
 * Expressing the stop as position keyframes makes it easy to place and very
 * hard to shape: the deceleration, the dwell and the pull-away each have to be
 * eased by hand, and every mistake shows up as the truck twitching.
 *
 * A speed profile inverts that. Speed is 1 while running and 0 while standing,
 * with a smooth ramp either side, and integrating it gives the position curve
 * for free. The integral is normalised, so the vehicle still arrives at the
 * bays on the final beat no matter how long the stop is made — lengthening the
 * dwell slows the rest of the drive rather than overshooting the yard. */
/* The vehicle is parked for the first two scenes — the camera's opening turn
   and the whole of the load — and only pulls away once the road scene starts.
   Two stops in one drive, then, and the profile below is what makes that a
   description rather than a special case. */
const ROAD_SCENE = 2;

/* The bridge, at the middle of its own scene — derived from the drive, like the
   station, so retiming the page moves the river with the truck
   rather than stranding a span in a field. */
export const BRIDGE_SCENE = 3;

/* How far off the bridge has to be before it is gone, measured from the
   vehicle. The scene is only about 35m of travel, so without this a landmark
   would sit in the distance across most of the page — a 124m truss did exactly
   that, which is what made it feel like it belonged to every scene at once.
   Fully there within 30m, gone by 85: it comes into view as an approach and
   leaves as a departure. */
export const BRIDGE_FADE = [30, 85] as const;

/** How far behind the vehicle's origin its rear doors are, in metres. */
export const TRAILER_REAR_BACK = 17.4;
const ROLLING_FROM = within(ROAD_SCENE, 0.04);
const ROLLING_TO = within(ROAD_SCENE, 0.2);

export const FUEL_SCENE = 5;
const DECEL_FROM = within(FUEL_SCENE, 0.1);
export const STOPPED_FROM = within(FUEL_SCENE, DRIVER_STOP_FROM);
const STOPPED_TO = within(FUEL_SCENE, DRIVER_STOP_TO);
const ACCEL_TO = within(FUEL_SCENE, 0.94);

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function speedAt(p: number) {
  // Standing while it is loaded, then pulling away.
  if (p <= ROLLING_FROM) return 0;
  if (p < ROLLING_TO) {
    return smoothstep((p - ROLLING_FROM) / (ROLLING_TO - ROLLING_FROM));
  }
  // Running, until the fuel stop takes it down and lets it go again.
  if (p <= DECEL_FROM || p >= ACCEL_TO) return 1;
  if (p >= STOPPED_FROM && p <= STOPPED_TO) return 0;
  if (p < STOPPED_FROM) {
    return 1 - smoothstep((p - DECEL_FROM) / (STOPPED_FROM - DECEL_FROM));
  }
  return smoothstep((p - STOPPED_TO) / (ACCEL_TO - STOPPED_TO));
}

/* Distance covered by scroll position, as a normalised lookup. Built once —
   integrating per frame would be silly, and the profile never changes. */
const DRIVE_SAMPLES = 512;
const DRIVE_CURVE = (() => {
  const covered = new Float32Array(DRIVE_SAMPLES + 1);
  let total = 0;
  for (let i = 1; i <= DRIVE_SAMPLES; i += 1) {
    total += speedAt((i - 0.5) / DRIVE_SAMPLES) / DRIVE_SAMPLES;
    covered[i] = total;
  }
  for (let i = 0; i <= DRIVE_SAMPLES; i += 1) covered[i] /= total;
  return covered;
})();

/** Where on the route the vehicle is, at a scroll position. */
export function routeAt(progress: number) {
  // Hold an identical route sample throughout the dwell, including its edges.
  const held = progress >= STOPPED_FROM && progress <= STOPPED_TO ? (STOPPED_FROM + STOPPED_TO) / 2 : progress;
  const p = Math.min(1, Math.max(0, held)) * DRIVE_SAMPLES;
  const i = Math.min(DRIVE_SAMPLES - 1, Math.floor(p));
  const f = p - i;
  const covered = DRIVE_CURVE[i] + (DRIVE_CURVE[i + 1] - DRIVE_CURVE[i]) * f;
  return TRUCK_FROM + (TRUCK_TO - TRUCK_FROM) * covered;
}

