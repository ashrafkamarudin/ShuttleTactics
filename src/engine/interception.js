import { clamp, dist } from './math.js';
import { MOVEMENT_SPEED, flightTime, leanDelay, trajectoryHeight, racketReach } from './shuttle.js';

/**
 * Estimate whether a receiver can contact a shuttle and the quality of that contact.
 *
 * @param {{x: number, d: number}} receiver Current player position in court coordinates.
 * @param {{x: number, d: number}} landing Shuttle landing target in court coordinates.
 * @param {string} shotType Stroke type, used to calculate flight and trajectory.
 * @param {string} lean Anticipation choice that affects reaction delay.
 * @param {{x: number, d: number}} from Position from which the shot was hit.
 * @returns {object} Interception timing, reach, contact point, and quality details.
 */
function qualityAt(receiver, landing, shotType, lean = 'neutral', from = { x: 0, d: 3.2 }) {
  const flight = flightTime(shotType, from, landing),
    reaction = leanDelay(lean, receiver, landing);
  const clear = shotType === 'clear' || shotType === 'serve-deep';
  const samples = [];
  let closest = null;
  for (let i = 6; i <= 99; i++) {
    const t = i / 100,
      elapsed = flight * t;
    // The trajectory crosses the net at this fraction of its front-to-back travel.
    const netFraction = from.d / (from.d + landing.d);
    if (t < netFraction + 0.025) continue;
    const progress = (t - netFraction) / (1 - netFraction);
    const point = { x: from.x + (landing.x - from.x) * t, d: Math.max(0.12, landing.d * progress) };
    const height = trajectoryHeight(shotType, t, landing);
    if (height < 0.32 || height > 3.05) continue;
    if (clear && point.d < 1.75) continue;
    const distance = dist(receiver, point),
      footwork = Math.max(0, elapsed - reaction) * MOVEMENT_SPEED;
    const extension = racketReach(receiver, point);
    const reach = footwork + extension;
    const candidate = {
      point,
      distance,
      reach,
      footwork,
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
    const v = closest || {
      point: landing,
      distance: dist(receiver, landing),
      reach: 0,
      elapsed: flight,
      height: 0,
    };
    return { ...v, canReach: false, quality: 0.15, flight, reaction, contact: 'miss' };
  }
  // The first comfortable interception beats waiting until the shuttle falls too low.
  const best = samples.find((v) => v.margin > 0.42) || samples[Math.min(3, samples.length - 1)];
  const feetFraction = best.distance ? Math.min(1, best.footwork / best.distance) : 1;
  best.feet = {
    x: receiver.x + (best.point.x - receiver.x) * feetFraction,
    d: receiver.d + (best.point.d - receiver.d) * feetFraction,
  };
  const stretch = clamp((best.distance - best.footwork) / Math.max(0.01, best.extension), 0, 1);
  const timing = clamp((flight - best.elapsed) / flight, 0, 1);
  const quality = clamp(
    0.86 + 0.18 * timing - 0.46 * stretch - (best.height < 0.65 ? 0.13 : 0),
    0.18,
    1,
  );
  const contact = quality >= 0.76 ? 'comfortable' : quality >= 0.48 ? 'stretched' : 'late';
  return { ...best, canReach: true, quality, contact, stretch, flight, reaction };
}

export { qualityAt };
