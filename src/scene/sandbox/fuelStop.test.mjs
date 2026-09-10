import test from 'node:test';
import assert from 'node:assert/strict';
import { fuelStopPose } from './fuelStop.ts';

test('driver and door stay inside the existing fuel-stop dwell', () => {
  assert.ok(fuelStopPose(0.32).door > 0);
  for (const p of [0, 0.29, 0.77, 1]) {
    assert.equal(fuelStopPose(p).visible, false);
    assert.equal(fuelStopPose(p).door, 0);
  }
  assert.ok(fuelStopPose(0.53).z > 8);
  assert.equal(fuelStopPose(0.53).x, 2.2);
  assert.ok(fuelStopPose(0.7).z < 2.7);
});

test('poses remain continuous and repeatable when rewinding', () => {
  for (let p = 0; p < 1; p += 0.001) {
    const a = fuelStopPose(p), b = fuelStopPose(p + 0.00001);
    for (const key of ['x', 'y', 'z', 'yaw', 'door', 'distance']) assert.ok(Math.abs(a[key] - b[key]) < 0.01, `${key} at ${p}`);
    assert.deepEqual(a, fuelStopPose(p));
  }
});

test('all seven scene checkpoints survive variable page heights', async () => {
  const { pageToScene, sceneToPage } = await import('./pageProgress.ts');
  const stops = [{page:0,scene:0}, {page:0.1,scene:0.07}, {page:0.2,scene:0.23}, {page:0.38,scene:0.38}, {page:0.5,scene:0.53}, {page:0.65,scene:0.68}, {page:0.81,scene:0.87}, {page:1,scene:1}];
  for (const stop of stops) assert.ok(Math.abs(pageToScene(stop.page, stops) - stop.scene) < 1e-9);
  for (let p = 0; p <= 1; p += 0.01) assert.ok(Math.abs(sceneToPage(pageToScene(p, stops), stops) - p) < 1e-9);
});

test('driver settles into a standing pose at the pumps and before climbing aboard', () => {
  assert.equal(fuelStopPose(0.53).gait, 0);
  assert.equal(fuelStopPose(0.70).gait, 0);
  assert.equal(fuelStopPose(0.44).gait, 1);
  assert.equal(fuelStopPose(0.64).gait, 1);
});
