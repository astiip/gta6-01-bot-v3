// Shooting: hitscan fire from Mara (on foot) or from the NIGHTHAWK window.
// Tracers are short-lived lines; hits flash the target and the HUD.

import { WEAPONS } from './config.js';
import { dist } from './util.js';

export function createCombat(G) {
  let cooldown = 0;
  const tracers = [];

  function fire() {
    if (cooldown > 0 || G.screen !== 'play') return;
    const weapon = WEAPONS[G.weaponIndex];
    cooldown = weapon.rate;
    G.audio.shot();
    const ox = G.playerCar ? G.playerCar.x : G.player.x;
    const oz = G.playerCar ? G.playerCar.z : G.player.z;
    const heading = G.playerCar ? G.playerCar.heading : G.player.heading;
    const fx = Math.sin(heading), fz = Math.cos(heading);

    for (let p = 0; p < (weapon.pellets || 1); p += 1) {
      const spread = (Math.random() - 0.5) * 2 * weapon.spread;
      const dx = fx + Math.cos(heading) * spread;
      const dz = fz - Math.sin(heading) * spread;
      // nearest living enemy or police car inside the cone
      let best = null, bestD = weapon.range;
      for (const e of G.enemies) {
        if (!e.alive) continue;
        const ex = e.x - ox, ez = e.z - oz;
        const d = Math.sqrt(ex * ex + ez * ez);
        if (d > weapon.range) continue;
        const dot = (ex * dx + ez * dz) / Math.max(d, 0.01);
        if (dot > 0.985 && d < bestD) { best = e; bestD = d; }
      }
      let hitX = ox + dx * weapon.range;
      let hitZ = oz + dz * weapon.range;
      if (best) {
        best.hp -= weapon.damage;
        hitX = best.x; hitZ = best.z;
        if (best.hp <= 0) {
          best.alive = false;
          best.mesh.rotation.z = Math.PI / 2;
          best.mesh.position.y = 0.2;
          G.hud.say('Rival down.');
          G.addRespect(2);
        }
      }
      // police cars can be shot too (drives the heat up)
      if (!best) {
        for (const car of G.police.state.cars) {
          const ex = car.x - ox, ez = car.z - oz;
          const d = Math.sqrt(ex * ex + ez * ez);
          if (d > weapon.range) continue;
          const dot = (ex * dx + ez * dz) / Math.max(d, 0.01);
          if (dot > 0.985 && d < bestD) { bestD = d; hitX = car.x; hitZ = car.z; car.hp -= weapon.damage; if (car.hp <= 0) car.wrecked = true; }
        }
      }
      if (best || bestD < weapon.range) G.police.addHeat(6);
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ox, G.playerCar ? 1.3 : 1.4, oz),
        new THREE.Vector3(hitX, 1.2, hitZ),
      ]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
      G.scene.add(line);
      tracers.push({ line, life: 0.09 });
    }
    // tiny muzzle flash + recoil kick on the camera
    G.cameraKick = 0.12;
  }

  return {
    update(dt) {
      cooldown = Math.max(0, cooldown - dt);
      for (let i = tracers.length - 1; i >= 0; i -= 1) {
        tracers[i].life -= dt;
        if (tracers[i].life <= 0) {
          G.scene.remove(tracers[i].line);
          tracers.splice(i, 1);
        }
      }
    },
    fire,
  };
}
