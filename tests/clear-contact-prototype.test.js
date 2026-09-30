import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOTS } from '../src/engine/constants.js';
import { flightTime, trajectoryHeight, trajectoryProgress } from '../src/engine/shuttle.js';
import { shotTarget } from '../src/engine/shots.js';
import { canSmash } from '../src/engine/smash.js';
import { qualityAt } from '../src/engine/interception.js';
import {
  candidateClearPath,
  evaluateClearContact,
  recoveryFixture,
} from './clear-contact-prototype.js';

const from = { x: 0, d: 3.2 };
const levels = [
  { name: 'weak', quality: 0.3 },
  { name: 'reduced', quality: 0.6 },
  { name: 'full', quality: 1 },
];

function matrix(quality) {
  return ['front-right', 'center-right', 'rear-right'].map((id) =>
    evaluateClearContact(recoveryFixture(id), quality, from),
  );
}

test('test-only path preserves clear target mapping and total flight time', () => {
  const clear = SHOTS.find((shot) => shot.id === 'straight-clear');
  for (const { quality } of levels) {
    const target = shotTarget(clear, from, quality);
    const result = evaluateClearContact(recoveryFixture('rear-right'), quality, from);

    assert.equal(result.target.d, target.d);
    assert.equal(result.target.peak, target.peak);
    assert.equal(result.flight, flightTime('clear', from, target));
    assert.ok(
      Math.abs(candidateClearPath(1, from, target, result.flight).point.d - target.d) < 1e-12,
    );
    assert.ok(Math.abs(candidateClearPath(0, from, target, result.flight).height - 0.75) < 1e-12);
    assert.ok(Math.abs(candidateClearPath(1, from, target, result.flight).height - 0.35) < 1e-12);
    assert.ok(candidateClearPath(0.5, from, target, result.flight).progress > 0.5);
    assert.ok(candidateClearPath(0.5, from, target, result.flight).height > target.peak);
  }
});

test('full clear contact quality improves from front to centre to rear without forcing a miss', () => {
  const [front, centre, rear] = matrix(1);

  assert.ok(front.canReach && centre.canReach && rear.canReach);
  assert.ok(front.modifier.retreatDistance > centre.modifier.retreatDistance);
  assert.ok(centre.modifier.retreatDistance > rear.modifier.retreatDistance);
  assert.ok(front.modifier.totalLoss > centre.modifier.totalLoss);
  assert.ok(centre.modifier.totalLoss > rear.modifier.totalLoss);
  assert.ok(front.finalQuality < centre.finalQuality);
  assert.ok(centre.finalQuality < rear.finalQuality);
  assert.ok(front.finalQuality < 0.76);
  assert.ok(centre.finalQuality >= 0.76);
  assert.ok(front.finalQuality > 0.18);
});

test('weak clear remains reachable and positioned players retain an early attackable contact', () => {
  const [front, centre, rear] = matrix(0.3);

  assert.ok(front.canReach && centre.canReach && rear.canReach);
  assert.ok(front.selected.elapsed < front.flight);
  assert.ok(front.selected.point.d < front.target.d);
  assert.ok(front.finalQuality > 0.75);
  assert.ok(
    canSmash(
      {
        canReach: front.canReach,
        quality: front.finalQuality,
        height: front.selected.height,
        stretch: front.selected.stretch,
      },
      'clear',
    ),
  );
  assert.ok(front.modifier.totalLoss < matrix(1)[0].modifier.totalLoss);
  assert.equal(centre.modifier.retreatDistance, 0);
  assert.equal(rear.modifier.retreatDistance, 0);
});

test('reduced clear contact quality falls between weak and full for each recovery position', () => {
  const weak = matrix(0.3);
  const reduced = matrix(0.6);
  const full = matrix(1);

  for (let i = 0; i < 3; i += 1) {
    assert.ok(reduced[i].canReach);
    assert.ok(reduced[i].finalQuality < weak[i].finalQuality);
    assert.ok(reduced[i].finalQuality > full[i].finalQuality);
  }
});

test('combined prototype preserves mirrored left/right interception outcomes', () => {
  const leftSource = { x: -0.2, d: from.d };
  const rightSource = { x: 0.2, d: from.d };
  for (const { quality } of levels) {
    const left = evaluateClearContact(recoveryFixture('front-left'), quality, leftSource);
    const right = evaluateClearContact(recoveryFixture('front-right'), quality, rightSource);

    assert.equal(left.canReach, right.canReach);
    assert.equal(left.flight, right.flight);
    assert.equal(left.target.d, right.target.d);
    assert.equal(left.selected.point.x, -right.selected.point.x);
    assert.equal(left.selected.point.d, right.selected.point.d);
    assert.equal(left.finalQuality, right.finalQuality);
    assert.equal(left.modifier.totalLoss, right.modifier.totalLoss);
  }
});

test('production clear trajectory and contact results match the tested prototype', () => {
  const clear = SHOTS.find((shot) => shot.id === 'straight-clear');
  for (const { quality } of levels) {
    const target = shotTarget(clear, from, quality);
    const flight = flightTime('clear', from, target);
    const progress = candidateClearPath(0.7, from, target, flight).progress;
    assert.equal(trajectoryProgress('clear', 0.7), progress);
    assert.equal(
      trajectoryHeight('clear', 0.3, target),
      candidateClearPath(0.3, from, target, flight).height,
    );

    for (const id of ['front-right', 'center-right', 'rear-right']) {
      const receiver = recoveryFixture(id);
      const expected = evaluateClearContact(receiver, quality, from);
      const actual = qualityAt(receiver, target, 'clear', 'neutral', from);

      assert.equal(actual.canReach, expected.canReach);
      assert.equal(actual.elapsed, expected.selected.elapsed);
      assert.equal(actual.point.x, expected.selected.point.x);
      assert.equal(actual.point.d, expected.selected.point.d);
      assert.equal(actual.distance, expected.selected.distance);
      assert.equal(actual.footwork, expected.selected.movementBudget);
      assert.equal(actual.extension, expected.selected.extension);
      assert.equal(actual.baseQuality, expected.existingQuality);
      assert.equal(actual.positioning.totalLoss, expected.modifier.totalLoss);
      assert.equal(actual.quality, expected.finalQuality);
    }
  }
});

test('non-clear trajectories and drop/smash contacts keep their previous model', () => {
  assert.equal(trajectoryProgress('drop', 0.7), 0.7);
  assert.equal(trajectoryProgress('smash', 0.7), 0.7);
  const fromCourt = { x: 0, d: 3.2 };
  const dropTarget = shotTarget(
    SHOTS.find((shot) => shot.id === 'straight-drop'),
    fromCourt,
    0.7,
  );
  const dropContact = qualityAt(
    recoveryFixture('front-right'),
    dropTarget,
    'drop',
    'neutral',
    fromCourt,
  );
  assert.equal(dropContact.positioning, null);
  assert.equal(dropContact.baseQuality, dropContact.quality);
  assert.equal(trajectoryHeight('drop', 1, dropTarget), 0.35);
  assert.equal(trajectoryHeight('smash', 1, { contactHeight: 2.6 }), 0.35);
});
