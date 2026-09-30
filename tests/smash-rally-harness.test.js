import test from 'node:test';
import assert from 'node:assert/strict';
import { batchScenario, simulateRally } from './smash-rally-harness.js';
import { qualityAt } from '../src/engine/interception.js';
import { expectedLean, smashTarget } from './smash-defense-prototype.js';
import { faultChances } from '../src/engine/faults.js';
import { shotTarget } from '../src/engine/shots.js';
import {
  resolveInterception,
  resolveRallyContact,
  resolveShotAttempt,
} from '../src/game/rally-resolution.js';

const scenarios = {
  A: { incomingType: 'smash', smashDirection: 'straight', receiver: { x: 0.35, d: 3.2 } },
  B: { incomingType: 'smash', smashDirection: 'cross', receiver: { x: 0.35, d: 3.2 } },
  C: { incomingType: 'smash', smashDirection: 'straight', receiver: { x: 1.3, d: 4.8 } },
  D: {
    incomingType: 'smash',
    smashDirection: 'cross',
    attackerX: 1,
    receiver: { x: 1.3, d: 4.8 },
  },
  E: { incomingType: 'drop', smashDirection: 'straight', receiver: { x: 0.35, d: 3.2 } },
};

const reads = {
  A: ['neutral', 'smash-straight', 'smash-cross'],
  B: ['neutral', 'smash-cross', 'smash-straight'],
  C: ['neutral', 'smash-straight', 'smash-cross'],
  D: ['neutral', 'smash-cross', 'smash-straight'],
  E: ['neutral', 'smash-straight', 'smash-cross'],
};

test('controller seam preserves production target, fault roll, interception, and point mapping', () => {
  const shot = { id: 'straight-clear', type: 'clear', cross: false };
  const from = { x: 0.4, d: 2.8, height: 1.6 };
  const quality = 0.57;
  const roll = 0.031;
  const attempt = resolveShotAttempt({ shot, from, quality, random: () => roll });
  const risks = faultChances(shot, quality);
  assert.deepEqual(attempt.target, shotTarget(shot, from, quality));
  assert.deepEqual({ net: attempt.net, out: attempt.out }, risks);
  assert.equal(
    attempt.fault,
    roll * 100 < risks.net ? 'net' : roll * 100 < risks.net + risks.out ? 'out' : null,
  );

  const receiver = { x: 0.35, d: 3.2 };
  const direct = qualityAt(receiver, attempt.target, shot.type, 'neutral', from);
  const throughSeam = resolveInterception({
    receiver,
    target: attempt.target,
    shotType: shot.type,
    lean: 'neutral',
    from,
  });
  assert.deepEqual(throughSeam, direct);
  assert.deepEqual(resolveRallyContact('cpu', { canReach: false }), {
    continues: false,
    pointWinner: 'cpu',
    reason: 'miss',
  });
  assert.deepEqual(resolveRallyContact('player', { canReach: true }), {
    continues: true,
    pointWinner: null,
  });
});

test('controller-path harness uses production smash eligibility and preserves recovery position', () => {
  const scenario = scenarios.A;
  const originalReceiver = { ...scenario.receiver };
  const result = simulateRally({ scenario, anticipation: 'smash-straight', seed: 19 });
  assert.equal(result.eligible, true);
  assert.ok(result.attackerEligibility.quality >= 0.75);
  assert.ok(result.attackerEligibility.height >= 2.2);
  assert.deepEqual(result.target, { x: 1.85, d: 2.8534550000000003 });
  assert.deepEqual(scenario.receiver, originalReceiver);
  assert.ok(result.reception.canReach);
  assert.ok(result.firstReturn);
  assert.ok(result.firstReturn.target.d >= 2.45);
  assert.ok(result.opponentReception);
  assert.ok(['player', 'cpu', null].includes(result.pointWinner));
});

test('wide correct-read cross smash remains a production-path miss at the 0.10m response', () => {
  const result = simulateRally({ scenario: scenarios.D, anticipation: 'smash-cross', seed: 7 });
  assert.equal(result.target.x, -1.85);
  assert.equal(result.reception.canReach, false);
  assert.equal(result.outcome, 'smash-winner');
  assert.equal(result.pointWinner, 'cpu');

  // Independently run the production interception sampler against the frozen
  // target. It uses the currently shipped vertical curve and directional lean,
  // because Candidate A/readiness are intentionally not installed in production.
  const from = { x: 1, d: 5, height: 2.6 };
  const receiver = scenarios.D.receiver;
  const target = smashTarget({ type: 'smash', cross: true }, from, 0.92, { profile: 'mid-court' });
  const lean = expectedLean(receiver, target);
  const productionPath = qualityAt(receiver, target, 'smash', lean, from);
  assert.equal(productionPath.canReach, false);
});

test('100 seeded rally trials are repeatable and compare the complete required fixture set', () => {
  for (const [key, scenario] of Object.entries(scenarios)) {
    for (const anticipation of reads[key]) {
      const first = batchScenario({ scenario, anticipation, trials: 100 });
      const second = batchScenario({ scenario, anticipation, trials: 100 });
      assert.deepEqual(first, second, `${key}/${anticipation} should be deterministic`);
      assert.equal(first.trials, 100);
      assert.equal(
        first.receptionMiss + first.weakContact + first.mediumContact + first.goodContact,
        100,
      );
      assert.equal(first.playerPoints + first.cpuPoints + first.continues, 100);
    }
  }
});

test('smash-specific reads remain a readiness choice against a front-court drop', () => {
  const neutral = simulateRally({ scenario: scenarios.E, anticipation: 'neutral', seed: 3 });
  const straightRead = simulateRally({
    scenario: scenarios.E,
    anticipation: 'smash-straight',
    seed: 3,
  });
  const crossRead = simulateRally({ scenario: scenarios.E, anticipation: 'smash-cross', seed: 3 });
  assert.equal(neutral.target.d, 0.62);
  assert.ok(
    neutral.reception.canReach && straightRead.reception.canReach && crossRead.reception.canReach,
  );
  assert.ok(neutral.reception.quality > straightRead.reception.quality);
  assert.ok(straightRead.reception.quality > crossRead.reception.quality);
});
