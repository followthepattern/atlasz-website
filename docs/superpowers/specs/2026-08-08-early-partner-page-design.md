# Early Partner Program page + page-per-file routing — design

Date: 2026-08-08
Branch: `experiment/immersive-3d-scroll`
Status: approved, ready for implementation planning

## Goal

Bring the standalone Early Partner Program deck
(`~/projects/atlasz/web/public/atlasz-early-partner.html`) into this site as a
scroll-driven page carrying the same 3D scene as the landing page, and split the
app's routes into one file per page along the way.

The deck is presented live during a demo. That is its only use: one version, one
language, a landscape presenter screen.

## Scope

**Part 1 — routing refactor.** `src/App.tsx` is 316 lines that route, own the
entire lead funnel, and compose the landing page. Split into one file per page.
No visual or behavioural change to the landing page, the funnel's validation, or
`POST /api/subscribe`.

**Part 2 — the Early Partner page.** The deck's five slides become five scroll
sections. Every Hungarian string carried over verbatim.

**Part 3 — a second camera journey.** The deck page is shorter than the landing
page, so the truck gets a shorter run and a calmer camera.

**Out of scope:**

- Keyboard / clicker navigation, fullscreen, print-to-PDF. The deck's presenter
  machinery is dropped; this is a page you scroll.
- English copy. The page is Hungarian only, with no i18n keys.
- Mobile-specific tuning of the new page. It is presented on a landscape screen.
- Any link to the new page from the landing page. It is unlisted.
- New copy. Nothing is written that the deck did not already say.

## Part 1 — routing refactor

### Structure

```
src/router.ts              Route union, useRoute(), navigate()
src/pages/
  LandingPage.tsx          TruckOverlay + Hero + RouteEconomics + Features
                           + Onboarding + Integrations + References + Footer
  SubscribePage.tsx        quiz → form → success; funnel state, validation,
                           subscribe(); header + LanguageSwitcher + Footer
  PrivacyPage.tsx          route binding for the self-contained Privacy
  EarlyPartnerPage.tsx     Part 2
src/App.tsx                route switch + SceneBackdrop + useDocumentMeta
```

### `src/router.ts`

A hand-rolled hash router — no new dependency, and the same mechanism `#privacy`
already uses.

```ts
export type Route = "landing" | "subscribe" | "privacy" | "early-partner";
export function useRoute(): Route;      // subscribes to hashchange
export function navigate(route: Route): void;
```

`navigate("landing")` clears the hash with `history.replaceState` and scrolls to
top, preserving today's `goHome` behaviour. Unknown hashes resolve to
`"landing"`.

### What moves where

- The funnel's six `useState` hooks, `EMAIL_RE`, `QUIZ_ENABLED`, `validateForm`,
  `handleSubmit` and the three stage branches move verbatim into
  `SubscribePage.tsx`. The `intro` stage disappears — reaching the funnel is now
  a route, not a stage. The remaining stages are `quiz | form | success`, local
  to the page.
- `Hero`'s `onStart` becomes `navigate("subscribe")`; `onHome` becomes
  `navigate("landing")`.
- Each page decides its own footer. Landing and Subscribe render the shared
  `Footer`; `Privacy` keeps the reduced one it already carries — a legal page
  should not carry the site nav that links back to itself — and the Early
  Partner deck has none.
- `App` keeps `useDocumentMeta()`, the route switch, `<SceneBackdrop>`, and
  `useScrollRefresh([route, i18n.language])`. The `stage` dependency is gone
  from the refresh — `SubscribePage` owns its own `useScrollRefresh([stage])`,
  because it is the thing whose height changes.

### Behaviour change, accepted

The funnel gains a URL (`#subscribe`). Back and reload now work; previously a
reload dropped the visitor back to the landing page. Typed answers are not
persisted across a reload.

### Scene framing per route

`SceneBackdrop` takes two independent props: `ambient` (park the camera at a
fixed progress) and `journey` (which choreography to drive). Per route:

| route | `journey` | `ambient` |
|---|---|---|
| `landing` | `landingJourney` | `false` |
| `subscribe` | `landingJourney` | `true` |
| `privacy` | `landingJourney` | `true` |
| `early-partner` | `deckJourney` | `false` |

This matches today's rule — the funnel and `#privacy` park the camera because
those pages are a form, not a scroll — and adds the deck as a second page that
drives its scene.

## Part 2 — the Early Partner page

Route `#early-partner`. `src/pages/EarlyPartnerPage.tsx`, Hungarian strings
hardcoded in the component, no `t()` calls, no `LanguageSwitcher`, no `Footer`.

### Sections

Five full-height sections. Copy sits in a left band, `max-w-2xl`, over the
existing `.ambient-scrim`, leaving the right and lower frame to the truck.

| § | Eyebrow | Content |
|---|---|---|
| 1 | `Atlasz Demo · 2026` | Brandrow (lettermark tile + `atlasz` wordmark); h1 "AI-alapú fuvarmenedzsment rendszer" |
| 2 | `Bemutatkozás` | h2 "Huszka Csaba"; lead; two bullets |
| 3 | `A termék` | h2 "Mi az atlasz?"; the italic quote; the bold lead; four cards; mono footnote |
| 4 | `Következik` | h1 "Élő bemutató." — nothing else |
| 5 | `Együttműködés` | h2 "Early Partner Program"; lead; *Mit várunk?* / *Mit biztosítunk?* cards; mono footnote |

Section 4 is a deliberately near-empty frame. In the deck it was a spoken beat;
here the scene carries it.

Section 5 ends on the contract footnote. There is no CTA — the deck had none.

### Built from what exists

- `Heading` / `Text` from `src/components/ui/`, `.glass` for cards, the
  `--muted` / `--hairline` tokens. The deck's own card and eyebrow styling is
  already near-identical to the site's, so this is a translation of markup, not
  a redesign. The deck's `<style>` block is dropped entirely.
- `useReveal` supplies the per-section stagger that the deck's `.stagger`
  keyframes did.
- `SplitText` on the two large headings (§1 h1, §5 h2).
- The lettermark is the existing `public/favicon.svg` — the same glyph the deck
  inlined — rendered in a bordered tile.

### Progress rail

A slim scroll-progress rail, bottom-centre, with an `01 / 05` counter. The one
piece of the deck's chrome worth keeping, since the page is driven live. It
reads from the existing scroll store rather than introducing state.

## Part 3 — a scene per layout

> Superseded during implementation. The original design gave both pages one
> world and varied only the camera, via a `Journey` passed to a shared
> `createWorld`. That is the wrong seam: the deck is going to grow its own
> stations and depots, and under a shared world every building added for the
> deck would have appeared on the marketing page too.

`SceneCanvas` is a host and nothing more — renderer, frame loop, visibility
pause, fade-in, all of it true of any scene. Everything on screen, the camera
included, belongs to the scene module it is handed.

```
src/scene/
  types.ts            SceneContext / SceneInstance / SceneFactory / SceneName
  SceneCanvas.tsx     the host; resolves a scene by name from the registry
  SceneBackdrop.tsx   WebGL availability gate
  cameraRig.ts        interpolation + damping; framings passed in
  road.ts             shared kit: route curve, ground grid, treeline
  assets/             shared model library
  scenes/
    index.ts          the registry, behind the lazy boundary
    landing.ts        the marketing world + its six framings
    deck.ts           the deck world + its four framings
```

`scenes/landing.ts` and `scenes/deck.ts` are independent. They are built from
the same kit today, so they look similar — that duplication is the price of
letting either diverge without touching the other, and is the point rather
than an oversight.

Shared is a toolkit, never a world. `road.ts` takes the treeline's extent and
its clearings as options, because the two scenes travel different stretches of
the same road.

### What each scene owns

| | landing | deck |
|---|---|---|
| route span | 0.30 → 0.612 | 0.45 → 0.612 |
| framings | 6 | 4 |
| aim bias | none | 0.28 of view distance, pushing the truck right of the copy |
| treeline | 0.18 → 0.78 | 0.34 → 0.78 |
| readout anchoring | publishes `truckScreen` | none |

The deck page is roughly half the landing page's height and scroll progress is
normalised against document height, so the shorter route span is what keeps
motion-per-scrolled-pixel comparable rather than doubled.

The deck's title framing sits above the treeline. Standing far enough back to
frame the whole rig puts the camera among conifers that scatter to 34 m off the
centreline, with one square in the lens at that point on the route; dropping in
closer only trades it for a wall of trailer.

### Scenes are named, not imported

Layouts pass a `SceneName` string. A layout importing a factory pulls Three.js
with it and puts ~150 KB gzip on the critical path — the main bundle reached
323 kB gzip against a 150 kB baseline before this was caught. The registry sits
behind the same lazy boundary as the renderer.

### One canvas per scene

`SceneBackdrop` keys the canvas on the scene name, and the two scene-owning
layouts are siblings, so navigating between the site and the deck unmounts one
canvas and mounts another. This is load-bearing: building a second renderer over
a live WebGL context raises `INVALID_OPERATION` on every frame after, with
nothing thrown and nothing logged.

`renderer.forceContextLoss()` looks like the right teardown and is **not** used.
StrictMode's double-invoke runs cleanup against a canvas React then mounts
again, and a renderer built over a force-lost context throws into the `onLost`
path, disabling the scene for the session. Dropping the detached canvas is
enough — verified over twenty site/deck swaps with no context lost.

## Verification

1. `npm run typecheck` and `npm run build` clean, with Three.js in the
   `SceneCanvas` chunk rather than the entry bundle.
2. `/` — hero, all six sections, floating readouts, camera sweep unchanged.
3. `/subscribe` — form validates, submit reaches `subscribe()`; back returns.
4. `/privacy` — renders with its reduced footer; canvas shared with `/subscribe`.
5. `/early-partner` — five sections, every deck string, own canvas, own title
   and `lang="hu"`, both restored on leaving.
6. No console errors and no `[cameraRig:*]` bearing warning on any route.
