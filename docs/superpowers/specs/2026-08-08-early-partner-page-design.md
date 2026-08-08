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
  PrivacyPage.tsx          Privacy + Footer
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
- Each page decides its own `Footer`. Landing, Subscribe and Privacy render one;
  the Early Partner deck does not. This also fixes an existing inconsistency:
  `Privacy` is currently the only route that should have a footer and lacks one.
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

## Part 3 — a second camera journey

`cameraRig.ts` currently holds both the mechanism (interpolation, damping,
local→world transform, the single-crossing assertion) and the choreography (the
six-framing table and its portrait math). Only the choreography differs between
the two pages, so it moves out.

### `src/scene/journeys.ts`

```ts
export type Journey = {
  truckFrom: number;   // route t at scroll 0
  truckTo: number;     // route t at scroll 1
  buildFramings(anchors: Record<string, THREE.Vector3>, aspect: number): Framing[];
};
export const landingJourney: Journey;
export const deckJourney: Journey;
```

`landingJourney` is today's `TRUCK_FROM` / `TRUCK_TO` and the current
`buildFramings` body **moved verbatim**. The landing page must come out
bit-for-bit identical; the rig's own invariant comment is emphatic about not
drifting framings that have already been signed off.

`world.ts` and `cameraRig.ts` take a `Journey` instead of module constants.
`SceneBackdrop` gains a `journey` prop, defaulting to `landingJourney`.

### `deckJourney`

Route span **0.45 → 0.612** rather than 0.30 → 0.612. The truck still arrives at
the bays, but travels roughly half the distance. Because scroll progress is
normalised against document height, and the deck page is roughly half the
landing page's height, this keeps motion-per-scrolled-pixel close to the landing
page instead of doubling it.

Four framings, no portrait math (landscape presenter screen only):

| at | § | framing | bearing |
|---|---|---|---|
| 0 | Title | Close profile, ATLASZ livery square to camera, truck low-right | ≈ +95° |
| 0.36 | Intro / product | Pull back and up, still facility side | ≈ +30° |
| 0.70 | Élő bemutató | The single crossing, past the nose | ≈ −15° |
| 1 | Early Partner | Arrival: truck between the two parked units, warehouse behind | ≈ −50° |

Bearings decrease monotonically, so `assertSingleCrossing` still passes: the
camera changes sides exactly once.

## Verification

1. `npm run typecheck` clean.
2. Landing page at `#` — hero, all six sections, funnel CTA, truck framing and
   camera sweep visually unchanged from before the refactor.
3. `#subscribe` — quiz disabled, form validates, submit path reaches
   `subscribe()`; back button returns to the landing page.
4. `#privacy` — renders, back link works, now has a footer.
5. `#early-partner` — all five sections, every deck string present, truck
   arrives at the bays by the last section, no `[cameraRig]` warning in the
   console.
6. No console errors on any route; scene survives switching between routes
   without a context leak.
