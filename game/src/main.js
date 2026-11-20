// NEON HARBOR: RAIN HEIST — boot, the one loop, player driving / on-foot control,
// camera, screens, garage, save, and the ?shot= staging mode.
//
// ?seed=N fixes the city layout. ?shot=chase|city|heist|finale (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady.

import { STEP, CAR, WEAPONS, RADIO, JOBS, LOCATIONS, PALETTE, SAVE_KEY } from './config.js';
import { createRandom } from './random.js';
import { clamp, dist, angleLerp } from './util.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildCity } from './city.js';
import { makeCarMesh, makeBoatMesh, createCar, updateDrive, createTraffic, updateTraffic } from './vehicles.js';
import { makeMaraMesh, createPedestrians, updatePedestrians, updateEnemies } from './people.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createWeather } from './weather.js';
import { createHud } from './hud.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.FogExp2(PALETTE.fog, 0.0052);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

const rng = createRandom(seed);
const city = buildCity(scene, rng);
const weather = createWeather(scene);
const audio = createAudio();
const input = createInput();
const traffic = createTraffic(scene, rng, 14);
const pedestrians = createPedestrians(scene, rng, 22);

// --- hero car + Mara -----------------------------------------------------------
const heroMesh = makeCarMesh({ body: 0x0e3f3c, underglow: 0x37e6ff, spoiler: true });
scene.add(heroMesh);
const headlight = new THREE.SpotLight(0xfff2c0, 60, 55, 0.5, 0.5, 1.2);
headlight.position.set(0, 1.0, 2.2);
const headTarget = new THREE.Object3D();
headTarget.position.set(0, 0, 24);
heroMesh.add(headlight, headTarget);
headlight.target = headTarget;

const maraMesh = makeMaraMesh();
scene.add(maraMesh);

const boatMesh = makeBoatMesh();
boatMesh.position.set(30, 0, 350);
scene.add(boatMesh);

// --- shared game state ---------------------------------------------------------
const saved = loadSave();
const G = {
  scene, camera, renderer, rng, city, weather, audio, input,
  time: 0,
  screen: 'title',
  player: { x: -150, z: 52, heading: 0, hp: 100, mesh: maraMesh, moving: false },
  playerCar: null,
  heroCar: null,
  traffic, pedestrians,
  enemies: [],
  parked: [],
  boat: boatMesh,
  boatEscape: false,
  money: saved?.money ?? 0,
  respect: saved?.respect ?? 0,
  weaponIndex: 0,
  upgrades: saved?.upgrades ?? { engine: 0, armor: 0, nitro: false, tires: 0 },
  cameraKick: 0,
  cameraLock: null,
  blackoutTimer: 0,
  actions: new Set(),
  scripted: null,
};
G.heroCar = createCar(heroMesh, -150, 56, Math.PI / 2);
G.heroCar.isHero = true;
G.heroCar.hp = CAR.hp + 60 * G.upgrades.armor;
G.heroCar.nitro = 5;
G.police = createPolice(G);
G.missions = createMissions(G);
G.combat = createCombat(G);
G.hud = createHud(G);
if (saved) {
  G.missions.state.jobIndex = Math.min(saved.jobIndex ?? 0, JOBS.length);
  G.missions.state.completed = saved.jobIndex ?? 0;
}

function announce(msg) { status.textContent = msg; }

G.saveGame = function saveGame() {
  writeSave({
    money: G.money, respect: G.respect,
    jobIndex: G.missions.state.jobIndex, upgrades: G.upgrades,
  });
};

G.addRespect = function addRespect(n) {
  const before = G.respect;
  G.respect += n;
  const ranks = [0, 40, 100, 180, 300, 450];
  const names = ['ROOKIE', 'STREET', 'HUSTLER', 'RUNNER', 'GHOST', 'LEGEND'];
  let rb = 0, ra = 0;
  for (let i = 0; i < ranks.length; i += 1) {
    if (before >= ranks[i]) rb = i;
    if (G.respect >= ranks[i]) ra = i;
  }
  if (ra > rb) {
    G.hud.say(`RESPECT UP — you are ${names[ra]} now. The bay is talking about Mara Voss.`);
    G.audio.chime();
  }
};

G.gameOver = function gameOver(kind) {
  if (G.screen === 'over') return;
  G.screen = 'over';
  if (kind === 'busted') {
    G.money = Math.floor(G.money * 0.8);
    G.hud.setOver('BUSTED', 'MBPD took Mara in under the harbour lights. They seized 20% of the take. The NIGHTHAWK is impounded at the garage — go get it back.');
  } else if (kind === 'wasted') {
    G.hud.setOver('WASTED', 'The rain keeps falling on Meridian Bay. Mara wakes up at the safehouse — the take is still hers, but the night is not over.');
  } else if (kind === 'escaped') {
    G.hud.setOver('CLEAN GETAWAY', `Eight jobs. One night. $${G.money.toLocaleString('en-US')} in the bag, respect ${G.respect}, and the whole bay behind her. Mara Voss is a ghost now — and ghosts do not get caught.`);
  }
  G.hud.showScreen('over');
  G.saveGame();
  announce(G.hud ? document.getElementById('over-title').textContent : kind);
};

function clearPolice() {
  for (const car of G.police.state.cars) G.scene.remove(car.mesh);
  G.police.state.cars = [];
  if (G.police.state.heli) { G.scene.remove(G.police.state.heli.mesh); G.police.state.heli = null; }
  G.police.state.wanted = 0;
  G.police.state.heat = 0;
  G.police.state.roadblocks.forEach((b) => b.forEach((c) => G.scene.remove(c.mesh)));
  G.police.state.roadblocks = [];
}

G.resetWorld = function resetWorld() {
  G.player.x = -150; G.player.z = 52; G.player.heading = 0; G.player.hp = 100; G.player.y = 0;
  G.player.mesh.visible = true;
  G.heroCar.x = -150; G.heroCar.z = 56; G.heroCar.heading = Math.PI / 2;
  G.heroCar.speed = 0; G.heroCar.hp = CAR.hp + 60 * G.upgrades.armor; G.heroCar.wrecked = false; G.heroCar.nitro = 5;
  G.heroCar.mesh.position.set(-150, 0, 56);
  G.heroCar.mesh.rotation.y = Math.PI / 2;
  G.playerCar = null;
  G.enemies.forEach((e) => G.scene.remove(e.mesh));
  G.enemies = [];
  G.cameraLock = null;
  G.cameraKick = 0;
  G.boatEscape = false;
  G.blackoutTimer = 0;
  clearPolice();
  G.missions.state.active = null;
  city.setBlackout(false);
  weather.setIntensity(1);
};

// --- car enter / exit ------------------------------------------------------------
function nearestCar(x, z, maxD) {
  let best = null, bestD = maxD;
  const candidates = [G.heroCar, ...G.parked, ...traffic];
  for (const c of candidates) {
    if (c.wrecked) continue;
    const d = dist(x, z, c.x, c.z);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

function enterCar(car) {
  const stolen = traffic.includes(car);
  if (stolen) {
    traffic.splice(traffic.indexOf(car), 1);
    G.parked.push(car);
    G.police.addHeat(15);
    G.hud.say('Carjacked. Somebody just called MBPD — that was loud.');
    G.hud.chatter('Dispatch: carjacking reported, harbour district. Unit 12 responding.');
  }
  G.playerCar = car;
  G.player.mesh.visible = false;
  G.audio.setEngine(0, true);
}

function exitCar() {
  const car = G.playerCar;
  if (!car || Math.abs(car.speed) > 2) return;
  G.playerCar = null;
  G.player.x = car.x + Math.cos(car.heading) * 2.4;
  G.player.z = car.z - Math.sin(car.heading) * 2.4;
  G.player.heading = car.heading;
  G.player.mesh.visible = true;
  G.audio.setEngine(0, false);
}

// --- garage ----------------------------------------------------------------------
function nearGarage() {
  return dist(G.player.x, G.player.z, LOCATIONS.garage.x, LOCATIONS.garage.z + 16) < 9;
}

function openGarage() {
  G.screen = 'garage';
  G.hud.openGarage();
  G.hud.showScreen('garage');
  announce('NIGHTHAWK GARAGE. Spend the take on the car.');
}

// --- one fixed step ----------------------------------------------------------------
function stepWorld(dt, scripted) {
  G.time += dt;
  const actions = scripted ? scripted.keys : input.takeActions();
  G.actions = actions;
  const axis = scripted ? scripted.axis : input.axis();
  if (actions.size > 0) audio.unlock();

  // global keys
  if (actions.has('Enter')) {
    if (G.screen === 'title') startGame();
    else if (G.screen === 'over') retry();
    else if (G.screen === 'pause') { G.screen = 'play'; G.hud.showScreen('play'); }
  }
  if (actions.has('KeyP')) {
    if (G.screen === 'play') { G.screen = 'pause'; G.hud.showScreen('pause'); announce('Paused.'); }
    else if (G.screen === 'pause') { G.screen = 'play'; G.hud.showScreen('play'); }
  }
  if (actions.has('KeyM')) {
    audio.setMuted(!audio.muted);
    G.hud.say(audio.muted ? 'Audio muted.' : `Audio on — ${RADIO[audio.station].name}.`);
  }
  if (actions.has('Digit1')) audio.setStation(0);
  if (actions.has('Digit2')) audio.setStation(1);
  if (actions.has('Digit3')) audio.setStation(2);
  if (actions.has('Escape') && G.screen === 'garage') { G.screen = 'play'; G.hud.showScreen('play'); }

  if (G.screen === 'title') {
    // ambient city: traffic rolls, rain falls, camera orbits the NIGHTHAWK
    updateTraffic(traffic, dt, G);
    updatePedestrians(pedestrians, dt, G.time, G);
    city.update(dt, G.time);
    weather.update(dt, camera);
    const a = G.time * 0.12;
    camera.position.set(G.heroCar.x + Math.cos(a) * 15, 5.5, G.heroCar.z + Math.sin(a) * 15);
    camera.lookAt(G.heroCar.x, 1.2, G.heroCar.z);
    return;
  }
  if (G.screen !== 'play') return; // pause / over / garage: freeze the world, keep rendering

  // play-only keys
  if (actions.has('KeyQ')) {
    G.weaponIndex = (G.weaponIndex + 1) % WEAPONS.length;
    G.hud.say(`Weapon: ${WEAPONS[G.weaponIndex].name}.`);
  }
  if (actions.has('KeyJ')) G.missions.acceptNext();
  if (actions.has('KeyC')) G.police.jam();
  if (actions.has('KeyF')) G.combat.fire();
  if (actions.has('KeyG') && !G.playerCar && nearGarage()) openGarage();

  // enter / exit car
  if (actions.has('KeyE')) {
    if (G.playerCar) exitCar();
    else {
      const car = nearestCar(G.player.x, G.player.z, 4.5);
      if (car) enterCar(car);
    }
  }

  // --- player ---
  const p = G.player;
  if (G.playerCar) {
    const car = G.playerCar;
    updateDrive(car, axis, dt, G, input.held.has('boost') || (scripted && scripted.boost));
    audio.setEngine(Math.abs(car.speed) / 62, true);
    p.x = car.x; p.z = car.z; p.heading = car.heading; p.moving = Math.abs(car.speed) > 1;
    if (car.wrecked) exitCar();
  } else {
    audio.setEngine(0, false);
    // camera-relative movement
    const fx = p.x - camera.position.x, fz = p.z - camera.position.z;
    const fl = Math.max(0.001, Math.hypot(fx, fz));
    const fwdX = fx / fl, fwdZ = fz / fl;
    const rightX = -fwdZ, rightZ = fwdX;
    const run = input.held.has('boost') || (scripted && scripted.boost);
    const speed = run ? 9.5 : 6.5;
    const mx = fwdX * axis.y + rightX * axis.x;
    const mz = fwdZ * axis.y + rightZ * axis.x;
    p.moving = Math.abs(mx) + Math.abs(mz) > 0.01;
    if (p.moving) {
      const ml = Math.hypot(mx, mz);
      const targetHeading = Math.atan2(mx / ml, mz / ml);
      p.heading = angleLerp(p.heading, targetHeading, Math.min(1, 12 * dt));
      const nx = p.x + Math.sin(p.heading) * speed * dt;
      const nz = p.z + Math.cos(p.heading) * speed * dt;
      const hit = city.collideCircle(nx, nz, 0.55);
      p.x = hit.x;
      const maxZ = Math.abs(hit.x) < 58 ? 348 : 316;
      p.z = clamp(hit.z, -310, maxZ);
      const swing = Math.sin(G.time * 11) * 0.45;
      maraMesh.userData.legL.rotation.x = swing;
      maraMesh.userData.legR.rotation.x = -swing;
    } else {
      maraMesh.userData.legL.rotation.x = 0;
      maraMesh.userData.legR.rotation.x = 0;
    }
    maraMesh.position.set(p.x, p.y || 0, p.z);
    maraMesh.rotation.y = p.heading;
  }

  // blackout job effect
  if (G.blackoutTimer > 0) {
    G.blackoutTimer -= dt;
    if (G.blackoutTimer <= 0) { city.setBlackout(false); weather.setIntensity(1); }
  }

  updateTraffic(traffic, dt, G);
  updatePedestrians(pedestrians, dt, G.time, G);
  updateEnemies(G.enemies, dt, G);
  G.police.update(dt);
  G.missions.update(dt);
  G.combat.update(dt);
  city.update(dt, G.time);
  weather.update(dt, camera);

  // boat bobbing at the pier
  boatMesh.position.y = Math.sin(G.time * 0.9) * 0.18 - 0.1;
  boatMesh.rotation.z = Math.sin(G.time * 0.7) * 0.02;

  // player health
  if (p.hp <= 0) { G.gameOver('wasted'); return; }

  // garage prompt
  if (!G.playerCar && nearGarage()) G.hud.setPrompt('G — NIGHTHAWK GARAGE (upgrade the car)');
  else if (!G.playerCar && nearestCar(p.x, p.z, 4.5)) G.hud.setPrompt('E — Get in the car');
  else if (G.playerCar && Math.abs(G.playerCar.speed) < 2) G.hud.setPrompt('E — Get out');
  else G.hud.setPrompt('');

  // --- camera ---
  if (G.cameraLock) {
    camera.position.set(G.cameraLock.pos.x, G.cameraLock.pos.y, G.cameraLock.pos.z);
    camera.lookAt(G.cameraLock.look.x, G.cameraLock.look.y, G.cameraLock.look.z);
  } else {
    const tx = G.playerCar ? G.playerCar.x : p.x;
    const tz = G.playerCar ? G.playerCar.z : p.z;
    const th = G.playerCar ? G.playerCar.heading : p.heading;
    const camDist = G.playerCar ? 11.5 : 7.5;
    const camH = G.playerCar ? 4.4 : 3.4;
    const dx = tx - Math.sin(th) * camDist;
    const dz = tz - Math.cos(th) * camDist;
    const k = Math.min(1, 5.5 * dt);
    camera.position.x += (dx - camera.position.x) * k;
    camera.position.y += (camH - camera.position.y) * k;
    camera.position.z += (dz - camera.position.z) * k;
    if (G.cameraKick > 0) {
      camera.position.x += (Math.random() - 0.5) * G.cameraKick;
      camera.position.y += (Math.random() - 0.5) * G.cameraKick * 0.5;
      G.cameraKick = Math.max(0, G.cameraKick - dt * 0.5);
    }
    camera.lookAt(tx + Math.sin(th) * 8, 1.5, tz + Math.cos(th) * 8);
  }

  G.hud.update(dt);
}

function startGame() {
  G.resetWorld();
  // restore saved progress onto the fresh world
  G.money = saved?.money ?? 0;
  G.respect = saved?.respect ?? 0;
  G.missions.state.jobIndex = Math.min(saved?.jobIndex ?? 0, JOBS.length);
  G.missions.state.completed = saved?.jobIndex ?? 0;
  G.screen = 'play';
  G.hud.showScreen('play');
  G.hud.say('Meridian Bay, 02:14 AM. Rain. The Vault is waiting — press J for the first job.');
  G.hud.dialog('NEON HARBOR: RAIN HEIST', 'Eight jobs stand between Mara Voss and the boat at Pier 9. Press J to take the first job. The NIGHTHAWK is parked by the garage.');
  announce('Playing. Press J for the first job.');
  audio.unlock();
  if (saved && (saved.money > 0 || (saved.jobIndex ?? 0) > 0)) {
    G.hud.setSaveLine(`Save loaded: $${G.money.toLocaleString('en-US')} · ${G.missions.state.completed}/8 jobs done`);
  }
}

function retry() {
  G.resetWorld();
  G.player.x = LOCATIONS.safehouse.x;
  G.player.z = LOCATIONS.safehouse.z - 14;
  G.heroCar.x = LOCATIONS.safehouse.x;
  G.heroCar.z = LOCATIONS.safehouse.z - 24;
  G.heroCar.heading = Math.PI;
  G.screen = 'play';
  G.hud.showScreen('play');
  G.hud.say('Back on your feet at the safehouse. The night is not over.');
  announce('Playing again from the safehouse.');
}

// garage purchases (bound to the HUD buttons)
G.buyUpgrade = function buyUpgrade(id) {
  const defs = [
    { id: 'engine', name: 'ENGINE MK-II', cost: 25000 },
    { id: 'armor', name: 'ARMOURED PLATES', cost: 18000 },
    { id: 'nitro', name: 'NITRO KIT', cost: 30000 },
    { id: 'tires', name: 'RAIN TIRES', cost: 12000 },
  ];
  const def = defs.find((d) => d.id === id);
  if (!def) return;
  if (G.money < def.cost) { G.hud.say(`Not enough take — ${def.name} costs $${def.cost.toLocaleString('en-US')}. Go earn it.`); return; }
  G.money -= def.cost;
  if (id === 'engine') G.upgrades.engine += 1;
  if (id === 'armor') { G.upgrades.armor += 1; G.heroCar.hp += 60; }
  if (id === 'nitro') G.upgrades.nitro = true;
  if (id === 'tires') G.upgrades.tires += 1;
  G.hud.say(`${def.name} installed on the NIGHTHAWK.`);
  G.audio.chime();
  G.saveGame();
};

// --- boot ------------------------------------------------------------------------
G.resetWorld();
G.hud.showScreen('title');
if (saved && (saved.money > 0 || (saved.jobIndex ?? 0) > 0)) {
  G.hud.setSaveLine(`Save found: $${(saved.money ?? 0).toLocaleString('en-US')} · ${(saved.jobIndex ?? 0)}/8 jobs done — press ENTER to continue the night.`);
}
announce('NEON HARBOR: RAIN HEIST. Press Enter to start.');

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') {
    G.screen = 'pause';
    G.hud.showScreen('pause');
  }
});

function runShot(name) {
  const script = stageShot(name, G);
  for (let i = 0; i < script.steps; i += 1) stepWorld(STEP, script);
  let painted = 0;
  function paint() {
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (accumulator >= STEP) {
      stepWorld(STEP, null);
      accumulator -= STEP;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
