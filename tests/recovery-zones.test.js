import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONES } from '../src/engine/constants.js';
import { qualityAt } from '../src/engine/interception.js';

const zone = (id) => ZONES.find((position) => position.id === id);
const halfway = (start, end) => ({
  x: (start.x + end.x) / 2,
  d: (start.d + end.d) / 2,
});

test('six recovery destinations use the calibrated mirrored positions', () => {
  assert.deepEqual(
    ZONES.map(({ id, x, d }) => ({ id, x, d })),
    [
      { id: 'front-left', x: -1.3, d: 1.6 },
      { id: 'front-right', x: 1.3, d: 1.6 },
      { id: 'center-left', x: -0.35, d: 3.2 },
      { id: 'center-right', x: 0.35, d: 3.2 },
      { id: 'rear-left', x: -1.3, d: 4.8 },
      { id: 'rear-right', x: 1.3, d: 4.8 },
    ],
  );
});

test('front-left recovery improves straight-drop contact versus partial and rear recovery', () => {
  const landing = { x: -1.85, d: 0.62, peak: 1.3 };
  const from = { x: 0, d: 3.2 };
  const balanced = qualityAt(zone('front-left'), landing, 'drop', 'front-left', from);
  const partial = qualityAt(
    halfway(zone('center-left'), zone('front-left')),
    landing,
    'drop',
    'front-left',
    from,
  );
  const rear = qualityAt(zone('rear-left'), landing, 'drop', 'front-left', from);

  assert.ok(balanced.quality > partial.quality);
  assert.ok(partial.quality > rear.quality);
  assert.equal(balanced.canReach, true);
  assert.equal(rear.canReach, false);
});

test('front-right position and anticipation improve a cross-drop interception', () => {
  const landing = { x: 1.85, d: 0.62, peak: 1.3 };
  const from = { x: 0, d: 3.2 };
  const balanced = qualityAt(zone('front-right'), landing, 'drop', 'front-right', from);
  const partial = qualityAt(
    halfway(zone('front-left'), zone('front-right')),
    landing,
    'drop',
    'front-right',
    from,
  );
  const wrongPosition = qualityAt(zone('front-left'), landing, 'drop', 'front-right', from);
  const wrongAnticipation = qualityAt(zone('front-left'), landing, 'drop', 'front-left', from);

  assert.ok(balanced.quality > partial.quality);
  assert.ok(partial.quality > wrongPosition.quality);
  assert.ok(wrongPosition.quality > wrongAnticipation.quality);
});

test('rear recovery handles a deep clear but not a tight front drop', () => {
  const from = { x: 0, d: 3.2 };
  const deepClearTarget = { x: -1.85, d: 5.9, peak: 5 };
  const deepClearStates = [
    zone('rear-left'),
    halfway(zone('center-left'), zone('rear-left')),
    zone('front-left'),
  ].map((receiver) => qualityAt(receiver, deepClearTarget, 'clear', 'rear-left', from));
  const deepClear = deepClearStates[0];
  const tightDrop = qualityAt(
    zone('rear-left'),
    { x: -1.85, d: 0.62, peak: 1.3 },
    'drop',
    'front-left',
    from,
  );

  assert.ok(deepClearStates.every((result) => result.canReach));
  assert.ok(deepClear.height >= 2.2);
  assert.equal(tightDrop.canReach, false);
});

test('consecutive net exchanges reward reaching the opposite front corner in time', () => {
  const from = { x: 0, d: 3.2 };
  const first = qualityAt(
    zone('front-left'),
    { x: -1.85, d: 0.62, peak: 1.3 },
    'drop',
    'front-left',
    from,
  );
  const nextLanding = { x: 1.85, d: 0.62, peak: 1.3 };
  const stillMoving = qualityAt(first.feet, nextLanding, 'drop', 'front-right', from);
  const recovered = qualityAt(zone('front-right'), nextLanding, 'drop', 'front-right', from);
  const outOfPosition = qualityAt(zone('rear-left'), nextLanding, 'drop', 'front-right', from);

  assert.ok(first.quality >= 0.76);
  assert.ok(recovered.quality > stillMoving.quality);
  assert.equal(recovered.canReach, true);
  assert.equal(stillMoving.canReach, false);
  assert.equal(outOfPosition.canReach, false);
});

test('centre recovery shades its side against a straight smash', () => {
  const from = { x: 0, d: 4.8 };
  const centralBase = { x: 0, d: 3.2 };
  const leftTarget = { x: -1.85, d: 0.6, power: 0.8, contactHeight: 2.8 };
  const rightTarget = { ...leftTarget, x: 1.85 };
  const recoveryStates = [zone('center-left'), centralBase, zone('center-right')];

  for (const receiver of recoveryStates) {
    const againstLeft = qualityAt(receiver, leftTarget, 'smash', 'front-left', from);
    const againstRight = qualityAt(receiver, rightTarget, 'smash', 'front-right', from);
    const mirroredReceiver = { ...receiver, x: -receiver.x };
    const mirroredAgainstLeft = qualityAt(
      mirroredReceiver,
      rightTarget,
      'smash',
      'front-right',
      from,
    );
    const mirroredAgainstRight = qualityAt(
      mirroredReceiver,
      leftTarget,
      'smash',
      'front-left',
      from,
    );

    assert.ok(againstLeft.distance >= 0 && againstRight.distance >= 0);
    assert.ok(Math.abs(againstLeft.distance - mirroredAgainstLeft.distance) < 1e-12);
    assert.ok(Math.abs(againstRight.distance - mirroredAgainstRight.distance) < 1e-12);
  }

  const leftPositionAgainstLeft = qualityAt(
    zone('center-left'),
    leftTarget,
    'smash',
    'front-left',
    from,
  );
  const rightPositionAgainstLeft = qualityAt(
    zone('center-right'),
    leftTarget,
    'smash',
    'front-left',
    from,
  );
  assert.ok(leftPositionAgainstLeft.distance < rightPositionAgainstLeft.distance);
});

test('front, centre, and rear states produce ordered movement demands against a full clear', () => {
  const landing = { x: -1.85, d: 5.9, peak: 5 };
  const from = { x: 0, d: 3.2 };
  const front = qualityAt(zone('front-left'), landing, 'clear', 'rear-left', from);
  const partial = qualityAt(
    halfway(zone('front-left'), zone('center-left')),
    landing,
    'clear',
    'rear-left',
    from,
  );
  const center = qualityAt(zone('center-left'), landing, 'clear', 'rear-left', from);
  const rear = qualityAt(zone('rear-left'), landing, 'clear', 'rear-left', from);

  assert.ok(front.distance > partial.distance);
  assert.ok(partial.distance > center.distance);
  assert.ok(center.distance > rear.distance);
  assert.equal(front.canReach, true);
  assert.equal(rear.canReach, true);
});

test('a correct rear anticipation improves clear contact quality', () => {
  const receiver = zone('rear-left');
  const landing = { x: -1.85, d: 5.9, peak: 5 };
  const from = { x: 0, d: 3.2 };
  const correct = qualityAt(receiver, landing, 'clear', 'rear-left', from);
  const wrong = qualityAt(receiver, landing, 'clear', 'front-left', from);

  assert.equal(correct.canReach, true);
  assert.equal(wrong.canReach, true);
  assert.ok(correct.reaction < wrong.reaction);
  assert.ok(correct.footwork > wrong.footwork);
  assert.ok(correct.quality > wrong.quality);
});

test('rear, partial, and front recovery states become progressively safer against a tight drop', () => {
  const landing = { x: -1.85, d: 0.62, peak: 1.3 };
  const from = { x: 0, d: 3.2 };
  const rear = qualityAt(zone('rear-left'), landing, 'drop', 'front-left', from);
  const partial = qualityAt(
    halfway(zone('rear-left'), zone('front-left')),
    landing,
    'drop',
    'front-left',
    from,
  );
  const front = qualityAt(zone('front-left'), landing, 'drop', 'front-left', from);

  assert.ok(rear.distance > partial.distance);
  assert.ok(partial.distance > front.distance);
  assert.equal(rear.canReach, false);
  assert.equal(front.canReach, true);
});

test('mirrored front-corner scenarios have matching interception outcomes', () => {
  const from = { x: 0, d: 3.2 };
  const left = qualityAt(
    zone('front-left'),
    { x: -1.85, d: 0.62, peak: 1.3 },
    'drop',
    'front-left',
    from,
  );
  const right = qualityAt(
    zone('front-right'),
    { x: 1.85, d: 0.62, peak: 1.3 },
    'drop',
    'front-right',
    from,
  );

  assert.equal(left.canReach, right.canReach);
  assert.ok(Math.abs(left.quality - right.quality) < 1e-12);
  assert.ok(Math.abs(left.elapsed - right.elapsed) < 1e-12);
});
