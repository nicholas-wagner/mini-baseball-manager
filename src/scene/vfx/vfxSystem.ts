import { createBaseUmpire } from './baseUmpire';
import { createPaintedBat } from '../characters/paintedBat';
import * as THREE from 'three';
import { createBallFlightVisual } from './ballFlightVisual';
import { BALL_TRAJECTORY_PRESETS, type BallTrajectorySpec, type BallVfxStyle } from './ballTrajectory';
import type { Vec3 } from '../camera/cameraRig';

interface ActiveCallout {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  elapsed: number;
  duration: number;
  startY: number;
  inCorner: boolean | 'contact';
}

export interface BallparkVfxSystem {
  group: THREE.Group;
  droppedBat: THREE.Mesh;
  umpire: ReturnType<typeof createBaseUmpire>;
  setCalloutsVisible: (visible: boolean) => void;
  launchBall: (style: BallVfxStyle, callout?: { text: string; color?: string }) => { cameraShake: number };
  ball: ReturnType<typeof createBallFlightVisual>;
  kickChalk: (position: Vec3) => void;
  impact: (position: Vec3, color: string) => void;
  clear: () => void;
  spawnComicCallout: (text: string, pos: Vec3, bgColor?: string, inCorner?: boolean | 'contact') => void;
  update: (dtSec: number, camera?: THREE.PerspectiveCamera) => void;
  dispose: () => void;
}

function createComicCalloutTexture(text: string, bgColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Spiky comic starburst bubble
    ctx.save();
    ctx.translate(256, 96);
    ctx.beginPath();
    const spikes = 14;
    for (let i = 0; i < spikes * 2; i += 1) {
      const rX = i % 2 === 0 ? 236 : 186;
      const rY = i % 2 === 0 ? 84 : 58;
      const a = (i * Math.PI) / spikes;
      const px = Math.cos(a) * rX;
      const py = Math.sin(a) * rY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#181B2C';
    ctx.stroke();
    ctx.restore();

    ctx.font = '900 44px Bungee, Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#181B2C';
    ctx.strokeText(text, 256, 98, 453);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, 256, 98, 453);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBallparkVfxSystem(): BallparkVfxSystem {
  const group = new THREE.Group();

  const ball = createBallFlightVisual();
  const umpire=createBaseUmpire();
  group.add(umpire.sprite);
  const bat = createPaintedBat();
  bat.barrel.visible = false;
  group.add(bat.barrel);
  let captions = true;
  const rays: number[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const tip = i % 2 ? 0.53 : 0.72;
    rays.push(0.2 * Math.cos(angle - 0.14), 0.2 * Math.sin(angle - 0.14), 0,
      tip * Math.cos(angle), tip * Math.sin(angle), 0,
      0.2 * Math.cos(angle + 0.14), 0.2 * Math.sin(angle + 0.14), 0);
  }
  const flareGeo = new THREE.BufferGeometry();
  flareGeo.setAttribute('position', new THREE.Float32BufferAttribute(rays, 3));
  const flare = new THREE.Mesh(flareGeo, new THREE.MeshBasicMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false, depthTest: false,
  }));
  flare.visible = false;
  flare.renderOrder = 10;
  let flareAge = 0;
  const impact = (pos: Vec3, color: string) => {
    flare.position.set(pos.x, pos.y, pos.z);
    flare.material.color.set(color);
    flare.visible = true;
    flareAge = 0;
  };
  // A small, reusable fan of chalk specks at the runner's cleat.
  const dust = new THREE.Group();
  const grain = new THREE.CircleGeometry(.07, 7);
  const chalk = new THREE.MeshBasicMaterial({color: '#fff1d6', transparent:true, depthWrite:false});
  for (let i = 0; i < 7; i++) dust.add(new THREE.Mesh(grain, chalk));
  dust.visible = false;
  group.add(dust);
  let dustAge = 0;
  const kickChalk = (at: Vec3) => {
    dust.position.set(at.x, .09, at.z);
    dustAge = 0;
    dust.visible = true;
  };
  group.add(ball.group, flare);
  const callouts: ActiveCallout[] = [];

  const spawnComicCallout = (
    text: string,
    pos: { x: number; y: number; z: number },
    bgColor = '#FFC300',
    inCorner: boolean | 'contact' = false,
  ) => {
    if (!captions) return;
    const texture = createComicCalloutTexture(text, bgColor);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(pos.x, pos.y, pos.z);
    sprite.scale.set(0.01, 0.01, 1);
    sprite.renderOrder = 20;
    group.add(sprite);
    callouts.push({ sprite, texture, elapsed: 0, duration: 1.35, startY: pos.y, inCorner });
  };

  let immediate: { spec: BallTrajectorySpec; elapsed: number; color?: string } | null = null;
  const launchBall: BallparkVfxSystem['launchBall'] = (style, override) => {
    const spec = BALL_TRAJECTORY_PRESETS[style];
    immediate = { spec, elapsed: 0, color: override?.color };
    ball.draw(spec, 0, override?.color);
    const position = { x: spec.start.x, y: 2.6, z: spec.start.z + (spec.start.z < -5 ? 1.3 : -1.5) };
    spawnComicCallout(override?.text ?? spec.calloutText, position, override?.color ?? spec.trailColor);
    return { cameraShake: spec.cameraShake };
  };

  const update = (dtSec: number, camera?: THREE.PerspectiveCamera) => {
    if (immediate) {
      immediate.elapsed += dtSec;
      const progress = immediate.elapsed / immediate.spec.durationSec;
      if (progress < 1.15) ball.draw(immediate.spec, Math.min(1, progress), immediate.color);
      else {
        immediate = null;
        ball.group.visible = false;
      }
    }
    if (dust.visible) {
      dustAge += dtSec;
      const u = Math.min(1, dustAge / .40);
      dust.children.forEach((speck, i) => {
        const angle = 1.6 + i * .36;
        speck.position.set(Math.cos(angle)*u*.62, Math.sin(Math.PI*u)*(.12+.03*(i%3)), Math.sin(angle)*u*.4);
        speck.scale.setScalar((.68+.17*(i%3))*(1+u));
        if (camera) speck.quaternion.copy(camera.quaternion);
      });
      chalk.opacity = (1-u)*.85;
      dust.visible = u < 1;
    }
    if (flare.visible) {
      flareAge += dtSec;
      const t = flareAge / 0.24;
      if (camera) flare.quaternion.copy(camera.quaternion);
      flare.scale.setScalar(0.45 + t);
      flare.material.opacity = Math.max(0, 1 - t);
      flare.visible = t < 1;
    }

    for (let i = callouts.length - 1; i >= 0; i -= 1) {
      const c = callouts[i];
      c.elapsed += dtSec;
      const t = c.elapsed / c.duration;
      if (t >= 1) {
        group.remove(c.sprite);
        c.sprite.material.dispose();
        c.texture.dispose();
        callouts.splice(i, 1);
      } else {
        // Elastic comic pop-in + gentle upward drift
        const pop = t < 0.18 ? (t / 0.18) * 1.18 : 1.18 - Math.min(0.18, (t - 0.18) * 0.9);
        if (c.inCorner === 'contact' && camera) {
          const depth = camera.position.distanceTo(c.sprite.position);
          const width = Math.min(2, depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * .49);
          c.sprite.scale.set(width * pop, width * pop * .375, 1);
          c.sprite.position.y = c.startY + .26 * t;
        } else if (c.inCorner && camera) {
          // Keep the play name inside the frame and clear of the pitch lane.
          const depth = 3;
          const height = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const width = height * camera.aspect;
          const labelWidth = Math.min(width * 0.36, height * 0.52);
          c.sprite.scale.set(labelWidth * pop, labelWidth * pop * 0.375, 1);
          c.sprite.position.set(width / 2 - labelWidth * 0.63, height / 2 - labelWidth * 0.26, -depth)
            .applyQuaternion(camera.quaternion).add(camera.position);
        } else {
          c.sprite.scale.set(4.1 * pop, 1.55 * pop, 1);
          c.sprite.position.y = c.startY + t * 1.35;
        }
        c.sprite.material.opacity = t > 0.72 ? (1 - t) / 0.28 : 1;
      }
    }
  };

  const clear = () => {
    immediate = null;
    umpire.sprite.visible=false;
    dust.visible = false;
    bat.barrel.visible = false;
    ball.group.visible = false;
    flare.visible = false;
    for (const c of callouts.splice(0)) {
      group.remove(c.sprite);
      c.sprite.material.dispose();
      c.texture.dispose();
    }
  };

  const dispose = () => {
    clear();
    ball.dispose();
    bat.dispose();
    umpire.dispose();
    grain.dispose();
    chalk.dispose();
    flareGeo.dispose();
    flare.material.dispose();
  };
  const setCalloutsVisible = (visible: boolean) => {
    captions = visible;
    for (const item of callouts) item.sprite.visible = visible;
  };
  return { group, umpire, droppedBat: bat.barrel, setCalloutsVisible, ball, launchBall, impact, kickChalk, clear, spawnComicCallout, update, dispose };
}
