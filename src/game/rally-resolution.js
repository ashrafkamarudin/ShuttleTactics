import { faultChances } from '../engine/faults.js';
import { qualityAt } from '../engine/interception.js';
import { shotTarget } from '../engine/shots.js';

// Shared by the interactive controller and deterministic rally fixtures. Keep
// random sampling injectable so a fixture can replay the same controller path.
function resolveShotAttempt({ shot, from, quality, target: fixedTarget, random = Math.random }) {
  const target = fixedTarget ?? shotTarget(shot, from, quality);
  const { net, out } = faultChances(shot, quality);
  const roll = random() * 100;
  const fault = roll < net ? 'net' : roll < net + out ? 'out' : null;
  return { target, fault, net, out };
}

function resolveInterception({ receiver, target, shotType, lean, from }) {
  return qualityAt(receiver, target, shotType, lean, from);
}

function resolveRallyContact(striker, interception) {
  if (interception.canReach) return { continues: true, pointWinner: null };
  return {
    continues: false,
    pointWinner: striker,
    reason: 'miss',
  };
}

export { resolveInterception, resolveRallyContact, resolveShotAttempt };
