import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDefense,
  smashHeight,
  smashHeightDerivative,
  smashTarget,
  smashTrajectorySample,
} from './smash-defense-prototype.js';
import { shotTarget } from '../src/engine/shots.js';

const attacker = { x: 0.5, d: 5, height: 2.6 };
const q = 0.92;
const straight = { type: 'smash', cross: false };
const cross = { type: 'smash', cross: true };
const drop = { type: 'drop', cross: false };
const centerRight = { x: 0.35, d: 3.2 };
const rearRight = { x: 1.3, d: 4.8 };
const frontMiddle = { x: 0, d: 1.6 };

test('candidate smash lands in the attacking mid-court band, distinct from drop and clear', () => {
  const smash = smashTarget(straight, attacker, q, { profile: 'mid-court' });
  const original = shotTarget(straight, attacker, q);
  const tightDrop = shotTarget({ type: 'drop' }, attacker, 0.9);
  const normalDrop = shotTarget({ type: 'drop' }, attacker, 0.6);
  const fullClear = shotTarget({ type: 'clear' }, attacker, 0.9);
  assert.ok(smash.d > tightDrop.d && smash.d > normalDrop.d);
  assert.ok(smash.d < fullClear.d);
  assert.ok(original.d < 1, 'production baseline is currently drop-depth');
});

test('frozen Candidate A preserves endpoints, target, and production flight time', () => {
  const target = smashTarget(straight, attacker, q, { profile: 'mid-court' });
  const start = smashTrajectorySample(0, attacker, target);
  const end = smashTrajectorySample(1, attacker, target);
  assert.ok(Math.abs(start.height - attacker.height) < 1e-9);
  assert.ok(Math.abs(end.height - 0.35) < 1e-9);
  assert.ok(Math.abs(end.verticalVelocity) < 3.2);
  assert.ok(smashHeightDerivative(1, target) < 0);
  assert.ok(smashHeight(0.5, target) > 0.35);
  assert.equal(start.flight, end.flight);
  assert.deepEqual({ x: target.x, d: target.d }, { x: 1.85, d: 2.8534550000000003 });
});

test('readiness changes reaction and contact outcome through the same reach/stretch model', () => {
  const neutral = evaluateDefense({
    receiver: frontMiddle,
    from: attacker,
    shot: straight,
    anticipation: 'neutral',
  });
  const correct = evaluateDefense({
    receiver: frontMiddle,
    from: attacker,
    shot: straight,
    anticipation: 'smash-straight',
  });
  const wrong = evaluateDefense({
    receiver: frontMiddle,
    from: attacker,
    shot: straight,
    anticipation: 'smash-cross',
  });
  assert.ok(correct.reaction < neutral.reaction);
  assert.ok(correct.selected.movementBudget > neutral.selected.movementBudget);
  assert.ok(correct.selected.initialProjection > wrong.selected.initialProjection);
  assert.ok(correct.selected.distance !== neutral.selected.distance);
  assert.ok(correct.readinessQuality > neutral.readinessQuality);
  assert.ok(wrong.reaction > correct.reaction);
  assert.ok(wrong.readinessQuality < correct.readinessQuality);
  const neutralCross = evaluateDefense({
    receiver: centerRight,
    from: attacker,
    shot: cross,
    anticipation: 'neutral',
  });
  const wrongCross = evaluateDefense({
    receiver: centerRight,
    from: attacker,
    shot: cross,
    anticipation: 'smash-straight',
  });
  assert.ok(wrongCross.readinessQuality < neutralCross.readinessQuality);
  assert.ok(correct.canReach && wrong.canReach, 'neither anticipation result should be automatic');
});

test('center and rear positions preserve a correct-read advantage without making every attack safe', () => {
  for (const receiver of [centerRight, rearRight]) {
    const neutral = evaluateDefense({
      receiver,
      from: attacker,
      shot: straight,
      anticipation: 'neutral',
    });
    const correct = evaluateDefense({
      receiver,
      from: attacker,
      shot: straight,
      anticipation: 'smash-straight',
    });
    const wrong = evaluateDefense({
      receiver,
      from: attacker,
      shot: straight,
      anticipation: 'smash-cross',
    });
    assert.ok(correct.reaction < neutral.reaction);
    assert.ok(correct.readinessQuality >= neutral.readinessQuality);
    assert.ok(wrong.readinessQuality <= correct.readinessQuality);
  }
  const wideSource = { x: 1, d: 5, height: 2.6 };
  const wideCorrect = evaluateDefense({
    receiver: rearRight,
    from: wideSource,
    shot: cross,
    anticipation: 'smash-cross',
  });
  const wideNeutral = evaluateDefense({
    receiver: rearRight,
    from: wideSource,
    shot: cross,
    anticipation: 'neutral',
  });
  const wideWrong = evaluateDefense({
    receiver: rearRight,
    from: wideSource,
    shot: cross,
    anticipation: 'smash-straight',
  });
  assert.ok(wideCorrect.canReach && wideCorrect.readinessQuality < 0.4);
  assert.ok(!wideNeutral.canReach && !wideWrong.canReach);
});

test('smash-specific readiness trades against a drop and does not alter recovery coordinates', () => {
  const neutral = evaluateDefense({
    receiver: centerRight,
    from: attacker,
    shot: drop,
    anticipation: 'neutral',
  });
  const smashRead = evaluateDefense({
    receiver: centerRight,
    from: attacker,
    shot: drop,
    anticipation: 'smash-straight',
  });
  assert.ok(smashRead.reaction > neutral.reaction);
  assert.deepEqual(centerRight, { x: 0.35, d: 3.2 });
});

test('initial-response sweep keeps target, trajectory, and reaction delays fixed', () => {
  const strengths = [0.1, 0.2, 0.3];
  const results = strengths.map((initialResponseMeters) =>
    evaluateDefense({
      receiver: centerRight,
      from: attacker,
      shot: straight,
      anticipation: 'smash-straight',
      initialResponseMeters,
    }),
  );
  assert.deepEqual(
    results.map((result) => result.reaction),
    [0.04, 0.04, 0.04],
  );
  assert.ok(results.every((result) => result.flight === results[0].flight));
  assert.ok(results.every((result) => result.target.d === results[0].target.d));
  assert.ok(results.every((result) => result.target.x === results[0].target.x));
  assert.ok(results[0].selected.movementBudget <= results[1].selected.movementBudget);
  assert.ok(results[1].selected.movementBudget <= results[2].selected.movementBudget);
});

test('reaction-only control isolates the large part of the correct-read benefit', () => {
  const reactionOnly = evaluateDefense({
    receiver: centerRight,
    from: attacker,
    shot: straight,
    anticipation: 'smash-straight',
    initialResponseMeters: 0,
  });
  const neutral = evaluateDefense({
    receiver: centerRight,
    from: attacker,
    shot: straight,
    anticipation: 'neutral',
  });
  assert.equal(reactionOnly.reaction, 0.04);
  assert.equal(neutral.reaction, 0.22);
  assert.ok(reactionOnly.readinessQuality > neutral.readinessQuality + 0.1);
});

test('left/right mirrored candidate fixtures have equal depth, flight, and contact quality', () => {
  const leftAttacker = { x: -attacker.x, d: attacker.d, height: attacker.height };
  const leftReceiver = { x: -centerRight.x, d: centerRight.d };
  const right = evaluateDefense({
    receiver: centerRight,
    from: attacker,
    shot: cross,
    anticipation: 'smash-cross',
  });
  const left = evaluateDefense({
    receiver: leftReceiver,
    from: leftAttacker,
    shot: { ...cross, cross: true },
    anticipation: 'smash-cross',
  });
  assert.ok(Math.abs(right.target.d - left.target.d) < 1e-9);
  assert.ok(Math.abs(right.flight - left.flight) < 1e-9);
  assert.ok(Math.abs(right.readinessQuality - left.readinessQuality) < 1e-9);
  assert.ok(Math.abs(right.target.x + left.target.x) < 1e-9);
});
