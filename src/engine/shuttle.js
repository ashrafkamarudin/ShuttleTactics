import { clamp } from './math.js';
import { LEANS } from './constants.js';
const MOVEMENT_SPEED = 3.65,
  GAME_TIME_SCALE = 0.82,
  MIN_SHOT_ANIMATION_MS = 700;
const REACH = { racket: 0.65, frontLunge: 0.85, sideLunge: 0.25, backLunge: 0.15 };
const DROP = {
  tightLanding: 0.62,
  normalLanding: 1.15,
  looseLanding: 1.75,
  tightPeak: 1.3,
  normalPeak: 1.65,
  loosePeak: 2.05,
};
function flightTime(type, from = { x: 0, d: 3.2 }, landing = { x: 0, d: 4 }) {
  const length = Math.hypot(landing.x - from.x, landing.d + from.d);
  if (type === 'smash') {
    const speed = 11 + (landing.power ?? 0.45) * 9;
    return clamp(length / speed + 0.08, 0.32, 0.8);
  }
  const speed =
    type === 'clear'
      ? 5.0
      : type === 'serve-deep'
        ? 5.3
        : type === 'serve-mid'
          ? 5.7
          : type === 'serve-short'
            ? 5.4
            : 7.5;
  return clamp(
    length / speed + (type === 'clear' ? 0.28 : type === 'serve-deep' ? 0.18 : 0.12),
    type === 'clear' ? 1.3 : 0.55,
    type === 'clear' ? 3.15 : 2.2,
  );
}
function leanDelay(lean, receiver, landing) {
  const l = LEANS.find((v) => v.id === lean) || LEANS[2];
  // Relative to the receiver's actual position, not just the nominal target corner.
  const dx = landing.x - receiver.x,
    dz = landing.d - receiver.d;
  const magnitude = Math.hypot(dx, dz) || 1;
  const alignment = (l.x * dx + l.z * dz) / (Math.SQRT2 * magnitude);
  return lean === 'neutral' ? 0.22 : clamp(0.22 - 0.16 * alignment, 0.09, 0.39);
}
function trajectoryHeight(type, t, target = {}) {
  if (type === 'smash') {
    const contactHeight = target.contactHeight ?? 2.2;
    return contactHeight * (1 - t) + 0.35 * t - 0.24 * 4 * t * (1 - t);
  }
  const peak =
    target.peak ??
    (type === 'clear' || type === 'serve-deep' ? 5.0 : type === 'serve-mid' ? 2.7 : 1.65);
  return 0.75 * (1 - t) + 0.35 * t + peak * 4 * t * (1 - t);
}
// Frontcourt lunges reach ahead of the feet; side and rear reaches are smaller.
// A racket can contact the shuttle without the player's feet reaching its XY point.
function racketReach(receiver, point) {
  const dx = Math.abs(point.x - receiver.x),
    dz = point.d - receiver.d;
  return (
    REACH.racket +
    (dz < -0.2 ? REACH.frontLunge : dz > 0.2 ? REACH.backLunge : 0) +
    (dx > 0.45 ? REACH.sideLunge : 0)
  );
}

export {
  MOVEMENT_SPEED,
  GAME_TIME_SCALE,
  MIN_SHOT_ANIMATION_MS,
  REACH,
  DROP,
  flightTime,
  leanDelay,
  trajectoryHeight,
  racketReach,
};
