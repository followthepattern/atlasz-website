import * as THREE from "three";
import { panelFill, accentFill, edgeMaterial, edgesFor } from "../../materials";
import type { ScenePalette } from "../../palette";

/* A forklift loading the trailer.
 *
 * Built in its own frame with +x pointing at the vehicle, so the whole machine
 * drives by moving along one axis and the world only has to say where the bay
 * is and which way it faces.
 *
 * It loads through the rear doors, driving straight up the trailer's own axis.
 * That forced the whole opening of the sweep to move: the camera has to be
 * behind the trailer's rear plane to see the doors at all, which at these radii
 * means a bearing above about 118°, so the opening and the load now happen from
 * behind the vehicle and the sweep starts there.
 */

/* Where the loader starts and where it noses up to, along its own approach
   axis. Its origin sits at the trailer's rear doors, so these are distances
   behind them.
 *
 * DOCKED_AT was -3.1, which parked it a clear three metres short: the forks
 * never reached the doorway and the pallet, pushed its full travel, still
 * ended up 0.35m outside the trailer. It loaded the air behind the truck. At
 * -0.5 the body still stops 0.4m clear of the bodywork while the forks reach a
 * metre through the opening, which is how this is actually done. */
const WAITING_AT = -48;
const DOCKED_AT = -0.5;

/* Fork travel: ground clearance up to the trailer floor, which sits at y=1.0.
   The pallet rides 0.09 above the forks, so this puts its underside just over
   the floor rather than through it. */
const FORK_LOW = 0.18;
const FORK_HIGH = 1.05;

/** How far the pallet slides off the forks into the trailer. */
const PUSH_IN = 1.5;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Portions of the scene: drive in, raise, push in, withdraw, drive out. */
const DRIVE_IN = 0.32;
const RAISE = 0.46;
const PUSH = 0.60;
const WITHDRAW = 0.70;
const DRIVE_OUT = 1;

export type Forklift = {
  object3D: THREE.Object3D;
  /** 0 before it arrives, 1 once it has gone. */
  setStage(t: number): void;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

export function proceduralForklift(palette: ScenePalette): Forklift {
  const group = new THREE.Group();
  const chassis = new THREE.Group();
  group.add(chassis);

  const fill = panelFill(palette);
  const accent = accentFill(palette);
  const edge = edgeMaterial(palette);
  const edgeDim = edgeMaterial(palette, true);
  const materials: THREE.Material[] = [fill, accent, edge, edgeDim];
  const geometries: THREE.BufferGeometry[] = [];

  const box = (
    parent: THREE.Object3D,
    size: [number, number, number],
    at: [number, number, number],
    material: THREE.Material = fill,
    outline = edge,
  ) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...at);
    geometries.push(geometry);
    parent.add(new THREE.Mesh(geometry, material), edgesFor(geometry, outline));
  };

  // --- Counterweight body -------------------------------------------------
  box(chassis, [2.3, 0.85, 1.15], [-0.75, 0.72, 0]);
  box(chassis, [0.9, 0.5, 1.0], [-1.6, 1.35, 0], fill, edgeDim); // counterweight
  // Seat and overhead guard: the two things that say "driven" at any distance.
  box(chassis, [0.55, 0.1, 0.8], [-0.55, 1.22, 0], fill, edgeDim);
  box(chassis, [0.1, 0.55, 0.75], [-0.9, 1.5, 0], fill, edgeDim);
  for (const z of [-0.5, 0.5]) {
    box(chassis, [0.07, 1.15, 0.07], [-0.2, 1.9, z], fill, edgeDim);
    box(chassis, [0.07, 1.15, 0.07], [-1.5, 1.9, z], fill, edgeDim);
  }
  box(chassis, [1.5, 0.07, 1.05], [-0.85, 2.5, 0], fill, edgeDim); // roof cage

  // Wheels: big at the front where the load is, small and steering behind.
  const wheel = (x: number, z: number, r: number) => {
    const geometry = new THREE.CylinderGeometry(r, r, 0.22, 12);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(x, r, z);
    geometries.push(geometry);
    chassis.add(new THREE.Mesh(geometry, fill), edgesFor(geometry, edgeDim));
  };
  for (const z of [-0.52, 0.52]) wheel(0.15, z, 0.36);
  for (const z of [-0.42, 0.42]) wheel(-1.55, z, 0.26);

  // --- Mast ---------------------------------------------------------------
  for (const z of [-0.34, 0.34]) {
    box(chassis, [0.1, 2.6, 0.1], [0.42, 1.3, z], fill, edgeDim);
  }
  box(chassis, [0.12, 0.1, 0.85], [0.42, 2.6, 0], fill, edgeDim);

  // --- Carriage and forks, which travel up the mast -----------------------
  const carriage = new THREE.Group();
  chassis.add(carriage);
  box(carriage, [0.14, 0.5, 0.9], [0.5, 0.25, 0], fill, edgeDim);
  for (const z of [-0.3, 0.3]) {
    box(carriage, [1.25, 0.07, 0.13], [1.18, 0.05, z], fill, edgeDim);
  }

  /* The pallet rides on the forks and is left behind in the trailer.
   *
   * It stays parented to the carriage for its whole life. An earlier version
   * re-parented it to the machine's root at the moment of the drop, which works
   * exactly once: scroll is scrubbed, not played, so going back up the page
   * left the pallet detached and hanging at the drop point while the forks
   * arrived underneath it empty. Anything that latches is wrong here.
   *
   * So the drop is expressed as arithmetic instead. Once it is in, the load
   * holds a fixed position in the machine's frame by cancelling out whatever
   * the chassis and carriage are doing — which reads identically, reverses
   * perfectly, and keeps one parent for the whole scene. */
  const load = new THREE.Group();
  carriage.add(load);
  // Sat ON the forks, not through them: the fork tops are at 0.085, so the
  // pallet's underside at 0.09 rests on them with nothing intersecting.
  box(load, [1.15, 0.12, 0.95], [1.15, 0.15, 0], fill, edgeDim); // pallet
  box(load, [0.95, 0.75, 0.8], [1.15, 0.59, 0], accent, edge); // crate

  chassis.position.x = WAITING_AT;
  carriage.position.y = FORK_LOW;

  return {
    object3D: group,

    setStage(t) {
      const p = clamp01(t);

      // The machine always exists: it waits well beyond the left edge,
      // drives into view, loads, then reverses all the way back out.
      chassis.visible = true;
      load.visible = p < 1;

      // Along its approach axis: in, hold while it works, out again.
      let along: number;
      if (p < DRIVE_IN) along = smooth(p / DRIVE_IN);
      else if (p < WITHDRAW) along = 1;
      else if (p < DRIVE_OUT) along = 1 - smooth((p - WITHDRAW) / (DRIVE_OUT - WITHDRAW));
      else along = 0;
      chassis.position.x = WAITING_AT + (DOCKED_AT - WAITING_AT) * along;

      // Forks: up between DRIVE_IN and RAISE, down again after WITHDRAW.
      let lift: number;
      if (p < DRIVE_IN) lift = 0;
      else if (p < RAISE) lift = smooth((p - DRIVE_IN) / (RAISE - DRIVE_IN));
      else if (p < WITHDRAW) lift = 1;
      else lift = 1 - smooth(Math.min(1, (p - WITHDRAW) / (DRIVE_OUT - WITHDRAW)));
      carriage.position.y = FORK_LOW + (FORK_HIGH - FORK_LOW) * lift;

      /* The push, and then the drop.
       *
       * Up to PUSH the pallet simply rides the forks, sliding forward off them
       * as it goes in. After PUSH it has been left in the trailer, so it holds
       * station at the forklift-frame position it was set down at — subtracting
       * the chassis and carriage motion means the forks withdraw and lower out
       * from under it rather than carrying it back out. */
      if (p < RAISE) {
        load.position.set(0, 0, 0);
      } else if (p < PUSH) {
        load.position.set(PUSH_IN * smooth((p - RAISE) / (PUSH - RAISE)), 0, 0);
      } else {
        load.position.set(
          DOCKED_AT + PUSH_IN - chassis.position.x,
          FORK_HIGH - carriage.position.y,
          0,
        );
      }
    },

    setPalette(next) {
      fill.color.copy(next.fill);
      fill.opacity = next.fillOpacity;
      accent.color.copy(next.accent);
      edge.color.copy(next.line);
      edge.opacity = next.lineOpacity;
      edgeDim.color.copy(next.lineDim);
      edgeDim.opacity = next.lineOpacity * 0.65;
    },

    dispose() {
      for (const geometry of geometries) geometry.dispose();
      group.traverse((child) => {
        (child as Partial<THREE.Mesh>).geometry?.dispose();
      });
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}
