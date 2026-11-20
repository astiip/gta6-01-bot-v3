// Staged screenshot scenes for ?shot=chase|city|heist|finale.
// Each one plays the real rules forward from a fresh world for a fixed number of
// steps with a scripted autopilot, so the frame is what a short game really looks
// like and the same seed always gives the same frame.

import { STEP } from './config.js';

// Put Mara in the NIGHTHAWK at (x, z), heading north/south as given, at speed.
function placeHero(G, x, z, heading, speed) {
  const car = G.heroCar;
  car.x = x; car.z = z; car.heading = heading; car.speed = speed;
  car.hp = 100; car.wrecked = false;
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading;
  G.playerCar = car;
  G.player.mesh.visible = false;
  G.player.x = x; G.player.z = z; G.player.heading = heading;
}

// Put Mara on foot at (x, z) facing `heading`.
function placeMara(G, x, z, heading) {
  G.playerCar = null;
  G.player.x = x; G.player.z = z; G.player.heading = heading;
  G.player.mesh.visible = true;
  G.player.mesh.position.set(x, 0, z);
  G.player.mesh.rotation.y = heading;
}

export function stageShot(name, G) {
  G.resetWorld();
  G.screen = 'play';
  G.hud.showScreen('play');
  const drive = { axis: { x: 0, y: 1 }, keys: new Set(), boost: false };
  const walk = { axis: { x: 0, y: 1 }, keys: new Set(), boost: false };
  const idle = { axis: { x: 0, y: 0 }, keys: new Set(), boost: false };

  if (name === 'chase') {
    // 5-star getaway at top speed, passing under the NEON HARBOR gantry.
    placeHero(G, 0, 308, Math.PI, 62);
    G.police.addHeat(95);
    G.police.forceSpawn(2);
    const cars = G.police.state.cars;
    if (cars[0]) { cars[0].x = -3.5; cars[0].z = 322; cars[0].heading = Math.PI; }
    if (cars[1]) { cars[1].x = 3.5; cars[1].z = 326; cars[1].heading = Math.PI; }
    G.cameraLock = { pos: { x: 4.5, y: 3.1, z: 266 }, look: { x: -0.5, y: 1.8, z: 292 } };
    G.hud.say('5 STARS — the whole bay is behind her. 223 KM/H under the gantry.');
    return { ...drive, steps: 24 };
  }

  if (name === 'city') {
    // On foot on the neon boulevard, umbrellas up, rain coming down.
    placeMara(G, 8, -50, Math.PI);
    // pull a crowd onto this boulevard for the frame — ahead of Mara, off her lane
    G.pedestrians.forEach((p, i) => {
      p.x = -30 + i * 3.1;
      p.z = -62 - (i % 3) * 3;
      p.heading = i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
    });
    G.hud.say('Meridian Bay, 02:14 AM. The boulevard never sleeps — it just gets wetter.');
    return { ...walk, steps: 80 };
  }

  if (name === 'heist') {
    // Mara stepping out of the Meridian Vault, take in hand, MBPD closing in.
    placeMara(G, 90, -56, Math.PI);
    G.money = 48000;
    G.police.addHeat(35);
    G.police.forceSpawn(2);
    const cars = G.police.state.cars;
    if (cars[0]) { cars[0].x = 58; cars[0].z = -60; cars[0].heading = Math.PI / 2; }
    if (cars[1]) { cars[1].x = 122; cars[1].z = -60; cars[1].heading = -Math.PI / 2; }
    G.hud.say('JOB 1 — THE VAULT. $48,000 cracked. Two stars and counting.');
    G.hud.dialog('JOB 1 — THE VAULT', 'Vault cracked. $48,000 in the bag — MBPD is on its way.');
    // low, wide framing: Mara in the foreground, the Vault sign above her
    G.cameraLock = { pos: { x: 90, y: 3.5, z: -46 }, look: { x: 90, y: 7, z: -78 } };
    return { ...walk, steps: 55 };
  }

  if (name === 'finale') {
    // The getaway boat at Pier 9, Mara aboard, the city burning neon behind her.
    // Mara stands on the stern deck (south of the cabin) so the boat never hides her.
    placeMara(G, 30, 354.5, 0.9);
    G.player.y = 1.15;
    G.boat.position.set(30, 0, 352);
    G.money = 261000;
    G.hud.say('CLEAN GETAWAY. Meridian Bay fades behind the rain.');
    G.hud.dialog('JOB 8 — CLEAN GETAWAY', 'Eight jobs. One night. Mara Voss is a ghost now.');
    G.cameraLock = { pos: { x: 42, y: 3.6, z: 364 }, look: { x: 30, y: 1.6, z: 351 } };
    return { ...idle, steps: 70 };
  }

  // unknown shot name: a quiet title-style frame over the harbour road
  placeHero(G, 0, 200, Math.PI, 0);
  return { ...idle, steps: 30 };
}
