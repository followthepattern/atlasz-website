import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import type { ScenePalette } from "../../palette";
import { ATLASZ_BOT_REFERENCE_MARKS, proceduralAtlaszBot } from "./atlaszBot";

const requiredReferenceMarks = [
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

const palette = (fillOpacity = 0.92, lineOpacity = 0.72): ScenePalette => ({
  line: new THREE.Color(0xe8e8e8),
  lineDim: new THREE.Color(0x777777),
  accent: new THREE.Color(0xffffff),
  fill: new THREE.Color(0x111111),
  glass: new THREE.Color(0x181818),
  grid: new THREE.Color(0x444444),
  fog: new THREE.Color(0x080808),
  fillOpacity,
  lineOpacity,
  glassOpacity: 0.64,
  gridOpacity: 0.2,
  fogDensity: 0.01,
});

const materialsFor = (root: THREE.Object3D) => {
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    const material = (child as THREE.Mesh | THREE.LineSegments).material;
    if (Array.isArray(material)) material.forEach((entry) => materials.add(entry));
    else if (material) materials.add(material);
  });
  return materials;
};

test("declares the Atlasz Bot reference marks", () => {
  assert.deepEqual(ATLASZ_BOT_REFERENCE_MARKS, requiredReferenceMarks);
});

test("resets walking transforms before standing", () => {
  const bot = proceduralAtlaszBot(palette());
  const rig = bot.object3D.getObjectByName("AtlaszBotRig");
  const hips = [
    bot.object3D.getObjectByName("AtlaszBotHipLeft"),
    bot.object3D.getObjectByName("AtlaszBotHipRight"),
  ];

  assert.ok(rig);
  assert.ok(hips.every(Boolean));

  bot.walk(0.17);
  assert.notEqual(rig.rotation.z, 0);
  assert.ok(hips.some((hip) => hip!.rotation.z !== 0));

  bot.stand(0);
  assert.equal(rig.rotation.z, 0);
  assert.ok(hips.every((hip) => hip!.rotation.z === 0));
  bot.dispose();
});

test("applies palette opacity without minimum clamps", () => {
  const bot = proceduralAtlaszBot(palette());
  const next = palette(0.24, 0.31);
  bot.setPalette(next);

  const byRole = new Map<string, THREE.Material>();
  for (const material of materialsFor(bot.object3D)) {
    const role = material.userData.botRole as string | undefined;
    if (role) byRole.set(role, material);
  }

  assert.equal(byRole.get("shell")?.opacity, next.fillOpacity);
  assert.equal(byRole.get("panel")?.opacity, next.fillOpacity * 0.98);
  assert.equal(byRole.get("trim")?.opacity, next.fillOpacity * 0.9);
  assert.equal(byRole.get("detail")?.opacity, next.fillOpacity * 0.7);
  assert.equal(byRole.get("glass")?.opacity, next.glassOpacity);

  const edge = [...materialsFor(bot.object3D)].find(
    (material) => material.userData.kind === "edge",
  );
  const seam = [...materialsFor(bot.object3D)].find(
    (material) => material.userData.kind === "edgeDim",
  );
  assert.equal(edge?.opacity, next.lineOpacity * 0.48);
  assert.equal(seam?.opacity, next.lineOpacity * 0.3);
  bot.dispose();
});

test("disposes every geometry and material it owns", () => {
  const bot = proceduralAtlaszBot(palette());
  const geometries = new Set<THREE.BufferGeometry>();
  bot.object3D.traverse((child) => {
    const geometry = (child as THREE.Mesh | THREE.LineSegments).geometry;
    if (geometry) geometries.add(geometry);
  });
  const materials = materialsFor(bot.object3D);
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  for (const geometry of geometries) {
    geometry.addEventListener("dispose", () => disposedGeometries.add(geometry));
  }
  for (const material of materials) {
    material.addEventListener("dispose", () => disposedMaterials.add(material));
  }

  bot.dispose();

  assert.equal(disposedGeometries.size, geometries.size);
  assert.equal(disposedMaterials.size, materials.size);
});
