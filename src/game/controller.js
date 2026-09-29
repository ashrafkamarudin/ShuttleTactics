import { clamp, dist } from '../engine/math.js';
import {
  FAULT_RATES,
  FAULT_TUNING,
  CPU_TUNING,
  PRESSURE,
  recoveryDelay,
  SHOTS,
  SERVES,
  ZONES,
  LEANS,
  C,
} from '../engine/constants.js';
import {
  MOVEMENT_SPEED,
  GAME_TIME_SCALE,
  DROP,
  flightTime,
  trajectoryHeight,
} from '../engine/shuttle.js';
import { shotTarget } from '../engine/shots.js';
import { qualityAt } from '../engine/interception.js';
import { cpuRecoveryForShot, chooseCpuLean } from '../engine/cpu.js';
import { faultChances, errorRoll } from '../engine/faults.js';
import {
  serviceX as serviceXForScore,
  serveTarget as serveTargetForScore,
} from '../engine/rules.js';
import { createScene } from '../render/scene.js';
import { createControls } from '../ui/controls.js';
// All dimensions below use metres. Court is 5.18m wide × 13.4m long (singles).
const $ = (id) => document.getElementById(id);
// Change these percentages to enable faults; 0 means disabled for every shot and serve.
// Percent chance for a comfortable standard stroke. Raise/lower freely.
let chosenShot = null,
  chosenZone = null,
  chosenLean = 'neutral',
  cpuLean = 'neutral',
  phase = 'serve',
  busy = false,
  gameOver = false,
  rallyEnded = false,
  score = [0, 0],
  rally = 1,
  player = { x: 0, d: 3.2 },
  cpu = { x: 0, d: 3.2 },
  incoming = { x: 0, d: 3.2, quality: 1 },
  lastHit = null,
  server = 0;
const getState = () => ({
  chosenShot,
  chosenZone,
  chosenLean,
  cpuLean,
  phase,
  busy,
  gameOver,
  rallyEnded,
  score,
  rally,
  player,
  cpu,
  incoming,
  server,
});
const setSelection = (key, value) => {
  if (key === 'chosenShot') chosenShot = value;
  else if (key === 'chosenZone') chosenZone = value;
  else if (key === 'chosenLean') chosenLean = value;
};
const {
  scene,
  camera,
  renderer,
  shuttle,
  marker,
  syncPeople,
  showShuttleAtCurrent,
  previewShot,
  hidePreview,
} = createScene(getState);
const { log, status, setScore, renderControls } = createControls(getState, setSelection, {
  marker,
  syncPeople,
  showShuttleAtCurrent,
  previewShot,
  hidePreview,
});
const serviceX = (who) => serviceXForScore(who, score);
const serveTarget = (s, who) => serveTargetForScore(s, who, score);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
// Clears can be met in midcourt; drops must be met before they fall too low.
// v0.6: geometry-based flight duration. A longer rear-to-rear diagonal takes longer
// than the same stroke from midcourt. Gameplay seconds are animated at 0.48x.
// Gameplay tuning. Racket reach and frontcourt lunges are measured from the player's feet.
// CPU selects a real recovery zone rather than always drifting to an invisible central point.
// It does not read the player's next stroke, recovery selection or anticipation.
// Faults: even comfortable strokes have a small risk. Stretching and late contact
// increase it sharply; a clear is preferable to a desperate tight drop.
function moveToward(from, to, limit) {
  let d = dist(from, to);
  let t = d ? Math.min(1, limit / d) : 1;
  from.x += (to.x - from.x) * t;
  from.d += (to.d - from.d) * t;
  syncPeople();
}
// Animate actual court movement instead of teleporting between positions.
function animateMove(actor, to, limit, duration = 430) {
  const start = { x: actor.x, d: actor.d },
    distance = dist(start, to),
    fraction = distance ? Math.min(1, limit / distance) : 1;
  const end = {
    x: start.x + (to.x - start.x) * fraction,
    d: start.d + (to.d - start.d) * fraction,
  };
  return new Promise((resolve) => {
    const started = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      actor.x = end.x;
      actor.d = end.d;
      syncPeople();
      resolve();
    };
    const fallback = setTimeout(finish, duration + 350);
    function step(now) {
      if (finished) return;
      const t = clamp((now - started) / duration, 0, 1),
        ease = t * t * (3 - 2 * t);
      actor.x = start.x + (end.x - start.x) * ease;
      actor.d = start.d + (end.d - start.d) * ease;
      syncPeople();
      if (t < 1) requestAnimationFrame(step);
      else {
        clearTimeout(fallback);
        finish();
      }
    }
    requestAnimationFrame(step);
  });
}
// One animation clock moves the shuttle, the receiver, and the recovering hitter.
// Receiver is steered toward the precomputed interception point; hitter can only
// cover speed × elapsed time, never snap to a selected recovery destination.
async function fly(
  from,
  to,
  type,
  fromYou,
  {
    hitter = null,
    recovery = null,
    receiver = null,
    intercept = null,
    lean = 'neutral',
    hitterQuality = 1,
  } = {},
) {
  const total = flightTime(type, from, to),
    endTime = intercept?.canReach ? intercept.elapsed : total;
  const startH = hitter ? { ...hitter } : null,
    startR = receiver ? { ...receiver } : null;
  const reaction = intercept?.reaction ?? 0.23;
  const duration = endTime * 1000 * GAME_TIME_SCALE;
  shuttle.visible = true;
  return new Promise((resolve) => {
    let finished = false,
      started = performance.now();
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      shuttle.visible = false;
      syncPeople();
      resolve();
    };
    const fallback = setTimeout(finish, duration + 650);
    function frame(now) {
      if (finished) return;
      const elapsed = clamp((now - started) / (1000 * GAME_TIME_SCALE), 0, endTime),
        t = clamp(elapsed / total, 0, 1);
      const a = fromYou ? from.d : -from.d,
        b = fromYou ? -to.d : to.d;
      shuttle.position.set(
        from.x + (to.x - from.x) * t,
        trajectoryHeight(type, t, to),
        a + (b - a) * t,
      );
      shuttle.rotation.z = t * 2;
      if (hitter && recovery) {
        const distance = dist(startH, recovery),
          amount = Math.min(
            distance,
            Math.max(0, elapsed - 0.12 - recoveryDelay(hitterQuality)) * MOVEMENT_SPEED,
          );
        const ratio = distance ? amount / distance : 1;
        hitter.x = startH.x + (recovery.x - startH.x) * ratio;
        hitter.d = startH.d + (recovery.d - startH.d) * ratio;
      }
      if (receiver && intercept?.canReach) {
        const feet = intercept.feet || intercept.point;
        const distance = dist(startR, feet),
          amount = Math.min(distance, Math.max(0, elapsed - reaction) * MOVEMENT_SPEED);
        const ratio = distance ? amount / distance : 1;
        receiver.x = startR.x + (feet.x - startR.x) * ratio;
        receiver.d = startR.d + (feet.d - startR.d) * ratio;
      }
      syncPeople();
      if (elapsed < endTime) requestAnimationFrame(frame);
      else finish();
    }
    requestAnimationFrame(frame);
  });
}
function point(winner, reason) {
  hidePreview();
  shuttle.visible = false;
  server = winner;
  score[winner]++;
  setScore();
  rallyEnded = true;
  busy = false;
  let name = winner === 0 ? 'You' : 'CPU';
  status(`${name} win${winner === 0 ? '' : 's'} the rally! ${reason}`);
  log(`${name} +1 — ${reason}`);
  $('turnTitle').textContent = winner === 0 ? 'Point to you!' : 'Point to CPU';
  const win =
    score[winner] >= 11 && (score[winner] - score[1 - winner] >= 2 || score[winner] === 15);
  if (win) {
    gameOver = true;
    $('turnTitle').textContent = winner === 0 ? '🏆 You win the match!' : 'CPU wins the match';
    status(`Final score: ${score[0]}–${score[1]}. Hit New match to play again.`);
  } else {
    $('next').style.display = 'block';
    $('next').textContent = 'Next rally →';
  }
  renderControls();
}
// Evaluate visible position only, with imperfect estimation and some variety.
// The CPU never reads chosenLean, chosenZone or the player's hidden next stroke.
function aiChoose(from = cpu, contactQuality = 1) {
  const observed = {
    x: clamp(player.x + (Math.random() - 0.5) * CPU_TUNING.positionReadNoise, -2.5, 2.5),
    d: clamp(player.d + (Math.random() - 0.5) * CPU_TUNING.positionReadNoise, 0.2, 6.5),
  };
  const options = SHOTS.map((shot) => {
    const target = shotTarget(shot, from, contactQuality);
    const expected = qualityAt(observed, target, shot.type, 'neutral', from);
    const fault = faultChances(shot, contactQuality);
    const risk = fault.net + fault.out;
    const pressure = (expected.canReach ? 0 : 2.8) + (1 - expected.quality) * 1.7 - risk * 0.085;
    const desperateDropPenalty =
      contactQuality < FAULT_TUNING.lateThreshold && shot.type === 'drop' ? 2.5 : 0;
    return { s: shot, target, pressure: pressure - desperateDropPenalty + Math.random() * 0.35 };
  }).sort((a, b) => b.pressure - a.pressure);
  return Math.random() < CPU_TUNING.bestShotChance
    ? options[0]
    : options[Math.floor(Math.random() * Math.min(3, options.length))];
}
function missReason(reach) {
  return `${reach.distance.toFixed(1)}m needed; ${reach.reach.toFixed(1)}m including racket reach in ${reach.elapsed.toFixed(2)}s`;
}
async function cpuReturn(context) {
  const from = context?.point ? { ...context.point } : { ...cpu },
    ai = aiChoose(from, context?.quality ?? 1);
  ai.target = shotTarget(ai.s, from, context?.quality ?? 1);
  const fault = errorRoll(ai.s, context?.quality ?? 1);
  if (fault) {
    point(0, `CPU hits ${fault === 'net' ? 'the net' : 'out'} on a ${ai.s.name.toLowerCase()}.`);
    return;
  }
  const recovery = cpuRecoveryForShot(ai.s, cpu);
  if (recoveryDelay(context?.quality ?? 1) > 0.01)
    log(
      `CPU needs ${recoveryDelay(context.quality).toFixed(2)}s to regain balance after ${Math.round(context.quality * 100)}% contact.`,
    );
  log(`CPU recovery target: ${recovery.name} from (${cpu.x.toFixed(1)}, ${cpu.d.toFixed(1)}).`);
  const reach = qualityAt(player, ai.target, ai.s.type, chosenLean, from);
  status(`CPU plays ${ai.s.name.toLowerCase()}…`);
  log(
    `CPU: ${ai.s.name}${ai.target.tightness ? ' (' + ai.target.tightness + ')' : ai.target.strength ? ' (' + ai.target.strength + ')' : ''} · ${flightTime(ai.s.type, from, ai.target).toFixed(2)}s flight · your ${chosenLean} anticipation`,
  );
  await fly(from, ai.target, ai.s.type, false, {
    hitter: cpu,
    recovery,
    receiver: player,
    intercept: reach,
    hitterQuality: context?.quality ?? 1,
  });
  log(
    `CPU recovery reached (${cpu.x.toFixed(1)}, ${cpu.d.toFixed(1)})${dist(cpu, recovery) < 0.08 ? ' — target reached' : ' — still moving toward ' + recovery.name}; your interception at ${reach.elapsed.toFixed(2)}s.`,
  );
  if (!reach.canReach) {
    point(1, `CPU's ${ai.s.name.toLowerCase()} beats your positioning (${missReason(reach)}).`);
    return;
  }
  // The shuttle is held at the racket while the human chooses the next turn.
  player.x = reach.feet.x;
  player.d = reach.feet.d;
  syncPeople();
  incoming = { ...reach.point, quality: reach.quality };
  phase = 'rally';
  chosenShot = null;
  chosenZone = null;
  chosenLean = 'neutral';
  cpuLean = chooseCpuLean();
  busy = false;
  $('turnTitle').textContent = 'Your return';
  $('context').textContent =
    `CPU played ${ai.s.name.toLowerCase()}. You intercepted it ${reach.contact} (${reach.height.toFixed(1)}m high). ${reach.quality < FAULT_TUNING.lateThreshold ? ' A clear is safer than a tight drop, but poor contact also reduces clear depth.' : ''} Choose your stroke, recovery and anticipation.`;
  status(
    `${reach.contact} contact at ${reach.elapsed.toFixed(2)}s, ${reach.height.toFixed(1)}m high · quality ${Math.round(reach.quality * 100)}%. Net/out risks shown on each shot use this quality. Your next shot starts from your actual position.`,
  );
  renderControls();
}
async function humanShot(s, z, quality) {
  const from = s.type.startsWith('serve') ? { ...player } : { ...incoming },
    target = s.type.startsWith('serve') ? serveTarget(s, 0) : shotTarget(s, from, quality);
  const fault = errorRoll(s, quality);
  if (fault) {
    point(1, `Your ${s.name.toLowerCase()} goes ${fault === 'net' ? 'into the net' : 'out'}.`);
    return;
  }
  const reach = qualityAt(cpu, target, s.type, cpuLean, from);
  if (recoveryDelay(quality) > 0.01)
    log(
      `Your ${Math.round(quality * 100)}% contact costs ${recoveryDelay(quality).toFixed(2)}s of recovery balance.`,
    );
  status(`You play ${s.name.toLowerCase()}…`);
  log(
    `You: ${s.name}${target.tightness ? ' (' + target.tightness + ')' : target.strength ? ' (' + target.strength + ')' : ''} → ${z.name} · ${chosenLean} lean · ${flightTime(s.type, from, target).toFixed(2)}s flight`,
  );
  await fly(from, target, s.type, true, {
    hitter: player,
    recovery: z,
    receiver: cpu,
    intercept: reach,
    hitterQuality: quality,
  });
  if (!reach.canReach) {
    point(0, `Your ${s.name.toLowerCase()} beats the CPU (${missReason(reach)}).`);
    return;
  }
  cpu.x = reach.feet.x;
  cpu.d = reach.feet.d;
  syncPeople();
  log(
    `CPU ${reach.contact} interception at ${reach.elapsed.toFixed(2)}s (${reach.height.toFixed(1)}m high); your recovery stopped at (${player.x.toFixed(1)}, ${player.d.toFixed(1)}).`,
  );
  log(
    `CPU anticipated ${cpuLean}; ${reach.contact} contact (${Math.round(reach.quality * 100)}% quality).`,
  );
  await delay(120);
  await cpuReturn(reach);
}
async function playServe() {
  if (!chosenShot || !chosenZone || busy || rallyEnded || gameOver) return;
  busy = true;
  hidePreview();
  renderControls();
  await humanShot(
    SERVES.find((v) => v.id === chosenShot),
    ZONES.find((v) => v.id === chosenZone),
    1,
  );
}
async function play() {
  if (phase === 'serve') return playServe();
  if (!chosenShot || !chosenZone || busy || rallyEnded || gameOver) return;
  busy = true;
  hidePreview();
  renderControls();
  await humanShot(
    SHOTS.find((v) => v.id === chosenShot),
    ZONES.find((v) => v.id === chosenZone),
    incoming.quality,
  );
}
// Never leave the interface locked if an animation or turn throws.
let turnWatchdog = null;
function recoverFromTurnError(err) {
  console.error('Turn failed:', err);
  clearTimeout(turnWatchdog);
  turnWatchdog = null;
  busy = false;
  hidePreview();
  shuttle.visible = false;
  status(
    'Turn interrupted: ' + (err?.message || String(err)) + '. You can retry, or start a new match.',
  );
  renderControls();
}
function runTurn(fn) {
  if (busy) return;
  clearTimeout(turnWatchdog);
  turnWatchdog = setTimeout(() => recoverFromTurnError(new Error('Animation timed out')), 10000);
  Promise.resolve()
    .then(fn)
    .catch(recoverFromTurnError)
    .finally(() => {
      clearTimeout(turnWatchdog);
      turnWatchdog = null;
    });
}
$('play').onclick = () => runTurn(play);
// Service follows singles rules: even server score = right box, odd = left.
// World x: player faces -z (right = +x); CPU faces +z (right = -x).
function setServiceInfo() {
  const side = score[server] % 2 === 0 ? 'Right' : 'Left';
  $('serveInfo').innerHTML =
    `<b>${server === 0 ? 'YOUR SERVE' : 'CPU SERVE'}</b> · ${side} service court · ${score[server]} points<br><span style="color:#a2bcb0">Choose short, mid or deep when serving; CPU serves automatically.</span>`;
}
async function nextRally() {
  if (gameOver) return;
  rally++;
  rallyEnded = false;
  busy = true;
  phase = server === 0 ? 'serve' : 'rally';
  chosenShot = null;
  chosenZone = null;
  chosenLean = 'neutral';
  cpuLean = chooseCpuLean();
  hidePreview();
  const sx = serviceX(server);
  player = { x: server === 0 ? sx : -sx, d: server === 0 ? 4.05 : 3.15 };
  cpu = { x: server === 1 ? sx : -sx, d: server === 1 ? 4.05 : 3.15 };
  incoming = { x: player.x, d: 3.25, quality: 1 };
  syncPeople();
  $('next').style.display = 'none';
  $('turnTitle').textContent = server === 0 ? 'Your serve' : 'CPU serving…';
  $('context').textContent =
    `Rally ${rally}: ${server === 0 ? 'Choose your serve and recovery' : 'CPU serves'} from the ${score[server] % 2 === 0 ? 'right' : 'left'} service court.`;
  setServiceInfo();
  status(server === 0 ? 'Pick a serve target and where to recover.' : 'CPU is choosing a serve…');
  log(
    `— Rally ${rally}: ${server === 0 ? 'You' : 'CPU'} serving (${score[server] % 2 === 0 ? 'right' : 'left'}) —`,
  );
  renderControls();
  if (server === 0) {
    busy = false;
    renderControls();
    return;
  }
  const aiServe = SERVES[Math.floor(Math.random() * SERVES.length)],
    target = serveTarget(aiServe, 1),
    from = { ...cpu },
    serveRecovery = ZONES.find((z) => z.id === 'center-' + (cpu.x >= 0 ? 'right' : 'left'));
  const serveFault = errorRoll(aiServe, 1);
  if (serveFault) {
    point(
      0,
      `CPU's ${aiServe.name.toLowerCase()} goes ${serveFault === 'net' ? 'into the net' : 'out'}.`,
    );
    return;
  }
  status(`CPU plays a ${aiServe.name.toLowerCase()}…`);
  log(`CPU: ${aiServe.name} → ${serveRecovery.name} recovery`);
  const reach = qualityAt(player, target, aiServe.type, 'neutral', from);
  await fly(from, target, aiServe.type, false, {
    hitter: cpu,
    recovery: serveRecovery,
    receiver: player,
    intercept: reach,
  });
  log(
    `CPU serve recovery reached (${cpu.x.toFixed(1)}, ${cpu.d.toFixed(1)})${dist(cpu, serveRecovery) < 0.08 ? ' — target reached' : ' — still moving toward ' + serveRecovery.name}.`,
  );
  if (gameOver) return;
  if (!reach.canReach) {
    point(1, `CPU's serve beats your receiving position (${missReason(reach)}).`);
    return;
  }
  player.x = reach.feet.x;
  player.d = reach.feet.d;
  syncPeople();
  incoming = { ...reach.point, quality: reach.quality };
  cpuLean = chooseCpuLean();
  busy = false;
  $('turnTitle').textContent = 'Return the serve';
  $('context').textContent =
    `CPU played a ${aiServe.name.toLowerCase()}. Choose your return, recovery and anticipation.`;
  status('You intercepted the serve. Choose your return.');
  renderControls();
}
// Hide the diagnostic log by default on phones; keep it expanded on laptops.
if (window.matchMedia('(max-width:850px)').matches) $('logDetails').open = false;
$('next').onclick = () => runTurn(nextRally);
$('reset').onclick = () => {
  clearTimeout(turnWatchdog);
  turnWatchdog = null;
  score = [0, 0];
  rally = 0;
  server = 0;
  gameOver = false;
  rallyEnded = false;
  busy = false;
  setScore();
  $('log').innerHTML = '';
  runTurn(nextRally);
};
runTurn(nextRally);
