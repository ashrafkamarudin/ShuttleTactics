export function serviceX(who, score) {
  const right = score[who] % 2 === 0;
  return (who === 0 ? 1 : -1) * (right ? 1 : -1) * 1.22;
}
export function serveTarget(s, who, score) {
  const side = serviceX(who, score);
  return { x: -Math.sign(side) * 0.92, d: s.id === 'short' ? 2.25 : s.id === 'mid' ? 3.85 : 5.95 };
}
