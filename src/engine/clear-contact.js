import { clamp } from './math.js';
import { REACH } from './shuttle.js';

const POSITIONING_PENALTY = { retreat: 0.1, behind: 0.1 };

function clearContactModifier(receiver, point, target, movementBudget) {
  const retreatDistance = Math.max(0, point.d - receiver.d);
  const retreatEffort = clamp(retreatDistance / Math.max(0.01, movementBudget), 0, 1);
  const behindDistance = Math.max(0, point.d - receiver.d - REACH.racket);
  const availableDepth = Math.max(0.01, target.d - receiver.d);
  const behindFraction = clamp(behindDistance / availableDepth, 0, 1);
  const retreatLoss = POSITIONING_PENALTY.retreat * retreatEffort;
  const behindLoss = POSITIONING_PENALTY.behind * behindFraction;

  return {
    retreatDistance,
    retreatEffort,
    behindDistance,
    behindFraction,
    retreatLoss,
    behindLoss,
    totalLoss: retreatLoss + behindLoss,
  };
}

export { clearContactModifier };
