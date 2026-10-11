# ATLASZ Device Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone `/device` page where an ATLASZ device clicks into a Scania tractor unit and the truck's data starts flowing to ATLASZ, as a ~9 s animation that plays on load and on Replay.

**Architecture:** A sibling layout with its own lazy-loaded canvas, same as `DeckLayout`/`SandboxLayout`. The scene's animation comes from a pure `devicePhase(t)` function, so it can be tested in Node and reduced motion is just `t = end`. A small module-level channel lets the React page ask for a replay and receive projected label positions, so the shared `SceneFactory` contract stays the same.

**Tech Stack:** React 19, react-router 7, react-i18next, three 0.185, Tailwind, `node --test` with tsx.

**Spec:** `docs/superpowers/specs/2026-10-11-atlasz-device-page-design.md`

## Global Constraints

- Route path is exactly `/device`; the landing scene and other routes are untouched.
- Tractor only: `proceduralTruck(palette, { trailer: false })`. Existing callers (`proceduralTruck(palette)`) must behave exactly as before.
- Unlit, palette-driven materials only (`materials.ts`). No additive blending, no emissive materials, no new dependencies.
- All visible copy in both `en.json` and `hu.json` under `device.*`.
- Reduced motion: final installed state, no orbit, no pulses moving, no Replay button.
- Data labels are HTML, not canvas text.
- `npm run build` and `npm test` pass.

## Review Focus

- Replay pressed mid-animation → restarts from t=0 cleanly; no stacked timers. (Channel test in Task 2.)
- Theme toggled mid-animation → the x-ray opacity is recomputed from the new palette, so the cab doesn't snap back to solid or stay stuck. (World code in Task 4 rebases on `setPalette`; manual check in Task 6.)
- Language switched on `/device` → labels, copy and `<title>` update in place. (Manual check in Task 6.)
- Navigating `/device` → `/` → the device canvas is disposed, no labels are left on screen, and the landing meta title comes back. (Manual check in Task 6.)
- Times outside the timeline (negative, far past the end) → phases are clamped to [0,1]. (Timeline test in Task 2.)

---

### Task 1: Tractor-only truck with device anchors

**Files:**
- Modify: `src/scene/assets/truck.ts`
- Create: `src/scene/assets/truck.test.ts`
- Modify: `package.json` (test script)

**Interfaces:**
- Produces: `proceduralTruck(palette: ScenePalette, options?: { trailer?: boolean }): SceneAsset`. With any options, `anchorPoints` always includes `dashboard`, `engine`, `fuelTank`, `driveAxle`, `frontWheel`, `tacho`, `roofTop`. `trailer`, `rear` and `roof` exist only when `trailer` is true.

- [ ] **Step 1: Write the failing test** — `src/scene/assets/truck.test.ts`

```ts
import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import type { ScenePalette } from "../palette";
import { proceduralTruck } from "./truck";

const palette = (): ScenePalette => ({
  line: new THREE.Color(0xe8e8e8),
  lineDim: new THREE.Color(0x777777),
  accent: new THREE.Color(0xffffff),
  fill: new THREE.Color(0x111111),
  glass: new THREE.Color(0x181818),
  grid: new THREE.Color(0x444444),
  fog: new THREE.Color(0x080808),
  fillOpacity: 0.92,
  lineOpacity: 0.72,
  glassOpacity: 0.8,
  gridOpacity: 0.2,
  fogDensity: 0.015,
});

const DEVICE_ANCHORS = ["dashboard", "engine", "fuelTank", "driveAxle", "frontWheel", "tacho", "roofTop"];

test("tractor-only truck stops behind the drive axle", () => {
  const truck = proceduralTruck(palette(), { trailer: false });
  assert.ok(truck.bounds.min.x > -4.5, `rear at ${truck.bounds.min.x}`);
  assert.ok(truck.bounds.max.x < 3.5, `front at ${truck.bounds.max.x}`);
  truck.dispose();
});

test("tractor-only truck exposes the device anchors and no trailer anchors", () => {
  const truck = proceduralTruck(palette(), { trailer: false });
  for (const name of DEVICE_ANCHORS) {
    const point = truck.anchorPoints[name];
    assert.ok(point, `missing anchor ${name}`);
    assert.ok(truck.bounds.clone().expandByScalar(0.6).containsPoint(point), `${name} is off the truck`);
  }
  assert.equal(truck.anchorPoints.trailer, undefined);
  assert.equal(truck.anchorPoints.rear, undefined);
  truck.dispose();
});
```

(The default `trailer: true` path builds a canvas decal, which needs `document`, so it can't run under Node. `npm run build` covers its types instead.)

- [ ] **Step 2: Add the test to the script and run it to verify it fails**

In `package.json`, change the `test` script to:

```json
"test": "node --import tsx --test src/scene/sandbox/assets/atlaszBot.test.ts src/scene/assets/truck.test.ts src/scene/device/*.test.ts",
```

Run: `node --import tsx --test src/scene/assets/truck.test.ts`
Expected: FAIL. `min.x` is about -17.7 (the trailer is still built) and the anchors are missing.

- [ ] **Step 3: Implement** in `src/scene/assets/truck.ts`

3a. Change the decal import to also pull the type:

```ts
import { createTextDecal, type TextDecal } from "../decal";
```

3b. Change the signature and derive the per-call constants at the top of the function:

```ts
export function proceduralTruck(
  palette: ScenePalette,
  { trailer = true }: { trailer?: boolean } = {},
): SceneAsset {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  /* Without a trailer the chassis stops a little behind the drive axle, where a
     solo tractor's frame ends, rather than running on under nothing. */
  const chassisRear = trailer ? TRAILER_REAR : DRIVE_AXLE - 1.1;
  const axles = trailer ? AXLES : [FRONT_AXLE, DRIVE_AXLE];
```

3c. In the chassis loop, replace `TRAILER_REAR` with `chassisRear` (both occurrences in that `addBox` call).

3d. Wrap the whole `// --- Trailer ---` section (from `addBox([TRAILER_LENGTH, ...` through the mudflaps loop) in `if (trailer) { ... }`. Declare the decal before it as `let decal: TextDecal | null = null;` and inside the block assign `decal = createTextDecal("ATLASZ", palette.line);`. The `decalMaterial` uses `decal.texture`, which still type-checks inside the block because TypeScript narrows after the assignment.

3e. Replace `for (const x of AXLES)` with `for (const x of axles)`.

3f. Replace the `anchorPoints` object and the decal uses in `setPalette`/`dispose`:

```ts
    anchorPoints: {
      cab: new THREE.Vector3(1.3, 2.3, 0),
      hood: new THREE.Vector3(NOSE + 0.2, 1.7, 0),
      ...(trailer
        ? {
            trailer: new THREE.Vector3(TRAILER_MID, 2.5, 0),
            rear: new THREE.Vector3(TRAILER_REAR, 2.1, 0),
            roof: new THREE.Vector3(TRAILER_MID, 4.0, 0),
          }
        : {}),
      whole: bounds.getCenter(new THREE.Vector3()),
      // Where an in-cab device would sit and what it would read from.
      dashboard: new THREE.Vector3(2.2, 2.0, 0.35),
      engine: new THREE.Vector3(1.6, 1.05, 0),
      fuelTank: new THREE.Vector3(-1.5, 0.78, -1.16),
      driveAxle: new THREE.Vector3(DRIVE_AXLE, WHEEL_RADIUS, TRACK),
      frontWheel: new THREE.Vector3(FRONT_AXLE, WHEEL_RADIUS, TRACK),
      tacho: new THREE.Vector3(2.1, 2.35, -0.45),
      roofTop: new THREE.Vector3(1.0, ROOF + 0.25, 0),
    },
    setPalette(next) {
      applyPalette(materials, next);
      decal?.recolor(next.line);
    },
```

and in `dispose()` replace `decal.dispose();` with `decal?.dispose();`.

- [ ] **Step 4: Run tests and typecheck**

Run: `node --import tsx --test src/scene/assets/truck.test.ts && npx tsc --noEmit`
Expected: 2 tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/scene/assets/truck.ts src/scene/assets/truck.test.ts package.json
git commit -m "Add tractor-only option and device anchors to the truck asset"
```

---

### Task 2: Timeline, data sources and the page↔scene channel

**Files:**
- Create: `src/scene/device/timeline.ts`, `src/scene/device/timeline.test.ts`
- Create: `src/scene/device/sources.ts`
- Create: `src/scene/device/channel.ts`, `src/scene/device/channel.test.ts`

**Interfaces:**
- Produces:
  - `DEVICE_TIMELINE_END: number` (9)
  - `type DevicePhase = { settle: number; xray: number; zoom: number; drop: number; led: number; lines: number; labels: number[]; uplink: number }`
  - `devicePhase(t: number, labelCount: number): DevicePhase`, where every value is in [0,1]
  - `type DataSourceId = "speed" | "fuel" | "rpm" | "odometer" | "gps" | "tacho"`, `DATA_SOURCES: readonly { id: DataSourceId; anchor: string }[]`, `UPLINK_LABEL = "atlasz"`
  - `type LabelPosition = { id: string; x: number; y: number; opacity: number }`
  - `createDeviceChannel()` returning `{ replay(): void; onReplay(cb: () => void): () => void; publishLabels(labels: LabelPosition[]): void; onLabels(cb: (labels: LabelPosition[]) => void): () => void }`, plus a shared `deviceChannel` instance

- [ ] **Step 1: Write the failing tests**

`src/scene/device/timeline.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { DEVICE_TIMELINE_END, devicePhase } from "./timeline";

const scalars = (p: ReturnType<typeof devicePhase>) => [p.settle, p.xray, p.zoom, p.drop, p.led, p.lines, p.uplink, ...p.labels];

test("starts with nothing shown", () => {
  const p = devicePhase(0, 6);
  assert.deepEqual(scalars(p), new Array(13).fill(0));
});

test("ends installed, lit, connected and pulled back wide", () => {
  const p = devicePhase(DEVICE_TIMELINE_END, 6);
  assert.equal(p.xray, 1);
  assert.equal(p.drop, 1);
  assert.equal(p.led, 1);
  assert.equal(p.lines, 1);
  assert.equal(p.uplink, 1);
  assert.equal(p.zoom, 0);
  assert.deepEqual(p.labels, new Array(6).fill(1));
});

test("is close on the dashboard while the device goes in", () => {
  const p = devicePhase(4, 6);
  assert.equal(p.zoom, 1);
  assert.ok(p.drop > 0 && p.drop < 1);
});

test("labels appear one after another", () => {
  const p = devicePhase(5.6, 6);
  for (let i = 1; i < p.labels.length; i += 1) assert.ok(p.labels[i] <= p.labels[i - 1]);
  assert.ok(p.labels[0] > p.labels[5]);
});

test("clamps times outside the timeline", () => {
  for (const t of [-5, 1e6]) for (const v of scalars(devicePhase(t, 6))) assert.ok(v >= 0 && v <= 1);
  assert.deepEqual(devicePhase(1e6, 6), devicePhase(DEVICE_TIMELINE_END, 6));
});
```

`src/scene/device/channel.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createDeviceChannel } from "./channel";

test("replay reaches every subscriber until it unsubscribes", () => {
  const channel = createDeviceChannel();
  let a = 0;
  let b = 0;
  const stopA = channel.onReplay(() => (a += 1));
  channel.onReplay(() => (b += 1));
  channel.replay();
  stopA();
  channel.replay();
  assert.equal(a, 1);
  assert.equal(b, 2);
});

test("labels are delivered as published", () => {
  const channel = createDeviceChannel();
  const seen: unknown[] = [];
  const stop = channel.onLabels((labels) => seen.push(labels));
  const labels = [{ id: "speed", x: 10, y: 20, opacity: 0.5 }];
  channel.publishLabels(labels);
  stop();
  channel.publishLabels([]);
  assert.deepEqual(seen, [labels]);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --test src/scene/device/*.test.ts`
Expected: FAIL, with "Cannot find module './timeline'" and "Cannot find module './channel'".

- [ ] **Step 3: Implement**

`src/scene/device/timeline.ts`:

```ts
/* The device page's one animation, as a pure function of time.
 *
 * Seconds in, eased [0,1] values out. Keeping it pure is what lets the scene
 * jump straight to the end for reduced motion, restart for Replay by setting
 * t back to zero, and be tested without a renderer. */

export const DEVICE_TIMELINE_END = 9;

export type DevicePhase = {
  /** Camera dollies in from further out as the page opens. */
  settle: number;
  /** Cab panels fade to translucent. */
  xray: number;
  /** 0 = wide on the whole truck, 1 = close on the dashboard. */
  zoom: number;
  /** Device drops from above into its mount. */
  drop: number;
  led: number;
  /** Source-to-device lines drawing in. */
  lines: number;
  /** One per data label, staggered. */
  labels: number[];
  /** Device-to-ATLASZ line drawing in. */
  uplink: number;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Smoothstepped progress of t through [from, to]. */
function ramp(t: number, from: number, to: number) {
  const x = clamp01((t - from) / (to - from));
  return x * x * (3 - 2 * x);
}

const LABELS_FROM = 4.8;
const LABEL_STAGGER = 0.3;
const LABEL_FADE = 0.4;

export function devicePhase(t: number, labelCount: number): DevicePhase {
  return {
    settle: ramp(t, 0, 1.5),
    xray: ramp(t, 1.5, 3),
    zoom: ramp(t, 1.5, 3) * (1 - ramp(t, 7, 9)),
    drop: ramp(t, 3, 4.5),
    led: ramp(t, 4.3, 4.5),
    lines: ramp(t, 4.5, 6.5),
    labels: Array.from({ length: labelCount }, (_, i) =>
      ramp(t, LABELS_FROM + i * LABEL_STAGGER, LABELS_FROM + i * LABEL_STAGGER + LABEL_FADE),
    ),
    uplink: ramp(t, 7, 8.5),
  };
}
```

Check: the last label (i=5) runs from 6.3 to 6.7, which is inside the 9 s end, so every label is 1 at `END`. `zoom` at 9 is `1 * (1 - 1) = 0`.

`src/scene/device/sources.ts`:

```ts
/* What the device reads, and where on the truck it reads it from. The ids key
   both the i18n labels (`device.data.<id>`) and the scene's lines; `anchor`
   names a point in the truck asset's `anchorPoints`. */

export type DataSourceId = "speed" | "fuel" | "rpm" | "odometer" | "gps" | "tacho";

export const DATA_SOURCES: readonly { id: DataSourceId; anchor: string }[] = [
  { id: "speed", anchor: "driveAxle" },
  { id: "fuel", anchor: "fuelTank" },
  { id: "rpm", anchor: "engine" },
  { id: "odometer", anchor: "frontWheel" },
  { id: "gps", anchor: "roofTop" },
  { id: "tacho", anchor: "tacho" },
];

/** The label over the uplink's far end. Not translated: it is the brand. */
export const UPLINK_LABEL = "atlasz";
```

`src/scene/device/channel.ts`:

```ts
/* The device page and its scene talk through this, not through the scene
   factory. `SceneFactory` only receives a `SceneContext` and is shared by every
   canvas on the site; widening it for one page's Replay button would touch
   them all. */

export type LabelPosition = {
  id: string;
  /** CSS pixels from the canvas's top-left. */
  x: number;
  y: number;
  opacity: number;
};

export function createDeviceChannel() {
  const replays = new Set<() => void>();
  const labelers = new Set<(labels: LabelPosition[]) => void>();

  return {
    replay() {
      replays.forEach((cb) => cb());
    },
    onReplay(cb: () => void) {
      replays.add(cb);
      return () => {
        replays.delete(cb);
      };
    },
    publishLabels(labels: LabelPosition[]) {
      labelers.forEach((cb) => cb(labels));
    },
    onLabels(cb: (labels: LabelPosition[]) => void) {
      labelers.add(cb);
      return () => {
        labelers.delete(cb);
      };
    },
  };
}

export const deviceChannel = createDeviceChannel();
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass (atlaszBot, truck, timeline, channel).

- [ ] **Step 5: Commit**

```bash
git add src/scene/device
git commit -m "Add device page timeline, data sources and page-scene channel"
```

---

### Task 3: Device mesh and data lines

**Files:**
- Create: `src/scene/device/device.ts`
- Create: `src/scene/device/dataLines.ts`

**Interfaces:**
- Consumes: `panelFill`, `edgeMaterial`, `accentFill`, `edgesFor`, `lineSegments`, `applyPalette`, `disposeObject` from `../materials`; `ScenePalette`.
- Produces:
  - `proceduralDevice(palette): { object3D: THREE.Group; setLit(amount: number): void; setPalette(p: ScenePalette): void; dispose(): void }`
  - `createDataLines(palette, sources: THREE.Vector3[], device: THREE.Vector3, uplinkTo: THREE.Vector3): { object3D: THREE.Group; setDraw(lines: number, uplink: number): void; update(elapsed: number): void; setPalette(p: ScenePalette): void; dispose(): void }`

- [ ] **Step 1: Implement `device.ts`**

```ts
import * as THREE from "three";
import type { ScenePalette } from "../palette";
import { accentFill, applyPalette, disposeObject, edgeMaterial, edgesFor, lineSegments, panelFill } from "../materials";

/* The ATLASZ device: a small ribbed box with a status LED and a connector
   stub. Built larger than life (a real unit is palm-sized), because at the
   close framing a true-scale box is a handful of pixels behind the screen. */

const W = 0.5;
const H = 0.12;
const D = 0.32;

export function proceduralDevice(palette: ScenePalette) {
  const group = new THREE.Group();
  const fill = panelFill(palette);
  const edge = edgeMaterial(palette);
  const edgeDim = edgeMaterial(palette, true);
  const led = accentFill(palette);
  const materials: THREE.Material[] = [fill, edge, edgeDim, led];

  const body = new THREE.BoxGeometry(W, H, D);
  group.add(new THREE.Mesh(body, fill), edgesFor(body, edge));

  // Cooling ribs across the lid.
  const ribs: number[] = [];
  for (let x = -W / 2 + 0.08; x < W / 2 - 0.12; x += 0.05) {
    ribs.push(x, H / 2 + 0.001, -D / 2 + 0.05, x, H / 2 + 0.001, D / 2 - 0.05);
  }
  group.add(lineSegments(ribs, edgeDim));

  const ledGeometry = new THREE.BoxGeometry(0.05, 0.02, 0.05);
  ledGeometry.translate(W / 2 - 0.07, H / 2 + 0.01, D / 2 - 0.07);
  group.add(new THREE.Mesh(ledGeometry, led));

  // The connector that goes into the truck's FMS port.
  const plug = new THREE.BoxGeometry(0.08, 0.06, 0.14);
  plug.translate(-W / 2 - 0.04, 0, 0);
  group.add(new THREE.Mesh(plug, fill), edgesFor(plug, edgeDim));

  let lit = 0;
  const setLit = (amount: number) => {
    lit = amount;
    led.opacity = 0.12 + 0.88 * amount;
  };
  setLit(0);

  return {
    object3D: group,
    setLit,
    setPalette(next: ScenePalette) {
      applyPalette(materials, next);
      setLit(lit);
    },
    dispose() {
      disposeObject(group);
    },
  };
}
```

- [ ] **Step 2: Implement `dataLines.ts`**

```ts
import * as THREE from "three";
import type { ScenePalette } from "../palette";
import { accentFill, applyPalette, disposeObject, edgeMaterial } from "../materials";

/* Lines from each data source to the device, and one from the device up to
   ATLASZ, with pulses running along them once they are drawn.

   They are drawn over the truck (no depth test): the point is that data
   leaves the engine and tank and reaches the device, and lines hidden behind
   the cab can't show that. */

const SEGMENTS = 40;
const OVERLAY_ORDER = 4;

function curveLine(curve: THREE.Curve<THREE.Vector3>, material: THREE.LineBasicMaterial) {
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SEGMENTS));
  const line = new THREE.Line(geometry, material);
  line.renderOrder = OVERLAY_ORDER;
  return line;
}

export function createDataLines(
  palette: ScenePalette,
  sources: THREE.Vector3[],
  device: THREE.Vector3,
  uplinkTo: THREE.Vector3,
) {
  const group = new THREE.Group();
  const lineMaterial = edgeMaterial(palette);
  lineMaterial.depthTest = false;
  const pulseMaterial = accentFill(palette);
  pulseMaterial.depthTest = false;
  const materials: THREE.Material[] = [lineMaterial, pulseMaterial];

  // Arc up out of each source, so lines from low sources don't cut through the
  // chassis in a straight line.
  const curves: THREE.Curve<THREE.Vector3>[] = sources.map((from) => {
    const mid = from.clone().lerp(device, 0.5);
    mid.y = Math.max(from.y, device.y) + 0.8;
    return new THREE.QuadraticBezierCurve3(from.clone(), mid, device.clone());
  });
  const uplink = new THREE.LineCurve3(device.clone(), uplinkTo.clone());

  const sourceLines = curves.map((curve) => curveLine(curve, lineMaterial));
  const uplinkLine = curveLine(uplink, lineMaterial);
  group.add(...sourceLines, uplinkLine);

  // A ring at the far end of the uplink, under the ATLASZ label.
  const ringPoints = new THREE.EllipseCurve(0, 0, 0.35, 0.35).getPoints(32).map((p) => new THREE.Vector3(p.x, 0, p.y));
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPoints), lineMaterial);
  ring.position.copy(uplinkTo);
  ring.renderOrder = OVERLAY_ORDER;
  group.add(ring);

  const pulseGeometry = new THREE.SphereGeometry(0.06, 10, 8);
  const makePulse = () => {
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulse.renderOrder = OVERLAY_ORDER + 1;
    group.add(pulse);
    return pulse;
  };
  const sourcePulses = curves.map(makePulse);
  const uplinkPulses = [0, 1 / 3, 2 / 3].map(makePulse);

  let drawnLines = 0;
  let drawnUplink = 0;

  const setDraw = (lines: number, up: number) => {
    drawnLines = lines;
    drawnUplink = up;
    const count = (p: number) => Math.floor((SEGMENTS + 1) * p);
    for (const line of sourceLines) line.geometry.setDrawRange(0, count(lines));
    uplinkLine.geometry.setDrawRange(0, count(up));
    ring.visible = up >= 1;
    for (const pulse of sourcePulses) pulse.visible = lines >= 1;
    for (const pulse of uplinkPulses) pulse.visible = up >= 1;
  };

  const update = (elapsed: number) => {
    if (drawnLines >= 1) {
      curves.forEach((curve, i) => curve.getPoint((elapsed * 0.45 + i * 0.17) % 1, sourcePulses[i].position));
    }
    if (drawnUplink >= 1) {
      uplinkPulses.forEach((pulse, i) => uplink.getPoint((elapsed * 0.6 + i / 3) % 1, pulse.position));
    }
  };

  setDraw(0, 0);
  update(0);

  return {
    object3D: group,
    setDraw,
    update,
    setPalette(next: ScenePalette) {
      applyPalette(materials, next);
    },
    dispose() {
      disposeObject(group);
    },
  };
}
```

`update(0)` puts the pulses somewhere sensible before the first frame; reduced motion never calls `update` again, so the pulses stay there.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/device/device.ts src/scene/device/dataLines.ts
git commit -m "Add the ATLASZ device mesh and data lines"
```

---

### Task 4: Device scene world and canvas

**Files:**
- Create: `src/scene/device/world.ts`
- Create: `src/scene/device/DeviceSceneCanvas.tsx`
- Create: `src/scene/device/DeviceScene.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–3; `SceneFactory` from `../types`; `useSceneHost`, `useSceneGate`.
- Produces: `createDeviceScene: SceneFactory`, and `<DeviceScene />` (renders the backdrop plus the lazy canvas).

- [ ] **Step 1: Implement `world.ts`**

```ts
import * as THREE from "three";
import { proceduralTruck } from "../assets/truck";
import type { SceneFactory } from "../types";
import { deviceChannel, type LabelPosition } from "./channel";
import { createDataLines } from "./dataLines";
import { proceduralDevice } from "./device";
import { DATA_SOURCES, UPLINK_LABEL } from "./sources";
import { DEVICE_TIMELINE_END, devicePhase } from "./timeline";

/* The device page's world: one parked tractor, the device going into its cab,
   and its data leaving for ATLASZ. Driven by its own clock, not by scroll —
   the page doesn't scroll. */

const FOV = 30;
const WIDE = { distance: 15, height: 4.4 };
const CLOSE = { distance: 6.5, height: 3.4 };
/** Extra distance at t=0 that the opening dolly closes. */
const SETTLE_DISTANCE = 6;
/** Three-quarter front view, from the +Z flank. */
const ORBIT_CENTRE = 0.85;
const ORBIT_SWING = 0.45;
const ORBIT_SPEED = 0.12;
/** How far translucent the cab goes: 0.8 leaves a fifth of each panel. */
const XRAY_DEPTH = 0.8;
/** The device starts this far above its mount. */
const DROP_HEIGHT = 1.6;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Every fill/glass material on the truck, with the opacity the palette gave it. */
function collectShell(root: THREE.Object3D) {
  const seen = new Set<THREE.MeshBasicMaterial>();
  root.traverse((child) => {
    const material = (child as THREE.Mesh).material;
    if (!material || Array.isArray(material)) return;
    const kind = material.userData.kind;
    if (kind === "fill" || kind === "glass") seen.add(material as THREE.MeshBasicMaterial);
  });
  return [...seen].map((material) => ({ material, base: material.opacity }));
}

export const createDeviceScene: SceneFactory = ({ palette, reduced, aspect }) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 200);

  const rig = new THREE.Group();
  scene.add(rig);

  const truck = proceduralTruck(palette, { trailer: false });
  rig.add(truck.object3D);
  const anchors = truck.anchorPoints;

  const device = proceduralDevice(palette);
  rig.add(device.object3D);

  const uplinkTo = anchors.roofTop.clone().add(new THREE.Vector3(0, 2.4, 0));
  const lines = createDataLines(
    palette,
    DATA_SOURCES.map((source) => anchors[source.anchor]),
    anchors.dashboard,
    uplinkTo,
  );
  rig.add(lines.object3D);

  let shell = collectShell(truck.object3D);

  let t = reduced ? DEVICE_TIMELINE_END : 0;
  let swing = 0;
  let width = 1;
  let height = 1;

  const stopReplay = deviceChannel.onReplay(() => {
    if (!reduced) t = 0;
  });

  const target = new THREE.Vector3();
  const point = new THREE.Vector3();

  const project = (id: string, local: THREE.Vector3, opacity: number): LabelPosition => {
    point.copy(local);
    rig.localToWorld(point);
    point.project(camera);
    return {
      id,
      x: (point.x * 0.5 + 0.5) * width,
      y: (-point.y * 0.5 + 0.5) * height,
      // Behind the camera, projection flips the point onto the screen.
      opacity: point.z > 1 ? 0 : opacity,
    };
  };

  return {
    scene,
    camera,
    setProgress() {
      // Not a scroll page; the clock drives everything.
    },
    update(elapsed, delta) {
      if (!reduced) {
        t += delta;
        swing += delta;
      }
      const p = devicePhase(t, DATA_SOURCES.length);

      for (const { material, base } of shell) material.opacity = base * (1 - XRAY_DEPTH * p.xray);

      device.object3D.visible = p.drop > 0;
      device.object3D.position.copy(anchors.dashboard);
      device.object3D.position.y += (1 - p.drop) * DROP_HEIGHT;
      device.setLit(p.led);

      lines.setDraw(p.lines, p.uplink);
      if (!reduced) lines.update(elapsed);

      const orbit = ORBIT_CENTRE + Math.sin(swing * ORBIT_SPEED) * ORBIT_SWING;
      const distance = lerp(WIDE.distance, CLOSE.distance, p.zoom) + (1 - p.settle) * SETTLE_DISTANCE;
      target.lerpVectors(anchors.whole, anchors.dashboard, p.zoom);
      camera.position.set(
        target.x + Math.cos(orbit) * distance,
        lerp(WIDE.height, CLOSE.height, p.zoom),
        target.z + Math.sin(orbit) * distance,
      );
      camera.lookAt(target);
      camera.updateMatrixWorld();

      deviceChannel.publishLabels([
        ...DATA_SOURCES.map((source, i) => project(source.id, anchors[source.anchor], p.labels[i])),
        project(UPLINK_LABEL, uplinkTo, p.uplink),
      ]);
    },
    resize(w, h) {
      width = w;
      height = h;
      camera.aspect = w / h;
      /* The copy holds a left column on wide screens and the top of the page
         on narrow ones. Shift the rendered window so the truck sits right of
         centre, or lower down, instead of underneath the text. */
      if (w >= 1024) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
      else camera.setViewOffset(w, h, 0, -h * 0.14, w, h);
      camera.updateProjectionMatrix();
    },
    setPalette(next) {
      truck.setPalette(next);
      device.setPalette(next);
      lines.setPalette(next);
      // applyPalette restored full opacity; take the new values as the base.
      shell = collectShell(truck.object3D);
    },
    dispose() {
      stopReplay();
      deviceChannel.publishLabels([]);
      truck.dispose();
      device.dispose();
      lines.dispose();
    },
  };
};
```

`anchors[source.anchor]` is typed `THREE.Vector3` because `anchorPoints` is a `Record<string, THREE.Vector3>`. Task 1's test guarantees the names exist.

- [ ] **Step 2: Implement the canvas components** (same shape as `src/scene/deck/`)

`src/scene/device/DeviceSceneCanvas.tsx`:

```tsx
import { useSceneHost } from "../useSceneHost";
import { createDeviceScene } from "./world";

/** The device page's canvas. Its own chunk, so no other page fetches this world. */
export default function DeviceSceneCanvas({ onLost }: { onLost?: () => void }) {
  const canvasRef = useSceneHost(createDeviceScene, { onLost });

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
```

`src/scene/device/DeviceScene.tsx`:

```tsx
import { Suspense, lazy } from "react";
import { useSceneGate } from "../useSceneGate";

const DeviceSceneCanvas = lazy(() => import("./DeviceSceneCanvas"));

/** The gradient base layer, and the device scene over it when the GPU can carry one. */
export function DeviceScene() {
  const { show, onLost } = useSceneGate();

  return (
    <>
      <div className="scene-backdrop" aria-hidden="true" />
      {show ? (
        <Suspense fallback={null}>
          <DeviceSceneCanvas onLost={onLost} />
        </Suspense>
      ) : null}
    </>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/device/world.ts src/scene/device/DeviceScene.tsx src/scene/device/DeviceSceneCanvas.tsx
git commit -m "Add the device scene world and canvas"
```

---

### Task 5: Page, layout, labels, route, copy and meta

**Files:**
- Modify: `src/i18n/useDocumentMeta.ts`
- Modify: `src/i18n/locales/en.json`, `src/i18n/locales/hu.json`
- Create: `src/components/DeviceLabels.tsx`
- Create: `src/pages/DevicePage.tsx`
- Create: `src/layouts/DeviceLayout.tsx`
- Modify: `src/routes.tsx`

**Interfaces:**
- Consumes: `deviceChannel`, `DATA_SOURCES`, `UPLINK_LABEL`, `<DeviceScene />`.
- Produces: `useDocumentMeta(keyPrefix = "meta")`. Existing callers are unchanged.

- [ ] **Step 1: Let `useDocumentMeta` take a key prefix**

In `src/i18n/useDocumentMeta.ts`, change the hook to:

```ts
export function useDocumentMeta(keyPrefix = "meta") {
  const { t, i18n } = useTranslation();
  const lang = (supportedLngs as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLng)
    : "en";

  useEffect(() => {
    const title = t(`${keyPrefix}.title`);
    const description = t(`${keyPrefix}.description`);
```

Leave the rest of the effect body as it is, and add `keyPrefix` to its dependency array: `}, [t, lang, keyPrefix]);`.

- [ ] **Step 2: Add the copy**

Add a top-level `"device"` block to `src/i18n/locales/en.json`:

```json
  "device": {
    "meta": {
      "title": "ATLASZ device | Agentic TMS ecosystem",
      "description": "The ATLASZ device plugs into your tractor units and sends live vehicle and tachograph data to ATLASZ automatically."
    },
    "eyebrow": "ATLASZ device",
    "headline": "Your trucks, talking to ATLASZ.",
    "bullets": [
      "Plugs into the truck's FMS / CAN interface in minutes.",
      "Reads live vehicle and tachograph data: speed, fuel, RPM, odometer, GPS, driver activity.",
      "Sends it to ATLASZ automatically — no manual entry, no extra telematics contract."
    ],
    "dataHeading": "Data the device reads",
    "data": {
      "speed": "Speed",
      "fuel": "Fuel level",
      "rpm": "RPM",
      "odometer": "Odometer",
      "gps": "GPS",
      "tacho": "Driver & tacho"
    },
    "replay": "Replay",
    "cta": "Get early access"
  },
```

and the same block to `src/i18n/locales/hu.json`:

```json
  "device": {
    "meta": {
      "title": "ATLASZ eszköz | Agentic TMS ecosystem",
      "description": "Az ATLASZ eszköz a nyergesvontatókra csatlakozik, és automatikusan küldi az élő jármű- és tachográfadatokat az ATLASZ-ba."
    },
    "eyebrow": "ATLASZ eszköz",
    "headline": "A kamionjaid, közvetlenül az ATLASZ-ban.",
    "bullets": [
      "Percek alatt csatlakozik a jármű FMS / CAN interfészére.",
      "Élőben olvassa a jármű- és tachográfadatokat: sebesség, üzemanyag, fordulatszám, km-óra, GPS, vezetői aktivitás.",
      "Automatikusan küldi az ATLASZ-ba — kézi rögzítés és külön telematikai szerződés nélkül."
    ],
    "dataHeading": "Az eszköz által olvasott adatok",
    "data": {
      "speed": "Sebesség",
      "fuel": "Üzemanyagszint",
      "rpm": "Fordulatszám",
      "odometer": "Km-óra",
      "gps": "GPS",
      "tacho": "Vezető és tachográf"
    },
    "replay": "Újra",
    "cta": "Korai hozzáférés"
  },
```

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json'));JSON.parse(require('fs').readFileSync('src/i18n/locales/hu.json'))"`
Expected: no output (both files are valid JSON).

- [ ] **Step 3: Labels overlay** — `src/components/DeviceLabels.tsx`

```tsx
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { deviceChannel } from "@/scene/device/channel";
import { DATA_SOURCES, UPLINK_LABEL } from "@/scene/device/sources";

const IDS = [...DATA_SOURCES.map((source) => source.id), UPLINK_LABEL];

/**
 * The data labels, pinned to points on the truck.
 *
 * Positioned by writing styles directly from the scene's per-frame callback,
 * not through React state: six labels re-rendering at 60fps would be the
 * whole page's work for nothing. React renders the list once (and on a
 * language change), and the scene moves it.
 */
export function DeviceLabels() {
  const { t } = useTranslation();
  const refs = useRef(new Map<string, HTMLLIElement>());

  useEffect(
    () =>
      deviceChannel.onLabels((labels) => {
        const shown = new Set(labels.map((label) => label.id));
        for (const label of labels) {
          const el = refs.current.get(label.id);
          if (!el) continue;
          el.style.transform = `translate3d(${label.x}px, ${label.y}px, 0) translate(-50%, -140%)`;
          el.style.opacity = String(label.opacity);
        }
        // A disposed scene publishes nothing: hide anything it no longer places.
        refs.current.forEach((el, id) => {
          if (!shown.has(id)) el.style.opacity = "0";
        });
      }),
    [],
  );

  return (
    <ul aria-label={t("device.dataHeading")} className="pointer-events-none fixed inset-0 z-0">
      {IDS.map((id) => (
        <li
          key={id}
          ref={(el) => {
            if (el) refs.current.set(id, el);
            else refs.current.delete(id);
          }}
          style={{ opacity: 0 }}
          className={`absolute left-0 top-0 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[0.7rem] tracking-[0.06em] backdrop-blur ${
            id === UPLINK_LABEL
              ? "border-fg/40 bg-fg text-canvas"
              : "border-hairline bg-canvas/80 text-fg"
          }`}
        >
          {id === UPLINK_LABEL ? "ATLASZ" : t(`device.data.${id}`)}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Page** — `src/pages/DevicePage.tsx`

```tsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, buttonClasses } from "@/components/ui/Button";
import { DeviceLabels } from "@/components/DeviceLabels";
import { usePrefersReducedMotion } from "@/motion/usePrefersReducedMotion";
import { deviceChannel } from "@/scene/device/channel";

export function DevicePage() {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const bullets = t("device.bullets", { returnObjects: true }) as string[];

  return (
    <>
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-16 pt-10 lg:justify-center lg:pt-0">
        <div className="max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{t("device.eyebrow")}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-fg md:text-5xl">{t("device.headline")}</h1>
          <ul className="mt-6 space-y-3 text-sm text-muted md:text-base">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg/60" />
                {bullet}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/subscribe" className={buttonClasses("primary")}>
              {t("device.cta")}
            </Link>
            {reduced ? null : (
              <Button type="button" onClick={() => deviceChannel.replay()}>
                {t("device.replay")}
              </Button>
            )}
          </div>
        </div>
      </main>
      <DeviceLabels />
    </>
  );
}
```

- [ ] **Step 5: Layout** — `src/layouts/DeviceLayout.tsx`

```tsx
import { Link, Outlet } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useDocumentMeta } from "@/i18n/useDocumentMeta";
import { DeviceScene } from "@/scene/device/DeviceScene";

/**
 * The device page: its own scene and its own canvas, a sibling of the site and
 * the deck rather than a page inside either, so the landing scene is never
 * touched and this world is only fetched here.
 */
export function DeviceLayout() {
  useDocumentMeta("device.meta");

  return (
    <div className="flex min-h-full flex-col">
      <DeviceScene />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
        <Link to="/" className="text-lg font-semibold tracking-tight text-fg hover:opacity-80">
          ATLASZ
        </Link>
        <LanguageSwitcher />
      </header>
      <Outlet />
    </div>
  );
}
```

- [ ] **Step 6: Route** — in `src/routes.tsx`, add the imports

```tsx
import { DeviceLayout } from "@/layouts/DeviceLayout";
import { DevicePage } from "@/pages/DevicePage";
```

add `DeviceLayout` to the layout map comment as `DeviceLayout        the ATLASZ device page: its own scene, header only`, and add this sibling route before the `SandboxLayout` entry:

```tsx
      {
        element: <DeviceLayout />,
        children: [{ path: "device", element: <DevicePage /> }],
      },
```

- [ ] **Step 7: Build and test**

Run: `npm run build && npm test`
Expected: the build succeeds and all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/i18n src/components/DeviceLabels.tsx src/pages/DevicePage.tsx src/layouts/DeviceLayout.tsx src/routes.tsx
git commit -m "Add the /device page with animated ATLASZ device scene"
```

---

### Task 6: Browser verification and tuning

**Files:** whichever of `src/scene/device/world.ts` / `dataLines.ts` / `device.ts` need numeric tuning. No new files.

- [ ] **Step 1: Check against the running dev server** at `http://localhost:3001/device`. Go through this list and fix whatever fails:
  - The animation plays once on load. The device ends up visibly inside the cab, behind the windscreen; adjust `anchors.dashboard` in `truck.ts` if it isn't.
  - All 6 labels appear next to their source and none sits on top of the copy at 1440×900. Also check 390×844: the truck is below the copy and the labels are readable.
  - Replay restarts from the beginning, both mid-animation and after it ends.
  - EN ↔ HU switch: the copy, the labels and the tab title all update.
  - Dark ↔ light theme mid-animation: the cab stays translucent and the lines stay visible.
  - With reduced motion emulated (DevTools → Rendering), the page shows the final state and has no Replay button.
  - Going from `/device` to the ATLASZ logo (`/`): the landing page renders normally, its title is "ATLASZ | Agentic TMS ecosystem", and no labels are left over.
  - The console shows no errors.

- [ ] **Step 2: Rerun build and tests after any tuning**

Run: `npm run build && npm test`
Expected: both pass.

- [ ] **Step 3: Commit any tuning**

```bash
git add -A src/scene
git commit -m "Tune device scene framing"
```
