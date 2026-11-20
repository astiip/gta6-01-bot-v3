// Small maths helpers shared by every module. Angles are radians, headings are
// measured around Y (0 = facing -Z, i.e. north on the map).

export const TAU = Math.PI * 2;

export function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

export function lerp(a, b, t) { return a + (b - a) * t; }

export function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

export function angleLerp(a, b, t) { return a + wrapAngle(b - a) * t; }

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}

export function dist(ax, az, bx, bz) { return Math.sqrt(dist2(ax, az, bx, bz)); }

// Nearest point on a street grid: streets sit at multiples of `step`.
export function nearestStreet(v, step) { return Math.round(v / step) * step; }

export function onRoad(x, z, step, roadWidth) {
  const dx = Math.abs(x - nearestStreet(x, step));
  const dz = Math.abs(z - nearestStreet(z, step));
  return dx < roadWidth / 2 || dz < roadWidth / 2;
}
