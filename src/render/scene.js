import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { clamp } from '../engine/math.js';
import { LEANS, SERVES, SHOTS, SMASH_SHOTS } from '../engine/constants.js';
import { shotTarget } from '../engine/shots.js';
import { canSmash } from '../engine/smash.js';
import { trajectoryHeight } from '../engine/shuttle.js';
import { serveTarget } from '../engine/rules.js';
export function createScene(getState) {
  const $ = (id) => document.getElementById(id);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#102a25');
  scene.fog = new THREE.Fog('#102a25', 17, 35);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(9, 12, 13);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('scene').appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xcdf9ed, 0x1b3c2d, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(-4, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  scene.add(sun);
  const mat = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  function box(w, h, d, m, x, y, z, shadow = false) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.receiveShadow = true;
    o.castShadow = shadow;
    scene.add(o);
    return o;
  }
  box(20, 0.18, 23, mat('#244b3d'), 0, -0.19, 0);
  box(6.7, 0.1, 14.9, mat('#b49a75'), 0, -0.045, 0);
  box(5.18, 0.025, 13.4, mat('#267c59'), 0, 0.018, 0);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xeafff2 });
  function line(x1, z1, x2, z2, width = 0.045) {
    let dx = x2 - x1,
      dz = z2 - z1;
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, 0.012, Math.hypot(dx, dz)), lineMat);
    m.position.set((x1 + x2) / 2, 0.047, (z1 + z2) / 2);
    m.rotation.y = Math.atan2(dx, dz);
    scene.add(m);
  }
  // Singles sidelines, back boundaries, doubles sidelines (visual only), short service lines and centre service lines.
  for (const x of [-2.59, 2.59, -3.05, 3.05]) line(x, -6.7, x, 6.7);
  for (const z of [-6.7, 6.7, -1.98, 1.98]) line(-3.05, z, 3.05, z);
  line(0, -6.7, 0, -1.98);
  line(0, 1.98, 0, 6.7);
  line(-3.05, 0, 3.05, 0, 0.06);
  const netMat = new THREE.MeshBasicMaterial({
    color: 0xe7fff0,
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 1.5), netMat);
  net.position.set(0, 0.79, 0);
  scene.add(net);
  for (let x = -3; x <= 3.01; x += 0.25) {
    let geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.05, 0),
      new THREE.Vector3(x, 1.54, 0),
    ]);
    scene.add(
      new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xd7f5e8, transparent: true, opacity: 0.26 }),
      ),
    );
  }
  for (let y = 0.05; y < 1.55; y += 0.19) {
    let geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-3.05, y, 0),
      new THREE.Vector3(3.05, y, 0),
    ]);
    scene.add(
      new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xd7f5e8, transparent: true, opacity: 0.27 }),
      ),
    );
  }
  box(0.07, 1.6, 0.07, mat('#f3f6e8'), -3.05, 0.8, 0);
  box(0.07, 1.6, 0.07, mat('#f3f6e8'), 3.05, 0.8, 0);
  box(6.16, 0.045, 0.045, mat('#fffdf0'), 0, 1.54, 0);
  function makePerson(color) {
    let g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.46, 5, 10), mat(color));
    body.position.y = 0.72;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), mat('#f2c49e'));
    head.position.y = 1.27;
    head.castShadow = true;
    g.add(head);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.37, 20),
      new THREE.MeshBasicMaterial({
        color: 0x071e17,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.07;
    g.add(shadow);
    scene.add(g);
    return g;
  }
  // Each player holds a lightweight racket made entirely from Three.js geometry.
  function addRacket(g, side) {
    const racket = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.043, 0.48, 8),
      mat('#2b3037'),
    );
    handle.position.y = 0.12;
    racket.add(handle);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.34, 8), mat('#cbd5e1'));
    shaft.position.y = 0.5;
    racket.add(shaft);
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 28), mat('#f9fafb'));
    head.scale.y = 1.35;
    head.position.y = 0.82;
    racket.add(head);
    const strings = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 14 }, (_, i) => {
          let n = (i % 7) - 3;
          return i < 7
            ? [
                new THREE.Vector3(
                  n * 0.043,
                  0.82 - Math.sqrt(Math.max(0, 0.19 ** 2 - (n * 0.043) ** 2)) * 1.35,
                  0,
                ),
                new THREE.Vector3(
                  n * 0.043,
                  0.82 + Math.sqrt(Math.max(0, 0.19 ** 2 - (n * 0.043) ** 2)) * 1.35,
                  0,
                ),
              ]
            : [
                new THREE.Vector3(
                  -0.19 * Math.sqrt(Math.max(0, 1 - ((n * 0.054) / 0.255) ** 2)),
                  0.82 + n * 0.054,
                  0,
                ),
                new THREE.Vector3(
                  0.19 * Math.sqrt(Math.max(0, 1 - ((n * 0.054) / 0.255) ** 2)),
                  0.82 + n * 0.054,
                  0,
                ),
              ];
        }).flat(),
      ),
      new THREE.LineBasicMaterial({ color: 0xd5e7e5, transparent: true, opacity: 0.7 }),
    );
    racket.add(strings);
    racket.position.set(side * 0.35, 0.66, 0);
    racket.rotation.z = side * -0.35;
    g.add(racket);
  }
  const youMesh = makePerson('#5aaaff'),
    cpuMesh = makePerson('#ffac57');
  addRacket(youMesh, 1);
  addRacket(cpuMesh, -1);
  function syncPeople() {
    const { player, cpu, chosenLean, cpuLean } = getState();
    youMesh.position.set(player.x, 0, player.d);
    cpuMesh.position.set(cpu.x, 0, -cpu.d);
    const l = LEANS.find((v) => v.id === chosenLean) || LEANS[2],
      c = LEANS.find((v) => v.id === cpuLean) || LEANS[2];
    youMesh.rotation.z = -l.x * 0.11;
    youMesh.rotation.x = l.z * 0.1;
    cpuMesh.rotation.z = c.x * 0.11;
    cpuMesh.rotation.x = -c.z * 0.1;
  }
  syncPeople();
  const shuttle = new THREE.Group();
  const cork = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat('#fff8db'));
  shuttle.add(cork);
  const feather = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.38, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf5fff9, side: THREE.DoubleSide }),
  );
  feather.position.y = 0.25;
  shuttle.add(feather);
  shuttle.visible = false;
  scene.add(shuttle);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.43, 32),
    new THREE.MeshBasicMaterial({
      color: '#8effb4',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.065;
  marker.visible = false;
  scene.add(marker);
  // Current shuttle and shot-preview arc remain visible while choosing.
  const previewMat = new THREE.LineDashedMaterial({
    color: 0xfde68a,
    dashSize: 0.23,
    gapSize: 0.13,
    transparent: true,
    opacity: 0.9,
  });
  const preview = new THREE.Line(new THREE.BufferGeometry(), previewMat);
  preview.visible = false;
  scene.add(preview);
  const landingRing = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.25, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffe48a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  landingRing.rotation.x = -Math.PI / 2;
  landingRing.position.y = 0.08;
  landingRing.visible = false;
  scene.add(landingRing);
  function showShuttleAtCurrent() {
    const { busy, rallyEnded, gameOver, phase, player, incoming } = getState();
    if (busy || rallyEnded || gameOver) return;
    shuttle.visible = true;
    const p = phase === 'serve' ? player : incoming;
    shuttle.position.set(p.x, phase === 'serve' ? 1.05 : (incoming.height ?? 0.95), p.d);
  }
  function previewShot(id) {
    const { busy, rallyEnded, gameOver, phase, player, incoming } = getState();
    if (busy || rallyEnded || gameOver) return;
    const options =
      phase === 'serve'
        ? SERVES
        : canSmash(incoming, incoming.shotType)
          ? [...SHOTS, ...SMASH_SHOTS]
          : SHOTS;
    const shot = options.find((s) => s.id === id);
    if (!shot) return;
    const from = phase === 'serve' ? player : incoming,
      to =
        phase === 'serve'
          ? serveTarget(shot, 0, getState().score)
          : shotTarget(shot, from, incoming.quality);
    const isClear = shot.type === 'clear' || shot.id === 'deep';
    const peak = to.peak ?? (isClear ? 3.8 : shot.id === 'mid' ? 2.2 : 1.4);
    let pts = [];
    for (let i = 0; i <= 36; i++) {
      let t = i / 36;
      pts.push(
        new THREE.Vector3(
          from.x + (to.x - from.x) * t,
          shot.type === 'smash'
            ? trajectoryHeight(shot.type, t, to)
            : 0.95 + peak * 4 * t * (1 - t),
          from.d + (-to.d - from.d) * t,
        ),
      );
    }
    preview.geometry.dispose();
    preview.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    preview.computeLineDistances();
    preview.visible = true;
    landingRing.visible = true;
    landingRing.position.set(to.x, 0.08, -to.d);
  }
  function hidePreview() {
    preview.visible = false;
    landingRing.visible = false;
  }

  const resize = () => {
    const el = $('scene');
    renderer.setSize(el.clientWidth, el.clientHeight);
    camera.aspect = el.clientWidth / el.clientHeight;
    camera.fov = window.innerWidth <= 850 ? (camera.aspect < 0.9 ? 65 : 57) : 42;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe($('scene'));
  resize();
  // Orbit without external controls. Keep camera on player's side for easy court reading.
  let orbit = { theta: 0, phi: 1.15, radius: 17.2 },
    pointer = null;
  const activePointers = new Map();
  let pinchDistance = null;
  function updateCamera() {
    camera.position.set(
      orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
      orbit.radius * Math.cos(orbit.phi),
      orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
    );
    camera.lookAt(0, 0, 0);
  }
  updateCamera();
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
    if (activePointers.size > 1) pinchDistance = null;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      const [a, b] = [...activePointers.values()],
        distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance)
        orbit.radius = clamp((orbit.radius * pinchDistance) / Math.max(1, distance), 11, 27);
      pinchDistance = distance;
      updateCamera();
      return;
    }
    if (!pointer || pointer.id !== e.pointerId) return;
    orbit.theta = clamp(orbit.theta - (e.clientX - pointer.x) * 0.006, -1.4, 1.4);
    orbit.phi = clamp(orbit.phi + (e.clientY - pointer.y) * 0.006, 0.3, 1.28);
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    updateCamera();
  });
  const releasePointer = (e) => {
    activePointers.delete(e.pointerId);
    pinchDistance = null;
    const remaining = [...activePointers.entries()][0];
    pointer = remaining ? { id: remaining[0], ...remaining[1] } : null;
  };
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      orbit.radius = clamp(orbit.radius + Math.sign(e.deltaY) * 1.3, 11, 27);
      updateCamera();
    },
    { passive: false },
  );
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  return {
    scene,
    camera,
    renderer,
    shuttle,
    marker,
    syncPeople,
    showShuttleAtCurrent,
    previewShot,
    hidePreview,
  };
}
