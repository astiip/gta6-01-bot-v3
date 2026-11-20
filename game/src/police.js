// MBPD: the wanted system, dispatch, roadblocks and the Air One helicopter.
// Wanted runs 0–5 stars. Police spawn at the city edge and hunt the player;
// at 3+ stars they throw roadblocks ahead of her, at 5 the heli joins in.

import { PD_UNITS, WORLD } from './config.js';
import { clamp, dist } from './util.js';
import { makeCarMesh, makeHeliMesh, createCar } from './vehicles.js';

export function createPolice(G) {
  const state = {
    wanted: 0,
    heat: 0, // 0..100, fills while committing crimes, drains while hidden
    cars: [],
    heli: null,
    roadblocks: [],
    bustTimer: 0,
    jamTimer: 0, // crew signal jam: police lose the trail
    jamCooldown: 0,
    chatterTimer: 0,
    spawnTimer: 0,
    units: PD_UNITS.map((u) => ({ ...u, dist: 0, status: 'STANDBY' })),
  };

  function spawnCar() {
    const mesh = makeCarMesh({ body: 0x14181f, police: true });
    G.scene.add(mesh);
    const edge = Math.floor(Math.random() * 4);
    let x, z, heading;
    if (edge === 0) { x = G.player.x + (Math.random() < 0.5 ? -160 : 160); z = G.player.z; }
    else if (edge === 1) { x = G.player.x; z = G.player.z + (Math.random() < 0.5 ? -160 : 160); }
    else if (edge === 2) { x = -280; z = G.player.z; }
    else { x = G.player.x; z = -280; }
    x = clamp(x, -295, 295); z = clamp(z, -295, 295);
    heading = Math.atan2(G.player.x - x, G.player.z - z);
    const car = createCar(mesh, x, z, heading);
    car.isPolice = true;
    car.maxSpeed = 34 + state.wanted * 4;
    state.cars.push(car);
    return car;
  }

  function spawnHeli() {
    if (state.heli) return;
    const mesh = makeHeliMesh();
    G.scene.add(mesh);
    state.heli = { mesh, x: G.player.x, z: G.player.z - 40, y: 42 };
  }

  function spawnRoadblock() {
    const px = G.playerCar ? G.playerCar.x : G.player.x;
    const pz = G.playerCar ? G.playerCar.z : G.player.z;
    const heading = G.playerCar ? G.playerCar.heading : G.player.heading;
    const bx = px + Math.sin(heading) * 55;
    const bz = pz + Math.cos(heading) * 55;
    if (Math.abs(bx) > 295 || Math.abs(bz) > 295) return;
    const block = [];
    for (const off of [-4.5, 0, 4.5]) {
      const mesh = makeCarMesh({ body: 0x14181f, police: true });
      G.scene.add(mesh);
      const cx = bx + Math.cos(heading) * off;
      const cz = bz - Math.sin(heading) * off;
      const car = createCar(mesh, cx, cz, heading + Math.PI / 2);
      car.isPolice = true;
      car.roadblock = true;
      block.push(car);
    }
    state.roadblocks.push(block);
    G.hud.say('MBPD roadblock ahead — find another street!');
    G.hud.chatter('Dispatch: roadblock set, harbour road. All units converge.');
  }

  function clearRoadblocks() {
    for (const block of state.roadblocks) {
      for (const car of block) G.scene.remove(car.mesh);
    }
    state.roadblocks = [];
  }

  return {
    state,
    forceSpawn(n) { for (let i = 0; i < n; i += 1) spawnCar(); },
    addHeat(amount) {
      state.heat = clamp(state.heat + amount, 0, 100);
      const want = state.heat >= 90 ? 5 : state.heat >= 70 ? 4 : state.heat >= 50 ? 3 : state.heat >= 30 ? 2 : state.heat >= 12 ? 1 : 0;
      if (want > state.wanted) {
        state.wanted = want;
        G.hud.say(want >= 3 ? `WANTED ${want} STARS — MBPD is coming for you.` : `WANTED ${want} STAR${want > 1 ? 'S' : ''} — lay low.`);
        G.hud.chatter(`Dispatch: suspect Mara Voss, wanted level ${want}. All units respond.`);
      } else {
        state.wanted = want;
      }
    },
    jam() {
      if (state.jamCooldown > 0) { G.hud.say('Wren is recharging the jammer — wait a bit.'); return false; }
      if (state.wanted === 0) { G.hud.say('No heat to jam right now.'); return false; }
      state.jamTimer = 12;
      state.jamCooldown = 60;
      G.hud.say('WREN: "Their radios are mine for twelve seconds. GO."');
      G.hud.chatter('Dispatch: ...static... repeat, we lost the signal...');
      return true;
    },
    update(dt) {
      const px = G.playerCar ? G.playerCar.x : G.player.x;
      const pz = G.playerCar ? G.playerCar.z : G.player.z;
      const moving = G.playerCar ? Math.abs(G.playerCar.speed) : (G.player.moving ? 1 : 0);
      if (state.jamTimer > 0) state.jamTimer -= dt;
      if (state.jamCooldown > 0) state.jamCooldown -= dt;

      // heat drains when hidden and slow, faster when jammed
      if (state.wanted > 0) {
        const hidden = state.cars.every((c) => dist(c.x, c.z, px, pz) > 60);
        let drain = hidden ? (moving < 2 ? 2.2 : 0.7) : 0;
        if (state.jamTimer > 0) drain += 4;
        state.heat = Math.max(0, state.heat - drain * dt);
        this.addHeat(0);
      }

      // spawn / despawn pursuit cars to match wanted level
      const target = state.jamTimer > 0 ? 0 : Math.min(state.wanted, 4);
      state.spawnTimer -= dt;
      if (state.cars.length < target && state.spawnTimer <= 0) {
        spawnCar();
        state.spawnTimer = 2.5;
      }
      if (state.cars.length > target) {
        const car = state.cars.pop();
        G.scene.remove(car.mesh);
      }

      // heli at 5 stars
      if (state.wanted >= 5 && state.jamTimer <= 0) spawnHeli();
      else if ((state.wanted < 5 || state.jamTimer > 0) && state.heli) {
        G.scene.remove(state.heli.mesh);
        state.heli = null;
      }

      // roadblocks at 3+ stars, one at a time
      if (state.wanted >= 3 && state.roadblocks.length === 0 && state.jamTimer <= 0 && Math.random() < dt * 0.08) {
        spawnRoadblock();
      }
      if (state.wanted < 3) clearRoadblocks();

      // chase AI: steer toward the player, ram when close
      let nearest = Infinity;
      for (const car of state.cars) {
        const d = dist(car.x, car.z, px, pz);
        nearest = Math.min(nearest, d);
        const wantHeading = Math.atan2(px - car.x, pz - car.z);
        let dh = wantHeading - car.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        car.heading += clamp(dh, -1.6 * dt, 1.6 * dt);
        const targetSpeed = state.jamTimer > 0 ? 6 : car.maxSpeed;
        car.speed += (targetSpeed - car.speed) * Math.min(1, 0.9 * dt);
        car.x += Math.sin(car.heading) * car.speed * dt;
        car.z += Math.cos(car.heading) * car.speed * dt;
        const hit = G.city.collideCircle(car.x, car.z, 1.6);
        car.x = hit.x; car.z = hit.z;
        car.mesh.position.set(car.x, 0, car.z);
        car.mesh.rotation.y = car.heading;
        // light bar flash
        const bar = car.mesh.userData.lightBar;
        if (bar) {
          const on = Math.floor(G.time * 6) % 2 === 0;
          bar.userData.red.material.color.setHex(on ? 0xff2a3c : 0x551018);
          bar.userData.blue.material.color.setHex(on ? 0x123a6b : 0x2a6bff);
        }
        // ram
        if (d < 3.4) {
          if (G.playerCar) {
            G.playerCar.hp -= 14 * dt * 10 * 0.1;
            G.playerCar.speed *= (1 - 1.5 * dt);
            if (Math.random() < dt * 2) { G.audio.thud(); G.hud.flashDamage(0.3); }
          } else {
            state.bustTimer += dt;
            G.hud.say(`MBPD ON YOU — run! Busted in ${Math.max(0, 3 - state.bustTimer).toFixed(1)}s`);
            if (state.bustTimer > 3) G.gameOver('busted');
            continue;
          }
        }
      }
      if (nearest > 4) state.bustTimer = Math.max(0, state.bustTimer - dt);

      // heli follows and spotlights
      if (state.heli) {
        const h = state.heli;
        h.x += (px - h.x) * Math.min(1, 0.8 * dt);
        h.z += (pz - h.z) * Math.min(1, 0.8 * dt);
        h.mesh.position.set(h.x, h.y + Math.sin(G.time * 1.3) * 1.5, h.z);
        h.mesh.rotation.y += dt * 0.4;
        h.mesh.userData.rotor.rotation.y += dt * 22;
      }

      // PD panel: named units + distance + status
      state.units.forEach((u, i) => {
        const car = state.cars[i];
        if (car) {
          u.dist = Math.round(dist(car.x, car.z, px, pz));
          u.status = state.jamTimer > 0 ? 'JAMMED' : (u.dist < 40 ? 'PURSUIT' : 'EN ROUTE');
        } else if (u.call === 'AIR ONE' && state.heli) {
          u.dist = Math.round(dist(state.heli.x, state.heli.z, px, pz));
          u.status = 'AIRBORNE';
        } else {
          u.dist = 0;
          u.status = 'STANDBY';
        }
      });

      // ambient chatter
      state.chatterTimer -= dt;
      if (state.chatterTimer <= 0) {
        state.chatterTimer = 9 + Math.random() * 8;
        if (state.wanted > 0) {
          const lines = [
            'Dispatch: last seen harbour road, heading north.',
            'Unit 12: visual on the teal coupe — it is fast.',
            'Dispatch: Air One, keep the spotlight on the pier.',
            'Unit 19: roadblock holding, no sign of the suspect.',
            'Dispatch: all units, suspect is Mara Voss. Armed. Approach with care.',
          ];
          G.hud.chatter(lines[Math.floor(Math.random() * lines.length)]);
        }
      }

      // siren volume follows the nearest unit
      G.audio.setSiren(state.wanted > 0, nearest === Infinity ? 0 : clamp(1 - nearest / 120, 0, 1));
    },
  };
}
