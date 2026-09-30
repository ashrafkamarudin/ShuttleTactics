import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOTS, ZONES } from '../src/engine/constants.js';
import { qualityAt } from '../src/engine/interception.js';
import { flightTime, trajectoryHeight } from '../src/engine/shuttle.js';
import { shotTarget } from '../src/engine/shots.js';

const source = { x: 0, d: 3.2 };
const clear = SHOTS.find((shot) => shot.id === 'straight-clear');
const drop = SHOTS.find((shot) => shot.id === 'straight-drop');
const contactLevels = [
  { name: 'weak', quality: 0.3 },
  { name: 'reduced', quality: 0.6 },
  { name: 'normal-like', quality: 0.75 },
  { name: 'full', quality: 1 },
];

test('clear landings remain deeper than drop landings as contact quality rises', () => {
  const drops = contactLevels.map(({ quality }) => shotTarget(drop, source, quality));
  const clears = contactLevels.map(({ quality }) => shotTarget(clear, source, quality));

  assert.deepEqual(
    drops.map(({ d }) => d),
    [1.75, 1.15, 1.15, 0.62],
  );
  assert.ok(drops[0].d < clears[0].d);
  assert.ok(clears[0].d < clears[1].d);
  assert.ok(clears[1].d < clears[2].d);
  assert.ok(clears[2].d < clears[3].d);
  assert.ok(clears[0].d - drops[0].d > 1.3);
  assert.equal(clears[0].d, 3.0679104477611943);
  assert.equal(clears[3].d, 5.9);
});

test('configured clear target is the generated trajectory landing point', () => {
  for (const { quality } of contactLevels) {
    const target = shotTarget(clear, source, quality);
    const landing = {
      x: source.x + (target.x - source.x),
      d: target.d,
    };
    assert.deepEqual(landing, { x: target.x, d: target.d });
    assert.ok(Math.abs(trajectoryHeight('clear', 1, target) - 0.35) < 1e-12);
  }
});

test('deterministic clear matrix captures trajectory and recovery-position effects', () => {
  const rightRecovery = ['front-right', 'center-right', 'rear-right'].map((id) =>
    ZONES.find((zone) => zone.id === id),
  );
  const matrix = contactLevels.map(({ quality }) => {
    const target = shotTarget(clear, source, quality);
    const flight = flightTime('clear', source, target);
    const netFraction = source.d / (source.d + target.d);
    const peakTime = 0.3;
    const netTime = 1 - (1 - netFraction) ** (1 / 1.4);
    const receivers = rightRecovery.map((receiver) =>
      qualityAt(receiver, target, 'clear', 'neutral', source),
    );

    return {
      target,
      flight,
      peakTime,
      peakHeight: trajectoryHeight('clear', peakTime, target),
      netHeight: trajectoryHeight('clear', netTime, target),
      receivers,
    };
  });

  assert.deepEqual(
    matrix.map(({ flight }) => Number(flight.toFixed(3))),
    [1.587, 1.886, 2.036, 2.137],
  );
  assert.deepEqual(
    matrix.map(({ peakHeight }) => Number(peakHeight.toFixed(3))),
    [3.375, 4.561, 5.154, 5.55],
  );
  for (const { netHeight, receivers } of matrix) {
    assert.ok(netHeight > 3.05);
    assert.ok(receivers.every(({ canReach }) => canReach));
  }

  // At this fixture, the sampler selects the first reachable point. Its move
  // distance separates starting positions even though the quality score does not.
  assert.equal(Number(matrix[0].receivers[0].elapsed.toFixed(3)), 1.238);
  assert.ok(matrix[0].receivers[0].distance < matrix[0].receivers[1].distance);
  assert.ok(matrix[0].receivers[1].distance < matrix[0].receivers[2].distance);
  assert.ok(matrix[0].receivers[0].quality < matrix[0].receivers[2].quality);
  assert.ok(matrix[3].receivers[0].distance > matrix[3].receivers[2].distance);
  assert.ok(matrix[3].receivers[2].distance < matrix[3].receivers[0].distance);
});

test('clear target, timing, and interception mirror between court sides', () => {
  const leftSource = { x: -0.2, d: source.d };
  const rightSource = { x: 0.2, d: source.d };
  const leftReceiver = ZONES.find((zone) => zone.id === 'front-left');
  const rightReceiver = ZONES.find((zone) => zone.id === 'front-right');

  for (const { quality } of contactLevels) {
    const leftTarget = shotTarget(clear, leftSource, quality);
    const rightTarget = shotTarget(clear, rightSource, quality);
    const leftResult = qualityAt(leftReceiver, leftTarget, 'clear', 'neutral', leftSource);
    const rightResult = qualityAt(rightReceiver, rightTarget, 'clear', 'neutral', rightSource);

    assert.equal(leftTarget.x, -rightTarget.x);
    assert.equal(leftTarget.d, rightTarget.d);
    assert.equal(
      flightTime('clear', leftSource, leftTarget),
      flightTime('clear', rightSource, rightTarget),
    );
    assert.equal(leftResult.point.x, -rightResult.point.x);
    assert.equal(leftResult.point.d, rightResult.point.d);
    assert.equal(leftResult.elapsed, rightResult.elapsed);
    assert.equal(leftResult.quality, rightResult.quality);
  }
});
