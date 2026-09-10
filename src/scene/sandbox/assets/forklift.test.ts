import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { proceduralForklift } from './forklift';
import type { ScenePalette } from '../../palette';

test('forklift enters from off-screen continuously and reverses out without popping', () => {
  const color = new THREE.Color('#aaaaaa');
  const palette = {line:color,lineDim:color,accent:color,fill:color,glass:color,grid:color,fog:color,fillOpacity:1,lineOpacity:1,glassOpacity:.2,gridOpacity:.2,fogDensity:.01} as ScenePalette;
  const forklift = proceduralForklift(palette);
  const chassis = forklift.object3D.children[0];
  forklift.setStage(0);
  assert.equal(chassis.visible,true);
  assert.equal(chassis.position.x,-48);
  forklift.setStage(.00001);
  assert.ok(Math.abs(chassis.position.x+48)<.001);
  forklift.setStage(.32);
  assert.equal(chassis.position.x,-.5);
  forklift.setStage(.99999);
  assert.ok(Math.abs(chassis.position.x+48)<.001);
  forklift.setStage(1);
  assert.equal(chassis.visible,true);
  assert.equal(chassis.position.x,-48);
  forklift.setStage(.15); const x=chassis.position.x;
  forklift.setStage(.7); forklift.setStage(.15);
  assert.equal(chassis.position.x,x);
  forklift.dispose();
});
