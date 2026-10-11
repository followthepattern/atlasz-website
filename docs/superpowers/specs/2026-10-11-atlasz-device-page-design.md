# ATLASZ device page — design

## Goal

A standalone page at `/device` that introduces the **ATLASZ device**: a small
computer installed in a tractor unit that reads the vehicle's data and sends it
to ATLASZ. Inspired by the "kit" demo at
lab.patrickheintzmann.com/demo/demoFormula, but deliberately simple: an
auto-playing animation with a replay button. No driving, no physics, no
scroll choreography.

Success: a visitor lands on `/device`, watches the device click into a Scania
tractor and the data start flowing within ~10 seconds, and understands what
the device does from three short bullets — in English or Hungarian.

## What the visitor sees

A dark stage (the site's existing `scene-backdrop` and palette) with the
procedural Scania S-series tractor unit, **without the trailer**, slowly
orbited by the camera. Copy sits in a left column; the truck sits right of
centre (stacked on mobile: copy above, scene behind).

One timeline, ~9 s, plays once on load and again on **Replay**:

| Time      | Beat |
|-----------|------|
| 0 – 1.5 s | Truck settles in; slow orbit begins. |
| 1.5 – 3 s | Cab panels fade to translucent; camera eases toward the dashboard. |
| 3 – 4.5 s | The ATLASZ device (small box, accent LED) drops in and clicks into place behind the dashboard. LED turns on. |
| 4.5 – 7 s | Glowing lines draw from data sources to the device: engine, fuel tank, wheel/axle, tachograph. A small HTML label appears at each source: Speed, Fuel level, RPM, Odometer, GPS, Driver & tacho. |
| 7 – 9 s   | Pulses travel from the device up to an "ATLASZ" marker above the cab. Camera eases back to the wide shot. |
| rest      | Idle: lines keep pulsing gently, orbit continues. |

**Reduced motion:** no timeline, no orbit — render the final installed state
(translucent cab, device lit, lines and labels visible) and hide Replay.

**No WebGL / context lost:** `useSceneGate` already falls back to the gradient;
the copy stands on its own.

## Copy (EN / HU)

Added under a new `device` key in `src/i18n/locales/{en,hu}.json`:

- eyebrow: "ATLASZ device" / "ATLASZ eszköz"
- headline: "Your trucks, talking to ATLASZ." / "A kamionjaid, közvetlenül az ATLASZ-ban."
- bullets:
  - "Plugs into the truck's FMS / CAN interface in minutes." / "Percek alatt csatlakozik a jármű FMS / CAN interfészére."
  - "Reads live vehicle and tachograph data: speed, fuel, RPM, odometer, GPS, driver activity." / "Élőben olvassa a jármű- és tachográfadatokat: sebesség, üzemanyag, fordulatszám, km-óra, GPS, vezetői aktivitás."
  - "Sends it to ATLASZ automatically — no manual entry, no extra telematics contract." / "Automatikusan küldi az ATLASZ-ba — kézi rögzítés és külön telematikai szerződés nélkül."
- data labels: Speed / Sebesség, Fuel level / Üzemanyagszint, RPM / Fordulatszám, Odometer / Km-óra, GPS / GPS, Driver & tacho / Vezető és tachográf
- replay: "Replay" / "Újra"
- cta: "Get early access" / "Korai hozzáférés" → `/subscribe`

Final wording can be tuned in review; the structure is what matters here.

## Architecture

Follows the pattern of `DeckLayout` / `SandboxLayout`: a sibling layout with
its own canvas, so the landing scene is untouched and this chunk is lazy-loaded.

- `src/routes.tsx` — new sibling route `{ element: <DeviceLayout />, children: [{ path: "device", element: <DevicePage /> }] }`.
- `src/layouts/DeviceLayout.tsx` — renders `<DeviceScene />` + `<Outlet />`; sets
  document title/meta for the page (`device.meta.*`) and restores on unmount.
  Indexed (it is a product page), linked from nowhere for now.
- `src/pages/DevicePage.tsx` — copy column, language switcher, Replay button,
  CTA, and the overlay layer for the data labels.
- `src/scene/device/DeviceScene.tsx` / `DeviceSceneCanvas.tsx` — same shape as
  the deck's: `useSceneGate`, lazy canvas, `useSceneHost(createDeviceScene)`.
- `src/scene/device/world.ts` — `createDeviceScene(context): SceneInstance`.
  Owns camera, truck, device, data lines, and a GSAP timeline driven by
  wall-clock time (ignores `setProgress`).
- `src/scene/device/device.ts` — the device mesh (box + LED + edges), built
  from `materials.ts` like the other assets.
- `src/scene/device/controller.ts` — a tiny module-level channel between the
  React page and the scene: `replay()` and `onLabels(cb)` (projected
  screen positions + visibility per data label each frame). Needed because
  `SceneFactory` only receives a `SceneContext`; this avoids widening that
  shared contract.

Change to an existing asset:

- `src/scene/assets/truck.ts` — `proceduralTruck(palette, { trailer = true } = {})`.
  Trailer parts go into their own sub-group that is omitted when
  `trailer: false`; new anchor points `dashboard`, `engine`, `fuelTank`,
  `driveAxle`, `tacho` for the device scene to aim at. Existing callers are
  unchanged.

Labels are HTML (positioned from projected anchors) rather than in-canvas text,
so they are crisp, translatable and readable by screen readers as a list.

## Testing

- `npm run build` (typecheck + bundle) passes.
- Manual check in the browser: EN and HU, desktop and phone width, dark and
  light theme, Replay mid-animation, reduced motion, landing page unaffected.
- No new unit tests: the logic is a timeline with no branching worth testing
  in isolation.

## Out of scope

Volvo cab model, driving/physics, scroll choreography, linking the page from
site navigation, real device specs or pricing.
