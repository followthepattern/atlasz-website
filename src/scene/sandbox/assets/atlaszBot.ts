import * as THREE from "three";
import { edgeMaterial, edgesFor, lineSegments } from "../../materials";
import type { ScenePalette } from "../../palette";
import type { Humanoid } from "./humanoid";
import { HUMANOID_HEIGHT } from "./humanoid";

/* Atlasz Bot, black edition.
 *
 * It keeps the same Humanoid contract as humanoid.ts, but the silhouette is
 * closer to the Atlasz Bot reference: glossy black helmet, broad armored torso,
 * side audio pods, ribbed forearms, chunky walking legs, long angular feet and
 * a vertical amber face strip that stays visible at scene scale.
 */

export const ATLASZ_BOT_HEIGHT = HUMANOID_HEIGHT;
export const ATLASZ_BOT_REFERENCE_MARKS = [
  "glossy-rounded-helmet",
  "vertical-amber-face-strip",
  "narrow-dotted-amber-strip",
  "side-audio-pods",
  "broad-armored-torso",
  "shoulder-wide-layered-torso",
  "ribbed-forearm-armor",
  "chunky-segmented-legs",
  "long-angular-feet",
] as const;

const SIDES = 14;
const OUTLINE = 28;
const AMBER = 0xff7a18;
const AMBER_DIM = 0x9a3d08;
const WALK_CYCLES = 5.15;

export function proceduralAtlaszBot(palette: ScenePalette): Humanoid {
  const group = new THREE.Group();
  group.name = "AtlaszBot";
  const rig = new THREE.Group();
  rig.name = "AtlaszBotRig";
  rig.scale.set(1.14, 1, 1.12);
  group.add(rig);

  const shell = botFill(0x030303, 1, true, "shell");
  const panel = botFill(0x11100f, 0.98, true, "panel");
  const trim = botFill(0x24211f, 0.9, true, "trim");
  const detail = botFill(0x5c5955, 0.7, true, "detail");
  const glass = botFill(0x010101, 1, true, "glass");
  const amber = botFill(AMBER, 1, false, "amber");
  const amberDim = botFill(AMBER_DIM, 0.95, false, "amberDim");
  const amberGlow = botFill(AMBER, 0.34, false, "amberGlow");
  const edge = edgeMaterial(palette);
  const seam = edgeMaterial(palette, true);

  const materials: THREE.Material[] = [
    shell,
    panel,
    trim,
    detail,
    glass,
    amber,
    amberDim,
    amberGlow,
    edge,
    seam,
  ];
  const ledMeshes: THREE.Mesh[] = [];

  const add = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    fill: THREE.Material = shell,
    edgeMat: THREE.LineBasicMaterial = edge,
    threshold = OUTLINE,
  ) => {
    parent.add(new THREE.Mesh(geometry, fill), edgesFor(geometry, edgeMat, threshold));
  };

  const addPlain = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    fill: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(geometry, fill);
    parent.add(mesh);
    return mesh;
  };

  const capsule = (
    parent: THREE.Object3D,
    radius: number,
    length: number,
    at: [number, number, number],
    scale: [number, number, number],
    fill: THREE.Material = shell,
    edgeMat: THREE.LineBasicMaterial = edge,
    threshold = OUTLINE,
  ) => {
    const geometry = new THREE.CapsuleGeometry(radius, length, 5, SIDES);
    geometry.scale(...scale);
    geometry.translate(...at);
    add(parent, geometry, fill, edgeMat, threshold);
  };

  const mass = (
    parent: THREE.Object3D,
    top: number,
    bottom: number,
    length: number,
    at: [number, number, number],
    flatten = 1,
    fill: THREE.Material = shell,
    edgeMat: THREE.LineBasicMaterial = edge,
  ) => {
    const geometry = new THREE.CylinderGeometry(top, bottom, length, SIDES);
    geometry.scale(1, 1, flatten);
    geometry.translate(...at);
    add(parent, geometry, fill, edgeMat);
  };

  const limb = (
    parent: THREE.Object3D,
    top: number,
    bottom: number,
    length: number,
    flatten = 1,
    fill: THREE.Material = shell,
  ) => {
    const geometry = new THREE.CylinderGeometry(top, bottom, length, SIDES);
    geometry.scale(1, 1, flatten);
    geometry.translate(0, -length / 2, 0);
    add(parent, geometry, fill);
  };

  const armorPlate = (
    parent: THREE.Object3D,
    size: [number, number, number],
    at: [number, number, number],
    fill: THREE.Material = panel,
  ) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...at);
    add(parent, geometry, fill, seam, 1);
  };

  const profilePlate = (
    parent: THREE.Object3D,
    points: Array<[number, number]>,
    z: number,
    depth: number,
    fill: THREE.Material = panel,
  ) => {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
    });
    geometry.translate(0, 0, z - depth / 2);
    add(parent, geometry, fill, seam, 1);
  };

  const pod = (
    parent: THREE.Object3D,
    radius: number,
    depth: number,
    at: [number, number, number],
  ) => {
    const outer = new THREE.CylinderGeometry(radius, radius * 0.94, depth, SIDES);
    outer.rotateX(Math.PI / 2);
    outer.translate(...at);
    add(parent, outer, panel, seam);

    const inner = new THREE.CylinderGeometry(radius * 0.55, radius * 0.5, depth * 1.08, SIDES);
    inner.rotateX(Math.PI / 2);
    inner.translate(at[0] + 0.002, at[1], at[2]);
    add(parent, inner, glass, edge);
  };

  const amberBolt = (
    parent: THREE.Object3D,
    radius: number,
    at: [number, number, number],
    glow = false,
  ) => {
    const dot = new THREE.SphereGeometry(radius, 10, 7);
    dot.scale(1.15, 1, 0.74);
    dot.translate(...at);
    const mesh = addPlain(parent, dot, glow ? amberGlow : amber);
    if (!glow) ledMeshes.push(mesh);
    return mesh;
  };

  const ring = (
    parent: THREE.Object3D,
    radius: number,
    tube: number,
    at: [number, number, number],
  ) => {
    const geometry = new THREE.TorusGeometry(radius, tube, 6, 22);
    geometry.translate(...at);
    addPlain(parent, geometry, detail);
  };

  mass(rig, 0.34, 0.18, 0.5, [0, 1.3, 0], 0.58, shell);
  mass(rig, 0.19, 0.23, 0.22, [0, 0.98, 0], 0.68, panel);
  capsule(rig, 0.07, 0.08, [0, 1.585, 0], [0.82, 1, 0.78], panel, seam);
  capsule(rig, 0.12, 0.12, [0.032, 1.48, 0], [1.28, 0.72, 0.58], panel, seam);

  for (const z of [-0.202, 0.202]) {
    profilePlate(
      rig,
      [
        [-0.16, 1.525],
        [0.262, 1.5],
        [0.222, 1.12],
        [0.055, 0.975],
        [-0.12, 1.045],
      ],
      z,
      0.022,
      shell,
    );
  }

  const chestDisk = new THREE.CylinderGeometry(0.094, 0.094, 0.026, 20);
  chestDisk.rotateZ(Math.PI / 2);
  chestDisk.scale(1, 1, 0.82);
  chestDisk.translate(0.302, 1.345, 0);
  add(rig, chestDisk, trim, seam);

  const chestCore = new THREE.CylinderGeometry(0.046, 0.046, 0.029, 18);
  chestCore.rotateZ(Math.PI / 2);
  chestCore.scale(1, 1, 0.8);
  chestCore.translate(0.323, 1.345, 0);
  add(rig, chestCore, glass, edge);

  armorPlate(rig, [0.024, 0.36, 0.014], [0.247, 1.265, 0], trim);
  for (const z of [-0.056, 0.056]) {
    armorPlate(rig, [0.018, 0.26, 0.012], [0.232, 1.245, z], panel);
    amberBolt(rig, 0.011, [0.275, 1.195, z], true);
  }
  for (const z of [-0.216, 0.216]) ring(rig, 0.058, 0.005, [0.08, 1.365, z]);

  rig.add(
    lineSegments(
      [
        0.248, 1.5, -0.095, 0.278, 1.36, -0.035,
        0.248, 1.5, 0.095, 0.278, 1.36, 0.035,
        0.224, 1.12, -0.09, 0.278, 1.33, -0.028,
        0.224, 1.12, 0.09, 0.278, 1.33, 0.028,
      ],
      seam,
    ),
  );

  const head = new THREE.Group();
  head.name = "AtlaszBotHead";
  head.position.set(0, 1.675, 0);
  rig.add(head);

  const skull = new THREE.SphereGeometry(0.148, 22, 15);
  skull.scale(0.98, 1.28, 1.04);
  skull.translate(0.017, 0.034, 0);
  add(head, skull, glass, edge, 30);

  const crown = new THREE.SphereGeometry(0.09, 18, 10);
  crown.scale(0.86, 0.62, 1);
  crown.translate(-0.025, 0.14, 0);
  add(head, crown, shell, seam, 32);

  const jaw = new THREE.CylinderGeometry(0.082, 0.096, 0.125, SIDES);
  jaw.scale(0.98, 1, 0.84);
  jaw.translate(0.016, -0.092, 0);
  add(head, jaw, panel, seam);

  pod(head, 0.056, 0.038, [-0.002, 0.016, -0.135]);
  pod(head, 0.056, 0.038, [-0.002, 0.016, 0.135]);
  for (const z of [-0.158, 0.158]) ring(head, 0.034, 0.005, [0.018, 0.012, z]);

  const faceGlow = new THREE.CapsuleGeometry(0.022, 0.205, 4, 9);
  faceGlow.scale(1, 1, 0.24);
  faceGlow.translate(0.18, 0.035, 0);
  addPlain(head, faceGlow, amberGlow);

  const faceStrip = new THREE.CapsuleGeometry(0.012, 0.19, 4, 8);
  faceStrip.scale(1, 1, 0.22);
  faceStrip.translate(0.192, 0.035, 0);
  addPlain(head, faceStrip, amberDim);

  for (let i = 0; i < 9; i += 1) {
    const y = -0.058 + i * 0.022;
    amberBolt(head, i === 4 ? 0.013 : 0.01, [0.202, y, 0]);
  }

  for (const z of [-0.074, 0.074]) amberBolt(head, 0.014, [0.065, 0.018, z], true);

  head.add(
    lineSegments(
      [
        0.136, -0.065, 0.052, 0.154, 0.02, 0.08,
        0.136, -0.032, -0.052, 0.154, 0.055, -0.08,
        0.032, -0.104, -0.075, 0.082, -0.12, -0.035,
        0.032, -0.104, 0.075, 0.082, -0.12, 0.035,
      ],
      seam,
    ),
  );

  const spine = new THREE.BoxGeometry(0.033, 0.35, 0.02);
  spine.translate(-0.127, 1.385, 0);
  add(rig, spine, panel, seam, 1);

  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? "AtlaszBotShoulderLeft" : "AtlaszBotShoulderRight";
    shoulder.position.set(0.006, 1.475, side * 0.24);
    capsule(shoulder, 0.101, 0.05, [0, 0, 0], [1.14, 0.72, 1.02], panel, seam);
    limb(shoulder, 0.107, 0.076, 0.335, 0.74, shell);
    armorPlate(shoulder, [0.034, 0.19, 0.014], [0.064, -0.16, 0], trim);
    for (const z of [-0.073, 0.073]) {
      profilePlate(
        shoulder,
        [
          [0.035, -0.045],
          [0.11, -0.125],
          [0.095, -0.292],
          [0.026, -0.345],
          [-0.03, -0.112],
        ],
        z,
        0.016,
        panel,
      );
    }

    const elbow = new THREE.Group();
    elbow.name = side < 0 ? "AtlaszBotElbowLeft" : "AtlaszBotElbowRight";
    elbow.position.set(0, -0.335, 0);
    capsule(elbow, 0.071, 0.04, [0, 0, 0], [1.06, 0.72, 0.88], panel, seam);
    limb(elbow, 0.085, 0.056, 0.305, 0.72, shell);

    for (const offset of [-0.044, 0, 0.044]) {
      const rib = new THREE.BoxGeometry(0.018, 0.19, 0.01);
      rib.translate(0.063, -0.14, offset);
      add(elbow, rib, trim, seam, 1);
    }
    shoulder.add(elbow);

    const hand = new THREE.Group();
    hand.name = side < 0 ? "AtlaszBotHandLeft" : "AtlaszBotHandRight";
    hand.position.set(0, -0.305, 0);
    capsule(hand, 0.04, 0.08, [0.02, -0.056, 0], [0.78, 1, 0.54], panel, seam);
    elbow.add(hand);

    rig.add(shoulder);
    return { shoulder, elbow, hand, side };
  });

  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group();
    hip.name = side < 0 ? "AtlaszBotHipLeft" : "AtlaszBotHipRight";
    hip.position.set(0, 0.9, side * 0.108);
    capsule(hip, 0.1, 0.05, [0, 0, 0], [1.12, 0.66, 0.88], panel, seam);
    limb(hip, 0.142, 0.09, 0.43, 0.74, shell);
    armorPlate(hip, [0.036, 0.23, 0.014], [0.075, -0.235, 0], trim);
    for (const z of [-0.075, 0.075]) {
      profilePlate(
        hip,
        [
          [0.045, -0.05],
          [0.13, -0.19],
          [0.092, -0.405],
          [0.015, -0.445],
          [-0.048, -0.17],
        ],
        z,
        0.016,
        panel,
      );
    }

    const knee = new THREE.Group();
    knee.name = side < 0 ? "AtlaszBotKneeLeft" : "AtlaszBotKneeRight";
    knee.position.set(0, -0.43, 0);
    capsule(knee, 0.084, 0.044, [0, 0, 0], [1.08, 0.68, 0.82], panel, seam);
    limb(knee, 0.092, 0.066, 0.405, 0.68, shell);
    armorPlate(knee, [0.03, 0.24, 0.012], [0.066, -0.215, 0], trim);
    hip.add(knee);

    const ankle = new THREE.Group();
    ankle.name = side < 0 ? "AtlaszBotAnkleLeft" : "AtlaszBotAnkleRight";
    ankle.position.set(0, -0.405, 0);
    capsule(ankle, 0.044, 0.035, [0, 0, 0], [0.94, 0.68, 0.74], panel, seam);

    const foot = new THREE.CapsuleGeometry(0.05, 0.26, 4, SIDES);
    foot.rotateZ(Math.PI / 2);
    foot.scale(1, 0.64, 0.56);
    foot.translate(0.098, -0.038, 0);
    add(ankle, foot, panel, edge);

    const toe = new THREE.BoxGeometry(0.145, 0.03, 0.062);
    toe.translate(0.232, -0.048, 0);
    add(ankle, toe, trim, seam, 1);
    knee.add(ankle);

    rig.add(hip);
    return { hip, knee, ankle, side };
  });

  function neutral() {
    rig.rotation.set(0, 0, 0);
    rig.position.y = 0;
    head.rotation.set(0, 0, 0);

    for (const { shoulder, elbow, hand } of arms) {
      shoulder.rotation.set(0, 0, 0);
      elbow.rotation.z = 0.16;
      hand.rotation.z = 0;
    }
    for (const { hip, knee, ankle } of legs) {
      hip.rotation.z = 0;
      knee.rotation.z = 0;
      ankle.rotation.z = 0;
    }
  }

  function setLEDs(strength: number, chase = 0) {
    const opacity = THREE.MathUtils.clamp(strength, 0.42, 1);
    amber.opacity = opacity;
    amberDim.opacity = Math.max(0.55, opacity * 0.82);
    amberGlow.opacity = Math.max(0.08, opacity * 0.15);
    ledMeshes.forEach((mesh, i) => {
      const scale = 0.9 + Math.max(0, Math.sin(chase + i * 0.78)) * 0.32;
      mesh.scale.setScalar(scale);
    });
  }

  setPalette(palette);

  return {
    object3D: group,

    stand(elapsed) {
      neutral();
      for (const { shoulder, side } of arms) {
        shoulder.rotation.x = side * 0.12;
        shoulder.rotation.z = 0.08;
      }
      rig.position.y = Math.sin(elapsed * 0.85) * 0.006;
      head.rotation.z = Math.sin(elapsed * 0.55) * 0.018;
      setLEDs(0.8 + Math.sin(elapsed * 1.7) * 0.08, elapsed * 1.2);
    },

    walk(along) {
      neutral();
      const phase = along * WALK_CYCLES * Math.PI * 2;
      rig.rotation.z = -0.13 + Math.sin(phase * 2) * 0.014;
      rig.position.y = Math.abs(Math.sin(phase)) * 0.028;
      head.rotation.z = Math.sin(phase) * 0.03;

      for (const { hip, knee, ankle, side } of legs) {
        const p = phase + (side > 0 ? 0 : Math.PI);
        const swing = Math.sin(p) * 0.67;
        hip.rotation.z = swing;
        knee.rotation.z = Math.max(0, -Math.cos(p)) * 0.98;
        ankle.rotation.z = -swing * 0.38;
      }
      for (const { shoulder, elbow, hand, side } of arms) {
        const p = phase + (side > 0 ? Math.PI : 0);
        shoulder.rotation.x = side * 0.12;
        shoulder.rotation.z = Math.sin(p) * 0.56;
        elbow.rotation.z = 0.26 + Math.max(0, Math.sin(p)) * 0.62;
        hand.rotation.z = Math.sin(p + 0.6) * 0.14;
      }
      setLEDs(0.96, phase);
    },

    work(elapsed, phase) {
      neutral();
      for (const { shoulder, elbow, hand, side } of arms) {
        shoulder.rotation.x = side * 0.24;
        shoulder.rotation.z = 0.68;
        elbow.rotation.z = 1.02;
        hand.rotation.z = 0.1 + Math.max(0, Math.sin(elapsed * 12 + phase + side)) * 0.32;
      }
      rig.position.y = Math.sin(elapsed * 0.8 + phase) * 0.007;
      head.rotation.z = Math.sin(elapsed * 0.7 + phase) * 0.016;
      setLEDs(0.86 + Math.sin(elapsed * 3.2 + phase) * 0.12, elapsed * 2.4 + phase);
    },

    setPalette,

    dispose() {
      group.traverse((child) => {
        (child as Partial<THREE.Mesh | THREE.LineSegments>).geometry?.dispose();
      });
      for (const material of materials) material.dispose();
      group.clear();
    },
  };

  function setPalette(next: ScenePalette) {
    shell.color.setHex(0x030303).lerp(next.fill, 0.025);
    shell.opacity = next.fillOpacity;
    panel.color.setHex(0x11100f).lerp(next.fill, 0.05);
    panel.opacity = next.fillOpacity * 0.98;
    trim.color.setHex(0x24211f).lerp(next.fill, 0.06);
    trim.opacity = next.fillOpacity * 0.9;
    glass.color.setHex(0x010101).lerp(next.fill, 0.018);
    glass.opacity = next.glassOpacity;
    detail.color.setHex(0x5c5955).lerp(next.line, 0.22);
    detail.opacity = next.fillOpacity * 0.7;
    edge.color.copy(next.line);
    edge.opacity = next.lineOpacity * 0.48;
    seam.color.copy(next.lineDim);
    seam.opacity = next.lineOpacity * 0.3;
    amber.color.setHex(AMBER);
    amberDim.color.setHex(AMBER_DIM);
    amberGlow.color.setHex(AMBER);
  }
}

function botFill(color: number, opacity: number, fog = true, role?: string) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.fog = fog;
  material.userData.kind = "botFill";
  material.userData.botRole = role;
  return material;
}
