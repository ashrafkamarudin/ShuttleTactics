import { clamp } from './math.js';
const FAULT_RATES = { net: 0.45, out: 0.65 };
// Poor contact increases risk; drops are especially demanding.
const FAULT_TUNING = { pressureMultiplier: 12, lateThreshold: 0.48, dropRisk: 1.65 };
// Initial v1.1 overhead-smash thresholds for playtesting.
const SMASH_TUNING = {
  minimumQuality: 0.75,
  minimumHeight: 2.2,
  maximumStretch: 0.35,
  fullPowerHeight: 3.2,
  minimumPower: 0.45,
};
// CPU sees where you stand, not your selected anticipation or recovery target.
const CPU_TUNING = { bestShotChance: 0.53, positionReadNoise: 0.42 };
// Pressure tuning: low-quality contact produces shorter clears and a slower first recovery step.
const PRESSURE = {
  clearMinDepth: 2.45,
  clearFullDepth: 5.9,
  clearMinPeak: 2.35,
  clearFullPeak: 5.0,
  recoveryDelayStart: 0.65,
  recoveryDelayMax: 0.38,
};
function recoveryDelay(quality = 1) {
  return (
    PRESSURE.recoveryDelayMax *
    clamp((PRESSURE.recoveryDelayStart - quality) / PRESSURE.recoveryDelayStart, 0, 1)
  );
}
// Per-shot net/out values below are reference rates at 100% of the configured rates.
const SHOTS = [
  { id: 'straight-clear', name: 'Straight clear', net: 3, out: 5, type: 'clear', cross: false },
  { id: 'cross-clear', name: 'Cross clear', net: 5, out: 8, type: 'clear', cross: true },
  { id: 'straight-drop', name: 'Straight drop', net: 7, out: 3, type: 'drop', cross: false },
  { id: 'cross-drop', name: 'Cross drop', net: 10, out: 5, type: 'drop', cross: true },
];
const SERVES = [
  { id: 'short', name: 'Short serve', net: 5, out: 2, type: 'serve-short' },
  { id: 'mid', name: 'Mid serve', net: 3, out: 4, type: 'serve-mid' },
  { id: 'deep', name: 'Deep serve', net: 2, out: 7, type: 'serve-deep' },
];
const SMASH_SHOTS = [
  { id: 'straight-smash', name: 'Straight smash', net: 8, out: 5, type: 'smash', cross: false },
  { id: 'cross-smash', name: 'Cross smash', net: 13, out: 8, type: 'smash', cross: true },
];
const ZONES = [
  { id: 'front-left', name: 'Front left', x: -0.72, d: 2.48 },
  { id: 'front-right', name: 'Front right', x: 0.72, d: 2.48 },
  { id: 'center-left', name: 'Center left', x: -0.65, d: 3.22 },
  { id: 'center-right', name: 'Center right', x: 0.65, d: 3.22 },
  { id: 'rear-left', name: 'Rear left', x: -0.76, d: 3.95 },
  { id: 'rear-right', name: 'Rear right', x: 0.76, d: 3.95 },
];
const LEANS = [
  { id: 'front-left', name: '↖ Front left', x: -1, z: -1 },
  { id: 'front-right', name: '↗ Front right', x: 1, z: -1 },
  { id: 'neutral', name: '◎ Neutral', x: 0, z: 0 },
  { id: 'rear-left', name: '↙ Rear left', x: -1, z: 1 },
  { id: 'rear-right', name: '↘ Rear right', x: 1, z: 1 },
];
const C = { halfWidth: 2.59, halfLength: 6.7 };

export {
  FAULT_RATES,
  FAULT_TUNING,
  SMASH_TUNING,
  CPU_TUNING,
  PRESSURE,
  recoveryDelay,
  SHOTS,
  SERVES,
  SMASH_SHOTS,
  ZONES,
  LEANS,
  C,
};
