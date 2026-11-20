// Meridian Bay: a rain-soaked grid city built from boxes, canvas textures and neon.
// Streets run every 60 m from -300 to +300. The harbour sits south of z = 322.

import { WORLD, PALETTE } from './config.js';
import { windowTexture, signTexture, roadTexture, plazaTexture, waterTexture } from './textures.js';
import { dist } from './util.js';

const STREETS = [];
for (let v = -WORLD.streetHalf; v <= WORLD.streetHalf; v += WORLD.streetStep) STREETS.push(v);

const NEON_SIGNS = ['NOODLES', 'HOTEL', 'BAR 24', 'RAMEN', 'MOTEL', 'KTV', 'PIER 9', 'TAXI', 'CLUB NEON', 'PHARMACY'];

function box(w, h, d, mat, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  // tile the facade texture so windows stay window-sized on any building
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * Math.max(1, w / 13), uv.getY(i) * Math.max(1, h / 13));
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const flickerSigns = [];
  const lampMeshes = [];
  let blackout = false;

  // --- ground, roads, water -------------------------------------------------
  const groundMat = new THREE.MeshLambertMaterial({ map: plazaTexture(), color: 0x9aa3b0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 10);
  group.add(ground);

  const roadTex = roadTexture();
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex, color: 0xb8c0cc });
  for (const s of STREETS) {
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(760, WORLD.roadWidth), roadMat.clone());
    rx.material.map = roadTex.clone();
    rx.material.map.repeat.set(38, 1);
    rx.material.map.needsUpdate = true;
    rx.rotation.x = -Math.PI / 2;
    rx.position.set(0, 0.02, s);
    group.add(rx);
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, 760), roadMat.clone());
    rz.material.map = roadTex.clone();
    rz.material.map.repeat.set(1, 38);
    rz.material.map.needsUpdate = true;
    rz.rotation.x = -Math.PI / 2;
    rz.position.set(s, 0.02, 0);
    group.add(rz);
  }

  const waterMat = new THREE.MeshLambertMaterial({
    map: waterTexture(), color: 0x8ab4d8, emissive: 0x0a2438, emissiveIntensity: 0.7,
    transparent: true, opacity: 0.94,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(760, 160), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.25, WORLD.waterZ + 80);
  group.add(water);

  // --- buildings ------------------------------------------------------------
  const facadeMats = [];
  const hues = ['#37e6ff', '#ff2e88', '#ffb02e', '#7CFC98'];
  for (let i = 0; i < 4; i += 1) {
    const tex = windowTexture(rng, hues[i]);
    facadeMats.push(new THREE.MeshLambertMaterial({
      map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.75, color: 0xffffff,
    }));
  }
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x11141c });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x0a0d13 });

  // Special blocks that stay clear for story locations.
  const reserved = [
    { x: 90, z: -90 }, { x: -150, z: 30 }, { x: -90, z: 210 },
    { x: 210, z: 150 }, { x: 150, z: -210 }, { x: 0, z: -270 },
  ];
  const isReserved = (bx, bz) => reserved.some((r) => Math.abs(r.x - bx) < 1 && Math.abs(r.z - bz) < 1);

  for (let bx = -270; bx <= 270; bx += 60) {
    for (let bz = -270; bz <= 270; bz += 60) {
      if (bz >= 300) continue;
      if (isReserved(bx, bz)) continue;
      const count = rng.int(1, 3);
      for (let k = 0; k < count; k += 1) {
        const w = rng.range(18, 34);
        const d = rng.range(18, 34);
        const h = rng.range(9, 58);
        const ox = (k % 2 === 0 ? -1 : 1) * rng.range(4, 10);
        const oz = (k < 2 ? -1 : 1) * rng.range(4, 10);
        const x = bx + ox, z = bz + oz;
        const mat = facadeMats[rng.int(0, facadeMats.length - 1)];
        const b = box(w, h, d, mat, x, h / 2, z);
        group.add(b);
        const roof = box(w + 0.6, 0.8, d + 0.6, roofMat, x, h + 0.4, z);
        group.add(roof);
        if (h > 40 && rng.next() < 0.6) {
          const ant = box(0.4, rng.range(4, 9), 0.4, darkMat, x + rng.range(-4, 4), h + 3, z + rng.range(-4, 4));
          group.add(ant);
        }
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
      // A few blocks get a rooftop neon sign.
      if (rng.next() < 0.4) {
        const word = rng.pick(NEON_SIGNS);
        const color = rng.pick(['#37e6ff', '#ff2e88', '#ffb02e', '#7CFC98']);
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(22, 5.5),
          new THREE.MeshBasicMaterial({ map: signTexture(word, color), transparent: true, side: THREE.DoubleSide }),
        );
        sign.position.set(bx, rng.range(16, 34), bz - 14);
        group.add(sign);
        if (rng.next() < 0.5) flickerSigns.push(sign.material);
      }
    }
  }

  // --- Meridian Vault (casino) ----------------------------------------------
  const vaultMat = new THREE.MeshLambertMaterial({
    map: windowTexture(rng, '#ffb02e'), emissive: 0xffffff,
    emissiveMap: windowTexture(rng, '#ffb02e'), emissiveIntensity: 0.6, color: 0xc9a24a,
  });
  const vault = box(44, 20, 28, vaultMat, 90, 10, -90);
  group.add(vault);
  const vaultSign = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 10),
    new THREE.MeshBasicMaterial({ map: signTexture('MERIDIAN VAULT', '#ffb02e', 'CASINO · 24 HOURS'), transparent: true }),
  );
  vaultSign.position.set(90, 17, -75.8);
  group.add(vaultSign);
  flickerSigns.push(vaultSign.material);
  const canopy = box(20, 1, 8, new THREE.MeshLambertMaterial({ color: 0x6b4d12 }), 90, 6.5, -73);
  group.add(canopy);
  colliders.push({ minX: 68, maxX: 112, minZ: -104, maxZ: -76 });

  // --- NIGHTHAWK Garage ------------------------------------------------------
  const garageMat = new THREE.MeshLambertMaterial({ color: 0x2a3f45 });
  const garage = box(34, 9, 20, garageMat, -150, 4.5, 30);
  group.add(garage);
  const garageSignMat = new THREE.MeshBasicMaterial({ map: signTexture('NIGHTHAWK GARAGE', '#37e6ff', 'TUNE · REPAIR · NITRO'), transparent: true });
  const garageSign = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), garageSignMat);
  garageSign.position.set(-150, 8, 19.8);
  const garageSignSouth = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), garageSignMat);
  garageSignSouth.position.set(-150, 8, 40.2);
  garageSignSouth.rotation.y = Math.PI;
  group.add(garageSign, garageSignSouth);
  colliders.push({ minX: -167, maxX: -133, minZ: 20, maxZ: 40 });

  // --- Substation ------------------------------------------------------------
  const subMat = new THREE.MeshLambertMaterial({ color: 0x1a2027 });
  for (const [sx, sz] of [[200, 140], [220, 140], [200, 162], [220, 162]]) {
    group.add(box(10, 6, 8, subMat, sx, 3, sz));
    colliders.push({ minX: sx - 5, maxX: sx + 5, minZ: sz - 4, maxZ: sz + 4 });
  }
  const subSign = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 4.5),
    new THREE.MeshBasicMaterial({ map: signTexture('SUBSTATION 7', '#ff5a3c'), transparent: true }),
  );
  subSign.position.set(210, 9, 136);
  group.add(subSign);

  // --- Safehouse --------------------------------------------------------------
  const house = box(16, 7, 12, new THREE.MeshLambertMaterial({ color: 0x2a2118 }), -90, 3.5, 210);
  group.add(house);
  const houseSign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 3),
    new THREE.MeshBasicMaterial({ map: signTexture('SAFEHOUSE', '#7CFC98'), transparent: true }),
  );
  houseSign.position.set(-90, 7.5, 203.8);
  group.add(houseSign);
  colliders.push({ minX: -98, maxX: -82, minZ: 204, maxZ: 216 });

  // --- NEON HARBOR gantry over the harbour road (z = 300) --------------------
  // Two faces back to back so the text reads correctly from both directions.
  const postMat = new THREE.MeshLambertMaterial({ color: 0x222a35 });
  group.add(box(1.2, 9, 1.2, postMat, -9, 4.5, 300));
  group.add(box(1.2, 9, 1.2, postMat, 9, 4.5, 300));
  const gantryMat = new THREE.MeshBasicMaterial({ map: signTexture('NEON HARBOR', '#37e6ff', 'MERIDIAN BAY'), transparent: true });
  const gantry = new THREE.Mesh(new THREE.PlaneGeometry(19, 4.4), gantryMat);
  gantry.position.set(0, 8.2, 300);
  const gantryBack = new THREE.Mesh(new THREE.PlaneGeometry(19, 4.4), gantryMat);
  gantryBack.position.set(0, 8.2, 299.94);
  gantryBack.rotation.y = Math.PI;
  group.add(gantry, gantryBack);
  flickerSigns.push(gantryMat);

  // --- Pier 9 boardwalk -------------------------------------------------------
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x3a2c1e });
  for (let x = -60; x <= 60; x += 6) {
    group.add(box(5.6, 0.6, 26, plankMat, x, 0.4, 335));
  }
  const pierMat = new THREE.MeshBasicMaterial({ map: signTexture('PIER 9', '#ff2e88'), transparent: true });
  const pierSign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), pierMat);
  pierSign.position.set(-40, 6, 324);
  const pierSignBack = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), pierMat);
  pierSignBack.position.set(-40, 6, 323.94);
  pierSignBack.rotation.y = Math.PI;
  group.add(pierSign, pierSignBack);
  // string lights along the pier
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  for (let x = -58; x <= 58; x += 8) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), bulbMat);
    bulb.position.set(x, 5.2 + Math.sin(x * 0.3) * 0.4, 326);
    group.add(bulb);
    lampMeshes.push(bulb);
  }

  // --- street lamps -----------------------------------------------------------
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x1c222c });
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffe6a8 });
  for (const s of STREETS) {
    for (const t of STREETS) {
      if (rng.next() > 0.5) continue;
      const x = s + 8, z = t + 8;
      if (z > 310 || Math.abs(x) > 300) continue;
      group.add(box(0.3, 6, 0.3, poleMat, x, 3, z));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), lampGlow);
      lamp.position.set(x, 6.2, z);
      group.add(lamp);
      lampMeshes.push(lamp);
    }
  }

  // --- distant skyline silhouette ---------------------------------------------
  const skyMat = new THREE.MeshLambertMaterial({
    map: windowTexture(rng, '#37e6ff'), emissive: 0xffffff,
    emissiveMap: windowTexture(rng, '#37e6ff'), emissiveIntensity: 0.5, color: 0x05070c,
  });
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const r = rng.range(390, 460);
    const h = rng.range(30, 110);
    const b = box(rng.range(18, 34), h, rng.range(18, 34), skyMat, Math.cos(a) * r, h / 2, Math.sin(a) * r + 10);
    group.add(b);
  }

  // --- collision + helpers ------------------------------------------------------
  function collideCircle(x, z, r) {
    let nx = x, nz = z;
    for (const c of colliders) {
      const cx = Math.max(c.minX, Math.min(x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 < 0.0001) { nz = c.maxZ + r; continue; }
        const d = Math.sqrt(d2);
        nx = cx + (dx / d) * r;
        nz = cz + (dz / d) * r;
      }
    }
    return { x: nx, z: nz };
  }

  return {
    group, colliders, waterMat,
    collideCircle,
    setBlackout(on) {
      blackout = on;
      for (const m of facadeMats) m.emissiveIntensity = on ? 0.08 : 0.75;
      for (const l of lampMeshes) l.visible = !on;
    },
    update(dt, t) {
      // one sign at a time buzzes and flickers, like tired neon in the rain
      const idx = Math.floor(t * 0.7) % flickerSigns.length;
      flickerSigns.forEach((m, i) => {
        m.opacity = i === idx ? (Math.sin(t * 22) > 0 ? 0.35 : 1) : 1;
      });
      waterMat.map.offset.x += dt * 0.008;
      waterMat.map.offset.y += dt * 0.004;
    },
  };
}
