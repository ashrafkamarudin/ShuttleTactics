import { clamp, dist } from '../src/engine/math.js';
import { ZONES } from '../src/engine/constants.js';
import { shotTarget } from '../src/engine/shots.js';
import {
  MOVEMENT_SPEED,
  REACH,
  flightTime,
  leanDelay,
  racketReach,
  trajectoryHeight,
} from '../src/engine/shuttle.js';

const CLEAR = { type: 'clear', cross: false };
const RETREAT_PENALTY = 0.1;
const BEHIND_PENALTY = 0.1;

function candidateClearPath(t, from, target, flight) {
  const progress = 1 - (1 - t) ** 1.4;
  const progressRate = 1.4 * (1 - t) ** 0.4;
  const peak = target.peak + 0.55;
  let height;
  let heightRate;

  if (t <= 0.3) {
    const u = t / 0.3;
    height = 0.75 + (peak - 0.75) * (1 - (1 - u) ** 2);
    heightRate = (2 * (peak - 0.75) * (1 - u)) / 0.3;
  } else if (t <= 0.7) {
    const u = (t - 0.3) / 0.4;
    height = peak - 0.15 * (3 * u ** 2 - 2 * u ** 3);
    heightRate = (-0.15 * 6 * u * (1 - u)) / 0.4;
  } else {
    const u = (t - 0.7) / 0.3;
    height = peak - 0.15 + (0.35 - (peak - 0.15)) * u ** 2;
    heightRate = (2 * (0.35 - (peak - 0.15)) * u) / 0.3;
  }

  return {
    progress,
    point: {
      x: from.x + (target.x - from.x) * progress,
      d: -from.d + (from.d + target.d) * progress,
    },
    height,
    velocity: {
      x: ((target.x - from.x) * progressRate) / flight,
      d: ((from.d + target.d) * progressRate) / flight,
      y: heightRate / flight,
    },
  };
}

function evaluateClearContact(receiver, quality, from, lean = 'neutral') {
  const target = shotTarget(CLEAR, from, quality);
  const flight = flightTime('clear', from, target);
  const reaction = leanDelay(lean, receiver, target);
  const samples = [];
  let closest = null;

  for (let i = 6; i <= 99; i += 1) {
    const t = i / 100;
    const elapsed = flight * t;
    const path = candidateClearPath(t, from, target, flight);
    const point = path.point;
    const height = path.height;
    const netFraction = from.d / (from.d + target.d);
    const netCrossingTime = 1 - (1 - netFraction) ** (1 / 1.4);
    if (t < netCrossingTime + 0.025) continue;
    if (point.d < 0.12 || height < 0.32 || height > 3.05 || point.d < 1.75) continue;

    const distance = dist(receiver, point);
    const movementBudget = Math.max(0, elapsed - reaction) * MOVEMENT_SPEED;
    const extension = racketReach(receiver, point);
    const reach = movementBudget + extension;
    const candidate = {
      point,
      distance,
      reach,
      movementBudget,
      extension,
      height,
      t,
      elapsed,
      margin: reach - distance,
    };
    if (!closest || candidate.margin > closest.margin) closest = candidate;
    if (distance <= reach) samples.push(candidate);
  }

  if (!samples.length) {
    return {
      canReach: false,
      target,
      flight,
      reaction,
      nearest: closest,
      earliestReachable: null,
      selected: closest,
      existingQuality: 0.15,
      modifier: {
        retreatEffort: 0,
        behindFraction: 0,
        retreatLoss: 0,
        behindLoss: 0,
        totalLoss: 0,
      },
      finalQuality: 0.15,
    };
  }

  const earliestReachable = samples[0];
  const selected =
    samples.find((sample) => sample.margin > 0.42) ?? samples[Math.min(3, samples.length - 1)];
  const timing = clamp((flight - selected.elapsed) / flight, 0, 1);
  const stretch = clamp(
    (selected.distance - selected.movementBudget) / Math.max(0.01, selected.extension),
    0,
    1,
  );
  const lowHeightLoss = selected.height < 0.65 ? 0.13 : 0;
  const existingQuality = clamp(0.86 + 0.18 * timing - 0.46 * stretch - lowHeightLoss, 0.18, 1);

  // Retreat rate is expressed as a share of the movement capacity available
  // before contact, not as a fixed distance threshold.
  const retreatDistance = Math.max(0, selected.point.d - receiver.d);
  const retreatEffort = clamp(retreatDistance / Math.max(0.01, selected.movementBudget), 0, 1);

  // The racket's existing reach is the comfortable forward allowance from the
  // receiver's starting/recovery depth. Beyond it, the shuttle is behind that
  // ideal overhead position and requires the receiver to get underneath it.
  const behindDistance = Math.max(0, selected.point.d - receiver.d - REACH.racket);
  const availableDepth = Math.max(0.01, target.d - receiver.d);
  const behindFraction = clamp(behindDistance / availableDepth, 0, 1);
  const retreatLoss = RETREAT_PENALTY * retreatEffort;
  const behindLoss = BEHIND_PENALTY * behindFraction;
  const totalLoss = Math.min(existingQuality, retreatLoss + behindLoss);

  const movedFeet = selected.distance
    ? Math.min(1, selected.movementBudget / selected.distance)
    : 1;
  selected.feet = {
    x: receiver.x + (selected.point.x - receiver.x) * movedFeet,
    d: receiver.d + (selected.point.d - receiver.d) * movedFeet,
  };
  selected.stretch = stretch;
  selected.qualityParts = {
    timingCredit: 0.18 * timing,
    stretchLoss: 0.46 * stretch,
    lowHeightLoss,
  };

  return {
    canReach: true,
    target,
    flight,
    reaction,
    earliestReachable,
    selected,
    existingQuality,
    modifier: {
      retreatDistance,
      retreatEffort,
      behindDistance,
      behindFraction,
      retreatLoss,
      behindLoss,
      totalLoss,
    },
    finalQuality: clamp(existingQuality - totalLoss, 0.18, 1),
  };
}

function recoveryFixture(id) {
  return ZONES.find((zone) => zone.id === id);
}

export { candidateClearPath, evaluateClearContact, recoveryFixture };
