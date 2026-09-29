import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOTS, SMASH_SHOTS, SERVES, ZONES, LEANS } from '../src/engine/constants.js';
import { flightTime, trajectoryHeight } from '../src/engine/shuttle.js';
import { shotTarget } from '../src/engine/shots.js';
import { qualityAt } from '../src/engine/interception.js';
import { faultChances } from '../src/engine/faults.js';
import { canSmash, smashPower } from '../src/engine/smash.js';
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
test('smash unlock requires a clear, high contact, good quality, and limited stretch', () => {
  const comfortableOverhead = {
    canReach: true,
    quality: 0.92,
    height: 2.6,
    stretch: 0.18,
  };
  assert.equal(canSmash(comfortableOverhead, 'clear'), true);
  assert.equal(canSmash(comfortableOverhead, 'drop'), false);
  assert.equal(canSmash({ ...comfortableOverhead, quality: 0.74 }, 'clear'), false);
  assert.equal(canSmash({ ...comfortableOverhead, height: 2.19 }, 'clear'), false);
  assert.equal(canSmash({ ...comfortableOverhead, stretch: 0.36 }, 'clear'), false);
  assert.equal(canSmash({ ...comfortableOverhead, canReach: false }, 'clear'), false);
});
test('straight and cross smashes use quality and height to set power', () => {
  assert.deepEqual(
    SMASH_SHOTS.map((shot) => shot.id),
    ['straight-smash', 'cross-smash'],
  );
  const lowOpportunityPower = smashPower(0.75, 2.2);
  const strongOpportunityPower = smashPower(0.92, 2.6);
  assert.ok(strongOpportunityPower > lowOpportunityPower);
  const from = { x: 0.7, d: 5, height: 2.6 };
  const straight = shotTarget(SMASH_SHOTS[0], from, 0.92);
  const cross = shotTarget(SMASH_SHOTS[1], from, 0.92);
  assert.notEqual(straight.x, cross.x);
  assert.ok(
    flightTime('smash', from, { ...straight, power: 0.92 }) <
      flightTime('smash', from, { ...straight, power: 0.45 }),
  );
  assert.equal(trajectoryHeight('smash', 0, straight), 2.6);
  assert.equal(trajectoryHeight('smash', 1, straight), 0.35);
});
