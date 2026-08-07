# Immersive 3D scroll experience — design

Date: 2026-08-07
Branch: `experiment/immersive-3d-scroll`
Status: approved, ready for implementation planning

## Goal

Replace the hand-drawn SVG Europe map in the hero with a real-time WebGL scene,
and layer cinematic scroll motion over the existing landing page. The result
should feel like a futuristic logistics operating system: glowing wireframe
vehicles, floating glass panels, particle-driven data flow, and camera movement
that carries the visitor through the page.

This is an **experiment**. `main` keeps the current site untouched so the two can
be compared and this branch can be discarded at no cost.

## Scope

**Keep, unchanged in meaning:**

- Every Hungarian and English string. No copywriting, no new `t()` keys, no
  translation debt.
- Section order: hero → RouteEconomics → Features → Onboarding → Integrations →
  References → Footer.
- The lead funnel (`intro → quiz → form → success`), its validation, and the
  `POST /api/subscribe` call.
- The `#privacy` route.
- The existing UI primitives in `src/components/ui/` and the semantic theme
  tokens in `src/styles/globals.css`.

**Replace:**

- `src/components/MapHero.tsx` and `src/components/europeMap.ts` are deleted.
  The SVG map, its coastline data, and the `.route-flow` keyframes in
  `globals.css` go with them.

**Add:**

- A persistent WebGL canvas behind the whole page with a scroll-driven camera.
- Smooth scrolling, section reveals, staggered typography, parallax.
- Glassmorphism treatment on existing panels.

**Explicitly out of scope:**

- Photoreal GLTF assets. None exist in the repo and none are authored here. The
  scene is procedural; see "Asset strategy".
- Changing what the page says or how it converts.

## Architecture

Two new directories. Existing components receive wiring, not rewrites.

```
src/scene/                  WebGL. No React state, no copy, no i18n.
  SceneCanvas.tsx           fixed canvas, renderer, RAF loop, context-loss guard
  world.ts                  assembles truck + route + warehouse + particles
  assets/truck.ts           proceduralTruck() → SceneAsset
  assets/warehouse.ts       proceduralWarehouse() → SceneAsset
  assets/particles.ts       instanced point field, count from quality tier
  cameraRig.ts              keyframes[] + damped interpolation; input: progress
  quality.ts                device tier → DPR cap, particle count, FX on/off

src/motion/                 DOM motion. No Three.js import.
  ScrollProvider.tsx        Lenis instance; drives ScrollTrigger, publishes progress
  useReveal.ts              section reveal with staggered children
  SplitText.tsx             word-split staggered typography, i18n- and SR-safe
  usePrefersReducedMotion.ts  hoisted from RouteEconomics.tsx
  tokens.ts                 DURATION / EASE constants
```

### The seam between them

`src/scene/` and `src/motion/` communicate through exactly one value: a
normalized scroll progress in `[0, 1]`, published by `ScrollProvider` and
consumed by `cameraRig`. Nothing else crosses.

Consequences that make this worth holding to:

- The scene can be developed and tuned against a debug slider, with no scrolling
  and no page.
- Deleting `src/scene/` leaves a working animated site. Deleting `src/motion/`
  leaves a working static site with a live canvas.
- Neither directory needs to be read to understand the other.

### Asset strategy

`assets/truck.ts` exports `proceduralTruck()`. Every asset module returns the
same shape:

```ts
type SceneAsset = {
  object3D: THREE.Object3D;
  bounds: THREE.Box3;
  anchorPoints: Record<string, THREE.Vector3>;  // camera targets, particle emitters
};
```

The procedural implementation builds a cab and trailer from extruded profiles,
derives glowing edges with `EdgesGeometry`, and instances the wheels. A future
`gltfTruck(url)` returning the same `SceneAsset` can replace it without any
change to `world.ts` or `cameraRig.ts`. `cameraRig` positions itself from
`anchorPoints`, never from hardcoded coordinates, so swapping the model does not
invalidate the choreography.

The wireframe look is the intended aesthetic, not a stand-in for missing
realism.

## Scene content and camera choreography

The world holds: the truck, a shader-driven ground grid that fades with
distance, a route line, a warehouse shell with `InstancedMesh` racking, and a
particle field.

Camera keyframes map to the existing sections. Progress values are
approximate and get tuned against the real document height during
implementation; section boundaries are read from the DOM rather than hardcoded.

| progress | section | framing |
|---|---|---|
| 0.00 | Hero | low three-quarter on the cab, headlights lit |
| 0.25 | RouteEconomics | pull back and up, route line ignites across the grid |
| 0.48 | Features | slow orbit, wireframe separates and reassembles |
| 0.62 | Onboarding | tracking shot alongside the trailer |
| 0.80 | Integrations | warehouse, particles streaming truck ↔ dock |
| 0.95 | References | wide, static, truck departing |

The camera damps toward the scroll-derived target rather than binding to it
directly. That inertia is what separates cinematic movement from scrubbing.

## Motion system

Lenis owns scrolling and drives ScrollTrigger. All timing lives in
`src/motion/tokens.ts`:

```ts
export const DURATION = { short: 0.6, base: 0.8, long: 1.2 };  // seconds
export const EASE = {
  out:   "cubic-bezier(0.16, 1.00, 0.30, 1.00)",  // entrances — fast start, long settle
  inOut: "cubic-bezier(0.65, 0.00, 0.35, 1.00)",  // camera moves, cross-fades
};
export const CAMERA_DAMPING = 0.075;  // per-frame lerp toward scroll target
```

Every animation references these. Retuning the feel is one file.

Glassmorphism is added as a `.glass` utility in `globals.css`, composed from the
existing `--surface` / `--hairline` tokens. No new color system is introduced.

## Changes to existing components

- **`App.tsx`** — wraps the tree in `ScrollProvider`, mounts `SceneCanvas`,
  renders the new `Hero`. Funnel logic is untouched.
- **`Hero.tsx`** (new) — the badge, headline, subtitle and CTA currently inline
  in `App.tsx:128-144`, rendered over the canvas with `SplitText` on the
  headline. Same `t()` keys.
- **`RouteEconomics.tsx`** — currently 658 lines containing its own animation
  engine (chat replay, capture replay, tab cross-fade, chained `setTimeout`).
  Split into `RouteEconomics/{index,EconomicsView,ChatView,CaptureView}.tsx`
  **before** any scroll wiring is added. Adding ScrollTrigger to a file that
  large, already running timers, invites triggers and timers fighting in code
  too big to debug. Behaviour is preserved exactly; this is a move, not a
  rewrite.
- **Features, Onboarding, Integrations, References** — wrapped in `useReveal`,
  panels get `.glass`. No structural change. The Integrations orbit layout from
  `2026-07-03-integrations-orbit-design.md` is kept as-is and layered, not
  replaced.

## Failure modes designed against

Each of these silently breaks the page if left to the end.

**Typography splitting vs. i18n and assistive tech.** Per-character splitting
mangles Hungarian diacritics and renders headings unusable to screen readers.
`SplitText` splits on **words**; the wrapper carries the intact string as
`aria-label` and the split spans are `aria-hidden`. It re-splits when the
`t()` value changes identity — otherwise the language switcher leaves stale,
already-animated markup on screen.

**ScrollTrigger staleness.** Stage transitions (`intro → quiz → form`), the
`#privacy` route, and language switches all change document height.
`ScrollTrigger.refresh()` must run after each. This is the most likely source of
subtle breakage.

**Battery and heat.** A permanently mounted canvas rendering at 60fps forever is
a laptop killer. The loop pauses on `document.hidden` and throttles when the
camera has no pending movement.

**Reduced motion.** Under `prefers-reduced-motion: reduce`: Lenis is disabled,
the camera snaps between static framings instead of flying, stagger becomes
instant. The scene still renders — it stops moving. The single hoisted
`usePrefersReducedMotion` is the only source of this signal.

**No WebGL, or context loss.** The canvas degrades to a static CSS gradient.
Hero copy and the CTA never depend on the canvas having mounted.

**Light mode.** The site is dark-first, but light mode is reachable via
`localStorage['atlasz-theme']` (`index.html:31`). Glowing wireframes on `#ffffff`
look broken. The scene observes the `.dark` class on `documentElement` and swaps
to a dark-line, no-bloom palette in light mode.

**The funnel must keep converting.** Quiz, form, success and `#privacy` are why
the site exists. On those stages the canvas settles to a quiet ambient framing
and the form renders exactly as it does today.

## Performance budget

Current production build: 358 KB raw / 116 KB gzip.

Added, gzip, approximate: Three.js tree-shaken ~150 KB, GSAP + ScrollTrigger
~30 KB, Lenis ~5 KB. Roughly **+185 KB gzip**.

Mitigation: `src/scene/` is loaded through a dynamic `import()`. Hero copy and
the CTA paint on the original bundle; the canvas fades in when the scene module
resolves. The funnel never waits on WebGL.

Accepted for an experiment. If this branch is ever considered for production,
the budget question reopens — the page's only conversion is an email field, and
+185 KB against that trade deserves a deliberate decision rather than
inheritance.

## Verification

The project has no test suite. `npm run build` (`tsc --noEmit && vite build`) is
the gate, plus manual checks:

- Funnel completes: intro → form → success, with validation errors firing.
- `#privacy` renders and returns home.
- Language switch mid-scroll leaves no stale split text and no misplaced
  triggers.
- `prefers-reduced-motion: reduce` disables movement, page stays usable.
- Light mode is legible.
- WebGL disabled: page renders, CTA works.
- Mobile viewport: no horizontal scroll, acceptable frame rate.
