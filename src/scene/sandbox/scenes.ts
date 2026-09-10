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

export type SceneContent =
  | { kind: "opening" }
  | { kind: "explanation"; title: string; body: string }
  | { kind: "partner-program" }
  | { kind: "none" };

export type SandboxScene = {
  name: string;
  /** Relative share of the scroll. Normalised against the others. */
  span: number;
  /** What the partner presentation shows during this scene. */
  content: SceneContent;
};

export const SCENES: SandboxScene[] = [
  /* Half a scene, because nothing happens in it but looking. The vehicle is
     stationary and the camera does the whole of its opening rotation here —
     a full-length scene of a parked truck being circled would be a title card
     that outstays itself. */
  { name: "the opening", span: 0.175, content: { kind: "opening" } },
  // The vehicle is still stationary; the forklift does the work.
  {
    name: "loading",
    span: 0.35,
    content: {
      kind: "explanation",
      title: "A fuvar a rakodásnál kezdődik.",
      body: "A rakomány elindul, a hozzá tartozó dokumentumok pedig egy helyre kerülnek. Az automatikus dokumentumkezelés segít átláthatóan kezelni a fuvar adminisztrációját.",
    },
  },
  // And now it drives. This scene is the drive and nothing else.
  {
    name: "the road",
    span: 0.315,
    content: {
      kind: "explanation",
      title: "Úton a rakomány. Kézben a feladatok.",
      body: "Az atlasz egy felületen fogja össze a fuvarszervezéshez kapcsolódó munkát. Az AI-alapú automatizációval kevesebb idő megy el az ismétlődő adminisztrációra.",
    },
  },
  // A truss bridge over a river — the one thing it goes through, not past.
  {
    name: "the bridge",
    span: 0.35,
    content: {
      kind: "explanation",
      title: "A fuvar költségei, egy helyen.",
      body: "Útdíjak, üzemanyag és a fuvarhoz kapcsolódó egyéb költségek: az atlasz központi helyen gyűjti őket, hogy átlátható legyen, miből áll össze egy fuvar költsége.",
    },
  },
  {
    name: "the uplink",
    span: 0.35,
    content: {
      kind: "explanation",
      title: "GPS és FMS: kapcsolat a flottával.",
      body: "Követjük a teherautók GPS- és FMS-adatait. A járművek helyzete és üzemi adatai egy felületen érhetők el, így a fuvarszervezők átláthatják, mi történik útközben.",
    },
  },
  // The longest of the four: it is the only one where the vehicle stops, and a
  // stop needs room on both sides of it to read as one — slowing, standing,
  // and pulling away are three things, not one.
  {
    name: "the fuel stop",
    span: 0.45,
    content: {
      kind: "explanation",
      title: "A legjobb útvonalat keressük.",
      body: "Optimalizáljuk az útvonalakat, hogy megtaláljuk az adott fuvarhoz legjobban illeszkedő megoldást. A megállók és a továbbhaladás is az útvonalterv részei.",
    },
  },
  // An uninterrupted stretch of driving after refuelling.
  { name: "the open road", span: 0.245, content: { kind: "none" } },
  { name: "the approach", span: 0.3, content: { kind: "partner-program" } },
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
