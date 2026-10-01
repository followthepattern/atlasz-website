import * as THREE from "three";
import type { ScenePalette } from "../../palette";

/** ATLASZ wordmark on the destination's road-facing facade. */
export function createPartnerSign(palette: ScenePalette) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .1, depthWrite: true, side: THREE.DoubleSide });
  const geometry = new THREE.PlaneGeometry(17, 4.25);
  const object3D = new THREE.Mesh(geometry, material);
  object3D.name = 'ATLASZ-depot-facade';
  object3D.position.set(15.04, 7.6, 0);
  object3D.rotation.y = Math.PI / 2;
  function paint(next: ScenePalette) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 2048, 512);
    ctx.fillStyle = `#${next.line.getHexString()}`;
    ctx.textAlign = 'center';
    ctx.font = '600 220px system-ui';
    ctx.fillText('ATLASZ', 1024, 333);
    texture.needsUpdate = true;
  }
  paint(palette);
  return { object3D, setPalette: paint, dispose() { object3D.removeFromParent(); texture.dispose(); material.dispose(); geometry.dispose(); } };
}
