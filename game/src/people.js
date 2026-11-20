// People: Mara Voss on foot, umbrella pedestrians on the boulevard, and the rival
// crew that ambushes her at Pier 9.

import { WORLD } from './config.js';
import { clamp, dist } from './util.js';

const COATS = [0x3a3f4a, 0x6b2f3c, 0x2f4a3c, 0x4a3a5a, 0x5a4a2f, 0x2f3a5a];

function lambert(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

export function makePersonMesh(rng, opts = {}) {
  const { coat = 0x3a3f4a, umbrella = true, enemy = false } = opts;
  const g = new THREE.Group();
  const coatMat = lambert(enemy ? 0x7a1f24 : coat);
  const skinMat = lambert(0xc9a186);
  const legMat = lambert(0x14161c);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.95, 8), coatMat);
  body.position.y = 0.95;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
  head.position.y = 1.62;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0x1a1210));
  hair.position.y = 1.66;
  g.add(hair);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 6), legMat);
  legL.position.set(-0.12, 0.25, 0);
  const legR = legL.clone();
  legR.position.x = 0.12;
  g.add(legL, legR);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6), coatMat);
  armL.position.set(-0.32, 1.1, 0.1);
  armL.rotation.x = -0.4;
  const armR = armL.clone();
  armR.position.x = 0.32;
  g.add(armL, armR);

  let umbrellaMesh = null;
  if (umbrella) {
    umbrellaMesh = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), lambert(0x888888));
    stick.position.y = 0.55;
    umbrellaMesh.add(stick);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 0.3, 10),
      lambert(rng ? rng.pick([0x37e6ff, 0xff2e88, 0xffb02e, 0x222831]) : 0x222831, { transparent: true, opacity: 0.92 }),
    );
    canopy.position.y = 1.12;
    umbrellaMesh.add(canopy);
    umbrellaMesh.position.set(0.28, 1.35, 0.15);
    umbrellaMesh.rotation.z = -0.18;
    g.add(umbrellaMesh);
  }

  // fake blob shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  g.add(shadow);

  g.userData = { legL, legR, umbrellaMesh };
  return g;
}

export function makeMaraMesh() {
  const g = new THREE.Group();
  const coatMat = lambert(0x14181f);
  const skinMat = lambert(0xd8b096);
  const scarfMat = lambert(0x0e6f6a, { emissive: 0x0e6f6a, emissiveIntensity: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.95, 8), coatMat);
  body.position.y = 0.95;
  g.add(body);
  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), scarfMat);
  scarf.position.y = 1.42;
  g.add(scarf);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10), skinMat);
  head.position.y = 1.62;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), lambert(0x0d0a08));
  hair.position.y = 1.66;
  g.add(hair);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 6), lambert(0x14161c));
  legL.position.set(-0.12, 0.25, 0);
  const legR = legL.clone();
  legR.position.x = 0.12;
  g.add(legL, legR);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.62, 6), coatMat);
  armL.position.set(-0.31, 1.08, 0.08);
  armL.rotation.x = -0.3;
  const armR = armL.clone();
  armR.position.x = 0.31;
  g.add(armL, armR);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  g.add(shadow);
  g.userData = { legL, legR };
  return g;
}

// --- pedestrians ---------------------------------------------------------------
export function createPedestrians(scene, rng, count = 22) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePersonMesh(rng, { coat: rng.pick(COATS), umbrella: true });
    scene.add(mesh);
    const alongX = rng.next() < 0.5;
    const street = Math.floor(rng.range(-5, 6)) * WORLD.streetStep;
    list.push({
      mesh,
      x: alongX ? rng.range(-280, 280) : street + rng.pick([-9, 9]),
      z: alongX ? street + rng.pick([-9, 9]) : rng.range(-280, 280),
      heading: rng.next() * Math.PI * 2,
      speed: rng.range(1.1, 2.0),
      alongX,
      street,
      walkPhase: rng.next() * 10,
    });
  }
  return list;
}

export function updatePedestrians(list, dt, t, G) {
  for (const p of list) {
    // stroll along the sidewalk; turn at intersections, never in the harbour
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    const nearStreetX = Math.abs(p.x - Math.round(p.x / 60) * 60) < 2;
    const nearStreetZ = Math.abs(p.z - Math.round(p.z / 60) * 60) < 2;
    if ((nearStreetX || nearStreetZ) && Math.random() < 0.004) {
      p.heading += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    if (p.z > 315) p.heading = Math.PI; // turn back from the water
    if (Math.abs(p.x) > 295) p.heading = p.x > 0 ? -Math.PI / 2 : Math.PI / 2;
    if (Math.abs(p.z) > 295 && p.z < 300) p.heading = 0;
    // keep clear of the player
    const d = dist(p.x, p.z, G.player.x, G.player.z);
    if (d < 2.2) {
      p.x += ((p.x - G.player.x) / Math.max(d, 0.01)) * dt * 3;
      p.z += ((p.z - G.player.z) / Math.max(d, 0.01)) * dt * 3;
    }
    p.walkPhase += dt * p.speed * 4;
    const swing = Math.sin(p.walkPhase) * 0.35;
    p.mesh.userData.legL.rotation.x = swing;
    p.mesh.userData.legR.rotation.x = -swing;
    if (p.mesh.userData.umbrellaMesh) {
      p.mesh.userData.umbrellaMesh.rotation.z = -0.18 + Math.sin(t * 2 + p.walkPhase) * 0.06;
    }
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
  }
}

// --- rival crew (JOB 6) ----------------------------------------------------------
export function spawnEnemies(scene, rng, cx, cz, count) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePersonMesh(rng, { enemy: true, umbrella: false });
    scene.add(mesh);
    const a = (i / count) * Math.PI * 2;
    list.push({
      mesh,
      x: cx + Math.cos(a) * 18,
      z: cz + Math.sin(a) * 18,
      heading: a,
      hp: 50,
      speed: rng.range(2.2, 3.2),
      shootTimer: rng.range(0.5, 2),
      alive: true,
      walkPhase: rng.next() * 10,
    });
  }
  return list;
}

export function updateEnemies(list, dt, G) {
  for (const e of list) {
    if (!e.alive) continue;
    const d = dist(e.x, e.z, G.player.x, G.player.z);
    // close in, but keep a little distance and fire
    const want = Math.atan2(G.player.x - e.x, G.player.z - e.z);
    e.heading += (want - e.heading) * Math.min(1, 3 * dt);
    if (d > 9) {
      e.x += Math.sin(e.heading) * e.speed * dt;
      e.z += Math.cos(e.heading) * e.speed * dt;
    }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && d < 42) {
      e.shootTimer = 1.6 + Math.random() * 1.2;
      if (Math.random() < 0.45) {
        G.player.hp -= 6 + Math.random() * 5;
        G.hud.flashDamage(0.3);
        G.audio.thud();
        G.hud.say('Rival crew firing — move!');
      }
    }
    e.walkPhase += dt * 6;
    e.mesh.userData.legL.rotation.x = Math.sin(e.walkPhase) * 0.4;
    e.mesh.userData.legR.rotation.x = -Math.sin(e.walkPhase) * 0.4;
    e.mesh.position.set(e.x, 0, e.z);
    e.mesh.rotation.y = e.heading;
  }
}
