import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOTS, SERVES, ZONES, LEANS } from '../src/engine/constants.js';
import { flightTime } from '../src/engine/shuttle.js';
import { shotTarget } from '../src/engine/shots.js';
import { qualityAt } from '../src/engine/interception.js';
import { faultChances } from '../src/engine/faults.js';
import { serviceX, serveTarget } from '../src/engine/rules.js';
test('existing shot and six recovery choices are preserved', () => {
  assert.equal(SHOTS.length, 4);
  assert.equal(SERVES.length, 3);
  assert.equal(ZONES.length, 6);
  assert.equal(LEANS.length, 5);
});
test('even and odd serving sides are preserved', () => {
  assert.equal(serviceX(0, [0, 0]), 1.22);
  assert.equal(serviceX(0, [1, 0]), -1.22);
  assert.equal(serviceX(1, [0, 0]), -1.22);
  assert.equal(serviceX(1, [0, 1]), 1.22);
  assert.equal(serveTarget(SERVES[0], 0, [0, 0]).d, 2.25);
});
test('cross-court rear clear takes longer than a shorter clear', () => {
  assert.ok(
    flightTime('clear', { x: -1.5, d: 5.5 }, { x: 1.5, d: 5.9 }) >
      flightTime('clear', { x: -1.5, d: 3 }, { x: -1.5, d: 5.9 }),
  );
});
test('weak contact produces shorter clears and looser drops', () => {
  const clear = SHOTS[0],
    drop = SHOTS[2];
  assert.ok(shotTarget(clear, { x: 0, d: 3 }, 0.3).d < shotTarget(clear, { x: 0, d: 3 }, 1).d);
  assert.ok(shotTarget(drop, { x: 0, d: 3 }, 0.3).d > shotTarget(drop, { x: 0, d: 3 }, 1).d);
});
test('poor contact increases fault risk', () => {
  const good = faultChances(SHOTS[2], 1),
    bad = faultChances(SHOTS[2], 0.3);
  assert.ok(bad.net > good.net);
  assert.ok(bad.out > good.out);
});
test('interception result includes a valid contact quality', () => {
  const result = qualityAt(
    { x: 0.65, d: 3.22 },
    { x: 0.65, d: 1.15, peak: 1.65 },
    'drop',
    'neutral',
    { x: 0.65, d: 3.2 },
  );
  assert.ok(result.quality >= 0 && result.quality <= 1);
});
