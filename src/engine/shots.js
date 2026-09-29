import { clamp } from './math.js';
import { PRESSURE } from './constants.js';
import { DROP } from './shuttle.js';
import { smashPower } from './smash.js';
function destination(shot, from) {
  // Opponent's left/right is measured in shared world x coordinates.
  const side = from.x >= 0 ? 1 : -1;
  return {
    x: clamp((shot.cross ? -side : side) * 1.85, -2.25, 2.25),
    d: shot.type === 'clear' ? 5.9 : 1.15,
  };
}
// Comfortable contact allows a tighter drop. A stretched/late return tends to float
// higher and deeper. No random quality roll: interception determines the trajectory.
function shotTarget(shot, from, quality = 1) {
  const target = destination(shot, from);
  const q = clamp(quality, 0, 1);
  if (shot.type === 'smash') {
    target.power = smashPower(q, from.height ?? 2.2);
    target.contactHeight = from.height ?? 2.2;
    target.d = 0.45 + (1 - target.power) * 0.45;
    return target;
  }
  if (shot.type === 'clear') {
    // A desperate clear falls short: the opponent can intercept earlier, while
    // the hitter still has to recover from the actual lunge position.
    const power = clamp((q - 0.18) / 0.67, 0, 1);
    target.d = PRESSURE.clearMinDepth + (PRESSURE.clearFullDepth - PRESSURE.clearMinDepth) * power;
    target.peak = PRESSURE.clearMinPeak + (PRESSURE.clearFullPeak - PRESSURE.clearMinPeak) * power;
    target.strength = power >= 0.97 ? 'full' : power >= 0.55 ? 'reduced' : 'weak';
    return target;
  }
  if (shot.type !== 'drop') return target;
  target.d = q >= 0.76 ? DROP.tightLanding : q >= 0.48 ? DROP.normalLanding : DROP.looseLanding;
  target.tightness = q >= 0.76 ? 'tight' : q >= 0.48 ? 'normal' : 'loose';
  target.peak = q >= 0.76 ? DROP.tightPeak : q >= 0.48 ? DROP.normalPeak : DROP.loosePeak;
  return target;
}

export { destination, shotTarget };
