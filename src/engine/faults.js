import { clamp } from './math.js';
import { FAULT_RATES, FAULT_TUNING } from './constants.js';
function faultChances(shot, quality = 1) {
  const q = clamp(quality, 0, 1),
    stress = Math.pow(1 - q, 1.65) * FAULT_TUNING.pressureMultiplier; // Previous interception quality directly sets next-shot risk.
  const typeFactor = shot.type === 'drop' ? FAULT_TUNING.dropRisk : 1;
  const netFactor =
    shot.type === 'drop' ? (shot.cross ? 1.65 : 1.3) : shot.type === 'clear' ? 0.65 : 1;
  const outFactor = shot.type === 'clear' ? 1.25 : shot.type === 'drop' ? 0.7 : 1;
  return {
    net: clamp(FAULT_RATES.net * netFactor * (1 + stress * typeFactor), 0, 60),
    out: clamp(FAULT_RATES.out * outFactor * (1 + stress * typeFactor), 0, 60),
  };
}
function errorRoll(shot, quality = 1) {
  const { net, out } = faultChances(shot, quality),
    roll = Math.random() * 100;
  return roll < net ? 'net' : roll < net + out ? 'out' : null;
}

export { faultChances, errorRoll };
