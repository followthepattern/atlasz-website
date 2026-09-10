import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE, roadProfile } from './road';
import { ROUTE as landingRoute } from '../road';
import { routeAt, TRUCK_FROM, TRUCK_TO } from './journey';
import { within } from './scenes';

test('sandbox covers three times the distance with the same journey progress', () => {
  assert.ok(ROUTE.getLength() > landingRoute.getLength() * 2.9);
  assert.ok(landingRoute.getLength() < 400);
  assert.equal(routeAt(0), TRUCK_FROM);
  assert.equal(routeAt(1), TRUCK_TO);
});

test('only the satellite section has a shallow curve; the open road stays straight and flat', () => {
  for (const scene of [0, 1, 3, 5, 6, 7]) {
    for (const local of [.05, .5, .95]) {
      const p = ROUTE.getPointAt(routeAt(within(scene, local)));
      assert.equal(p.y, 0);
      assert.equal(p.z, 0, `scene ${scene} stays straight`);
    }
  }
  const satellite = ROUTE.getPointAt(routeAt(within(4, .5)));
  assert.ok(satellite.z > 3.9 && satellite.z <= 4);
  assert.deepEqual(roadProfile(75), { y: 0, z: 0 });
  for (let i = 1; i < 2000; i++) {
    const tangent = ROUTE.getTangentAt(i / 2000);
    assert.equal(tangent.y, 0);
    assert.ok(Math.abs(tangent.z / tangent.x) < .1);
  }
});
