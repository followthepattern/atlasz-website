/** Local progress within scene 6; the existing journey owns truck movement. */
export const DRIVER_STOP_FROM = 0.3;
export const DRIVER_STOP_TO = 0.76;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const beat = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const smooth = (v: number) => v * v * (3 - 2 * v);

export function fuelStopPose(progress: number) {
  const p = clamp(progress);
  const exit = smooth(beat(p, 0.34, 0.39));
  const outward = beat(p, 0.39, 0.50);
  const returning = beat(p, 0.59, 0.69);
  const enter = smooth(beat(p, 0.69, 0.73));
  const away = outward - returning;
  return {
    visible: p > 0.34 && p < 0.73,
    door: smooth(beat(p, DRIVER_STOP_FROM, 0.34)) * (1 - smooth(beat(p, 0.73, DRIVER_STOP_TO))),
    x: 0.95 + 1.25 * away,
    y: 0.06 + 1.15 * (1 - exit + enter),
    z: 1.42 + 1.23 * (exit - enter) + 5.45 * away,
    yaw: Math.atan2(1.25, 5.45) * smooth(beat(p, 0.39, 0.40)) + Math.PI * smooth(beat(p, 0.56, 0.59)),
    distance: Math.hypot(1.25, 5.45) * (outward + returning),
    gait: smooth(beat(p, 0.39, 0.405)) * (1 - smooth(beat(p, 0.485, 0.50)))
      + smooth(beat(p, 0.59, 0.605)) * (1 - smooth(beat(p, 0.675, 0.69))),
    walking: (p > 0.39 && p < 0.50) || (p > 0.59 && p < 0.69),
    phase: p < DRIVER_STOP_FROM ? 'Approaching the fuel station'
      : p < 0.34 ? 'Parked · opening the door'
      : p < 0.39 ? 'Driver stepping down'
      : p < 0.50 ? 'Walking to the pumps'
      : p < 0.56 ? 'At the fuel pumps'
      : p < 0.59 ? 'Turning back'
      : p < 0.69 ? 'Returning to the truck'
      : p < 0.73 ? 'Driver climbing aboard'
      : p < DRIVER_STOP_TO ? 'Closing the door' : 'Leaving for the depot',
  };
}
