import * as THREE from 'three';

// A seamless painted cyclorama gives the low shoulder cameras a distant horizon
// without building individual hills and trees around all five camera positions.
export function createHorizon(): THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial> {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const { width, height } = canvas;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#4bb9ee');
    sky.addColorStop(0.6, '#a7e1f4');
    sky.addColorStop(0.88, '#fff0ca');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 16; i++) {
      const x = i * 128 + 60;
      const y = 252 + 53 * Math.sin(i * 2.7);
      ctx.fillStyle = '#f6fbef';
      ctx.beginPath();
      ctx.moveTo(x - 40, y);
      ctx.bezierCurveTo(x - 40, y - 10, x - 34, y - 12, x - 25, y - 10);
      ctx.bezierCurveTo(x - 19, y - 37, x + 7, y - 36, x + 13, y - 16);
      ctx.bezierCurveTo(x + 23, y - 25, x + 34, y - 17, x + 37, y - 9);
      ctx.quadraticCurveTo(x + 55, y - 10, x + 49, y);
      ctx.fill();
      ctx.fillStyle = '#c9e8e7';
      ctx.fillRect(x - 33, y + 3, 64, 3);
    }

    for (const [base, frequency, fill] of [
      [371, 7, '#a7cdd0'], [386, 11, '#83b4ae'], [410, 23, '#629c88'],
    ] as const) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 4) {
        const a = (x / width) * Math.PI * 2;
        ctx.lineTo(x, base + 10 * Math.cos(frequency * a) + 7 * Math.sin(3 * a));
      }
      ctx.lineTo(width, height);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  const sky = new THREE.Mesh(
    new THREE.CylinderGeometry(90, 90, 66, 64, 1, true),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false }),
  );
  sky.position.y = 26;
  return sky;
}

export function createClayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e2a06a';
    ctx.fillRect(0, 0, 256, 256);
    // A fine, tileable mixture of sand and red clay, visible close to the mound.
    for (let i = 0; i < 420; i++) {
      const x = (i * 97) % 256;
      const y = (i * i * 13 + i * 31 + Math.floor(i / 7)) % 256;
      ctx.fillStyle = i % 3 === 0 ? '#edb885' : '#d99965';
      ctx.fillRect(x, y, 3 + i % 4, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

// One painted lamp bank per tower keeps individual bulbs visible on phones.
export function createFloodlights(): THREE.Group {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#283d49';
    ctx.fillRect(0, 0, 256, 96);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 28 + col * 50;
        const y = 26 + row * 43;
        ctx.fillStyle = '#102b37';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd17b';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff7cf';
        ctx.beginPath();
        ctx.arc(x - 3, y - 4, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.MeshBasicMaterial({ map: texture });
  const steel = new THREE.MeshStandardMaterial({ color: 0x485663, roughness: 0.82 });
  const pole = new THREE.CylinderGeometry(0.12, 0.24, 10, 8);
  const housing = new THREE.BoxGeometry(3.4, 1.35, 0.38);
  const lens = new THREE.PlaneGeometry(3.28, 1.23);
  const group = new THREE.Group();
  for (const [x, z] of [[-11, 15], [11, 15], [-24, -46], [24, -46]]) {
    const tower = new THREE.Group();
    tower.position.set(x, 0, z);
    tower.lookAt(0, 0, -8);
    if (z > 0) tower.scale.y = 0.9;
    const mast = new THREE.Mesh(pole, steel);
    mast.position.y = 5;
    const box = new THREE.Mesh(housing, steel);
    box.position.y = 10;
    const lights = new THREE.Mesh(lens, face);
    lights.position.z = 0.2;
    box.add(lights);
    box.rotation.x = 0.16;
    tower.add(mast, box);
    group.add(tower);
  }
  return group;
}
