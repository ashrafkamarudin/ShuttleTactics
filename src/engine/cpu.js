import { dist } from './math.js';
import { ZONES } from './constants.js';
function cpuRecoveryForShot(shot, from) {
  const side = from.x >= 0 ? 'right' : 'left';
  const candidates =
    shot.type === 'drop'
      ? [`front-${side}`, `center-${side}`, `center-${side === 'right' ? 'left' : 'right'}`]
      : [`center-${side}`, `rear-${side}`, `center-${side === 'right' ? 'left' : 'right'}`];
  // More distant recovery is possible, but actual movement is limited by interception time.
  const ranked = candidates
    .map((id, i) => {
      const z = ZONES.find((z) => z.id === id);
      return {
        z,
        score: (i === 0 ? 1 : i === 1 ? 0.75 : 0.65) - dist(from, z) * 0.12 + Math.random() * 0.42,
      };
    })
    .sort((a, b) => b.score - a.score);
  return ranked[0].z;
}
function chooseCpuLean() {
  const pool = ['neutral', 'neutral', 'front-left', 'front-right', 'rear-left', 'rear-right'];
  return pool[Math.floor(Math.random() * pool.length)];
}

export { cpuRecoveryForShot, chooseCpuLean };
