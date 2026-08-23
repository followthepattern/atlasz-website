/* The sandbox's running order.
 *
 * A scene is one beat of the story with a share of the scroll. Framings are
 * authored *within* a scene — 0 at its start, 1 at its end — rather than as
 * absolute scroll positions, which is the whole point of this file: adding a
 * scene, or resizing one, re-times every framing after it instead of requiring
 * the entire sequence to be retyped. That had already happened four times.
 *
 * `span` is a weight, not a promise. Three scenes at 0.35 want 1.05 of a scroll
 * that only has 1.00, so the numbers are normalised below and what each scene
 * actually gets is its share of the total. Written as 0.35 anyway because the
 * intent — "these two are equals, that one is a little shorter" — survives
 * adding a fourth scene, where absolute figures would not.
 */

export type SandboxScene = {
  name: string;
  /** Relative share of the scroll. Normalised against the others. */
  span: number;
};

export const SCENES: SandboxScene[] = [
  /* Half a scene, because nothing happens in it but looking. The vehicle is
     stationary and the camera does the whole of its opening rotation here —
     a full-length scene of a parked truck being circled would be a title card
     that outstays itself. */
  { name: "the opening", span: 0.175 },
  // The vehicle is still stationary; the forklift does the work.
  { name: "loading", span: 0.35 },
  // And now it drives. This scene is the drive and nothing else.
  { name: "the road", span: 0.35 },
  // A truss bridge over a river — the one thing it goes through, not past.
  { name: "the bridge", span: 0.35 },
  { name: "the uplink", span: 0.35 },
  // The longest of the four: it is the only one where the vehicle stops, and a
  // stop needs room on both sides of it to read as one — slowing, standing,
  // and pulling away are three things, not one.
  { name: "the fuel stop", span: 0.45 },
  { name: "the approach", span: 0.3 },
];

const TOTAL = SCENES.reduce((sum, scene) => sum + scene.span, 0);

/** Normalised width of each scene, in scroll. */
export const SCENE_SPAN = SCENES.map((scene) => scene.span / TOTAL);

/** Scroll position each scene starts at. Same length as SCENES. */
export const SCENE_START = SCENE_SPAN.reduce<number[]>(
  (starts, span, i) => [...starts, starts[i] + span],
  [0],
).slice(0, SCENES.length);

/**
 * A scroll position inside a scene: `t` runs 0 at its start to 1 at its end.
 *
 * Every framing in the world is placed through this, so none of them carries an
 * absolute scroll position and none has to be touched when the running order
 * changes.
 */
export function within(scene: number, t: number): number {
  return SCENE_START[scene] + SCENE_SPAN[scene] * t;
}

/** Which scene a scroll position falls in, and how far through it is. */
export function sceneAt(progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  let index = SCENES.length - 1;
  for (let i = 0; i < SCENES.length; i += 1) {
    if (p < SCENE_START[i] + SCENE_SPAN[i]) {
      index = i;
      break;
    }
  }
  return {
    index,
    number: index + 1,
    count: SCENES.length,
    name: SCENES[index].name,
    /** How far through this scene, 0 to 1. */
    local: (p - SCENE_START[index]) / SCENE_SPAN[index],
  };
}
