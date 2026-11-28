import type { EffectiveBatSide } from '../../engine/handedness/types';
import { createBrokenBat } from './brokenBat';
import { createStadiumCelebration } from './stadiumCelebration';
import { createBaseUmpire } from './baseUmpire';
import { createPaintedBat } from '../characters/paintedBat';
import * as THREE from 'three';
import { createBallFlightVisual } from './ballFlightVisual';
import { BALL_TRAJECTORY_PRESETS, type BallTrajectorySpec, type BallVfxStyle } from './ballTrajectory';
import { createSpecialPitchVfx } from './specialPitchVfx';
import type { Vec3 } from '../camera/cameraRig';

interface ActiveCallout {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  elapsed: number;
  duration: number;
  anchor: THREE.Vector3;
  inCorner: boolean | 'contact' | 'flight';
}

export interface BallparkVfxSystem {
  group: THREE.Group;
  celebration: ReturnType<typeof createStadiumCelebration>;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
  droppedBat: THREE.Mesh;
  triggerBrokenBat: (origin: Vec3, batSide: EffectiveBatSide) => void;
  drawSwingArc: (barrel: Vec3 | null, side: EffectiveBatSide, sincePlate: number) => void;
  umpire: ReturnType<typeof createBaseUmpire>;
  setCalloutsVisible: (visible: boolean) => void;
  launchBall: (style: BallVfxStyle, callout?: { text: string; color?: string }) => { cameraShake: number };
  ball: ReturnType<typeof createBallFlightVisual>;
  specialPitch: ReturnType<typeof createSpecialPitchVfx>;
  kickChalk: (position: Vec3) => void;
  impact: (position: Vec3, color: string) => void;
  clear: () => void;
  spawnComicCallout: (text: string, pos: Vec3, bgColor?: string, inCorner?: boolean | 'contact' | 'flight') => void;
  update: (dtSec: number, camera?: THREE.PerspectiveCamera, heightPx?: number) => void;
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

// The outer edge crosses the registered barrel at the midpoint of its sweep.
export const inSwingArcWindow = (sincePlate: number) => sincePlate > -.09 && sincePlate < .15;
const arcSegments = 28;
function createSwingArc() {
  const vertices: number[] = [], triangles: number[] = [];
  for (let i = 0; i <= arcSegments; i++) {
    const u = i/arcSegments, angle = (u-.5)*2.3;
    const width = .015 + .105*Math.sin(Math.PI*u);
    for (const radius of [.93-width,.93]) {
      vertices.push(radius*Math.cos(angle)-.93, .22*Math.sin(angle), -radius*Math.sin(angle));
    }
    if (i > 0) {
      const a = 2*i-2;
      triangles.push(a,a+1,a+2,a+1,a+3,a+2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(triangles);
  const arc = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: '#ffe3a2', side: THREE.DoubleSide, transparent:true, depthWrite:false,
  }));
  arc.name = 'swing arc';
  arc.visible = false;
  return arc;
}

export function createBallparkVfxSystem(): BallparkVfxSystem {
  const group = new THREE.Group();

  const celebration = createStadiumCelebration();
  let splinters: ReturnType<typeof createBrokenBat> | undefined;
  let reducedMotion = false;
  group.add(celebration.group);
  const arc = createSwingArc();
  group.add(arc);
  const drawSwingArc: BallparkVfxSystem['drawSwingArc'] = (barrel,side,sincePlate) => {
    arc.visible = Boolean(barrel && !reducedMotion && inSwingArcWindow(sincePlate));
    if (!arc.visible || !barrel) return;
    const head = Math.min(arcSegments,Math.ceil((sincePlate+.09)/.18*arcSegments));
    const tail = Math.max(0,Math.floor((sincePlate+.01)/.18*arcSegments));
    arc.geometry.setDrawRange(tail*6,(head-tail)*6);
    arc.material.opacity = .72*(1-THREE.MathUtils.smoothstep(sincePlate,.055,.15));
    arc.position.copy(barrel);
    arc.scale.x = side === 'R' ? 1 : -1;
  };
  const ball = createBallFlightVisual();
  const specialPitch = createSpecialPitchVfx();
  const umpire=createBaseUmpire();
  group.add(umpire.sprite, specialPitch.group);
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
    inCorner: boolean | 'contact' | 'flight' = false,
  ) => {
    if (!captions) return;
    const texture = createComicCalloutTexture(text, bgColor);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(pos.x, pos.y, pos.z);
    sprite.scale.set(0.01, 0.01, 1);
    sprite.renderOrder = 20;
    group.add(sprite);
    callouts.push({ sprite, texture, elapsed: 0, duration: 1.35, anchor: sprite.position.clone(), inCorner });
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

  const projected = new THREE.Vector3();
  const update = (dtSec: number, camera?: THREE.PerspectiveCamera, heightPx = 320) => {
    celebration.update(dtSec, camera);
    splinters?.update(dtSec);
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
      if (t >= 1 || (c.inCorner === 'flight' && !ball.group.visible)) {
        group.remove(c.sprite);
        c.sprite.material.dispose();
        c.texture.dispose();
        callouts.splice(i, 1);
      } else {
        // Elastic comic pop-in + gentle upward drift
        const pop = t < 0.18 ? (t / 0.18) * 1.18 : 1.18 - Math.min(0.18, (t - 0.18) * 0.9);
        if ((c.inCorner === 'contact' || c.inCorner === 'flight') && camera) {
          if (c.inCorner === 'flight') c.anchor.copy(ball.position);
          camera.updateMatrixWorld();
          projected.copy(c.anchor).project(camera);
          const pxHeight = Math.max(1,heightPx);
          const pxWidth = pxHeight * camera.aspect;
          const depth = -c.sprite.position.copy(c.anchor).applyMatrix4(camera.matrixWorldInverse).z;
          const worldPerPx = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov/2)) / pxHeight;
          // 44px lettering on a 512px texture needs a 140px panel for a 12px font.
          const width = Math.max(1,Math.min(pxWidth - 8, Math.max(144,pxHeight*.28) * Math.max(1,pop)));
          const height = width*.375;
          const edgeX = Math.max(0,1-(width+8)/pxWidth);
          const edgeY = Math.max(0,1-(height+8)/pxHeight);
          const offset = (height+16)/pxHeight;
          projected.x = THREE.MathUtils.clamp(projected.x,-edgeX,edgeX);
          projected.y = THREE.MathUtils.clamp(projected.y + (projected.y+offset>edgeY ? -offset : offset),-edgeY,edgeY);
          c.sprite.position.copy(projected.unproject(camera));
          c.sprite.scale.set(width*worldPerPx,height*worldPerPx,1);
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
          c.sprite.position.y = c.anchor.y + t * 1.35;
        }
        c.sprite.material.opacity = t > 0.72 ? (1 - t) / 0.28 : 1;
      }
    }
  };

  const clear = () => {
    celebration.clear();
    specialPitch.clear();
    if (splinters) splinters.group.visible = false;
    immediate = null;
    arc.visible = false;
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
    arc.geometry.dispose();
    arc.material.dispose();
    celebration.dispose();
    specialPitch.dispose();
    splinters?.dispose();
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
  return { group, celebration, drawSwingArc, get reducedMotion() { return reducedMotion; },
    setReducedMotion(value) {
      reducedMotion = value;
      if (value) {
        arc.visible = false;
        if (splinters) splinters.group.visible = false;
      }
      celebration.setReducedMotion(value);
    },
    triggerBrokenBat(at, batSide) {
      if (reducedMotion) return;
      if (!splinters) {
        splinters = createBrokenBat();
        group.add(splinters.group);
      }
      splinters.start(at, batSide);
    },
    umpire, droppedBat: bat.barrel, setCalloutsVisible, ball, specialPitch, launchBall, impact, kickChalk, clear, spawnComicCallout, update, dispose };
}
