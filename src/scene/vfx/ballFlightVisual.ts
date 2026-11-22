import * as THREE from 'three';
import { attachComicOutline } from '../core/toonMaterials';
import { sampleBallTrajectory, type BallTrajectorySpec } from './ballTrajectory';

function baseballTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fff8dc';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#b82c3c';
    ctx.lineWidth = 2.7;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let x = 0; x <= 128; x += 2) {
        const y = 32 + side * (15 + 8 * Math.cos(x * Math.PI / 32));
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      for (let x = 4; x < 128; x += 8) {
        const y = 32 + side * (15 + 8 * Math.cos(x * Math.PI / 32));
        ctx.beginPath();
        ctx.moveTo(x - 2, y - 2.8);
        ctx.lineTo(x + 2, y + 2.8);
        ctx.stroke();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A single tapered mesh follows the sampled path. Its end always meets the
// ball, even when the knuckleball changes direction between rendered frames.
export function createBallFlightVisual() {
  const group = new THREE.Group();
  const texture = baseballTexture();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  // From the mound the tail sits between the lens and the baseball. Paint
  // the leather over the translucent streak while still testing field depth.
  ball.renderOrder = 2;
  attachComicOutline(ball, 1.14);
  const rings = 12;
  const sides = 6;
  const positions = new THREE.Float32BufferAttribute(new Float32Array(rings * sides * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  const colors = new THREE.Float32BufferAttribute(new Float32Array(rings * sides * 3), 3);
  const indices: number[] = [];
  for (let r = 1; r < rings; r++) {
    for (let side = 0; side < sides; side++) {
      const a = (r - 1) * sides + side;
      const b = (r - 1) * sides + (side + 1) % sides;
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positions);
  geometry.setAttribute('color', colors);
  geometry.setIndex(indices);
  const trail = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.86, depthWrite: false,
  }));
  trail.frustumCulled = false;
  group.add(trail, ball);
  group.visible = false;
  let ballScale = 1;
  let lastPrimary = '';
  let lastAccent = '';

  function draw(spec: BallTrajectorySpec, progress: number, primary = spec.trailColor, scale = 1) {
    ballScale = scale;
    ball.scale.setScalar(scale);
    group.visible = true;
    const head = sampleBallTrajectory(spec, progress);
    ball.position.set(head.x, head.y, head.z);
    ball.rotation.set(progress * 16, progress * 10, 0.5);
    const repaint = lastPrimary !== primary || lastAccent !== spec.secondaryColor;
    const main = repaint ? new THREE.Color(primary) : null;
    const accent = repaint ? new THREE.Color(spec.secondaryColor) : null;
    const trailLength = Math.min(progress, 0.22, 0.095 / spec.durationSec);
    for (let r = 0; r < rings; r++) {
      const u = r / (rings - 1);
      const point = sampleBallTrajectory(spec, progress - u * trailLength);
      const radius = 0.14 * scale * (1 - u);
      for (let side = 0; side < sides; side++) {
        const angle = (side / sides) * Math.PI * 2;
        const idx = r * sides + side;
        positions.setXYZ(idx, point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius, point.z);
        if (main && accent) {
          const color = side < 2 ? accent : main;
          colors.setXYZ(idx, color.r, color.g, color.b);
        }
      }
    }
    positions.needsUpdate = true;
    if (repaint) colors.needsUpdate = true;
    lastPrimary = primary;
    lastAccent = spec.secondaryColor;
  }

  function sizeForCamera(camera: THREE.PerspectiveCamera, heightPx: number) {
    // Preserve a four-pixel radius as a fly ball recedes over the wall.
    const depth = ball.position.distanceTo(camera.position);
    const worldPerPixel = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / heightPx;
    ball.scale.setScalar(Math.max(ballScale, 4 * worldPerPixel / 0.19));
  }

  function dispose() {
    ball.geometry.dispose();
    ball.material.dispose();
    texture.dispose();
    geometry.dispose();
    trail.material.dispose();
  }
  return { group, draw, sizeForCamera, dispose };
}
