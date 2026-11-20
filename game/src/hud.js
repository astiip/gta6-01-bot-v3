// HUD: DOM overlay for wanted stars, money, respect, minimap, PD dispatch panel,
// dialog, prompts and the garage menu. The 3D canvas stays clean underneath.

import { WEAPONS, RANKS, RANK_AT, UPGRADES, RADIO } from './config.js';

export function createHud(G) {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="hud-tl">
      <div id="wanted"></div>
      <div id="money">$0</div>
      <div id="respect"><span id="rank">ROOKIE</span><div id="respect-bar"><i></i></div></div>
    </div>
    <div id="hud-tr"><canvas id="minimap" width="200" height="200"></canvas><div id="map-label">MERIDIAN BAY</div></div>
    <div id="hud-pd"><div id="pd-title">MBPD DISPATCH</div><div id="pd-list"></div><div id="chatter"></div></div>
    <div id="hud-bc">
      <div id="dialog"><div id="dialog-title"></div><div id="dialog-text"></div></div>
      <div id="say"></div>
      <div id="prompt"></div>
      <div id="progress"><div id="progress-fill"></div><span id="progress-label"></span></div>
    </div>
    <div id="hud-br">
      <div id="speed">0 <small>KM/H</small></div>
      <div id="weapon">PISTOL</div>
      <div id="radio">RAIN FM 88.1</div>
      <div id="controls-hint">WASD drive · E enter/exit · F fire · Q weapon · J next job · C jam · G garage · M mute · P pause</div>
    </div>
    <div id="vignette"></div>
    <div id="screen-title" class="screen">
      <h1>NEON HARBOR</h1><h2>RAIN HEIST</h2>
      <p class="tag">One rainy night. Eight jobs. One way out — the boat at Pier 9.</p>
      <p class="story">Mara Voss came back to Meridian Bay to rob the Meridian Vault and vanish before dawn.
      The MBPD, the storm surge and a rival crew all have other plans. Drive the NIGHTHAWK,
      lose the heat, and get to the water.</p>
      <p class="cta">ENTER — START THE NIGHT</p>
      <p class="keys">WASD / arrows — drive &amp; walk · E — enter car / interact · F — fire · Q — weapon<br>
      J — next job · C — Wren jams police radio · G — garage (near NIGHTHAWK GARAGE) · SHIFT — nitro<br>
      1/2/3 — radio · M — mute · P — pause</p>
      <p id="save-line"></p>
    </div>
    <div id="screen-pause" class="screen"><h1>PAUSED</h1><p class="cta">P or ENTER — back to the rain</p></div>
    <div id="screen-over" class="screen"><h1 id="over-title">BUSTED</h1><p id="over-text"></p><p class="cta">ENTER — try again</p></div>
    <div id="screen-garage" class="screen">
      <h1>NIGHTHAWK GARAGE</h1><p class="tag">Spend the take. The NIGHTHAWK remembers every dollar.</p>
      <div id="garage-money"></div><div id="garage-list"></div>
      <p class="cta">G or ESC — back to the street</p>
    </div>`;
  document.body.appendChild(root);

  const $ = (id) => document.getElementById(id);
  const minimap = $('minimap');
  const mctx = minimap.getContext('2d');
  let sayTimer = 0;
  let dialogTimer = 0;
  let damageFlash = 0;

  function starRow(wanted) {
    let s = '';
    for (let i = 0; i < 5; i += 1) s += i < wanted ? '★' : '☆';
    return s;
  }

  function drawMinimap() {
    const W = 200, S = W / 640, OX = 100, OZ = 100;
    const toX = (x) => OX + x * S;
    const toY = (z) => OZ + z * S;
    mctx.fillStyle = '#0a0f1a';
    mctx.fillRect(0, 0, W, W);
    // water
    mctx.fillStyle = '#0a2438';
    mctx.fillRect(0, toY(322), W, W - toY(322));
    // roads
    mctx.strokeStyle = '#2c3542';
    mctx.lineWidth = 2;
    for (let v = -300; v <= 300; v += 60) {
      mctx.beginPath(); mctx.moveTo(toX(v), 0); mctx.lineTo(toX(v), W); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(0, toY(v)); mctx.lineTo(W, toY(v)); mctx.stroke();
    }
    // pier
    mctx.fillStyle = '#5a4632';
    mctx.fillRect(toX(-60), toY(322), 120 * S, 26 * S);
    // objective beacon
    const a = G.missions.active;
    if (a && a.job && a.job.pos) {
      mctx.fillStyle = '#37e6ff';
      mctx.beginPath(); mctx.arc(toX(a.job.pos.x), toY(a.job.pos.z), 5, 0, Math.PI * 2); mctx.fill();
      mctx.strokeStyle = '#37e6ff';
      mctx.beginPath(); mctx.arc(toX(a.job.pos.x), toY(a.job.pos.z), 8 + Math.sin(G.time * 4) * 2, 0, Math.PI * 2); mctx.stroke();
    }
    if (a && a.phase === 'race' && a.gatePos) {
      mctx.fillStyle = '#37e6ff';
      mctx.beginPath(); mctx.arc(toX(a.gatePos.x), toY(a.gatePos.z), 5, 0, Math.PI * 2); mctx.fill();
    }
    // police
    for (const car of G.police.state.cars) {
      mctx.fillStyle = '#2a6bff';
      mctx.beginPath(); mctx.arc(toX(car.x), toY(car.z), 3, 0, Math.PI * 2); mctx.fill();
    }
    if (G.police.state.heli) {
      mctx.fillStyle = '#ff2a3c';
      mctx.beginPath(); mctx.arc(toX(G.police.state.heli.x), toY(G.police.state.heli.z), 3.5, 0, Math.PI * 2); mctx.fill();
    }
    // player arrow (clamped to the map so the pier does not push it off-canvas)
    const px = G.playerCar ? G.playerCar.x : G.player.x;
    const pz = G.playerCar ? G.playerCar.z : G.player.z;
    const h = G.playerCar ? G.playerCar.heading : G.player.heading;
    mctx.save();
    mctx.translate(Math.max(6, Math.min(194, toX(px))), Math.max(6, Math.min(194, toY(pz))));
    mctx.rotate(Math.atan2(Math.sin(h), -Math.cos(h)) + Math.PI);
    mctx.fillStyle = '#37e6ff';
    mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6); mctx.closePath(); mctx.fill();
    mctx.restore();
  }

  function rankFor(respect) {
    let r = 0;
    for (let i = 0; i < RANKS.length; i += 1) if (respect >= RANK_AT[i]) r = i;
    return r;
  }

  const hud = {
    say(msg) {
      $('say').textContent = msg;
      sayTimer = 4;
    },
    dialog(title, text) {
      $('dialog-title').textContent = title;
      $('dialog-text').textContent = text;
      $('dialog').style.opacity = '1';
      dialogTimer = 6;
    },
    chatter(text) {
      $('chatter').textContent = `“${text}”`;
    },
    setPrompt(text) {
      $('prompt').textContent = text || '';
    },
    setProgress(frac, label) {
      $('progress').style.opacity = frac > 0 ? '1' : '0';
      $('progress-fill').style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
      $('progress-label').textContent = label || '';
    },
    flashDamage(amount) {
      damageFlash = Math.max(damageFlash, amount);
    },
    showScreen(name) {
      for (const id of ['screen-title', 'screen-pause', 'screen-over', 'screen-garage']) {
        $(id).style.display = id === `screen-${name}` ? 'flex' : 'none';
      }
      $('hud-tl').style.display = name === 'play' ? 'block' : 'none';
      $('hud-tr').style.display = name === 'play' ? 'block' : 'none';
      $('hud-pd').style.display = name === 'play' ? 'block' : 'none';
      $('hud-br').style.display = name === 'play' ? 'block' : 'none';
      $('hud-bc').style.display = name === 'play' ? 'block' : 'none';
    },
    setOver(title, text) {
      $('over-title').textContent = title;
      $('over-text').textContent = text;
    },
    setSaveLine(text) { $('save-line').textContent = text; },
    openGarage() {
      $('garage-money').textContent = `Take on hand: $${G.money.toLocaleString('en-US')}`;
      const list = $('garage-list');
      list.innerHTML = '';
      for (const u of UPGRADES) {
        const owned = G.upgrades[u.id === 'engine' ? 'engine' : u.id === 'armor' ? 'armor' : u.id === 'nitro' ? 'nitro' : 'tires'];
        const count = typeof owned === 'number' ? owned : (owned ? 1 : 0);
        const btn = document.createElement('button');
        btn.className = 'garage-btn';
        btn.innerHTML = `<b>${u.name}</b><span>${u.desc}</span><em>$${u.cost.toLocaleString('en-US')} · owned ${count}</em>`;
        btn.onclick = () => { G.buyUpgrade(u.id); hud.openGarage(); };
        list.appendChild(btn);
      }
    },
    update(dt) {
      const wanted = G.police.state.wanted;
      $('wanted').textContent = starRow(wanted);
      $('wanted').style.color = wanted === 0 ? '#8fa3b8' : wanted >= 4 ? '#ff2a3c' : '#ffb02e';
      $('money').textContent = `$${G.money.toLocaleString('en-US')}`;
      const r = rankFor(G.respect);
      $('rank').textContent = RANKS[r];
      const next = RANK_AT[r + 1] ?? RANK_AT[r];
      const frac = r >= RANKS.length - 1 ? 1 : (G.respect - RANK_AT[r]) / (next - RANK_AT[r]);
      document.querySelector('#respect-bar i').style.width = `${Math.round(frac * 100)}%`;
      const speed = G.playerCar ? Math.abs(G.playerCar.speed) * 3.6 : 0;
      $('speed').innerHTML = `${Math.round(speed)} <small>KM/H</small>`;
      $('weapon').textContent = WEAPONS[G.weaponIndex].name;
      $('radio').textContent = G.audio.muted ? 'MUTED' : RADIO[G.audio.station].name;
      // PD panel
      const rows = G.police.state.units.map((u) => {
        const d = u.dist ? `${u.dist}m` : '—';
        return `<div class="pd-row"><span>${u.call} · ${u.name}</span><span>${u.status} ${d}</span></div>`;
      }).join('');
      $('pd-list').innerHTML = rows;
      if (sayTimer > 0) { sayTimer -= dt; if (sayTimer <= 0) $('say').textContent = ''; }
      if (dialogTimer > 0) { dialogTimer -= dt; if (dialogTimer <= 0) $('dialog').style.opacity = '0'; }
      if (damageFlash > 0) {
        damageFlash = Math.max(0, damageFlash - dt * 1.4);
        $('vignette').style.opacity = String(damageFlash);
      }
      drawMinimap();
    },
  };
  return hud;
}
