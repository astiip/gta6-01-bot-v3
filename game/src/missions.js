// The eight-job story: Mara's single rainy night in Meridian Bay.
// Jobs unlock in order; J accepts the next one. Each job has one objective
// type: crack (hold E), goto, escape, survive, race, or board the boat.

import { JOBS, RACE_GATES, LOCATIONS } from './config.js';
import { dist } from './util.js';
import { spawnEnemies } from './people.js';

export function createMissions(G) {
  const state = {
    jobIndex: 0, // next job to accept
    active: null, // { job, phase, progress, timer, gates, enemies }
    beacon: null,
    completed: 0,
  };

  function makeBeacon(x, z, color) {
    const group = new THREE.Group();
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 26, 16, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    cyl.position.y = 13;
    group.add(cyl);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.0, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    group.add(ring);
    group.position.set(x, 0, z);
    G.scene.add(group);
    return group;
  }

  function clearBeacon() {
    if (state.beacon) { G.scene.remove(state.beacon); state.beacon = null; }
  }

  function startJob(index) {
    const job = JOBS[index];
    if (!job || state.active) return false;
    if (job.kind === 'race') {
      state.active = { job, phase: 'race', gates: 0, timer: job.hold, gatePos: RACE_GATES[0] };
      G.hud.say(`${job.title} — ${job.brief}`);
      G.hud.dialog(job.title, job.brief);
      state.beacon = makeBeacon(RACE_GATES[0].x, RACE_GATES[0].z, 0x37e6ff);
      return true;
    }
    if (job.kind === 'survive') {
      const enemies = spawnEnemies(G.scene, G.rng, job.pos.x, job.pos.z, 6);
      G.enemies.push(...enemies);
      state.active = { job, phase: 'survive', timer: job.hold, enemies };
      G.police.addHeat(55);
      G.hud.say(`${job.title} — ${job.brief}`);
      G.hud.dialog(job.title, job.brief);
      state.beacon = makeBeacon(job.pos.x, job.pos.z, 0xff2e88);
      return true;
    }
    state.active = { job, phase: 'go', progress: 0 };
    if (job.pos) state.beacon = makeBeacon(job.pos.x, job.pos.z, job.kind === 'crack' ? 0xffb02e : 0x37e6ff);
    G.hud.say(`${job.title} — ${job.brief}`);
    G.hud.dialog(job.title, job.brief);
    return true;
  }

  function completeJob() {
    const { job } = state.active;
    G.money += job.pay;
    G.addRespect(job.respect);
    state.completed += 1;
    state.jobIndex += 1;
    G.hud.say(job.done);
    G.hud.dialog('JOB COMPLETE', `${job.title} — +$${job.pay.toLocaleString('en-US')} · +${job.respect} respect`);
    G.audio.chime();
    clearBeacon();
    state.active = null;
    G.saveGame();
  }

  function failJob(reason) {
    G.hud.say(reason);
    clearBeacon();
    state.active = null;
  }

  return {
    state,
    get nextJob() { return JOBS[state.jobIndex] || null; },
    get active() { return state.active; },
    startJob,
    update(dt) {
      const a = state.active;
      if (!a) return;
      const px = G.playerCar ? G.playerCar.x : G.player.x;
      const pz = G.playerCar ? G.playerCar.z : G.player.z;
      const inCar = !!G.playerCar;

      if (a.phase === 'go' && a.job.pos) {
        const d = dist(px, pz, a.job.pos.x, a.job.pos.z);
        if (a.job.kind === 'crack') {
          if (d < a.job.radius && !inCar && G.input.isDown('KeyE')) {
            a.progress += dt;
            G.hud.setProgress(a.progress / a.job.hold, 'CRACKING…');
            if (a.progress >= a.job.hold) {
              G.police.addHeat(a.job.wanted * 10);
              completeJob();
            }
          } else {
            a.progress = Math.max(0, a.progress - dt * 2);
            G.hud.setProgress(a.progress / a.job.hold, d < a.job.radius ? 'Hold E to crack' : 'Reach the marker');
          }
        } else if (a.job.kind === 'goto') {
          if (d < a.job.radius && (!a.job.onFoot || !inCar)) completeJob();
        } else if (a.job.kind === 'boat') {
          if (d < a.job.radius && !inCar) {
            G.hud.setPrompt('E — Board the getaway boat');
            if (G.input.was('KeyE')) {
              G.boatEscape = true;
              completeJob();
              G.gameOver('escaped');
            }
          }
        }
      }

      if (a.phase === 'race') {
        a.timer -= dt;
        const gate = a.gatePos;
        const d = dist(px, pz, gate.x, gate.z);
        G.hud.setProgress(1 - a.timer / a.job.hold, `GATE ${a.gates + 1}/6 — ${Math.ceil(a.timer)}s left`);
        if (d < 9 && inCar) {
          a.gates += 1;
          G.audio.chime();
          G.hud.say(`Gate ${a.gates}/6 cleared!`);
          clearBeacon();
          if (a.gates >= RACE_GATES.length) { completeJob(); return; }
          a.gatePos = RACE_GATES[a.gates];
          state.beacon = makeBeacon(a.gatePos.x, a.gatePos.z, 0x37e6ff);
        }
        if (a.timer <= 0) failJob('Storm Surge: out of time. The surge took the road. Press J to retry the job.');
      }

      if (a.phase === 'survive') {
        a.timer -= dt;
        G.hud.setProgress(1 - a.timer / a.job.hold, `SURVIVE — ${Math.ceil(a.timer)}s`);
        const alive = a.enemies.filter((e) => e.alive).length;
        if (alive === 0 && a.timer > 0) {
          // crew wiped early — still must wait out the clock, heat stays
        }
        if (a.timer <= 0) completeJob();
      }

      // escape job is accepted separately below
      if (a.job && a.job.kind === 'escape') {
        if (G.police.state.wanted === 0) completeJob();
        else G.hud.setProgress(1 - G.police.state.heat / 100, 'LOSE THE HEAT');
      }
    },
    acceptNext() {
      const job = JOBS[state.jobIndex];
      if (!job) { G.hud.say('All eight jobs done. Meridian Bay is yours, Mara.'); return; }
      if (state.active) { G.hud.say('A job is already running — finish it first.'); return; }
      if (job.kind === 'escape') {
        if (G.police.state.wanted === 0) { G.hud.say('No heat to lose — the streets are already quiet.'); return; }
        state.active = { job, phase: 'escape', progress: 0 };
        G.hud.say(`${job.title} — ${job.brief}`);
        G.hud.dialog(job.title, job.brief);
        return;
      }
      startJob(state.jobIndex);
    },
  };
}
