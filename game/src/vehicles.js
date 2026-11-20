// Cars: the hero NIGHTHAWK, city traffic, MBPD interceptors, the heli and the
// getaway boat. All built from boxes and cylinders — no model files.

import { CAR, PALETTE, WORLD } from './config.js';
import { clamp, dist, onRoad } from './util.js';

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function lambert(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

export function makeCarMesh(opts = {}) {
  const {
    body = 0x2a2f38, cabin = 0x11141c, accent = 0x37e6ff,
    police = false, underglow = null, spoiler = false,
  } = opts;
  const g = new THREE.Group();
  const bodyMat = lambert(body);
  const glassMat = lambert(cabin, { emissive: 0x0a2030, emissiveIntensity: 0.6 });

  g.add(box(2.0, 0.62, 4.4, bodyMat, 0, 0.55, 0));
  g.add(box(1.7, 0.55, 2.1, glassMat, 0, 1.08, -0.2));
  // hood + trunk shaping
  g.add(box(1.9, 0.28, 0.9, bodyMat, 0, 0.72, 1.85));
  g.add(box(1.9, 0.28, 0.7, bodyMat, 0, 0.72, -1.95));
  if (spoiler) g.add(box(1.9, 0.08, 0.5, lambert(0x0c0e12), 0, 1.12, -2.05));

  // wheels
  const wheelMat = lambert(0x0a0a0c);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    g.add(w);
    wheels.push(w);
  }

  // headlights + taillights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  g.add(box(0.42, 0.16, 0.08, headMat, -0.62, 0.62, 2.21));
  g.add(box(0.42, 0.16, 0.08, headMat, 0.62, 0.62, 2.21));
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a3c });
  g.add(box(1.7, 0.14, 0.08, tailMat, 0, 0.66, -2.21));

  if (underglow) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 5.0),
      new THREE.MeshBasicMaterial({ color: underglow, transparent: true, opacity: 0.55 }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.06;
    g.add(glow);
  }

  let lightBar = null;
  if (police) {
    // MBPD livery: white doors, black hood, light bar on the roof.
    g.add(box(2.02, 0.4, 1.6, lambert(0xf2f4f6), 0, 0.62, 0.1));
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2a3c }));
    red.position.x = -0.4;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
    blue.position.x = 0.4;
    lightBar.add(red, blue);
    lightBar.position.set(0, 1.42, -0.2);
    lightBar.userData = { red, blue };
    g.add(lightBar);
  }

  // fake blob shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 5.2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  g.add(shadow);

  g.userData = { wheels, lightBar };
  return g;
}

export function makeHeliMesh() {
  const g = new THREE.Group();
  g.add(box(2.2, 1.6, 3.4, lambert(0x1c222e), 0, 0, 0));
  g.add(box(1.2, 1.0, 3.2, lambert(0x0e1420), 0, -0.2, -3.0));
  g.add(box(0.5, 1.4, 0.5, lambert(0x1c222e), 0, 0.4, -4.2));
  const rotor = box(7.5, 0.08, 0.5, lambert(0x11141a), 0, 1.1, 0);
  g.add(rotor);
  const tail = box(0.3, 0.3, 0.3, new THREE.MeshBasicMaterial({ color: 0xff2a3c }), 0, 0.9, -4.4);
  g.add(tail);
  // searchlight cone
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -13;
  g.add(cone);
  g.userData = { rotor };
  return g;
}

export function makeBoatMesh() {
  const g = new THREE.Group();
  g.add(box(3.2, 1.0, 8.5, lambert(0x12303a), 0, 0.6, 0));
  g.add(box(2.4, 1.1, 3.0, lambert(0x0c1a20), 0, 1.6, -0.6));
  g.add(box(3.0, 0.25, 1.2, lambert(0x37e6ff), 0, 1.15, 3.2));
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0x37e6ff }));
  light.position.set(0, 2.4, -0.6);
  g.add(light);
  return g;
}

// --- arcade driving ----------------------------------------------------------
export function createCar(mesh, x, z, heading) {
  return {
    mesh, x, z, heading, speed: 0, steer: 0, hp: CAR.hp,
    nitro: 0, wrecked: false, isHero: false,
  };
}

export function updateDrive(car, axis, dt, G, boost) {
  if (car.wrecked) { car.speed *= (1 - 2 * dt); return; }
  const up = G.upgrades || { engine: 0, armor: 0, nitro: false, tires: 0 };
  const top = CAR.maxSpeed * (1 + 0.18 * up.engine) * (boost && up.nitro && car.nitro > 0 ? 1.35 : 1);
  const accel = CAR.accel * (1 + 0.1 * up.engine);
  if (axis.y > 0) car.speed += accel * dt;
  else if (axis.y < 0) {
    if (car.speed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverseAccel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
  }
  if (boost && up.nitro && car.nitro > 0 && axis.y > 0) car.nitro -= dt;
  else if (car.nitro < 5) car.nitro = Math.min(5, car.nitro + dt * 0.25);
  car.speed = clamp(car.speed, -CAR.maxReverse, top);

  const grip = CAR.grip + 0.7 * up.tires;
  const steerTarget = axis.x * CAR.steer * clamp(Math.abs(car.speed) / 12, 0, 1);
  car.steer += (steerTarget - car.steer) * Math.min(1, grip * dt);
  car.heading += car.steer * dt * Math.sign(car.speed) * clamp(Math.abs(car.speed) / 8, 0, 1.4);

  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const hit = G.city.collideCircle(nx, nz, 1.6);
  if (hit.x !== nx || hit.z !== nz) {
    if (Math.abs(car.speed) > 8) { car.hp -= Math.abs(car.speed) * 0.5; G.audio.thud(); G.hud.flashDamage(0.35); }
    car.speed *= 0.35;
  }
  car.x = clamp(hit.x, -310, 310);
  car.z = clamp(hit.z, -310, 316);
  if (car.hp <= 0 && !car.wrecked) {
    car.wrecked = true;
    car.speed = 0;
    G.hud.say('NIGHTHAWK wrecked. Get out and run — E to exit.');
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // body roll + wheel spin for life
  car.mesh.rotation.z = -car.steer * 0.05 * Math.sign(car.speed || 1);
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.2;
}

// --- city traffic --------------------------------------------------------------
const TRAFFIC_COLORS = [0x8a2f3c, 0x2f4a6b, 0x6b6b2f, 0x3c3c44, 0x5a2f6b, 0x777777, 0x2f6b4a];

export function createTraffic(scene, rng, count = 14) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makeCarMesh({ body: rng.pick(TRAFFIC_COLORS) });
    scene.add(mesh);
    const alongX = rng.next() < 0.5;
    const street = Math.floor(rng.range(-5, 6)) * WORLD.streetStep;
    const pos = rng.range(-280, 280);
    cars.push({
      mesh,
      x: alongX ? pos : street + (rng.next() < 0.5 ? 3.5 : -3.5),
      z: alongX ? street + (rng.next() < 0.5 ? 3.5 : -3.5) : pos,
      heading: alongX ? (rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng.next() < 0.5 ? 0 : Math.PI),
      speed: rng.range(8, 14),
      street,
      alongX,
      stopped: 0,
    });
  }
  return cars;
}

export function updateTraffic(cars, dt, G) {
  for (const c of cars) {
    if (c.stopped > 0) { c.stopped -= dt; continue; }
    const ahead = 14;
    // slow down if the player car is right ahead
    const px = G.playerCar ? G.playerCar.x : G.player.x;
    const pz = G.playerCar ? G.playerCar.z : G.player.z;
    const d = dist(c.x, c.z, px, pz);
    if (d < ahead) {
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      const dot = ((px - c.x) * fx + (pz - c.z) * fz) / Math.max(d, 0.01);
      if (dot > 0.7 && d < 10) { c.stopped = 0.6; continue; }
    }
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
    // at an intersection, sometimes turn
    const sx = Math.round(c.x / WORLD.streetStep) * WORLD.streetStep;
    const sz = Math.round(c.z / WORLD.streetStep) * WORLD.streetStep;
    const nearX = Math.abs(c.x - sx) < 1.2;
    const nearZ = Math.abs(c.z - sz) < 1.2;
    if ((nearX || nearZ) && Math.abs(c.x) < 295 && Math.abs(c.z) < 295) {
      if (Math.random() < 0.012) {
        c.alongX = !c.alongX;
        c.heading += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
        if (c.alongX) c.z = sz + (Math.random() < 0.5 ? 3.5 : -3.5);
        else c.x = sx + (Math.random() < 0.5 ? 3.5 : -3.5);
      }
    }
    // respawn at the far side if it drove out of town
    if (Math.abs(c.x) > 305 || Math.abs(c.z) > 305) {
      c.x = -Math.sign(c.x) * 290;
      c.z = -Math.sign(c.z) * 290;
    }
    // bump into the player
    if (d < 3.2) {
      const push = (3.2 - d) * 0.5;
      const dx = (c.x - px) / Math.max(d, 0.01), dz = (c.z - pz) / Math.max(d, 0.01);
      c.x += dx * push; c.z += dz * push;
      if (G.playerCar && Math.abs(G.playerCar.speed) > 6) {
        G.playerCar.hp -= 4;
        G.audio.thud();
      }
    }
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.heading;
  }
}
