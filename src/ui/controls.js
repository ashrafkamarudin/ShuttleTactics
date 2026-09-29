import { SHOTS, SERVES, ZONES, LEANS } from '../engine/constants.js';
import { faultChances } from '../engine/faults.js';
export function createControls(
  getState,
  setSelection,
  { marker, syncPeople, showShuttleAtCurrent, previewShot, hidePreview },
) {
  const $ = (id) => document.getElementById(id);
  function log(msg) {
    let d = document.createElement('div');
    d.textContent = msg;
    $('log').prepend(d);
  }
  function status(s) {
    $('status').textContent = s;
  }
  function setScore() {
    $('youScore').textContent = getState().score[0];
    $('cpuScore').textContent = getState().score[1];
  }
  function renderControls() {
    const { phase, chosenShot, chosenZone, chosenLean, busy, rallyEnded, gameOver, incoming } =
      getState();
    document.body.classList.toggle('rally-ended', rallyEnded && !gameOver);
    document.body.classList.toggle('match-over', gameOver);
    const options = phase === 'serve' ? SERVES : SHOTS;
    $('shots').innerHTML = options
      .map(
        (s) =>
          `<button class="choice ${chosenShot === s.id ? 'selected' : ''}" data-shot="${s.id}" ${busy || rallyEnded || gameOver ? 'disabled' : ''}><strong>${s.name}</strong><small>${(() => {
            const r = faultChances(s, phase === 'serve' ? 1 : incoming.quality);
            return `Net ${r.net.toFixed(1)}% · out ${r.out.toFixed(1)}%`;
          })()}</small></button>`,
      )
      .join('');
    $('zones').innerHTML = ZONES.map(
      (z) =>
        `<button class="zone ${chosenZone === z.id ? 'selected' : ''}" data-zone="${z.id}" ${busy || rallyEnded || gameOver ? 'disabled' : ''}>${z.name}</button>`,
    ).join('');
    $('leans').innerHTML = LEANS.map(
      (l) =>
        `<button class="lean ${chosenLean === l.id ? 'selected' : ''}" data-lean="${l.id}" ${busy || rallyEnded || gameOver ? 'disabled' : ''}>${l.name}</button>`,
    ).join('');
    $('play').disabled = !chosenShot || !chosenZone || busy || rallyEnded || gameOver;
    $('play').textContent = busy ? 'PLAYING…' : phase === 'serve' ? 'SERVE →' : 'PLAY SHOT →';
    let z = ZONES.find((z) => z.id === chosenZone);
    marker.visible = !!z && !busy && !rallyEnded;
    if (z) marker.position.set(z.x, 0.065, z.d);
    syncPeople();
    if (!busy && !rallyEnded) showShuttleAtCurrent();
  }
  $('shots').onclick = (e) => {
    const b = e.target.closest('[data-shot]');
    if (!b || getState().busy) return;
    setSelection('chosenShot', b.dataset.shot);
    renderControls();
    previewShot(b.dataset.shot);
  };
  $('shots').addEventListener('pointerover', (e) => {
    let b = e.target.closest('[data-shot]');
    if (b) previewShot(b.dataset.shot);
  });
  $('shots').addEventListener('pointerout', (e) => {
    if (e.relatedTarget?.closest?.('[data-shot]')) return;
    if (getState().chosenShot) previewShot(getState().chosenShot);
    else hidePreview();
  });
  $('zones').onclick = (e) => {
    const b = e.target.closest('[data-zone]');
    if (!b || getState().busy) return;
    setSelection('chosenZone', b.dataset.zone);
    renderControls();
  };
  $('leans').onclick = (e) => {
    const b = e.target.closest('[data-lean]');
    if (!b || getState().busy) return;
    setSelection('chosenLean', b.dataset.lean);
    renderControls();
  };

  return { log, status, setScore, renderControls };
}
