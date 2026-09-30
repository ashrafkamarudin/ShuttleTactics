import { clamp, dist } from '../src/engine/math.js';
import { LEANS, PRESSURE, ZONES } from '../src/engine/constants.js';
import { shotTarget } from '../src/engine/shots.js';
import {
  MOVEMENT_SPEED,
  DROP,
  REACH,
  flightTime,
  leanDelay,
  racketReach,
  trajectoryHeight,
} from '../src/engine/shuttle.js';

const ATTACK_DEPTHS = {
  minimumNonDrop: PRESSURE.clearMinDepth,
  courtCentre: ZONES.find((zone) => zone.id === 'center-right').d,
};
const SHOT_READINESS = {
  exactSmash: -0.08,
  oppositeSmash: 0.22,
  clear: 0.12,
  drop: 0.17,
  exactInitialMovement: 0.3,
  mismatchInitialMovement: 0.15,
};

function initialMovement(lean, distance) {
  if (lean === 'neutral' || distance === 0) return null;
  const vector = LEANS.find((item) => item.id === lean) ?? { x: 0, z: 0 };
  const magnitude = Math.hypot(vector.x, vector.z) || 1;
  return { x: (vector.x / magnitude) * distance, z: (vector.z / magnitude) * distance };
}

function smashTarget(shot, from, quality, { profile = 'current', depth = null } = {}) {
  const target = shotTarget(shot, from, quality);
  if (profile === 'mid-court') target.d = depth ?? ATTACK_DEPTHS.courtCentre - target.power * 0.45;
  if (profile === 'minimum-non-drop') target.d = depth ?? ATTACK_DEPTHS.minimumNonDrop;
  return target;
}

function smashHeight(t, target) {
  const launch = target.contactHeight ?? 2.2;
  const landing = 0.35;
  const delta = landing - launch;
  // Frozen Candidate A: quadratic with a controlled terminal descent.
  const terminalSlope = -1.4;
  const initialSlope = 2 * delta - terminalSlope;
  return launch + initialSlope * t + ((terminalSlope - initialSlope) * t ** 2) / 2;
}

function smashHeightDerivative(t, target) {
  const launch = target.contactHeight ?? 2.2;
  const landing = 0.35;
  const delta = landing - launch;
  const terminalSlope = -1.4;
  const initialSlope = 2 * delta - terminalSlope;
  return initialSlope + (terminalSlope - initialSlope) * t;
}

function smashTrajectorySample(t, from, target) {
  const flight = flightTime('smash', from, target);
  const horizontalDistance = Math.hypot(target.x - from.x, target.d + from.d);
  const verticalVelocity = smashHeightDerivative(t, target) / flight;
  const horizontalVelocity = horizontalDistance / flight;
  return {
    t,
    time: flight * t,
    x: from.x + (target.x - from.x) * t,
    courtDepth: -from.d + (from.d + target.d) * t,
    height: smashHeight(t, target),
    horizontalVelocity,
    verticalVelocity,
    descentVelocity: Math.min(0, verticalVelocity),
    trajectoryAngle: (Math.atan2(verticalVelocity, horizontalVelocity) * 180) / Math.PI,
    remainingDistance: (1 - t) * horizontalDistance,
    flight,
    horizontalDistance,
  };
}

function expectedLean(receiver, target) {
  const dx = target.x - receiver.x;
  const dz = target.d - receiver.d;
  const length = Math.hypot(dx, dz) || 1;
  const direction = { x: dx / length, z: dz / length };
  return LEANS.filter((lean) => lean.id !== 'neutral').reduce(
    (best, lean) => {
      const score = (lean.x * direction.x + lean.z * direction.z) / Math.SQRT2;
      return score > best.score ? { id: lean.id, score } : best;
    },
    { id: 'front-left', score: -Infinity },
  ).id;
}

function smashDirection(from, target) {
  const attackerSide = from.x >= 0 ? 1 : -1;
  return Math.sign(target.x) === attackerSide ? 'straight' : 'cross';
}

function prototypeReaction(
  anticipation,
  receiver,
  actualShot,
  from,
  target,
  profile,
  initialResponseMeters = SHOT_READINESS.exactInitialMovement,
) {
  if (anticipation === 'neutral') {
    return {
      delay: leanDelay('neutral', receiver, target),
      lean: 'neutral',
      adjustment: 0,
      match: 'neutral',
      initialMovement: null,
    };
  }
  if (!anticipation.startsWith('smash-')) {
    return {
      delay: leanDelay(anticipation, receiver, target),
      lean: anticipation,
      adjustment: 0,
      match: 'existing-directional',
      initialMovement: initialMovement(anticipation, 0.16),
    };
  }

  const expectedDirection = anticipation.slice('smash-'.length);
  const expectedDepth =
    profile === 'current'
      ? target.d
      : profile === 'minimum-non-drop'
        ? ATTACK_DEPTHS.minimumNonDrop
        : ATTACK_DEPTHS.courtCentre - (target.power ?? 0) * 0.45;
  const anticipatedTarget = {
    x: expectedDirection === 'straight' ? (from.x >= 0 ? 1.85 : -1.85) : from.x >= 0 ? -1.85 : 1.85,
    d: expectedDepth,
  };
  const lean = expectedLean(receiver, anticipatedTarget);
  const directionalDelay = leanDelay(lean, receiver, anticipatedTarget);

  if (actualShot.type === 'smash') {
    const exact = smashDirection(from, target) === expectedDirection;
    const adjustment = exact ? SHOT_READINESS.exactSmash : SHOT_READINESS.oppositeSmash;
    return {
      delay: clamp(directionalDelay + adjustment, exact ? 0.04 : 0.09, 0.39),
      lean,
      directionalDelay,
      adjustment,
      match: exact ? 'exact-smash' : 'opposite-smash',
      initialMovement: initialMovement(lean, initialResponseMeters),
    };
  }
  const adjustment = actualShot.type === 'drop' ? SHOT_READINESS.drop : SHOT_READINESS.clear;
  return {
    delay: clamp(directionalDelay + adjustment, 0.09, 0.39),
    lean,
    directionalDelay,
    adjustment,
    match: actualShot.type === 'drop' ? 'soft-shot-mismatch' : 'clear-mismatch',
    initialMovement: initialMovement(lean, SHOT_READINESS.mismatchInitialMovement),
  };
}

function evaluateDefense({
  receiver,
  from,
  shot,
  quality = 0.92,
  anticipation = 'neutral',
  targetProfile = 'mid-court',
  targetDepth = null,
  initialResponseMeters = 0.3,
}) {
  const target =
    shot.type === 'smash'
      ? smashTarget(shot, from, quality, { profile: targetProfile, depth: targetDepth })
      : shotTarget(shot, from, quality);
  const flight = flightTime(shot.type, from, target);
  const readiness = prototypeReaction(
    anticipation,
    receiver,
    shot,
    from,
    target,
    targetProfile,
    initialResponseMeters,
  );
  const reaction = readiness.delay;
  const samples = [];
  let nearest = null;

  for (let i = 6; i <= 99; i += 1) {
    const t = i / 100;
    const elapsed = flight * t;
    const netFraction = from.d / (from.d + target.d);
    if (t < netFraction + 0.025) continue;
    const progressAfterNet = (t - netFraction) / (1 - netFraction);
    const point = {
      x: from.x + (target.x - from.x) * t,
      d: Math.max(0.12, target.d * progressAfterNet),
    };
    const height =
      shot.type === 'smash' ? smashHeight(t, target) : trajectoryHeight(shot.type, t, target);
    if (height < 0.32 || height > 3.05) continue;

    const distance = dist(receiver, point);
    const movementTime = Math.max(0, elapsed - reaction);
    const desiredDistance = dist(receiver, point) || 1;
    const direction = {
      x: (point.x - receiver.x) / desiredDistance,
      z: (point.d - receiver.d) / desiredDistance,
    };
    const initialProjection = readiness.initialMovement
      ? readiness.initialMovement.x * direction.x + readiness.initialMovement.z * direction.z
      : 0;
    const movementBudget = Math.max(0, movementTime * MOVEMENT_SPEED + initialProjection);
    const extension = racketReach(receiver, point);
    const reach = movementBudget + extension;
    const candidate = {
      point,
      distance,
      reach,
      movementBudget,
      initialProjection,
      extension,
      height,
      t,
      elapsed,
      margin: reach - distance,
    };
    if (!nearest || candidate.margin > nearest.margin) nearest = candidate;
    if (distance <= reach) samples.push(candidate);
  }

  if (!samples.length) {
    return {
      target,
      flight,
      reaction,
      readiness,
      earliestReachable: null,
      selected: nearest,
      canReach: false,
      baseQuality: 0.15,
      readinessQuality: 0.15,
      returned: false,
    };
  }

  const earliestReachable = samples[0];
  const selected =
    samples.find((sample) => sample.margin > 0.42) ?? samples[Math.min(3, samples.length - 1)];
  const stretch = clamp(
    (selected.distance - selected.movementBudget) / Math.max(0.01, selected.extension),
    0,
    1,
  );
  const timing = clamp((flight - selected.elapsed) / flight, 0, 1);
  const baseQuality = clamp(
    0.86 + 0.18 * timing - 0.46 * stretch - (selected.height < 0.65 ? 0.13 : 0),
    0.18,
    1,
  );

  // Readiness changes only when movement begins. Quality still comes from the
  // same timing, movement budget, reach, stretch, and contact-height formula.
  const readinessQuality = baseQuality;
  const landingZone =
    target.d <= DROP.looseLanding
      ? 'drop/front-court'
      : target.d < 5.5
        ? 'attacking-mid-court'
        : 'deep-court';
  const movementFraction = selected.distance
    ? Math.min(1, selected.movementBudget / selected.distance)
    : 1;
  const feet = {
    x: receiver.x + (selected.point.x - receiver.x) * movementFraction,
    d: receiver.d + (selected.point.d - receiver.d) * movementFraction,
  };
  return {
    target,
    flight,
    reaction,
    readiness,
    earliestReachable,
    selected: { ...selected, stretch, feet },
    canReach: true,
    baseQuality,
    readinessQuality,
    returned: true,
    diagnostics: {
      horizontalTargetDistance: Math.abs(target.x - from.x),
      totalHorizontalDistance: Math.hypot(target.x - from.x, target.d + from.d),
      margin: selected.margin,
      highContact: selected.height >= 2.2,
      landingZone,
      unusedBaseRacketReach: REACH.racket,
    },
  };
}

export {
  ATTACK_DEPTHS,
  evaluateDefense,
  expectedLean,
  prototypeReaction,
  smashHeight,
  smashHeightDerivative,
  smashTarget,
  smashTrajectorySample,
};
