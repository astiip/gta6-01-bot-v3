// Procedural canvas textures: lit windows, neon signs, wet roads. Nothing is loaded
// from the network — every texture is painted at boot from a seeded RNG.

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

// A tower facade: dark concrete, a grid of windows, some lit warm, some lit cyan.
export function windowTexture(rng, hue) {
  const [c, g] = makeCanvas(256, 512);
  g.fillStyle = '#0b0e14';
  g.fillRect(0, 0, 256, 512);
  const cols = 8, rows = 16;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const lit = rng.next();
      const px = 8 + x * 30, py = 10 + y * 30;
      if (lit < 0.42) {
        const warm = rng.next() < 0.6;
        g.fillStyle = warm ? `rgba(255, 190, 90, ${0.55 + rng.next() * 0.4})` : `rgba(80, 220, 255, ${0.5 + rng.next() * 0.4})`;
      } else if (lit < 0.5) {
        g.fillStyle = 'rgba(120, 140, 170, 0.25)';
      } else {
        g.fillStyle = 'rgba(8, 12, 20, 1)';
      }
      g.fillRect(px, py, 20, 18);
    }
  }
  // faint vertical neon edge
  g.fillStyle = hue;
  g.globalAlpha = 0.85;
  g.fillRect(0, 0, 3, 512);
  g.globalAlpha = 1;
  return toTexture(c);
}

// A glowing sign: big letters on a dark plate, with a soft halo baked in.
export function signTexture(text, color, sub = '') {
  const [c, g] = makeCanvas(1024, 256);
  g.fillStyle = '#05070c';
  g.fillRect(0, 0, 1024, 256);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 42;
  g.fillStyle = color;
  g.font = '900 118px system-ui, sans-serif';
  g.fillText(text, 512, sub ? 104 : 128);
  g.shadowBlur = 10;
  g.fillText(text, 512, sub ? 104 : 128);
  if (sub) {
    g.font = '700 44px system-ui, sans-serif';
    g.shadowBlur = 18;
    g.fillStyle = '#cfe9ff';
    g.fillText(sub, 512, 206);
  }
  return toTexture(c);
}

// Wet asphalt: dark with lane dashes and a centre glow strip baked in.
export function roadTexture() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#14171f';
  g.fillRect(0, 0, 256, 256);
  // speckle
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  // centre dashes, running along V
  g.fillStyle = 'rgba(230, 200, 90, 0.75)';
  g.fillRect(124, 20, 8, 70);
  g.fillRect(124, 150, 8, 70);
  // edge lines
  g.fillStyle = 'rgba(200, 220, 255, 0.35)';
  g.fillRect(6, 0, 3, 256);
  g.fillRect(247, 0, 3, 256);
  return toTexture(c, 1, 1);
}

// Sidewalk / plaza paving.
export function plazaTexture() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#171a22';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(140, 160, 190, 0.18)';
  g.lineWidth = 2;
  for (let i = 0; i <= 4; i += 1) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
  }
  return toTexture(c, 4, 4);
}

// Harbour water: near-black blue with faint moving-light streaks baked in.
export function waterTexture() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#04101e';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i += 1) {
    g.fillStyle = `rgba(60, 160, 220, ${0.05 + Math.random() * 0.12})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 30 + Math.random() * 70, 2);
  }
  return toTexture(c, 8, 8);
}
