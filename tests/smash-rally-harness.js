import { canSmash } from '../src/engine/smash.js';
import { MOVEMENT_SPEED, flightTime } from '../src/engine/shuttle.js';
import { recoveryDelay } from '../src/engine/constants.js';
import { shotTarget } from '../src/engine/shots.js';
import { evaluateDefense, smashTarget } from './smash-defense-prototype.js';
import {
  resolveInterception,
  resolveRallyContact,
  resolveShotAttempt,
} from '../src/game/rally-resolution.js';

const HUMAN_CLEAR = { id: 'straight-clear', name: 'Straight clear', type: 'clear', cross: false };
const CPU_SMASH = {
  straight: { id: 'straight-smash', name: 'Straight smash', type: 'smash', cross: false },
  cross: { id: 'cross-smash', name: 'Cross smash', type: 'smash', cross: true },
};
const CENTER_RIGHT = { x: 0.35, d: 3.2 };

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function advanceRecovery(position, destination, elapsed, quality) {
  const dx = destination.x - position.x;
  const dz = destination.d - position.d;
  const distance = Math.hypot(dx, dz);
  const move = Math.min(
    distance,
    Math.max(0, elapsed - 0.12 - recoveryDelay(quality)) * MOVEMENT_SPEED,
  );
  const fraction = distance ? move / distance : 1;
  return { x: position.x + dx * fraction, d: position.d + dz * fraction };
}

function simulateRally({
  scenario,
  anticipation,
  initialResponseMeters = 0.1,
  seed = 1,
  maxStrokes = 8,
}) {
  const random = seededRandom(seed);
  const from = { x: scenario.attackerX ?? 0.5, d: 5, height: 2.6 };
  const attackerQuality = 0.92;
  const eligibilityFrom = { x: 0, d: 2 };
  const eligibilityTarget = shotTarget(
    { id: 'straight-clear', type: 'clear', cross: false },
    eligibilityFrom,
    0.92,
  );
  const attackerInterception = resolveInterception({
    receiver: CENTER_RIGHT,
    target: eligibilityTarget,
    shotType: 'clear',
    lean: 'neutral',
    from: eligibilityFrom,
  });
  const smashAvailable = canSmash(attackerInterception, 'clear');
  if (!smashAvailable) throw new Error('Fixture must satisfy production smash eligibility');

  const incomingShot =
    scenario.incomingType === 'drop'
      ? { id: 'straight-drop', name: 'Straight drop', type: 'drop', cross: false }
      : CPU_SMASH[scenario.smashDirection];
  const incomingTarget =
    incomingShot.type === 'smash'
      ? smashTarget(incomingShot, from, attackerQuality, { profile: 'mid-court' })
      : shotTarget(incomingShot, from, attackerQuality);
  const incomingFlight = flightTime(incomingShot.type, from, incomingTarget);
  let cpuPosition = advanceRecovery(from, CENTER_RIGHT, incomingFlight, attackerQuality);
  let playerPosition = { ...scenario.receiver };
  const reception = evaluateDefense({
    receiver: playerPosition,
    from,
    shot: incomingShot,
    quality: attackerQuality,
    anticipation,
    initialResponseMeters,
  });
  const summary = {
    eligible: smashAvailable,
    attackerEligibility: {
      quality: attackerInterception.quality,
      height: attackerInterception.height,
      stretch: attackerInterception.stretch,
    },
    target: { x: incomingTarget.x, d: incomingTarget.d },
    flight: incomingFlight,
    reception: {
      canReach: reception.canReach,
      quality: reception.readinessQuality,
      contact:
        reception.readinessQuality >= 0.76
          ? 'good'
          : reception.readinessQuality >= 0.48
            ? 'medium'
            : 'weak',
      point: reception.selected?.point ?? null,
      feet: reception.selected?.feet ?? null,
      stretch: reception.selected?.stretch ?? null,
      height: reception.selected?.height ?? null,
      reaction: reception.reaction,
    },
    firstReturn: null,
    opponentReception: null,
    strokes: 0,
    outcome: null,
    pointWinner: null,
  };
  if (!reception.canReach) {
    summary.outcome = 'smash-winner';
    summary.pointWinner = 'cpu';
    return summary;
  }

  playerPosition = reception.selected.feet;
  let hitPoint = { ...reception.selected.point, height: reception.selected.height };
  let hitQuality = reception.readinessQuality;
  let hitter = 'player';
  let receiverPosition = cpuPosition;

  for (let stroke = 0; stroke < maxStrokes; stroke += 1) {
    const attempt = resolveShotAttempt({
      shot: HUMAN_CLEAR,
      from: hitPoint,
      quality: hitQuality,
      random,
    });
    summary.strokes += 1;
    if (hitter === 'player' && !summary.firstReturn) {
      summary.firstReturn = {
        quality: hitQuality,
        netFaultPercent: attempt.net,
        outFaultPercent: attempt.out,
        fault: attempt.fault,
      };
    }
    if (attempt.fault) {
      summary.outcome = `${hitter}-${attempt.fault}-fault`;
      summary.pointWinner = hitter === 'player' ? 'cpu' : 'player';
      return summary;
    }

    const target = attempt.target;
    if (hitter === 'player' && summary.firstReturn && !summary.firstReturn.target) {
      summary.firstReturn.target = { x: target.x, d: target.d, strength: target.strength };
    }
    const fromContact = { x: hitPoint.x, d: hitPoint.d };
    const incomingToReceiver = resolveInterception({
      receiver: receiverPosition,
      target,
      shotType: 'clear',
      lean: 'neutral',
      from: fromContact,
    });
    const recovery = CENTER_RIGHT;
    const flight = incomingToReceiver.canReach
      ? incomingToReceiver.elapsed
      : incomingToReceiver.flight;
    const nextHitterPosition =
      hitter === 'player'
        ? advanceRecovery(playerPosition, recovery, flight, hitQuality)
        : advanceRecovery(cpuPosition, recovery, flight, hitQuality);

    if (!resolveRallyContact(hitter, incomingToReceiver).continues) {
      summary.opponentReception = { canReach: false, quality: incomingToReceiver.quality };
      summary.outcome = 'opponent-miss';
      summary.pointWinner = hitter;
      return summary;
    }
    if (stroke === 0) {
      summary.opponentReception = {
        canReach: true,
        quality: incomingToReceiver.quality,
        contact: incomingToReceiver.contact,
      };
    }

    const nextContact = {
      x: incomingToReceiver.point.x,
      d: incomingToReceiver.point.d,
      height: incomingToReceiver.height,
    };
    const nextQuality = incomingToReceiver.quality;
    if (hitter === 'player') {
      cpuPosition = incomingToReceiver.feet;
      playerPosition = nextHitterPosition;
      hitter = 'cpu';
    } else {
      playerPosition = incomingToReceiver.feet;
      cpuPosition = nextHitterPosition;
      hitter = 'player';
    }
    hitPoint = nextContact;
    hitQuality = nextQuality;
    receiverPosition = hitter === 'player' ? cpuPosition : playerPosition;
  }

  summary.outcome = 'rally-continues';
  summary.pointWinner = null;
  return summary;
}

function batchScenario({ scenario, anticipation, initialResponseMeters = 0.1, trials = 100 }) {
  const results = Array.from({ length: trials }, (_, i) =>
    simulateRally({ scenario, anticipation, initialResponseMeters, seed: i + 1 }),
  );
  const pct = (n) => (100 * n) / trials;
  return {
    trials,
    receptionMiss: pct(results.filter((result) => !result.reception.canReach).length),
    weakContact: pct(
      results.filter((result) => result.reception.canReach && result.reception.quality < 0.48)
        .length,
    ),
    mediumContact: pct(
      results.filter(
        (result) =>
          result.reception.canReach &&
          result.reception.quality >= 0.48 &&
          result.reception.quality < 0.76,
      ).length,
    ),
    goodContact: pct(
      results.filter((result) => result.reception.canReach && result.reception.quality >= 0.76)
        .length,
    ),
    firstReturnFault: pct(results.filter((result) => result.firstReturn?.fault).length),
    opponentInterception: pct(
      results.filter((result) => result.opponentReception?.canReach).length,
    ),
    playerPoints: pct(results.filter((result) => result.pointWinner === 'player').length),
    cpuPoints: pct(results.filter((result) => result.pointWinner === 'cpu').length),
    continues: pct(results.filter((result) => result.outcome === 'rally-continues').length),
    representative: results[0],
  };
}

export { batchScenario, simulateRally };
