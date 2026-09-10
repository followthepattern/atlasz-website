import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { panelFill, glassFill, accentFill, edgeMaterial, applyPalette, disposeObject } from '../../materials';
import type { ScenePalette } from '../../palette';
import type { SceneAsset } from '../../assets/types';

/** A production hall and dispatch apron behind the loading truck. */
export function proceduralFactory(palette: ScenePalette): SceneAsset {
  const group = new THREE.Group();
  group.name = 'loading-factory';
  const fill = panelFill(palette), edge = edgeMaterial(palette), detail = edgeMaterial(palette, true);
  const glazing = glassFill(palette), accent = accentFill(palette);
  const solids: THREE.BufferGeometry[] = [], outlines: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry) => { solids.push(g); outlines.push(new THREE.EdgesGeometry(g)); };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x,y,z); add(g);
  };
  // A transparent two-storey pavilion: only the roof, floors and core are solid.
  box(32,.24,19,-38,8.3,-17);
  box(30,.16,17,-38,4.15,-17);
  box(30,.14,17,-38,.08,-17);
  box(5,7.8,4,-48,3.9,-22);
  box(35,.14,4.5,-38,5,-6.5);
  box(38,.1,12,-37,-.01,-2.5);
  for(const x of [-52,-44,-36,-24]) {
    for(const z of [-25,-9]) box(.13,8,.13,x,4,z);
  }
  // Curtain walls are actual glass sheets, with no opaque shell behind them.
  glazing.depthWrite = false;
  const pane = (w: number,h: number,x: number,y: number,z: number,turn = 0) => {
    const g = new THREE.PlaneGeometry(w,h);
    g.rotateY(turn); g.translate(x,y,z);
    const mesh = new THREE.Mesh(g,glazing); mesh.renderOrder = 3; group.add(mesh);
  };
  pane(30,8,-38,4,-8.48);
  pane(30,8,-38,4,-25.52);
  pane(17,8,-22.98,4,-17,Math.PI/2);
  pane(17,8,-53.02,4,-17,Math.PI/2);
  const lines: number[] = [];
  for(let x=-53;x<=-23;x+=3) {
    lines.push(x,0,-8.45,x,8,-8.45);
  }
  for(let z=-25.5;z<=-8.5;z+=3.4) lines.push(-22.95,0,z,-22.95,8,z);
  // A sculptural stair and slender mezzanine balustrade are visible through glass.
  for(let i=0;i<18;i++) box(2.2,.12,.44,-29,.22+i*.22,-22+i*.44);
  for(const x of [-45,-38,-31]) {
    box(3,.13,1.4,x,5.05,-17);
    for(const dx of [-1.3,1.3]) box(.09,.8,.09,x+dx,4.6,-17);
    box(2.5,.7,.7,x,.5,-20);
  }
  lines.push(-51,5.2,-10,-25,5.2,-10);
  // Flush glazed dispatch portals instead of heavy roller shutters.
  for(const x of [-47,-38]) {
    box(.1,3.8,.12,x-2.4,1.9,-8.3);
    box(.1,3.8,.12,x+2.4,1.9,-8.3);
    box(4.9,.1,.12,x,3.8,-8.3);
  }
  const light = new THREE.BoxGeometry(34,.06,.07);
  light.translate(-38,4.89,-4.24); group.add(new THREE.Mesh(light,accent));
  // Minimal roof fins and low, integrated solar panels.
  for(const x of [-48,-42,-36,-30]) box(4,.09,4,x,8.5,-18);
  for(const x of [-48,-42]) {
    box(1.8,.15,1.4,x,.15,-4);
    box(1.5,.9,1.2,x,.68,-4);
  }
  group.add(new THREE.Mesh(mergeGeometries(solids)!, fill));
  group.add(new THREE.LineSegments(mergeGeometries(outlines)!, edge));
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lines,3));
  group.add(new THREE.LineSegments(lineGeometry, detail));
  solids.forEach(g=>g.dispose()); outlines.forEach(g=>g.dispose());
  const tintGlass = (next: ScenePalette) => {
    glazing.color.copy(next.line).lerp(new THREE.Color('#84cbd5'), .35);
    glazing.opacity = .18;
  };
  tintGlass(palette);
  return {
    object3D: group, bounds: new THREE.Box3().setFromObject(group), anchorPoints: {},
    setPalette(next) { applyPalette([fill,edge,detail,glazing,accent],next); tintGlass(next); },
    dispose() { disposeObject(group); group.clear(); },
  };
}
