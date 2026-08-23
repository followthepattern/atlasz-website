import * as THREE from "three";
import { panelFill, edgeMaterial, edgesFor } from "../../materials";
import type { ScenePalette } from "../../palette";

/* A humanoid, after the Westworld drone host: smooth, pale, anatomical, and
 * deliberately faceless.
 *
 * Built from tapered cylinders rather than boxes. The reference has no straight
 * edges anywhere on it — every mass swells and narrows, and the silhouette is
 * the whole read at this size. Boxes gave a figure that was unmistakably a
 * stack of crates; a chest that is wide at the shoulder and narrow at the waist
 * reads as a body from a hundred metres away even when it is forty pixels tall.
 *
 * Six radial segments per limb, outlined at a 34° threshold. Low enough to stay
 * cheap, high enough that the outline traces a curve rather than a hexagon —
 * and since nothing here is lit, that outline is the only thing describing
 * form. The head is an ovoid with no features, which is both what the reference
 * has and what stops a face from being attempted at a scale that cannot hold
 * one.
 *
 * One skeleton, two uses: standing and walking for the driver, seated and
 * typing for the office. The pose functions are exported so a caller picks a
 * behaviour rather than getting a figure that only knows how to do one thing.
 */

export const HUMANOID_HEIGHT = 1.8;

/** Radial segments per limb. Six is where the outline stops reading faceted. */
const SIDES = 6;
/** Outline threshold, in degrees. Above the facet angle, below a real crease. */
const OUTLINE = 34;

export type Humanoid = {
  object3D: THREE.Object3D;
  /** Arms down, weight even. `sway` breathes it so it is not a mannequin. */
  stand(elapsed: number): void;
  /** A walk cycle, driven by distance covered rather than by a clock. */
  walk(along: number): void;
  /** Standing at a desk, hands working. `elapsed` drives the typing. */
  work(elapsed: number, phase: number): void;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

export function proceduralHumanoid(palette: ScenePalette): Humanoid {
  const group = new THREE.Group();

  const fill = panelFill(palette);
  const edge = edgeMaterial(palette);
  const materials: THREE.Material[] = [fill, edge];
  const geometries: THREE.BufferGeometry[] = [];

  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry) => {
    geometries.push(geometry);
    parent.add(new THREE.Mesh(geometry, fill), edgesFor(geometry, edge, OUTLINE));
  };

  /** A tapered mass hung from its top, so a joint above can swing it. */
  const limb = (
    parent: THREE.Object3D,
    top: number,
    bottom: number,
    length: number,
    flatten = 1,
  ) => {
    const geometry = new THREE.CylinderGeometry(bottom, top, length, SIDES);
    if (flatten !== 1) geometry.scale(1, 1, flatten);
    geometry.translate(0, -length / 2, 0);
    add(parent, geometry);
  };

  /** A mass sitting on its own centre — torso sections, joints, the head. */
  const mass = (
    parent: THREE.Object3D,
    top: number,
    bottom: number,
    length: number,
    at: [number, number, number],
    flatten = 1,
  ) => {
    const geometry = new THREE.CylinderGeometry(bottom, top, length, SIDES);
    if (flatten !== 1) geometry.scale(1, 1, flatten);
    geometry.translate(...at);
    add(parent, geometry);
  };

  // --- Trunk ---------------------------------------------------------------
  // Shoulders down to waist, then waist out to hips: the two tapers that make
  // a torso, and the only proportion in the figure that really has to be right.
  mass(group, 0.2, 0.13, 0.42, [0, 1.3, 0], 0.62); // chest
  mass(group, 0.13, 0.155, 0.2, [0, 1.0, 0], 0.66); // pelvis
  mass(group, 0.055, 0.05, 0.1, [0, 1.56, 0]); // neck

  // Head: an ovoid, faceless. Slightly deeper than wide, like the reference.
  const skull = new THREE.SphereGeometry(0.105, 12, 9);
  skull.scale(1, 1.28, 1.1);
  skull.translate(0, 1.72, 0.005);
  add(group, skull);

  // --- Arms ----------------------------------------------------------------
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 1.45, side * 0.2);
    mass(shoulder, 0.075, 0.075, 0.08, [0, 0, 0]); // deltoid
    limb(shoulder, 0.072, 0.05, 0.3);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.3, 0);
    limb(elbow, 0.05, 0.036, 0.27);
    shoulder.add(elbow);

    const hand = new THREE.Group();
    hand.position.set(0, -0.27, 0);
    mass(hand, 0.042, 0.03, 0.16, [0, -0.08, 0], 0.5);
    elbow.add(hand);

    group.add(shoulder);
    return { shoulder, elbow, hand, side };
  });

  // --- Legs ----------------------------------------------------------------
  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group();
    hip.position.set(0, 0.92, side * 0.09);
    limb(hip, 0.098, 0.062, 0.45);

    const knee = new THREE.Group();
    knee.position.set(0, -0.45, 0);
    limb(knee, 0.062, 0.042, 0.43);
    hip.add(knee);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.43, 0);
    const foot = new THREE.CylinderGeometry(0.036, 0.05, 0.2, SIDES);
    foot.rotateZ(Math.PI / 2);
    foot.scale(1, 1, 0.62);
    foot.translate(0.055, -0.028, 0);
    add(ankle, foot);
    knee.add(ankle);

    group.add(hip);
    return { hip, knee, ankle, side };
  });

  function neutral() {
    for (const { shoulder, elbow, hand } of arms) {
      shoulder.rotation.set(0, 0, 0);
      elbow.rotation.z = 0.08;
      hand.rotation.z = 0;
    }
    for (const { hip, knee, ankle } of legs) {
      hip.rotation.z = 0;
      knee.rotation.z = 0;
      ankle.rotation.z = 0;
    }
    group.position.y = 0;
  }

  return {
    object3D: group,

    stand(elapsed) {
      neutral();
      // Arms hang a little away from the body, as they do on the reference —
      // dead-vertical arms read as a doll.
      for (const { shoulder, side } of arms) shoulder.rotation.x = side * 0.09;
      group.position.y = Math.sin(elapsed * 0.9) * 0.006;
    },

    walk(along) {
      const phase = along * 4.5 * Math.PI * 2;
      for (const { hip, knee, ankle, side } of legs) {
        const p = phase + (side > 0 ? 0 : Math.PI);
        const swing = Math.sin(p) * 0.55;
        hip.rotation.z = swing;
        // Knees only ever bend one way. It is the single thing separating a
        // walk from a puppet.
        knee.rotation.z = Math.max(0, -Math.cos(p)) * 0.85;
        ankle.rotation.z = -swing * 0.3;
      }
      for (const { shoulder, elbow, side } of arms) {
        const p = phase + (side > 0 ? Math.PI : 0); // opposite the leg
        shoulder.rotation.x = side * 0.06;
        shoulder.rotation.z = Math.sin(p) * 0.42;
        elbow.rotation.z = 0.18 + Math.max(0, Math.sin(p)) * 0.5;
      }
      // The body rises and falls on each step. Two per stride, not one.
      group.position.y = Math.abs(Math.sin(phase)) * 0.022;
    },

    work(elapsed, phase) {
      neutral();
      // Standing, weight settled, arms forward over the desk. A standing figure
      // reads at a glance where a seated one is mostly chair.
      for (const { shoulder, elbow, hand, side } of arms) {
        shoulder.rotation.x = side * 0.2;
        shoulder.rotation.z = 0.62; // upper arms forward
        elbow.rotation.z = 0.95; // forearms out over the desk
        // Hands work independently and out of step, so several figures at
        // several desks never look like one animation played over again.
        const beat = Math.sin(elapsed * 11 + phase + (side > 0 ? 0 : 1.9));
        hand.rotation.z = 0.1 + Math.max(0, beat) * 0.34;
      }
      // A little weight shift, so nobody is standing perfectly still.
      group.position.y = Math.sin(elapsed * 0.8 + phase) * 0.008;
    },

    setPalette(next) {
      fill.color.copy(next.fill);
      fill.opacity = next.fillOpacity;
      edge.color.copy(next.line);
      edge.opacity = next.lineOpacity;
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
