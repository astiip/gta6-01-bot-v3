// Weather: driving rain around the camera and the occasional lightning flash
// that turns the whole wet city white for a blink.

export function createWeather(scene) {
  const COUNT = 2600;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 90;
    positions[i * 3 + 1] = Math.random() * 45;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x9fc4e8, size: 0.14, transparent: true, opacity: 0.65, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const ambient = new THREE.AmbientLight(0x33415e, 1.0);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(0x8fa8d8, 0.55);
  moon.position.set(-120, 180, -80);
  scene.add(moon);

  let flash = 0;
  let nextFlash = 6 + Math.random() * 9;
  let intensity = 1;

  return {
    setIntensity(v) { intensity = v; },
    update(dt, camera) {
      // rain follows the camera and falls, slightly slanted by wind
      points.position.set(camera.position.x, 0, camera.position.z);
      const arr = geo.attributes.position.array;
      for (let i = 0; i < COUNT; i += 1) {
        arr[i * 3 + 1] -= 34 * dt;
        arr[i * 3] -= 6 * dt;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 40 + Math.random() * 5;
          arr[i * 3] = (Math.random() - 0.5) * 90;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 90;
        }
      }
      geo.attributes.position.needsUpdate = true;
      // lightning
      nextFlash -= dt;
      if (nextFlash <= 0) {
        flash = 0.22;
        nextFlash = 7 + Math.random() * 12;
      }
      if (flash > 0) {
        flash -= dt;
        ambient.intensity = 1.0 + flash * 9;
        moon.intensity = 0.55 + flash * 6;
      } else {
        ambient.intensity = 1.0 * intensity;
        moon.intensity = 0.55 * intensity;
      }
    },
  };
}
